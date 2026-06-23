import { useState } from 'react';
import { Zap, Settings, Check, X, LogOut, Pencil } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AdminPanel } from './AdminPanel';
import clsx from 'clsx';

interface NavbarProps {
  onSetUsername: (name: string) => void;
  onSignInGoogle: () => void;
  onSignInApple: () => void;
  onSignOut: () => void;
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

// Brand icons (inline SVG)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C41.4 36.4 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 814 1000" className="w-3.5 h-4 flex-shrink-0" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-161.2-113.8c-124.3-168.1-213.4-428.6-213.4-662.6 0-30.6 2.5-60.9 7.5-90.9 22.3-123.7 89.5-208.8 176.5-259.6 52-30.4 111.2-47.5 171.2-48.4 55.6-.9 116.9 22.2 160.7 54.6 39.4 29.7 63.4 61.3 78 83.4 2.5 3.7 5.2 7.2 7.7 10.8 7.1-21.7 20.9-43.4 39.5-65.4 52.5-62.1 133.5-96.8 212.5-96.8z"/>
    </svg>
  );
}

export function Navbar({ onSetUsername, onSignInGoogle, onSignInApple, onSignOut }: NavbarProps) {
  const { username, userId, isAuthenticated } = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const startEdit = () => { setNameInput(username); setEditingName(true); setShowMenu(false); };
  const saveEdit = () => {
    if (nameInput.trim()) onSetUsername(nameInput.trim());
    setEditingName(false);
  };

  return (
    <>
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
          <button
            onClick={() => setShowAdmin(true)}
            className="p-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition-colors"
            title="Einstellungen"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
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
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors group"
                >
                  <div className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br',
                    getGradient(username || 'U'),
                  )}>
                    {getInitials(username || 'U')}
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors hidden sm:block">
                    {username || 'Gast'}
                  </span>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a28] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-white/8">
                        <p className="text-sm font-medium text-white truncate">{username || 'Gast'}</p>
                        <p className="text-xs text-white/30">
                          {isAuthenticated ? 'Angemeldet' : 'Als Gast unterwegs'}
                        </p>
                      </div>

                      <button
                        onClick={startEdit}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Name ändern
                      </button>

                      <div className="border-t border-white/8" />

                      {isAuthenticated ? (
                        <button
                          onClick={() => { setShowMenu(false); onSignOut(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Abmelden
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => { setShowMenu(false); onSignInGoogle(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <GoogleIcon />
                            Mit Google anmelden
                          </button>
                          <button
                            onClick={() => { setShowMenu(false); onSignInApple(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <AppleIcon />
                            Mit Apple anmelden
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} currentUserId={userId} />
      )}
    </>
  );
}
