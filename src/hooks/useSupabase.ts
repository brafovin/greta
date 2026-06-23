import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../supabase';
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

type DbParticipant = {
  room_id: string; user_id: string; username: string; avatar: string;
  is_muted: boolean; is_speaking: boolean; joined_at: string;
};
type DbRoom = {
  id: string; name: string; description: string; category: string;
  host_id: string; host_username: string; max_participants: number;
  is_private: boolean; tags: string[]; created_at: string;
};
type DbMessage = {
  id: string; room_id: string; user_id: string; username: string;
  avatar: string; text: string; reactions: Record<string, unknown>; created_at: string;
};
type PresencePayload = {
  userId: string; username: string; avatar: string;
  isMuted: boolean; isSpeaking: boolean;
};

function toParticipant(p: DbParticipant): Participant {
  return { id: p.user_id, username: p.username, avatar: p.avatar,
    isMuted: p.is_muted, isSpeaking: p.is_speaking, joinedAt: p.joined_at };
}
function toRoom(r: DbRoom, participants: Participant[]): Room {
  return { id: r.id, name: r.name, description: r.description ?? '',
    category: r.category as Room['category'], hostId: r.host_id,
    hostUsername: r.host_username, participants, participantCount: participants.length,
    maxParticipants: r.max_participants, isPrivate: r.is_private,
    createdAt: r.created_at, tags: r.tags ?? [] };
}
function toMessage(m: DbMessage): Message {
  const reactions = m.reactions && !Array.isArray(m.reactions)
    ? Object.values(m.reactions) : [];
  return { id: m.id, userId: m.user_id, username: m.username, avatar: m.avatar,
    text: m.text, timestamp: m.created_at, reactions: reactions as Message['reactions'] };
}

export function useSupabase() {
  const store = useAppStore();
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const usernameRef = useRef<string>('');
  const avatarRef = useRef<string>('#7c3aed');
  const speakingRef = useRef<boolean>(false);
  const signalCallbacksRef = useRef<{
    onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
    onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
    onIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => void;
  } | null>(null);

  async function fetchRooms() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: roomsData } = await supabase
      .from('rooms').select('*').eq('is_private', false)
      .order('created_at', { ascending: false });
    if (!roomsData) { store.setRooms([]); return; }

    const { data: participantsData } = await supabase
      .from('participants').select('*').in('room_id', roomsData.map(r => r.id));

    const byRoom = new Map<string, Participant[]>();
    (participantsData ?? []).forEach((p: DbParticipant) => {
      const list = byRoom.get(p.room_id) ?? [];
      list.push(toParticipant(p));
      byRoom.set(p.room_id, list);
    });
    store.setRooms(roomsData.map((r: DbRoom) => toRoom(r, byRoom.get(r.id) ?? [])));
    store.setIsConnected(true);
  }

  useEffect(() => {
    // Restore or generate identity
    let userId = localStorage.getItem('funflow_userId');
    let username = localStorage.getItem('funflow_username');
    let avatar = localStorage.getItem('funflow_avatar');
    if (!userId) { userId = crypto.randomUUID(); localStorage.setItem('funflow_userId', userId); }
    if (!username) { username = randomUsername(); localStorage.setItem('funflow_username', username); }
    if (!avatar) { avatar = randomAvatar(); localStorage.setItem('funflow_avatar', avatar); }

    userIdRef.current = userId;
    usernameRef.current = username;
    avatarRef.current = avatar;
    store.setUserId(userId);
    store.setUsername(username);
    store.setAvatar(avatar);

    if (!isSupabaseConfigured()) {
      store.setIsConnected(false);
      return;
    }

    fetchRooms();

    const supabase = getSupabase()!;
    const ch = supabase.channel('lobby-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, fetchRooms)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') store.setIsConnected(true);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') store.setIsConnected(false);
      });
    lobbyChannelRef.current = ch;

    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setUsername = useCallback((username: string) => {
    localStorage.setItem('funflow_username', username);
    usernameRef.current = username;
    store.setUsername(username);
  }, [store]);

  const createRoom = useCallback(async (data: {
    name: string; description: string; category: RoomCategory;
    maxParticipants?: number; isPrivate?: boolean; tags?: string[];
  }) => {
    const supabase = getSupabase();
    if (!supabase || !userIdRef.current) return;
    const { data: room, error } = await supabase.from('rooms').insert({
      name: data.name, description: data.description || '',
      category: data.category, host_id: userIdRef.current,
      host_username: usernameRef.current,
      max_participants: data.maxParticipants ?? 20,
      is_private: data.isPrivate ?? false, tags: data.tags ?? [],
    }).select().single();
    if (error || !room) { console.error('createRoom failed', error); return; }
    await joinRoom(room.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const joinRoom = useCallback(async (roomId: string) => {
    const supabase = getSupabase();
    if (!supabase || !userIdRef.current) return;

    currentRoomIdRef.current = roomId;
    store.setMessages([]);

    // Clean stale participants from all rooms
    supabase.from('participants')
      .delete().lt('last_heartbeat', new Date(Date.now() - 90_000).toISOString())
      .then(() => {});

    await supabase.from('participants').upsert({
      room_id: roomId, user_id: userIdRef.current,
      username: usernameRef.current, avatar: avatarRef.current,
      is_muted: false, is_speaking: false,
      last_heartbeat: new Date().toISOString(),
    });

    const [{ data: roomData }, { data: participantsData }, { data: messagesData }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('participants').select('*').eq('room_id', roomId),
      supabase.from('messages').select('*').eq('room_id', roomId)
        .order('created_at', { ascending: true }).limit(100),
    ]);

    if (roomData) {
      store.setCurrentRoom(toRoom(roomData as DbRoom,
        (participantsData ?? []).map((p: DbParticipant) => toParticipant(p))));
    }
    (messagesData ?? []).forEach((m: DbMessage) => store.addMessage(toMessage(m)));

    const sb = supabase!;

    // Helper: refresh room state from DB
    async function refreshRoom() {
      const [{ data: rData }, { data: pData }] = await Promise.all([
        sb.from('rooms').select('*').eq('id', roomId).single(),
        sb.from('participants').select('*').eq('room_id', roomId),
      ]);
      if (!rData) {
        // Room was deleted (e.g. by admin)
        roomChannelRef.current?.untrack();
        currentRoomIdRef.current = null;
        store.setCurrentRoom(null);
        store.setMessages([]);
        return;
      }
      const participants = (pData ?? []).map((p: DbParticipant) => toParticipant(p));
      // Kicked by admin: our row was deleted
      if (!participants.some(p => p.id === userIdRef.current)) {
        roomChannelRef.current?.untrack();
        currentRoomIdRef.current = null;
        store.setCurrentRoom(null);
        store.setMessages([]);
        return;
      }
      store.setCurrentRoom(toRoom(rData as DbRoom, participants));
    }

    // Helper: clean up after someone leaves
    async function cleanupAfterLeave(leftUserId: string) {
      if (!currentRoomIdRef.current) return;
      await sb.from('participants').delete()
        .eq('room_id', roomId).eq('user_id', leftUserId);
      const { data: remaining } = await sb
        .from('participants').select('user_id').eq('room_id', roomId);
      if (!remaining || remaining.length === 0) {
        await sb.from('messages').delete().eq('room_id', roomId);
        await sb.from('rooms').delete().eq('id', roomId);
      }
    }

    const ch = supabase.channel(`room:${roomId}`)
      // ── Presence: detect disconnects (tab closed, network lost) ──────────
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const p of (leftPresences as unknown as PresencePayload[])) {
          if (p.userId && p.userId !== userIdRef.current) {
            cleanupAfterLeave(p.userId);
          }
        }
      })
      // ── Participants table: mute/speak updates + admin kicks ──────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants',
        filter: `room_id=eq.${roomId}` }, refreshRoom)
      // ── Messages ─────────────────────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${roomId}` }, (payload) => {
        store.addMessage(toMessage(payload.new as DbMessage));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${roomId}` }, (payload) => {
        store.updateMessage(toMessage(payload.new as DbMessage));
      })
      // ── WebRTC signaling ─────────────────────────────────────────────────
      .on('broadcast', { event: 'webrtc' }, ({ payload }) => {
        const { type, fromId, toId, data } = payload as {
          type: string; fromId: string; toId: string; data: unknown;
        };
        if (toId !== userIdRef.current) return;
        const cbs = signalCallbacksRef.current;
        if (!cbs) return;
        if (type === 'offer') cbs.onOffer(fromId, data as RTCSessionDescriptionInit);
        if (type === 'answer') cbs.onAnswer(fromId, data as RTCSessionDescriptionInit);
        if (type === 'ice') cbs.onIceCandidate(fromId, data as RTCIceCandidateInit);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence — server auto-removes it on disconnect
          ch.track({
            userId: userIdRef.current,
            username: usernameRef.current,
            avatar: avatarRef.current,
            isMuted: false,
            isSpeaking: false,
          } as PresencePayload);
        }
      });

    roomChannelRef.current = ch;
  }, [store]);

  const leaveRoom = useCallback(async () => {
    const supabase = getSupabase();
    const roomId = currentRoomIdRef.current;
    const userId = userIdRef.current;

    // Untrack presence first so other clients get the leave event
    if (roomChannelRef.current) {
      await roomChannelRef.current.untrack();
      supabase?.removeChannel(roomChannelRef.current);
      roomChannelRef.current = null;
    }

    if (supabase && userId && roomId) {
      await supabase.from('participants').delete()
        .eq('room_id', roomId).eq('user_id', userId);
      const { data: remaining } = await supabase
        .from('participants').select('user_id').eq('room_id', roomId);
      if (!remaining || remaining.length === 0) {
        await supabase.from('messages').delete().eq('room_id', roomId);
        await supabase.from('rooms').delete().eq('id', roomId);
      }
    }

    signalCallbacksRef.current = null;
    currentRoomIdRef.current = null;
    store.setCurrentRoom(null);
    store.setMessages([]);
  }, [store]);

  const sendMessage = useCallback(async (text: string) => {
    const supabase = getSupabase();
    const roomId = currentRoomIdRef.current;
    if (!supabase || !roomId || !userIdRef.current) return;
    await supabase.from('messages').insert({
      room_id: roomId, user_id: userIdRef.current,
      username: usernameRef.current, avatar: avatarRef.current, text, reactions: {},
    });
  }, []);

  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    const supabase = getSupabase();
    if (!supabase || !userIdRef.current) return;
    const { data: msg } = await supabase
      .from('messages').select('reactions').eq('id', messageId).single();
    if (!msg) return;
    type R = { emoji: string; count: number; userIds: string[] };
    const reactions = (msg.reactions as Record<string, R>) ?? {};
    const existing: R = reactions[emoji] ?? { emoji, count: 0, userIds: [] };
    if (!existing.userIds.includes(userIdRef.current)) {
      await supabase.from('messages').update({
        reactions: { ...reactions, [emoji]: {
          ...existing, count: existing.count + 1,
          userIds: [...existing.userIds, userIdRef.current],
        }},
      }).eq('id', messageId);
    }
  }, []);

  const toggleMute = useCallback(async (isMuted: boolean) => {
    const supabase = getSupabase();
    const roomId = currentRoomIdRef.current;
    if (!supabase || !roomId || !userIdRef.current) return;
    await supabase.from('participants').update({ is_muted: isMuted })
      .eq('room_id', roomId).eq('user_id', userIdRef.current);
    // Keep presence in sync
    roomChannelRef.current?.track({
      userId: userIdRef.current, username: usernameRef.current,
      avatar: avatarRef.current, isMuted, isSpeaking: speakingRef.current,
    } as PresencePayload);
  }, []);

  const setSpeaking = useCallback(async (isSpeaking: boolean) => {
    if (speakingRef.current === isSpeaking) return;
    speakingRef.current = isSpeaking;
    const supabase = getSupabase();
    const roomId = currentRoomIdRef.current;
    if (!supabase || !roomId || !userIdRef.current) return;
    await supabase.from('participants').update({ is_speaking: isSpeaking })
      .eq('room_id', roomId).eq('user_id', userIdRef.current);
  }, []);

  const sendWebRTCOffer = useCallback(async (targetId: string, offer: RTCSessionDescriptionInit) => {
    const ch = roomChannelRef.current;
    if (!ch || !userIdRef.current) return;
    await ch.send({ type: 'broadcast', event: 'webrtc',
      payload: { type: 'offer', fromId: userIdRef.current, toId: targetId, data: offer } });
  }, []);

  const sendWebRTCAnswer = useCallback(async (targetId: string, answer: RTCSessionDescriptionInit) => {
    const ch = roomChannelRef.current;
    if (!ch || !userIdRef.current) return;
    await ch.send({ type: 'broadcast', event: 'webrtc',
      payload: { type: 'answer', fromId: userIdRef.current, toId: targetId, data: answer } });
  }, []);

  const sendIceCandidate = useCallback(async (targetId: string, candidate: RTCIceCandidateInit) => {
    const ch = roomChannelRef.current;
    if (!ch || !userIdRef.current) return;
    await ch.send({ type: 'broadcast', event: 'webrtc',
      payload: { type: 'ice', fromId: userIdRef.current, toId: targetId, data: candidate } });
  }, []);

  const listenToSignals = useCallback((
    _roomId: string, _userId: string,
    callbacks: {
      onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
      onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
      onIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => void;
    },
  ): (() => void) => {
    signalCallbacksRef.current = callbacks;
    return () => { signalCallbacksRef.current = null; };
  }, []);

  return {
    setUsername, createRoom, joinRoom, leaveRoom,
    sendMessage, sendReaction, toggleMute, setSpeaking,
    sendWebRTCOffer, sendWebRTCAnswer, sendIceCandidate, listenToSignals,
  };
}
