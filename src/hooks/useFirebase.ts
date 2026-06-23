import { useEffect, useRef, useCallback } from 'react';
import {
  ref, set, push, onValue, onChildAdded, remove, update, off,
} from 'firebase/database';
import { getDb, isFirebaseConfigured } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { Room, Message, Participant, RoomCategory } from '../types';

const ADJECTIVES = ['Happy', 'Brave', 'Cool', 'Wild', 'Calm', 'Swift', 'Bold', 'Wise', 'Zesty', 'Lively'];
const NOUNS = ['Fox', 'Bear', 'Wolf', 'Hawk', 'Star', 'Moon', 'Wave', 'Flame', 'Storm', 'River'];
const AVATAR_COLORS = ['#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706', '#dc2626'];

function randomUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 999)}`;
}

function randomAvatar() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function parseParticipants(raw: Record<string, unknown> | null): Participant[] {
  if (!raw) return [];
  return Object.entries(raw).map(([id, p]) => {
    const data = p as Record<string, unknown>;
    return {
      id,
      username: String(data.username ?? ''),
      avatar: String(data.avatar ?? '#7c3aed'),
      isMuted: Boolean(data.isMuted),
      isSpeaking: Boolean(data.isSpeaking),
      joinedAt: data.joinedAt as string,
    };
  });
}

function parseRoom(id: string, data: Record<string, unknown>): Room {
  const participants = parseParticipants(
    (data.participants as Record<string, unknown>) ?? null
  );
  return {
    id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    category: (data.category as RoomCategory) ?? 'chill',
    hostId: String(data.hostId ?? ''),
    hostUsername: String(data.hostUsername ?? ''),
    participants,
    participantCount: participants.length,
    maxParticipants: Number(data.maxParticipants ?? 20),
    isPrivate: Boolean(data.isPrivate),
    createdAt: data.createdAt as string,
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

export function useFirebase() {
  const store = useAppStore();
  const cleanupFnsRef = useRef<(() => void)[]>([]);
  const roomCleanupFnsRef = useRef<(() => void)[]>([]);
  const currentRoomIdRef = useRef<string | null>(null);

  // Init user identity from localStorage, then start Firebase room listener
  useEffect(() => {
    let userId = localStorage.getItem('funflow_userId');
    let username = localStorage.getItem('funflow_username');
    let avatar = localStorage.getItem('funflow_avatar');

    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('funflow_userId', userId);
    }
    if (!username) {
      username = randomUsername();
      localStorage.setItem('funflow_username', username);
    }
    if (!avatar) {
      avatar = randomAvatar();
      localStorage.setItem('funflow_avatar', avatar);
    }

    store.setUserId(userId);
    store.setUsername(username);
    store.setAvatar(avatar);

    if (!isFirebaseConfigured()) {
      store.setIsConnected(false);
      return;
    }

    const db = getDb()!;
    const roomsRef = ref(db, 'rooms');
    const unsubRooms = onValue(roomsRef, (snapshot) => {
      store.setIsConnected(true);
      const data = snapshot.val() as Record<string, Record<string, unknown>> | null;
      if (!data) { store.setRooms([]); return; }
      const rooms: Room[] = Object.entries(data)
        .map(([id, roomData]) => parseRoom(id, roomData))
        .filter(r => !r.isPrivate);
      store.setRooms(rooms);
    }, () => {
      store.setIsConnected(false);
    });

    cleanupFnsRef.current.push(unsubRooms);
    return () => {
      cleanupFnsRef.current.forEach(fn => fn());
      cleanupFnsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setUsername = useCallback((username: string) => {
    localStorage.setItem('funflow_username', username);
    store.setUsername(username);
  }, [store]);

  const createRoom = useCallback(async (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants?: number;
    isPrivate?: boolean;
    tags?: string[];
  }) => {
    const db = getDb();
    if (!db || !store.userId) return;

    const newRoomRef = push(ref(db, 'rooms'));
    await set(newRoomRef, {
      name: data.name,
      description: data.description || '',
      category: data.category,
      hostId: store.userId,
      hostUsername: store.username,
      maxParticipants: data.maxParticipants ?? 20,
      isPrivate: data.isPrivate ?? false,
      tags: data.tags ?? [],
      createdAt: Date.now(),
    });

    await joinRoom(newRoomRef.key!);
  }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinRoom = useCallback(async (roomId: string) => {
    const db = getDb();
    if (!db || !store.userId) return;

    currentRoomIdRef.current = roomId;
    store.setMessages([]);

    // Write participant presence
    const participantRef = ref(db, `rooms/${roomId}/participants/${store.userId}`);
    await set(participantRef, {
      username: store.username,
      avatar: store.avatar,
      isMuted: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    });

    // Listen to full room (participants + meta)
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubRoom = onValue(roomRef, (snapshot) => {
      const data = snapshot.val() as Record<string, unknown> | null;
      if (!data) { store.setCurrentRoom(null); return; }
      store.setCurrentRoom(parseRoom(roomId, data));
    });
    roomCleanupFnsRef.current.push(unsubRoom);

    // Listen to chat messages
    const msgsRef = ref(db, `messages/${roomId}`);
    const unsubMsgs = onChildAdded(msgsRef, (snap) => {
      const data = snap.val() as Record<string, unknown> | null;
      if (!data) return;
      const message: Message = {
        id: snap.key!,
        userId: String(data.userId ?? ''),
        username: String(data.username ?? ''),
        avatar: String(data.avatar ?? '#7c3aed'),
        text: String(data.text ?? ''),
        timestamp: data.timestamp as string,
        reactions: Array.isArray(data.reactions)
          ? data.reactions
          : Object.values((data.reactions as Record<string, unknown>) ?? {}),
      };
      store.addMessage(message);
    });
    roomCleanupFnsRef.current.push(unsubMsgs);
  }, [store]);

  const leaveRoom = useCallback(async () => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    const userId = store.userId;

    roomCleanupFnsRef.current.forEach(fn => fn());
    roomCleanupFnsRef.current = [];

    if (db && userId && roomId) {
      await remove(ref(db, `rooms/${roomId}/participants/${userId}`));
      await remove(ref(db, `signaling/${roomId}/${userId}`));

      // Delete room if now empty
      const participantsRef = ref(db, `rooms/${roomId}/participants`);
      onValue(participantsRef, (snap) => {
        const data = snap.val();
        if (!data || Object.keys(data).length === 0) {
          remove(ref(db, `rooms/${roomId}`));
          remove(ref(db, `messages/${roomId}`));
          remove(ref(db, `signaling/${roomId}`));
        }
        off(participantsRef);
      }, { onlyOnce: true });
    }

    currentRoomIdRef.current = null;
    store.setCurrentRoom(null);
    store.setMessages([]);
  }, [store]);

  const sendMessage = useCallback(async (text: string) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;

    await push(ref(db, `messages/${roomId}`), {
      userId: store.userId,
      username: store.username,
      avatar: store.avatar,
      text,
      timestamp: Date.now(),
    });
  }, [store]);

  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;

    const reactionRef = ref(db, `messages/${roomId}/${messageId}/reactions/${emoji}`);
    onValue(reactionRef, (snap) => {
      const data = snap.val() as { count?: number; userIds?: string[] } | null;
      const userIds: string[] = data?.userIds ?? [];
      if (!userIds.includes(store.userId!)) {
        set(reactionRef, {
          emoji,
          count: (data?.count ?? 0) + 1,
          userIds: [...userIds, store.userId],
        });
      }
      off(reactionRef);
    }, { onlyOnce: true });
  }, [store]);

  const toggleMute = useCallback(async (isMuted: boolean) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;
    await update(ref(db, `rooms/${roomId}/participants/${store.userId}`), { isMuted });
  }, [store]);

  const setSpeaking = useCallback(async (isSpeaking: boolean) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;
    await update(ref(db, `rooms/${roomId}/participants/${store.userId}`), { isSpeaking });
  }, [store]);

  // WebRTC signaling — send side
  const sendWebRTCOffer = useCallback(async (targetId: string, offer: RTCSessionDescriptionInit) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;
    await set(ref(db, `signaling/${roomId}/${targetId}/${store.userId}/offer`), offer);
  }, [store]);

  const sendWebRTCAnswer = useCallback(async (targetId: string, answer: RTCSessionDescriptionInit) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;
    await set(ref(db, `signaling/${roomId}/${targetId}/${store.userId}/answer`), answer);
  }, [store]);

  const sendIceCandidate = useCallback(async (targetId: string, candidate: RTCIceCandidateInit) => {
    const db = getDb();
    const roomId = currentRoomIdRef.current;
    if (!db || !roomId || !store.userId) return;
    await push(ref(db, `signaling/${roomId}/${targetId}/${store.userId}/candidates`), candidate);
  }, [store]);

  // WebRTC signaling — receive side (called from Room)
  const listenToSignals = useCallback((
    roomId: string,
    userId: string,
    callbacks: {
      onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
      onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
      onIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => void;
    }
  ): (() => void) => {
    const db = getDb();
    if (!db) return () => {};

    const peerUnsubs: (() => void)[] = [];

    // Listen for any peer that opens a signaling channel to us
    const mySignalingRef = ref(db, `signaling/${roomId}/${userId}`);
    const unsubPeers = onChildAdded(mySignalingRef, (peerSnap) => {
      const fromId = peerSnap.key!;

      const offerRef = ref(db, `signaling/${roomId}/${userId}/${fromId}/offer`);
      const unsubOffer = onValue(offerRef, (snap) => {
        const v = snap.val();
        if (v) callbacks.onOffer(fromId, v as RTCSessionDescriptionInit);
      });

      const answerRef = ref(db, `signaling/${roomId}/${userId}/${fromId}/answer`);
      const unsubAnswer = onValue(answerRef, (snap) => {
        const v = snap.val();
        if (v) callbacks.onAnswer(fromId, v as RTCSessionDescriptionInit);
      });

      const candidatesRef = ref(db, `signaling/${roomId}/${userId}/${fromId}/candidates`);
      const unsubCandidates = onChildAdded(candidatesRef, (snap) => {
        const v = snap.val();
        if (v) callbacks.onIceCandidate(fromId, v as RTCIceCandidateInit);
      });

      peerUnsubs.push(unsubOffer, unsubAnswer, unsubCandidates);
    });

    return () => {
      unsubPeers();
      peerUnsubs.forEach(fn => fn());
    };
  }, []);

  return {
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
    listenToSignals,
  };
}
