export interface Participant {
  id: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: Date;
  reactions: { emoji: string; count: number; userIds: string[] }[];
}

export type RoomCategory = 'gaming' | 'music' | 'talk' | 'chill' | 'art' | 'tech';

export interface Room {
  id: string;
  name: string;
  description: string;
  category: RoomCategory;
  hostId: string;
  hostUsername: string;
  participants: Map<string, Participant>;
  messages: Message[];
  maxParticipants: number;
  isPrivate: boolean;
  password?: string;
  createdAt: Date;
  tags: string[];
}

export interface RoomPublic {
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
  createdAt: Date;
  tags: string[];
}
