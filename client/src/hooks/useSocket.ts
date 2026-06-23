import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../store/useAppStore';
import { Room, Message, Participant } from '../types';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());
  const store = useAppStore();

  const joinRoom = useCallback((roomId: string, password?: string) => {
    socketRef.current.emit('join-room', { roomId, password });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current.emit('leave-room');
    store.setCurrentRoom(null);
    store.setMessages([]);
  }, [store]);

  const createRoom = useCallback((data: {
    name: string;
    description: string;
    category: string;
    maxParticipants?: number;
    isPrivate?: boolean;
    tags?: string[];
  }) => {
    socketRef.current.emit('create-room', data);
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketRef.current.emit('send-message', { text });
  }, []);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current.emit('send-reaction', { messageId, emoji });
  }, []);

  const toggleMute = useCallback((isMuted: boolean) => {
    socketRef.current.emit('toggle-mute', isMuted);
  }, []);

  const setSpeaking = useCallback((isSpeaking: boolean) => {
    socketRef.current.emit('speaking-state', isSpeaking);
  }, []);

  const setUsername = useCallback((username: string) => {
    socketRef.current.emit('set-username', username);
  }, []);

  const sendWebRTCOffer = useCallback((targetId: string, offer: RTCSessionDescriptionInit) => {
    socketRef.current.emit('webrtc-offer', { targetId, offer });
  }, []);

  const sendWebRTCAnswer = useCallback((targetId: string, answer: RTCSessionDescriptionInit) => {
    socketRef.current.emit('webrtc-answer', { targetId, answer });
  }, []);

  const sendIceCandidate = useCallback((targetId: string, candidate: RTCIceCandidateInit) => {
    socketRef.current.emit('webrtc-ice-candidate', { targetId, candidate });
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('init', (data: { userId: string; username: string; avatar: string }) => {
      store.setUserId(data.userId);
      store.setUsername(data.username);
      store.setAvatar(data.avatar);
    });

    socket.on('username-set', (data: { username: string; avatar: string }) => {
      store.setUsername(data.username);
      store.setAvatar(data.avatar);
    });

    socket.on('room-list', (rooms: Room[]) => {
      store.setRooms(rooms);
    });

    socket.on('room-joined', (data: { room: Room; messages: Message[] }) => {
      store.setCurrentRoom(data.room);
      store.setMessages(data.messages);
    });

    socket.on('room-updated', (room: Room) => {
      store.updateRoom(room);
    });

    socket.on('user-joined', (data: { participant: Participant }) => {
      store.addParticipant(data.participant);
    });

    socket.on('user-left', (data: { userId: string }) => {
      store.removeParticipant(data.userId);
    });

    socket.on('message', (message: Message) => {
      store.addMessage(message);
    });

    socket.on('message-updated', (message: Message) => {
      store.updateMessage(message);
    });

    socket.on('user-mute-changed', (data: { userId: string; isMuted: boolean }) => {
      store.updateParticipant(data.userId, { isMuted: data.isMuted });
    });

    socket.on('user-speaking', (data: { userId: string; isSpeaking: boolean }) => {
      store.updateParticipant(data.userId, { isSpeaking: data.isSpeaking });
    });

    socket.on('error', (message: string) => {
      console.error('Socket error:', message);
    });

    return () => {
      socket.off('init');
      socket.off('username-set');
      socket.off('room-list');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('message');
      socket.off('message-updated');
      socket.off('user-mute-changed');
      socket.off('user-speaking');
      socket.off('error');
    };
  }, [store]);

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    createRoom,
    sendMessage,
    sendReaction,
    toggleMute,
    setSpeaking,
    setUsername,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendIceCandidate,
  };
}
