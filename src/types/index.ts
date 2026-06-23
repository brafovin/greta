export type RoomCategory = 'gaming' | 'music' | 'talk' | 'chill' | 'art' | 'tech';

export interface Participant {
  id: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: Date | string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: Date | string;
  reactions: MessageReaction[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  category: RoomCategory;
  hostId: string;
  hostUsername: string;
  participants: Participant[];
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  createdAt: Date | string;
  tags: string[];
}

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  gaming: '🎮 Gaming',
  music: '🎵 Music',
  talk: '💬 Talk',
  chill: '🌿 Chill',
  art: '🎨 Art',
  tech: '💻 Tech',
};

export const CATEGORY_COLORS: Record<RoomCategory, string> = {
  gaming: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  music: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  talk: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  chill: 'bg-green-500/20 text-green-300 border-green-500/30',
  art: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  tech: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};
