import { v4 as uuidv4 } from 'uuid';
import { Room, RoomPublic, Participant, RoomCategory } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(options: {
    name: string;
    description: string;
    category: RoomCategory;
    hostId: string;
    hostUsername: string;
    maxParticipants?: number;
    isPrivate?: boolean;
    password?: string;
    tags?: string[];
  }): Room {
    const room: Room = {
      id: uuidv4(),
      name: options.name,
      description: options.description,
      category: options.category,
      hostId: options.hostId,
      hostUsername: options.hostUsername,
      participants: new Map(),
      messages: [],
      maxParticipants: options.maxParticipants ?? 20,
      isPrivate: options.isPrivate ?? false,
      password: options.password,
      createdAt: new Date(),
      tags: options.tags ?? [],
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): RoomPublic[] {
    return Array.from(this.rooms.values())
      .filter(r => !r.isPrivate)
      .map(r => this.toPublic(r));
  }

  addParticipant(roomId: string, participant: Participant): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.participants.size >= room.maxParticipants) return false;
    room.participants.set(participant.id, participant);
    return true;
  }

  removeParticipant(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants.delete(userId);
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      return;
    }
    if (room.hostId === userId) {
      const firstParticipant = room.participants.values().next().value;
      if (firstParticipant) {
        room.hostId = firstParticipant.id;
        room.hostUsername = firstParticipant.username;
      }
    }
  }

  updateParticipant(roomId: string, userId: string, updates: Partial<Participant>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(userId);
    if (!participant) return;
    Object.assign(participant, updates);
  }

  addMessage(roomId: string, message: Omit<import('./types').Message, 'id' | 'reactions'>): import('./types').Message | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const msg = { ...message, id: uuidv4(), reactions: [] };
    room.messages.push(msg);
    if (room.messages.length > 200) room.messages.shift();
    return msg;
  }

  addReaction(roomId: string, messageId: string, emoji: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const msg = room.messages.find(m => m.id === messageId);
    if (!msg) return;
    let reaction = msg.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = { emoji, count: 0, userIds: [] };
      msg.reactions.push(reaction);
    }
    if (!reaction.userIds.includes(userId)) {
      reaction.userIds.push(userId);
      reaction.count++;
    }
  }

  findRoomByParticipant(userId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.participants.has(userId)) return room;
    }
    return undefined;
  }

  toPublic(room: Room): RoomPublic {
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      category: room.category,
      hostId: room.hostId,
      hostUsername: room.hostUsername,
      participants: Array.from(room.participants.values()),
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
      tags: room.tags,
    };
  }
}
