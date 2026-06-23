import { useState } from 'react';
import { Zap, Bell, Settings, Check, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import clsx from 'clsx';

interface NavbarProps {
  onSetUsername: (name: string) => void;
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-purple-600 to-pink-600',
  'from-blue-600 to-cyan-600',
  'from-green-600 to-emerald-600',
  'from-orange-600 to-red-600',
  'from-yellow-600 to-orange-600',
];

function getGradient(username: string): string {
  return AVATAR_GRADIENTS[username.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function Navbar({ onSetUsername }: NavbarProps) {
  const { username } = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startEdit = () => {
    setNameInput(username);
    setEditingName(true);
  };

  const saveEdit = () => {
    if (nameInput.trim()) {
      onSetUsername(nameInput.trim());
    }
    setEditingName(false);
  };

  return (
    <nav className="h-14 flex items-center px-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-lg sticky top-0 z-40">
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            FunFlow
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-colors">
          <Settings className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingName(false); }}
                maxLength={24}
                autoFocus
                className="input-field py-1 px-2 text-sm w-32"
              />
              <button onClick={saveEdit} className="p-1.5 bg-green-600/30 hover:bg-green-600/50 text-green-400 rounded-lg transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors group"
            >
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br',
                getGradient(username || 'U'),
              )}>
                {getInitials(username || 'U')}
              </div>
              <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors hidden sm:block">
                {username || 'Set name'}
              </span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
