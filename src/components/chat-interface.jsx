"use client"

import * as React from "react"
import { Send, Hash, MessageSquare, Video, Users } from "lucide-react"
import { useSocket } from "@/contexts/SocketContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

export function ChatInterface({ channel, messages, onStartGroupCall }) {
  const { socket } = useSocket()
  const [newMessage, setNewMessage] = React.useState("")
  const scrollRef = React.useRef(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim() && socket && channel) {
      socket.emit('send-message', {
        channelId: channel.id,
        content: newMessage.trim()
      })
      setNewMessage("")
    }
  }

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No channel selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a channel from the sidebar to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{channel.name}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onStartGroupCall}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            <Users className="h-4 w-4" />
            Start Group Call
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                {message.user?.first_name?.[0]}{message.user?.last_name?.[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">
                    {message.user?.first_name} {message.user?.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), 'h:mm a')}
                  </span>
                </div>
                <p className="mt-1 text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message #${channel.name}`}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}