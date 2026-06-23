import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms';
import { RoomCategory } from './types';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

const usernames = new Map<string, string>();
const userAvatars = new Map<string, string>();

function getAvatar(username: string): string {
  const colors = ['#7c3aed', '#db2777', '#2563eb', '#059669', '#d97706', '#dc2626'];
  const idx = username.charCodeAt(0) % colors.length;
  return colors[idx];
}

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  const username = `User${socket.id.slice(0, 4).toUpperCase()}`;
  usernames.set(socket.id, username);
  userAvatars.set(socket.id, getAvatar(username));

  socket.emit('init', {
    userId: socket.id,
    username,
    avatar: getAvatar(username),
  });

  socket.emit('room-list', roomManager.getAllRooms());

  socket.on('set-username', (newUsername: string) => {
    if (!newUsername || typeof newUsername !== 'string') return;
    const clean = newUsername.trim().slice(0, 24);
    if (!clean) return;
    usernames.set(socket.id, clean);
    userAvatars.set(socket.id, getAvatar(clean));

    const existingRoom = roomManager.findRoomByParticipant(socket.id);
    if (existingRoom) {
      roomManager.updateParticipant(existingRoom.id, socket.id, {
        username: clean,
        avatar: getAvatar(clean),
      });
      io.to(existingRoom.id).emit('room-updated', roomManager.toPublic(existingRoom));
    }

    socket.emit('username-set', { username: clean, avatar: getAvatar(clean) });
  });

  socket.on('get-rooms', () => {
    socket.emit('room-list', roomManager.getAllRooms());
  });

  socket.on('create-room', (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants?: number;
    isPrivate?: boolean;
    tags?: string[];
  }) => {
    if (!data.name || !data.category) {
      socket.emit('error', 'Room name and category are required');
      return;
    }
    const username = usernames.get(socket.id) ?? 'Unknown';
    const room = roomManager.createRoom({
      name: data.name.trim().slice(0, 60),
      description: (data.description ?? '').trim().slice(0, 200),
      category: data.category,
      hostId: socket.id,
      hostUsername: username,
      maxParticipants: data.maxParticipants,
      isPrivate: data.isPrivate,
      tags: data.tags,
    });

    const participant = {
      id: socket.id,
      username,
      avatar: userAvatars.get(socket.id) ?? getAvatar(username),
      isMuted: false,
      isSpeaking: false,
      joinedAt: new Date(),
    };
    roomManager.addParticipant(room.id, participant);
    socket.join(room.id);

    socket.emit('room-joined', {
      room: roomManager.toPublic(room),
      messages: room.messages,
    });

    io.emit('room-list', roomManager.getAllRooms());
  });

  socket.on('join-room', (data: { roomId: string; password?: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.isPrivate && room.password && room.password !== data.password) {
      socket.emit('error', 'Wrong password');
      return;
    }
    if (room.participants.size >= room.maxParticipants) {
      socket.emit('error', 'Room is full');
      return;
    }

    const existingRoom = roomManager.findRoomByParticipant(socket.id);
    if (existingRoom && existingRoom.id !== room.id) {
      roomManager.removeParticipant(existingRoom.id, socket.id);
      socket.leave(existingRoom.id);
      socket.to(existingRoom.id).emit('user-left', { userId: socket.id });
      io.to(existingRoom.id).emit('room-updated', roomManager.toPublic(existingRoom));
    }

    const username = usernames.get(socket.id) ?? 'Unknown';
    const participant = {
      id: socket.id,
      username,
      avatar: userAvatars.get(socket.id) ?? getAvatar(username),
      isMuted: false,
      isSpeaking: false,
      joinedAt: new Date(),
    };
    roomManager.addParticipant(room.id, participant);
    socket.join(room.id);

    socket.emit('room-joined', {
      room: roomManager.toPublic(room),
      messages: room.messages,
    });

    socket.to(room.id).emit('user-joined', { participant });
    io.to(room.id).emit('room-updated', roomManager.toPublic(room));
    io.emit('room-list', roomManager.getAllRooms());
  });

  socket.on('leave-room', () => {
    handleLeaveRoom(socket);
  });

  socket.on('send-message', (data: { text: string }) => {
    const room = roomManager.findRoomByParticipant(socket.id);
    if (!room || !data.text?.trim()) return;

    const username = usernames.get(socket.id) ?? 'Unknown';
    const msg = roomManager.addMessage(room.id, {
      userId: socket.id,
      username,
      avatar: userAvatars.get(socket.id) ?? getAvatar(username),
      text: data.text.trim().slice(0, 500),
      timestamp: new Date(),
    });
    if (msg) {
      io.to(room.id).emit('message', msg);
    }
  });

  socket.on('send-reaction', (data: { messageId: string; emoji: string }) => {
    const room = roomManager.findRoomByParticipant(socket.id);
    if (!room) return;
    roomManager.addReaction(room.id, data.messageId, data.emoji, socket.id);
    const msg = room.messages.find(m => m.id === data.messageId);
    if (msg) {
      io.to(room.id).emit('message-updated', msg);
    }
  });

  socket.on('toggle-mute', (isMuted: boolean) => {
    const room = roomManager.findRoomByParticipant(socket.id);
    if (!room) return;
    roomManager.updateParticipant(room.id, socket.id, { isMuted });
    io.to(room.id).emit('user-mute-changed', { userId: socket.id, isMuted });
    io.to(room.id).emit('room-updated', roomManager.toPublic(room));
  });

  socket.on('speaking-state', (isSpeaking: boolean) => {
    const room = roomManager.findRoomByParticipant(socket.id);
    if (!room) return;
    roomManager.updateParticipant(room.id, socket.id, { isSpeaking });
    io.to(room.id).emit('user-speaking', { userId: socket.id, isSpeaking });
  });

  // WebRTC signaling
  socket.on('webrtc-offer', (data: { targetId: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(data.targetId).emit('webrtc-offer', {
      fromId: socket.id,
      offer: data.offer,
    });
  });

  socket.on('webrtc-answer', (data: { targetId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(data.targetId).emit('webrtc-answer', {
      fromId: socket.id,
      answer: data.answer,
    });
  });

  socket.on('webrtc-ice-candidate', (data: { targetId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(data.targetId).emit('webrtc-ice-candidate', {
      fromId: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handleLeaveRoom(socket);
    usernames.delete(socket.id);
    userAvatars.delete(socket.id);
  });

  function handleLeaveRoom(sock: Socket) {
    const room = roomManager.findRoomByParticipant(sock.id);
    if (!room) return;
    roomManager.removeParticipant(room.id, sock.id);
    sock.leave(room.id);
    io.to(room.id).emit('user-left', { userId: sock.id });
    const updatedRoom = roomManager.getRoom(room.id);
    if (updatedRoom) {
      io.to(room.id).emit('room-updated', roomManager.toPublic(updatedRoom));
    }
    io.emit('room-list', roomManager.getAllRooms());
  }
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`FunFlow server running on port ${PORT}`);
});
