import { useState } from 'react';
import { Zap, Settings, Check, X, LogOut, Pencil, Mail } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AdminPanel } from './AdminPanel';
import { AuthModal } from './AuthModal';
import clsx from 'clsx';

interface NavbarProps {
  onSetUsername: (name: string) => void;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
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

export function Navbar({ onSetUsername, onSignIn, onSignUp, onSignOut }: NavbarProps) {
  const { username, userId, isAuthenticated, isAdmin } = useAppStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
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
            {isAdmin && (
              <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-1.5 py-0.5">
                Admin
              </span>
            )}
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
                        <button
                          onClick={() => { setShowMenu(false); setShowAuth(true); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Mit E-Mail anmelden
                        </button>
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
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
        />
      )}
    </>
  );
}
