"use client"

import * as React from "react"
import { Plus, Hash, MessageSquare, Users, Phone, Video, Circle } from "lucide-react"
import { useSocket } from "@/contexts/SocketContext"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export function ChatSidebar({ 
  channels, 
  activeChannel, 
  onChannelSelect, 
  users, 
  onUserSelect,
  onVideoCall,
  user 
}) {
  const { socket } = useSocket()
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newChannelName, setNewChannelName] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("channels")

  const handleCreateChannel = () => {
    if (newChannelName.trim() && socket) {
      socket.emit('create-channel', { name: newChannelName.trim() })
      setNewChannelName("")
      setIsCreateOpen(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
  }

  const handleVideoCall = (targetUser) => {
    if (onVideoCall) {
      onVideoCall(targetUser)
    }
  }

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="w-full">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <MessageSquare className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">RAI Chat</span>
                <span className="text-xs text-muted-foreground">Real-time messaging</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="mt-4">
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between">
                Channels
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Channel</DialogTitle>
                      <DialogDescription>
                        Create a new channel for your team to collaborate.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="general"
                          className="col-span-3"
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateChannel}>Create Channel</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {channels.map((channel) => (
                    <SidebarMenuItem key={channel.id}>
                      <SidebarMenuButton
                        onClick={() => {
                          onChannelSelect(channel)
                          setActiveTab("channels")
                        }}
                        isActive={activeChannel?.id === channel.id && activeTab === "channels"}
                      >
                        <Hash className="size-4" />
                        <span>{channel.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
          
          <TabsContent value="users" className="mt-4">
            <SidebarGroup>
              <SidebarGroupLabel>Users</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {users.map((targetUser) => (
                    <SidebarMenuItem key={targetUser.id}>
                      <SidebarMenuButton
                        onClick={() => onUserSelect(targetUser)}
                        className="justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                              {targetUser.first_name?.[0]}{targetUser.last_name?.[0]}
                            </div>
                            {targetUser.status?.is_online && (
                              <Circle className="absolute -bottom-0.5 -right-0.5 size-3 fill-green-500 text-green-500" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 leading-none">
                            <span className="text-sm font-medium">
                              {targetUser.first_name} {targetUser.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {targetUser.status?.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        {targetUser.status?.is_online && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVideoCall(targetUser)
                            }}
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No other users yet
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
        </Tabs>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">{user?.first_name} {user?.last_name}</span>
                  <span className="text-xs text-muted-foreground">@{user?.username}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="w-full text-red-600 hover:text-red-700">
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}