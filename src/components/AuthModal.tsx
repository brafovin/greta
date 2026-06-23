import { useState } from 'react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface AuthModalProps {
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  onSignUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
}

type Mode = 'signin' | 'signup';

export function AuthModal({ onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async () => {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben');
      return;
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await onSignIn(email.trim(), password);
      setLoading(false);
      if (error) { setError(error); return; }
      onClose();
    } else {
      const { error, needsConfirmation } = await onSignUp(email.trim(), password);
      setLoading(false);
      if (error) { setError(error); return; }
      if (needsConfirmation) {
        setInfo('Bestätigungs-E-Mail gesendet. Bitte prüfe dein Postfach.');
        return;
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-bold text-white text-sm">
            {mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="E-Mail"
              autoFocus
              className="input-field pl-9"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Passwort"
              className="input-field pl-9"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {info && <p className="text-green-400 text-xs">{info}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={clsx('btn-primary w-full flex items-center justify-center gap-2', loading && 'opacity-70')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Anmelden' : 'Registrieren'}
          </button>

          <div className="text-center pt-1">
            {mode === 'signin' ? (
              <button
                onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Noch kein Konto? <span className="text-purple-400">Registrieren</span>
              </button>
            ) : (
              <button
                onClick={() => { setMode('signin'); setError(''); setInfo(''); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Schon ein Konto? <span className="text-purple-400">Anmelden</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
