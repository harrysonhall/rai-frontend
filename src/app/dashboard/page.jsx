"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatInterface } from "@/components/chat-interface"
import { VideoChat } from "@/components/video-chat"
import { SocketProvider, useSocket } from "@/contexts/SocketContext"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function DashboardContent() {
  const router = useRouter()
  const { socket } = useSocket()
  const [user, setUser] = useState(null)
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false)
  const [callingUserId, setCallingUserId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    fetchChannels()
    fetchUsers()
  }, [router])

  useEffect(() => {
    if (!socket) return

    socket.on('new-channel', (channel) => {
      setChannels(prev => [...prev, channel])
    })

    socket.on('new-message', (message) => {
      if (message.channel_id === activeChannel?.id) {
        setMessages(prev => [...prev, message])
      }
    })

    socket.on('user-online', (onlineUser) => {
      setUsers(prev => prev.map(u => 
        u.id === onlineUser.id ? { ...u, status: onlineUser.status } : u
      ))
    })

    socket.on('user-offline', ({ userId }) => {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: { ...u.status, is_online: false } } : u
      ))
    })

    return () => {
      socket.off('new-channel')
      socket.off('new-message')
      socket.off('user-online')
      socket.off('user-offline')
    }
  }, [socket, activeChannel])

  useEffect(() => {
    if (activeChannel && socket) {
      socket.emit('join-channel', activeChannel.id)
      fetchMessages(activeChannel.id)
    }
  }, [activeChannel, socket])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setChannels(data)
        if (data.length > 0 && !activeChannel) {
          setActiveChannel(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (channelId) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleVideoCall = (targetUser) => {
    setCallingUserId(targetUser.id)
    setIsVideoCallOpen(true)
  }

  const handleUserSelect = (selectedUser) => {
    setSelectedUser(selectedUser)
    setActiveChannel(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar
          channels={channels}
          activeChannel={activeChannel}
          onChannelSelect={setActiveChannel}
          users={users}
          onUserSelect={handleUserSelect}
          onVideoCall={handleVideoCall}
          user={user}
        />
        <div className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Chat</BreadcrumbLink>
                </BreadcrumbItem>
                {activeChannel && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeChannel.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatInterface channel={activeChannel} messages={messages} />
          </main>
        </div>
      </div>
      <VideoChat 
        isOpen={isVideoCallOpen} 
        onClose={() => setIsVideoCallOpen(false)}
        callingUserId={callingUserId}
      />
    </SidebarProvider>
  )
}

export default function DashboardPage() {
  return (
    <SocketProvider>
      <DashboardContent />
    </SocketProvider>
  )
}