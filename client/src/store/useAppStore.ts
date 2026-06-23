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

  setUserId: (id: string) => void;
  setUsername: (name: string) => void;
  setAvatar: (avatar: string) => void;
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

  setUserId: (id) => set({ userId: id }),
  setUsername: (name) => set({ username: name }),
  setAvatar: (avatar) => set({ avatar }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setRooms: (rooms) => set({ rooms }),

  updateRoom: (room) => {
    set({ currentRoom: room });
    set(state => ({
      rooms: state.rooms.map(r => r.id === room.id ? room : r),
    }));
  },

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set(state => ({ messages: [...state.messages, message] })),
  updateMessage: (message) => set(state => ({
    messages: state.messages.map(m => m.id === message.id ? message : m),
  })),

  setMuted: (muted) => set({ isMuted: muted }),
  setHasAudioPermission: (val) => set({ hasAudioPermission: val }),

  addParticipant: (participant) => {
    const room = get().currentRoom;
    if (!room) return;
    if (room.participants.find(p => p.id === participant.id)) return;
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
    set({
      currentRoom: {
        ...room,
        participants: updated,
        participantCount: updated.length,
      },
    });
  },

  updateParticipant: (userId, updates) => {
    const room = get().currentRoom;
    if (!room) return;
    set({
      currentRoom: {
        ...room,
        participants: room.participants.map(p =>
          p.id === userId ? { ...p, ...updates } : p
        ),
      },
    });
  },
}));
