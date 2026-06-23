import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Shield, Eye, LogOut, Users, Ban as BanIcon, DoorOpen, ShieldCheck } from 'lucide-react';
import { getSupabase } from '../supabase';
import { useAppStore } from '../store/useAppStore';
import { ModerationMenu } from './ModerationMenu';
import { Room, Participant, Ban, RoomCategory } from '../types';
import clsx from 'clsx';

const ADMIN_PASSWORD = '0001';

type DbParticipant = {
  room_id: string; user_id: string; username: string; avatar: string;
  is_muted: boolean; is_speaking: boolean; joined_at: string; account_type?: string;
};
type DbRoom = {
  id: string; name: string; description: string; category: string;
  host_id: string; host_username: string; max_participants: number;
  is_private: boolean; tags: string[]; created_at: string;
};
type DbBan = {
  user_id: string; username: string; reason: string;
  banned_by: string; banned_at: string; expires_at: string | null;
};

function toParticipant(p: DbParticipant): Participant {
  return { id: p.user_id, username: p.username, avatar: p.avatar,
    isMuted: p.is_muted, isSpeaking: p.is_speaking, joinedAt: p.joined_at,
    accountType: (p.account_type as 'guest' | 'email') ?? 'guest' };
}
function toRoom(r: DbRoom, participants: Participant[]): Room {
  return { id: r.id, name: r.name, description: r.description ?? '',
    category: r.category as RoomCategory, hostId: r.host_id,
    hostUsername: r.host_username, participants, participantCount: participants.length,
    maxParticipants: r.max_participants, isPrivate: r.is_private,
    createdAt: r.created_at, tags: r.tags ?? [] };
}
function toBan(b: DbBan): Ban {
  return { userId: b.user_id, username: b.username, reason: b.reason,
    bannedBy: b.banned_by, bannedAt: b.banned_at, expiresAt: b.expires_at };
}
function banActive(b: DbBan): boolean {
  return !b.expires_at || new Date(b.expires_at).getTime() > Date.now();
}

interface AdminPanelProps {
  onClose: () => void;
  currentUserId: string | null;
}

type Tab = 'rooms' | 'users' | 'bans';

export function AdminPanel({ onClose, currentUserId }: AdminPanelProps) {
  const { isAdmin, setIsAdmin, username } = useAppStore();
  const unlocked = isAdmin;
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('rooms');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<Participant[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [moderating, setModerating] = useState<Participant | null>(null);

  const bannedIds = new Set(bans.map(b => b.userId));

  const fetchAll = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);

    const [{ data: roomsData }, { data: parts }, { data: bansData }] = await Promise.all([
      supabase.from('rooms').select('*').order('created_at', { ascending: false }),
      supabase.from('participants').select('*'),
      supabase.from('bans').select('*').order('banned_at', { ascending: false }),
    ]);

    const roomNames = new Map<string, string>((roomsData ?? []).map((r: DbRoom) => [r.id, r.name]));
    const byRoom = new Map<string, Participant[]>();
    const byUser = new Map<string, Participant>();
    (parts ?? []).forEach((p: DbParticipant) => {
      const list = byRoom.get(p.room_id) ?? [];
      list.push(toParticipant(p));
      byRoom.set(p.room_id, list);
      byUser.set(p.user_id, { ...toParticipant(p), roomId: p.room_id, roomName: roomNames.get(p.room_id) ?? '—' });
    });

    setRooms((roomsData ?? []).map((r: DbRoom) => toRoom(r, byRoom.get(r.id) ?? [])));
    setUsers(Array.from(byUser.values()));
    setBans((bansData ?? []).filter(banActive).map(toBan));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (unlocked) fetchAll();
  }, [unlocked, fetchAll]);

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) { setIsAdmin(true); setError(false); }
    else { setError(true); setPassword(''); }
  };

  const handleLockAdmin = () => { setIsAdmin(false); onClose(); };

  const handleDeleteRoom = async (roomId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('messages').delete().eq('room_id', roomId);
    await supabase.from('participants').delete().eq('room_id', roomId);
    await supabase.from('rooms').delete().eq('id', roomId);
    fetchAll();
  };

  // ── Moderation (direct DB, mirrors useSupabase) ──
  const doMute = async (userId: string, muted: boolean) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('participants').update({ is_muted: muted }).eq('user_id', userId);
    fetchAll();
  };
  const doKick = async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('participants').delete().eq('user_id', userId);
    fetchAll();
  };
  const doBan = async (userId: string, uname: string, minutes?: number) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const expires_at = minutes && minutes > 0
      ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    await supabase.from('bans').upsert({
      user_id: userId, username: uname, reason: '',
      banned_by: username, banned_at: new Date().toISOString(), expires_at,
    });
    await supabase.from('participants').delete().eq('user_id', userId);
    fetchAll();
  };
  const doUnban = async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('bans').delete().eq('user_id', userId);
    fetchAll();
  };

  const TabBtn = ({ id, icon, label }: { id: Tab; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={clsx(
        'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2',
        tab === id ? 'text-purple-300 border-purple-500' : 'text-white/40 border-transparent hover:text-white/60',
      )}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white text-sm">Admin Panel</h2>
            <p className="text-white/30 text-xs">Moderation &amp; Verwaltung</p>
          </div>
          {unlocked && (
            <button onClick={handleLockAdmin} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mr-1" title="Admin-Modus verlassen">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin verlassen</span>
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

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
                className={clsx('input-field text-center tracking-widest', error && 'border-red-500/50 bg-red-500/10')}
              />
              {error && <p className="text-red-400 text-xs text-center">Falsches Passwort</p>}
              <button onClick={handleUnlock} className="btn-primary w-full">Entsperren</button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <TabBtn id="rooms" icon={<DoorOpen className="w-3.5 h-3.5" />} label={`Räume (${rooms.length})`} />
              <TabBtn id="users" icon={<Users className="w-3.5 h-3.5" />} label={`Nutzer (${users.length})`} />
              <TabBtn id="bans" icon={<BanIcon className="w-3.5 h-3.5" />} label={`Bans (${bans.length})`} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between -mb-1">
                <p className="text-white/30 text-[11px]">Tippe auf einen Nutzer für Moderationsaktionen.</p>
                <button onClick={fetchAll} className="text-xs text-purple-400 hover:text-purple-300">Aktualisieren</button>
              </div>

              {loading && <div className="text-center py-8 text-white/30 text-sm">Lädt…</div>}

              {/* ── Rooms tab ── */}
              {!loading && tab === 'rooms' && (
                rooms.length === 0
                  ? <div className="text-center py-8 text-white/30 text-sm">Keine Räume vorhanden</div>
                  : rooms.map(room => (
                    <div key={room.id} className="bg-white/5 border border-white/8 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm truncate">{room.name}</span>
                            {room.isPrivate && <span className="text-xs text-white/40 bg-white/8 rounded-full px-1.5 py-0.5">privat</span>}
                          </div>
                          <p className="text-white/30 text-xs">{room.participantCount}/{room.maxParticipants} · von {room.hostUsername}</p>
                        </div>
                        <button onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)} className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Raum löschen">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {expandedRoom === room.id && (
                        <div className="border-t border-white/5 px-4 py-2 space-y-1">
                          {room.participants.length === 0 && <p className="text-white/20 text-xs py-1">Keine Teilnehmer</p>}
                          {room.participants.map(p => (
                            <button
                              key={p.id}
                              onClick={() => p.id !== currentUserId && setModerating({ ...p, roomId: room.id, roomName: room.name })}
                              disabled={p.id === currentUserId}
                              className={clsx(
                                'w-full flex items-center gap-2.5 py-1.5 px-1 rounded-lg transition-colors text-left',
                                p.id === currentUserId ? 'opacity-60 cursor-default' : 'hover:bg-white/5',
                              )}
                            >
                              <div style={{ background: p.avatar }} className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {p.username.slice(0, 1).toUpperCase()}
                              </div>
                              <span className={clsx('flex-1 text-sm truncate', p.id === currentUserId ? 'text-purple-300' : 'text-white/70')}>
                                {p.username}{p.id === currentUserId && ' (du)'}
                              </span>
                              {p.isMuted && <span className="text-[10px] text-yellow-400">stumm</span>}
                              {p.isSpeaking && <span className="text-[10px] text-green-400">spricht</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}

              {/* ── Users tab ── */}
              {!loading && tab === 'users' && (
                users.length === 0
                  ? <div className="text-center py-8 text-white/30 text-sm">Niemand online</div>
                  : users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => u.id !== currentUserId && setModerating(u)}
                      disabled={u.id === currentUserId}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-left transition-colors',
                        u.id === currentUserId ? 'opacity-60 cursor-default' : 'hover:bg-white/10',
                      )}
                    >
                      <div style={{ background: u.avatar }} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {u.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{u.username}{u.id === currentUserId && ' (du)'}</p>
                        <p className="text-white/30 text-xs truncate">
                          {u.accountType === 'email' ? 'Registriert' : 'Gast'} · {u.roomName}
                        </p>
                      </div>
                      {u.isMuted && <span className="text-[10px] text-yellow-400">stumm</span>}
                    </button>
                  ))
              )}

              {/* ── Bans tab ── */}
              {!loading && tab === 'bans' && (
                bans.length === 0
                  ? <div className="text-center py-8 text-white/30 text-sm">Keine aktiven Bans</div>
                  : bans.map(b => (
                    <div key={b.userId} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/8 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <BanIcon className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{b.username || b.userId}</p>
                        <p className="text-white/30 text-xs">
                          {b.expiresAt ? `Timeout bis ${new Date(b.expiresAt).toLocaleString()}` : 'Permanent'}
                        </p>
                      </div>
                      <button
                        onClick={() => doUnban(b.userId)}
                        className="flex items-center gap-1 text-xs text-green-400 hover:bg-green-500/10 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Entbannen
                      </button>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </div>

      {moderating && (
        <ModerationMenu
          participant={moderating}
          isBanned={bannedIds.has(moderating.id)}
          onClose={() => setModerating(null)}
          onMute={(muted) => doMute(moderating.id, muted)}
          onKick={() => doKick(moderating.id)}
          onTimeout={(minutes) => doBan(moderating.id, moderating.username, minutes)}
          onBan={() => doBan(moderating.id, moderating.username)}
          onUnban={() => doUnban(moderating.id)}
        />
      )}
    </div>
  );
}
