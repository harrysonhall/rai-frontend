"use client"

import * as React from "react"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2 } from "lucide-react"
import { useSocket } from "@/contexts/SocketContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function VideoChat({ isOpen, onClose, callingUserId }) {
  const { socket } = useSocket()
  const [localStream, setLocalStream] = React.useState(null)
  const [remoteStream, setRemoteStream] = React.useState(null)
  const [peerConnection, setPeerConnection] = React.useState(null)
  const [callState, setCallState] = React.useState('idle') // idle, calling, connected
  const [isMuted, setIsMuted] = React.useState(false)
  const [isVideoOff, setIsVideoOff] = React.useState(false)
  const [currentCall, setCurrentCall] = React.useState(null)
  const [incomingCall, setIncomingCall] = React.useState(null)
  
  const localVideoRef = React.useRef(null)
  const remoteVideoRef = React.useRef(null)

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Public TURN servers for NAT traversal
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
    if (isOpen && callingUserId) {
      startCall(callingUserId)
    }
  }, [isOpen, callingUserId])

  React.useEffect(() => {
    if (!socket) return

    // Handle incoming call
    socket.on('incoming-call', async (data) => {
      setIncomingCall(data)
      setCallState('incoming')
    })

    // Handle call answered
    socket.on('call-answered', async (data) => {
      if (peerConnection && data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        setCallState('connected')
      }
    })

    // Handle call rejected
    socket.on('call-rejected', () => {
      endCall()
      alert('Call was rejected')
    })

    // Handle call ended
    socket.on('call-ended', () => {
      endCall()
    })

    // Handle ICE candidates
    socket.on('ice-candidate', async (data) => {
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    })

    // Handle user not available
    socket.on('user-not-available', () => {
      alert('User is not available')
      endCall()
    })

    // Handle call ringing
    socket.on('call-ringing', (data) => {
      setCallState('calling')
      setCurrentCall(data)
    })

    return () => {
      socket.off('incoming-call')
      socket.off('call-answered')
      socket.off('call-rejected')
      socket.off('call-ended')
      socket.off('ice-candidate')
      socket.off('user-not-available')
      socket.off('call-ringing')
    }
  }, [socket, peerConnection])

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      alert('Failed to access camera/microphone')
    }
  }

  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(iceServers)

    // Add local stream tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && currentCall) {
        socket.emit('ice-candidate', {
          userId: currentCall.userId || currentCall.caller?.id,
          candidate: event.candidate
        })
      }
    }

    setPeerConnection(pc)
    return pc
  }

  const startCall = async (userId) => {
    const stream = await startLocalStream()
    if (!stream) return

    const pc = createPeerConnection(stream)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    setCurrentCall({ userId })
    setCallState('calling')

    socket.emit('call-user', {
      userId,
      offer,
      callType: 'video'
    })
  }

  const acceptCall = async () => {
    if (!incomingCall) return

    const stream = await startLocalStream()
    if (!stream) return

    const pc = createPeerConnection(stream)
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))
    
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    socket.emit('answer-call', {
      callId: incomingCall.callId,
      answer
    })

    setCurrentCall(incomingCall)
    setCallState('connected')
    setIncomingCall(null)
  }

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit('reject-call', { callId: incomingCall.callId })
      setIncomingCall(null)
      setCallState('idle')
    }
  }

  const endCall = () => {
    if (currentCall?.callId) {
      socket.emit('end-call', { callId: currentCall.callId })
    }

    // Clean up
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (peerConnection) {
      peerConnection.close()
      setPeerConnection(null)
    }
    setRemoteStream(null)
    setCallState('idle')
    setCurrentCall(null)
    setIncomingCall(null)
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

  return (
    <>
      {/* Incoming call dialog */}
      {callState === 'incoming' && incomingCall && (
        <Dialog open={true} onOpenChange={() => rejectCall()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Incoming Video Call</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                {incomingCall.caller?.first_name?.[0]}{incomingCall.caller?.last_name?.[0]}
              </div>
              <p className="text-lg font-semibold">
                {incomingCall.caller?.first_name} {incomingCall.caller?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">is calling you...</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="destructive"
                size="lg"
                onClick={rejectCall}
                className="gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                Decline
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={acceptCall}
                className="gap-2"
              >
                <Phone className="h-5 w-5" />
                Accept
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Video call interface */}
      {(callState === 'calling' || callState === 'connected') && (
        <Dialog open={isOpen} onOpenChange={() => { endCall(); onClose(); }}>
          <DialogContent className="max-w-6xl h-[90vh] p-0">
            <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
              {/* Remote video (full screen) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local video (picture-in-picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <VideoOff className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Call status */}
              {callState === 'calling' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-xl mb-2">Calling...</p>
                    <p className="text-sm text-gray-300">Waiting for response</p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
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
                    onClick={() => { endCall(); onClose(); }}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Export a function to initiate calls from outside the component
export const initiateVideoCall = (userId) => {
  // This will be called from the dashboard
  return userId
}