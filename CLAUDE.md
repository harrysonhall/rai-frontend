# Frontend - RAI Chat Application

## Overview
Next.js 14 application with real-time chat and video calling features.

## Key Components

### Pages
- `/` - Landing page
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - Main chat interface with video calling

### Components
- `app-sidebar.jsx` - Main navigation sidebar
- `chat-sidebar.jsx` - Channel list and user list with video call buttons
- `chat-interface.jsx` - Message display and input
- `video-chat.jsx` - WebRTC video calling component
- `SocketContext.jsx` - WebSocket connection management

## Video Calling Flow
1. User clicks video call button on another online user
2. Initiates WebRTC peer connection
3. Creates offer and sends via WebSocket
4. Receiver gets incoming call dialog
5. On accept, creates answer and establishes connection
6. ICE candidates exchanged for NAT traversal
7. Video/audio streams established

## Environment Variables
- NEXT_PUBLIC_WS_URL - WebSocket server URL (defaults to window.location.origin)

## Styling
- Tailwind CSS
- shadcn/ui components
- Dark mode support ready

## Build & Deploy
```bash
npm install
npm run build
npm start
```