import { X, MicOff, Mic, LogOut, Clock, Ban, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Participant } from '../types';

interface ModerationMenuProps {
  participant: Participant;
  isBanned?: boolean;
  onClose: () => void;
  onMute: (muted: boolean) => void;
  onKick: () => void;
  onTimeout: (minutes: number) => void;
  onBan: () => void;
  onUnban?: () => void;
}

const TIMEOUTS = [
  { label: '5 Min', minutes: 5 },
  { label: '15 Min', minutes: 15 },
  { label: '1 Std', minutes: 60 },
  { label: '24 Std', minutes: 1440 },
];

function fmt(date: Date | string | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

export function ModerationMenu({
  participant, isBanned, onClose, onMute, onKick, onTimeout, onBan, onUnban,
}: ModerationMenuProps) {
  const act = (fn: () => void) => { fn(); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div
            style={{ background: participant.avatar }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          >
            {participant.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{participant.username}</p>
            <p className="text-white/30 text-xs flex items-center gap-1">
              {participant.accountType === 'email'
                ? <><ShieldCheck className="w-3 h-3" /> Registriert</>
                : <><UserIcon className="w-3 h-3" /> Gast</>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account insight */}
        <div className="px-4 py-2.5 border-b border-white/8 space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-white/30">User-ID</span>
            <span className="text-white/60 font-mono truncate max-w-[160px]">{participant.id}</span>
          </div>
          {participant.roomName && (
            <div className="flex justify-between gap-2">
              <span className="text-white/30">Raum</span>
              <span className="text-white/60 truncate max-w-[160px]">{participant.roomName}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-white/30">Beigetreten</span>
            <span className="text-white/60">{fmt(participant.joinedAt)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/30">Status</span>
            <span className={isBanned ? 'text-red-400' : participant.isMuted ? 'text-yellow-400' : 'text-green-400'}>
              {isBanned ? 'Gebannt' : participant.isMuted ? 'Stummgeschaltet' : 'Aktiv'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => act(() => onMute(!participant.isMuted))}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg transition-colors"
          >
            {participant.isMuted ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-yellow-400" />}
            {participant.isMuted ? 'Entstummen' : 'Stummschalten'}
          </button>

          <button
            onClick={() => act(onKick)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 text-orange-400" />
            Aus Raum werfen (Kick)
          </button>

          {/* Timeouts */}
          <div className="px-3 pt-2 pb-1">
            <p className="text-white/30 text-[11px] flex items-center gap-1 mb-1.5">
              <Clock className="w-3 h-3" /> Timeout geben
            </p>
            <div className="grid grid-cols-4 gap-1">
              {TIMEOUTS.map(t => (
                <button
                  key={t.minutes}
                  onClick={() => act(() => onTimeout(t.minutes))}
                  className="py-1.5 text-xs bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-300 text-white/70 rounded-lg transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {isBanned && onUnban ? (
            <button
              onClick={() => act(onUnban)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Entbannen
            </button>
          ) : (
            <button
              onClick={() => act(onBan)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Ban className="w-4 h-4" />
              Permanent bannen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
