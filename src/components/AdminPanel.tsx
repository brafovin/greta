import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, MicOff, Mic, Shield, Eye, LogOut } from 'lucide-react';
import { getSupabase } from '../supabase';
import { useAppStore } from '../store/useAppStore';
import { Room, Participant, RoomCategory } from '../types';
import clsx from 'clsx';

const ADMIN_PASSWORD = '0001';

type DbParticipant = {
  room_id: string; user_id: string; username: string; avatar: string;
  is_muted: boolean; is_speaking: boolean; joined_at: string;
};
type DbRoom = {
  id: string; name: string; description: string; category: string;
  host_id: string; host_username: string; max_participants: number;
  is_private: boolean; tags: string[]; created_at: string;
};

function toParticipant(p: DbParticipant): Participant {
  return { id: p.user_id, username: p.username, avatar: p.avatar,
    isMuted: p.is_muted, isSpeaking: p.is_speaking, joinedAt: p.joined_at };
}
function toRoom(r: DbRoom, participants: Participant[]): Room {
  return { id: r.id, name: r.name, description: r.description ?? '',
    category: r.category as RoomCategory, hostId: r.host_id,
    hostUsername: r.host_username, participants, participantCount: participants.length,
    maxParticipants: r.max_participants, isPrivate: r.is_private,
    createdAt: r.created_at, tags: r.tags ?? [] };
}

interface AdminPanelProps {
  onClose: () => void;
  currentUserId: string | null;
}

export function AdminPanel({ onClose, currentUserId }: AdminPanelProps) {
  const { isAdmin, setIsAdmin } = useAppStore();
  const unlocked = isAdmin;
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const fetchAllRooms = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);

    const { data: roomsData } = await supabase
      .from('rooms').select('*').order('created_at', { ascending: false });

    if (!roomsData) { setLoading(false); return; }

    const { data: participantsData } = await supabase
      .from('participants').select('*')
      .in('room_id', roomsData.map(r => r.id));

    const byRoom = new Map<string, Participant[]>();
    (participantsData ?? []).forEach((p: DbParticipant) => {
      const list = byRoom.get(p.room_id) ?? [];
      list.push(toParticipant(p));
      byRoom.set(p.room_id, list);
    });

    setRooms(roomsData.map((r: DbRoom) => toRoom(r, byRoom.get(r.id) ?? [])));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) fetchAllRooms();
  }, [unlocked, fetchAllRooms]);

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleLockAdmin = () => {
    setIsAdmin(false);
    onClose();
  };

  const handleDeleteRoom = async (roomId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('messages').delete().eq('room_id', roomId);
    await supabase.from('participants').delete().eq('room_id', roomId);
    await supabase.from('rooms').delete().eq('id', roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const handleToggleMute = async (roomId: string, userId: string, currentlyMuted: boolean) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('participants')
      .update({ is_muted: !currentlyMuted })
      .eq('room_id', roomId).eq('user_id', userId);
    // Update local state
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        participants: r.participants.map(p =>
          p.id === userId ? { ...p, isMuted: !currentlyMuted } : p
        ),
      };
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-sm">Admin Panel</h2>
            <p className="text-white/30 text-xs">Raumverwaltung</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {!unlocked ? (
            /* Password gate */
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white mb-1">Gesicherter Bereich</h3>
                <p className="text-white/40 text-sm">Bitte gib das Admin-Passwort ein</p>
              </div>
              <div className="w-full max-w-xs flex flex-col gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Passwort"
                  autoFocus
                  className={clsx(
                    'input-field text-center tracking-widest',
                    error && 'border-red-500/50 bg-red-500/10',
                  )}
                />
                {error && (
                  <p className="text-red-400 text-xs text-center">Falsches Passwort</p>
                )}
                <button onClick={handleUnlock} className="btn-primary w-full">
                  Entsperren
                </button>
              </div>
            </div>
          ) : (
            /* Admin dashboard */
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs">{rooms.length} Räume gesamt</p>
                <div className="flex items-center gap-3">
                  <button onClick={fetchAllRooms} className="text-xs text-purple-400 hover:text-purple-300">
                    Aktualisieren
                  </button>
                  <button
                    onClick={handleLockAdmin}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                    title="Admin-Modus verlassen"
                  >
                    <LogOut className="w-3 h-3" />
                    Admin verlassen
                  </button>
                </div>
              </div>
              <p className="text-white/30 text-[11px] -mt-1 mb-1">
                Als Admin kannst du in jedem Raum Chat-Nachrichten bearbeiten und löschen.
              </p>

              {loading && (
                <div className="text-center py-8 text-white/30 text-sm">Lade Räume…</div>
              )}

              {!loading && rooms.length === 0 && (
                <div className="text-center py-8 text-white/30 text-sm">Keine Räume vorhanden</div>
              )}

              {rooms.map(room => (
                <div key={room.id} className="bg-white/5 border border-white/8 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">{room.name}</span>
                        {room.isPrivate && (
                          <span className="text-xs text-white/40 bg-white/8 rounded-full px-1.5 py-0.5">privat</span>
                        )}
                      </div>
                      <p className="text-white/30 text-xs">
                        {room.participantCount}/{room.maxParticipants} · von {room.hostUsername}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                      className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Participant list */}
                  {expandedRoom === room.id && room.participants.length > 0 && (
                    <div className="border-t border-white/5 px-4 py-2 space-y-1.5">
                      {room.participants.map(p => (
                        <div key={p.id} className="flex items-center gap-2.5 py-1">
                          <div
                            style={{ background: p.avatar }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          >
                            {p.username.slice(0, 1).toUpperCase()}
                          </div>
                          <span className={clsx(
                            'flex-1 text-sm',
                            p.id === currentUserId ? 'text-purple-300 font-medium' : 'text-white/70',
                          )}>
                            {p.username}
                            {p.id === currentUserId && ' (du)'}
                          </span>
                          {p.isSpeaking && (
                            <span className="text-xs text-green-400">spricht</span>
                          )}
                          <button
                            onClick={() => handleToggleMute(room.id, p.id, p.isMuted)}
                            disabled={p.id === currentUserId}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1',
                              p.isMuted
                                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10',
                              p.id === currentUserId && 'opacity-40 cursor-not-allowed',
                            )}
                            title={p.isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}
                          >
                            {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedRoom === room.id && room.participants.length === 0 && (
                    <div className="border-t border-white/5 px-4 py-2">
                      <p className="text-white/20 text-xs">Keine Teilnehmer</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
