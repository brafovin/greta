import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { RoomCategory, CATEGORY_LABELS } from '../types';
import clsx from 'clsx';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants: number;
    isPrivate: boolean;
    tags: string[];
  }) => void;
}

const CATEGORIES: RoomCategory[] = ['gaming', 'music', 'talk', 'chill', 'art', 'tech'];

export function CreateRoomModal({ onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RoomCategory>('talk');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [isPrivate, setIsPrivate] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), category, maxParticipants, isPrivate, tags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative card w-full max-w-lg animate-slide-up p-6 shadow-2xl shadow-black/50 max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Create a Room</h2>
            <p className="text-white/40 text-sm mt-0.5">Start your own live session</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Room Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Give your room a cool name..."
              maxLength={60}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this room about?"
              maxLength={200}
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={clsx(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                    category === cat
                      ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white/80',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">
              Max Participants: <span className="text-white">{maxParticipants}</span>
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={maxParticipants}
              onChange={e => setMaxParticipants(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>2</span><span>50</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag..."
                maxLength={20}
                className="input-field flex-1"
              />
              <button type="button" onClick={addTag} className="btn-ghost px-3">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-500/30 rounded-full text-xs text-purple-300">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/8">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-sm font-medium text-white/80">Private Room</p>
                <p className="text-xs text-white/30">Only accessible via direct link</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(v => !v)}
              className={clsx(
                'relative w-10 h-6 rounded-full transition-colors',
                isPrivate ? 'bg-purple-600' : 'bg-white/20',
              )}
            >
              <div className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                isPrivate ? 'translate-x-5' : 'translate-x-1',
              )} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
