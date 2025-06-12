"use client"

import { useState, useEffect } from "react"
import { Camera, Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MediaPermissions() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permissions, setPermissions] = useState({
    camera: 'prompt',
    microphone: 'prompt'
  })

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' })
        const micPermission = await navigator.permissions.query({ name: 'microphone' })
        
        setPermissions({
          camera: cameraPermission.state,
          microphone: micPermission.state
        })

        // Show prompt if either permission is not granted
        if (cameraPermission.state !== 'granted' || micPermission.state !== 'granted') {
          setShowPrompt(true)
        }

        // Listen for permission changes
        cameraPermission.addEventListener('change', () => {
          setPermissions(prev => ({ ...prev, camera: cameraPermission.state }))
        })
        
        micPermission.addEventListener('change', () => {
          setPermissions(prev => ({ ...prev, microphone: micPermission.state }))
        })
      } else {
        // If permissions API not available, show prompt
        setShowPrompt(true)
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      setShowPrompt(true)
    }
  }

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      // Successfully got permissions, stop the stream
      stream.getTracks().forEach(track => track.stop())
      
      setShowPrompt(false)
      await checkPermissions()
    } catch (error) {
      console.error('Permission denied:', error)
      // User denied permissions, but we'll hide the prompt anyway
      setShowPrompt(false)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Enable Camera & Microphone</CardTitle>
              <CardDescription className="mt-2">
                To use video calling features, please allow access to your camera and microphone.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPrompt(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              permissions.camera === 'granted' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Camera className={`h-6 w-6 ${
                permissions.camera === 'granted' ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">Camera Access</p>
              <p className="text-sm text-muted-foreground">
                {permissions.camera === 'granted' ? 'Granted' : 
                 permissions.camera === 'denied' ? 'Denied' : 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              permissions.microphone === 'granted' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Mic className={`h-6 w-6 ${
                permissions.microphone === 'granted' ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">Microphone Access</p>
              <p className="text-sm text-muted-foreground">
                {permissions.microphone === 'granted' ? 'Granted' : 
                 permissions.microphone === 'denied' ? 'Denied' : 'Not set'}
              </p>
            </div>
          </div>

          <Button 
            onClick={requestPermissions} 
            className="w-full"
            disabled={permissions.camera === 'granted' && permissions.microphone === 'granted'}
          >
            {permissions.camera === 'granted' && permissions.microphone === 'granted' 
              ? 'Permissions Granted' 
              : 'Grant Permissions'}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            You can change these permissions in your browser settings at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}