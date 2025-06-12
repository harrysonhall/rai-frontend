"use client"

import * as React from "react"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users, Maximize2, Minimize2 } from "lucide-react"
import { useSocket } from "@/contexts/SocketContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function GroupVideoChat({ channel, isOpen, onClose }) {
  const { socket } = useSocket()
  const [localStream, setLocalStream] = React.useState(null)
  const [participants, setParticipants] = React.useState(new Map())
  const [peerConnections, setPeerConnections] = React.useState(new Map())
  const [callState, setCallState] = React.useState('idle') // idle, joining, connected
  const [isMuted, setIsMuted] = React.useState(false)
  const [isVideoOff, setIsVideoOff] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [activeParticipant, setActiveParticipant] = React.useState(null)
  
  const localVideoRef = React.useRef(null)
  const remoteVideoRefs = React.useRef(new Map())
  const containerRef = React.useRef(null)

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }

  React.useEffect(() => {
    if (!socket || !channel) return

    // Socket event handlers for group calls
    socket.on('user-joined-call', handleUserJoinedCall)
    socket.on('user-left-call', handleUserLeftCall)
    socket.on('group-call-offer', handleGroupCallOffer)
    socket.on('group-call-answer', handleGroupCallAnswer)
    socket.on('group-ice-candidate', handleGroupIceCandidate)
    socket.on('channel-call-participants', handleCallParticipants)

    return () => {
      socket.off('user-joined-call')
      socket.off('user-left-call')
      socket.off('group-call-offer')
      socket.off('group-call-answer')
      socket.off('group-ice-candidate')
      socket.off('channel-call-participants')
    }
  }, [socket, channel])

  React.useEffect(() => {
    if (isOpen && channel) {
      joinCall()
    } else if (!isOpen) {
      leaveCall()
    }
  }, [isOpen, channel])

  const handleCallParticipants = (data) => {
    // Set initial participants when joining
    const newParticipants = new Map()
    data.participants.forEach(participant => {
      if (participant.id !== socket.id) {
        newParticipants.set(participant.id, participant)
      }
    })
    setParticipants(newParticipants)
  }

  const handleUserJoinedCall = async (data) => {
    if (data.userId === socket.id) return
    
    // Add new participant
    setParticipants(prev => {
      const updated = new Map(prev)
      updated.set(data.userId, data.user)
      return updated
    })

    // Create offer for the new participant
    if (localStream) {
      await createPeerConnection(data.userId, true)
    }
  }

  const handleUserLeftCall = (data) => {
    // Remove participant
    setParticipants(prev => {
      const updated = new Map(prev)
      updated.delete(data.userId)
      return updated
    })

    // Close peer connection
    const pc = peerConnections.get(data.userId)
    if (pc) {
      pc.close()
      setPeerConnections(prev => {
        const updated = new Map(prev)
        updated.delete(data.userId)
        return updated
      })
    }

    // Remove video element
    const videoElement = remoteVideoRefs.current.get(data.userId)
    if (videoElement) {
      videoElement.srcObject = null
      remoteVideoRefs.current.delete(data.userId)
    }
  }

  const handleGroupCallOffer = async (data) => {
    const { fromUserId, offer } = data
    await createPeerConnection(fromUserId, false)
    
    const pc = peerConnections.get(fromUserId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      socket.emit('group-call-answer', {
        channelId: channel.id,
        toUserId: fromUserId,
        answer
      })
    }
  }

  const handleGroupCallAnswer = async (data) => {
    const { fromUserId, answer } = data
    const pc = peerConnections.get(fromUserId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  const handleGroupIceCandidate = async (data) => {
    const { fromUserId, candidate } = data
    const pc = peerConnections.get(fromUserId)
    if (pc && candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  const createPeerConnection = async (userId, createOffer) => {
    const pc = new RTCPeerConnection(iceServers)

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const videoElement = remoteVideoRefs.current.get(userId)
      if (videoElement) {
        videoElement.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('group-ice-candidate', {
          channelId: channel.id,
          toUserId: userId,
          candidate: event.candidate
        })
      }
    }

    // Store peer connection
    setPeerConnections(prev => {
      const updated = new Map(prev)
      updated.set(userId, pc)
      return updated
    })

    // Create offer if needed
    if (createOffer) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      
      socket.emit('group-call-offer', {
        channelId: channel.id,
        toUserId: userId,
        offer
      })
    }

    return pc
  }

  const joinCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Join channel call
      socket.emit('join-channel-call', { channelId: channel.id })
      setCallState('connected')
    } catch (error) {
      console.error('Error joining call:', error)
      alert('Failed to access camera/microphone')
    }
  }

  const leaveCall = () => {
    // Notify server
    if (channel) {
      socket.emit('leave-channel-call', { channelId: channel.id })
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }

    // Close all peer connections
    peerConnections.forEach(pc => pc.close())
    setPeerConnections(new Map())

    // Clear remote videos
    remoteVideoRefs.current.forEach(video => {
      video.srcObject = null
    })
    remoteVideoRefs.current.clear()

    setParticipants(new Map())
    setCallState('idle')
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen()
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  if (!isOpen) return null

  const gridCols = participants.size <= 1 ? 1 : 
                   participants.size <= 4 ? 2 : 
                   participants.size <= 9 ? 3 : 4

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-white" />
          <h2 className="text-white font-semibold">
            {channel?.name} - Group Call
          </h2>
          <span className="text-white/70 text-sm">
            ({participants.size + 1} participants)
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-white hover:bg-white/20"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={cn(
          "grid gap-4 h-full",
          `grid-cols-${gridCols}`,
          participants.size === 0 && "place-items-center"
        )}>
          {/* Local video */}
          <Card className="relative overflow-hidden bg-gray-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Camera Off</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
              You {isMuted && '(Muted)'}
            </div>
          </Card>

          {/* Remote videos */}
          {Array.from(participants.entries()).map(([userId, participant]) => (
            <Card key={userId} className="relative overflow-hidden bg-gray-900">
              <video
                ref={el => {
                  if (el) remoteVideoRefs.current.set(userId, el)
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                {participant.first_name} {participant.last_name}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="destructive"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => {
              leaveCall()
              onClose()
            }}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}