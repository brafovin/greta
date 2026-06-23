import { useState } from 'react';
import { Plus, Users, Search, TrendingUp, WifiOff, Loader2, Settings } from 'lucide-react';
import { Room, RoomCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import { CreateRoomModal } from './CreateRoomModal';
import { useAppStore } from '../store/useAppStore';
import { isFirebaseConfigured } from '../firebase';
import clsx from 'clsx';

interface LobbyProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants: number;
    isPrivate: boolean;
    tags: string[];
  }) => void;
}

const ALL_CATEGORIES: (RoomCategory | 'all')[] = ['all', 'gaming', 'music', 'talk', 'chill', 'art', 'tech'];
const CATEGORY_FILTER_LABELS: Record<string, string> = {
  all: '✨ All',
  ...Object.fromEntries(Object.entries(CATEGORY_LABELS)),
};

function RoomCard({ room, onJoin }: { room: Room; onJoin: () => void }) {
  const isFull = room.participantCount >= room.maxParticipants;

  return (
    <div className={clsx(
      'card p-5 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/10',
      'transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group',
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full border', CATEGORY_COLORS[room.category])}>
          {CATEGORY_LABELS[room.category]}
        </span>
        <div className={clsx('flex items-center gap-1 text-xs', isFull ? 'text-red-400' : 'text-white/40')}>
          <Users className="w-3.5 h-3.5" />
          <span>{room.participantCount}/{room.maxParticipants}</span>
        </div>
      </div>

      <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-purple-300 transition-colors line-clamp-1">
        {room.name}
      </h3>

      {room.description && (
        <p className="text-white/40 text-sm mb-3 line-clamp-2 leading-relaxed">{room.description}</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {room.participants.slice(0, 4).map((p, i) => (
            <div
              key={p.id}
              style={{ zIndex: 4 - i, background: p.avatar }}
              className="w-6 h-6 rounded-full border-2 border-[#111118] flex items-center justify-center text-[9px] font-bold text-white"
            >
              {p.username.slice(0, 1).toUpperCase()}
            </div>
          ))}
          {room.participantCount > 4 && (
            <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#111118] flex items-center justify-center text-[9px] text-white/60">
              +{room.participantCount - 4}
            </div>
          )}
        </div>
        <span className="text-white/30 text-xs">
          by <span className="text-white/50">{room.hostUsername}</span>
        </span>
      </div>

      {room.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {room.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">#{tag}</span>
          ))}
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onJoin(); }}
        disabled={isFull}
        className={clsx(
          'w-full py-2 rounded-xl text-sm font-semibold transition-all',
          isFull ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'btn-primary',
        )}
      >
        {isFull ? 'Room Full' : 'Join Room'}
      </button>
    </div>
  );
}

export function Lobby({ onJoinRoom, onCreateRoom }: LobbyProps) {
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { rooms, isConnected, isConnecting } = useAppStore();
  const configured = isFirebaseConfigured();

  const filtered = rooms.filter(room => {
    const matchesCategory = selectedCategory === 'all' || room.category === selectedCategory;
    const matchesSearch = !searchQuery || [room.name, room.description, room.hostUsername, ...room.tags]
      .some(s => s?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCreate = (data: Parameters<typeof onCreateRoom>[0]) => {
    onCreateRoom(data);
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] pb-20">
      {/* Connection status banners */}
      {!configured && (
        <div className="flex items-start gap-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-sm py-3 px-4">
          <Settings className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Firebase not configured.</strong> Add your Firebase env vars to Vercel to enable real-time rooms and voice chat.{' '}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-200"
            >
              Create a free Firebase project →
            </a>
          </span>
        </div>
      )}
      {configured && isConnecting && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-sm py-2 px-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting to Firebase…</span>
        </div>
      )}
      {configured && !isConnecting && !isConnected && (
        <div className="flex items-center justify-center gap-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm py-2 px-4">
          <WifiOff className="w-4 h-4" />
          <span>Connection lost. Check your Firebase configuration.</span>
        </div>
      )}

      {/* Hero */}
      <div className="px-6 py-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-300 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            <span>{rooms.length} live rooms</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Where{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">Fun</span>
            {' '}Meets{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Connection</span>
          </h1>
          <p className="text-white/50 text-lg max-w-lg mx-auto">
            Join live voice rooms with people who share your vibe. Talk, laugh, play.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search rooms..."
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0',
                selectedCategory === cat
                  ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:text-white/70',
              )}
            >
              {CATEGORY_FILTER_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Room grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌊</div>
            <h3 className="text-xl font-semibold text-white/60 mb-2">
              {rooms.length === 0 ? 'No rooms yet' : 'No rooms match your search'}
            </h3>
            <p className="text-white/30 mb-6">
              {rooms.length === 0 ? 'Be the first to create a room!' : 'Try a different category or search term'}
            </p>
            {rooms.length === 0 && isConnected && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Create the first room
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(room => (
              <RoomCard key={room.id} room={room} onJoin={() => onJoinRoom(room.id)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {isConnected && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 btn-primary flex items-center gap-2 shadow-2xl shadow-purple-900/50"
        >
          <Plus className="w-5 h-5" />
          <span>Create Room</span>
        </button>
      )}

      {showCreateModal && (
        <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
