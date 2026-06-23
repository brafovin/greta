import { create } from 'zustand';
import { Room, Message, Participant } from '../types';

interface AppState {
  userId: string | null;
  username: string;
  avatar: string;
  currentRoom: Room | null;
  rooms: Room[];
  messages: Message[];
  isMuted: boolean;
  hasAudioPermission: boolean | null;
  isConnected: boolean;
  isConnecting: boolean;

  setUserId: (id: string) => void;
  setUsername: (name: string) => void;
  setAvatar: (avatar: string) => void;
  setIsConnected: (val: boolean) => void;
  setIsConnecting: (val: boolean) => void;
  setCurrentRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
  updateRoom: (room: Room) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  setMuted: (muted: boolean) => void;
  setHasAudioPermission: (val: boolean) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  userId: null,
  username: '',
  avatar: '#7c3aed',
  currentRoom: null,
  rooms: [],
  messages: [],
  isMuted: false,
  hasAudioPermission: null,
  isConnected: false,
  isConnecting: true,

  setUserId: (id) => set({ userId: id }),
  setUsername: (name) => set({ username: name }),
  setAvatar: (avatar) => set({ avatar }),
  setIsConnected: (val) => set({ isConnected: val, isConnecting: false }),
  setIsConnecting: (val) => set({ isConnecting: val }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setRooms: (rooms) => set({ rooms }),

  updateRoom: (room) => {
    set({ currentRoom: room });
    set(state => ({ rooms: state.rooms.map(r => r.id === room.id ? room : r) }));
  },

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set(state => {
    if (state.messages.find(m => m.id === message.id)) return state;
    return { messages: [...state.messages, message] };
  }),
  updateMessage: (message) => set(state => ({
    messages: state.messages.map(m => m.id === message.id ? message : m),
  })),

  setMuted: (muted) => set({ isMuted: muted }),
  setHasAudioPermission: (val) => set({ hasAudioPermission: val }),

  addParticipant: (participant) => {
    const room = get().currentRoom;
    if (!room || room.participants.find(p => p.id === participant.id)) return;
    set({
      currentRoom: {
        ...room,
        participants: [...room.participants, participant],
        participantCount: room.participants.length + 1,
      },
    });
  },

  removeParticipant: (userId) => {
    const room = get().currentRoom;
    if (!room) return;
    const updated = room.participants.filter(p => p.id !== userId);
    set({ currentRoom: { ...room, participants: updated, participantCount: updated.length } });
  },

  updateParticipant: (userId, updates) => {
    const room = get().currentRoom;
    if (!room) return;
    set({
      currentRoom: {
        ...room,
        participants: room.participants.map(p => p.id === userId ? { ...p, ...updates } : p),
      },
    });
  },
}));
