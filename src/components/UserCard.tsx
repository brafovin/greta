import { MicOff } from 'lucide-react';
import { Participant } from '../types';
import clsx from 'clsx';

interface UserCardProps {
  participant: Participant;
  isCurrentUser?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isAdmin?: boolean;
  onModerate?: (participant: Participant) => void;
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
  'from-pink-600 to-rose-600',
  'from-indigo-600 to-purple-600',
  'from-teal-600 to-green-600',
];

function getGradient(username: string): string {
  const idx = username.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function UserCard({ participant, isCurrentUser = false, size = 'md', isAdmin = false, onModerate }: UserCardProps) {
  const avatarSizes = { sm: 'w-12 h-12 text-sm', md: 'w-16 h-16 text-base', lg: 'w-24 h-24 text-xl' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
  const canModerate = isAdmin && !isCurrentUser && !!onModerate;

  return (
    <div
      onClick={canModerate ? () => onModerate!(participant) : undefined}
      className={clsx(
        'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200',
        size === 'lg' ? 'gap-3 p-4' : '',
        participant.isSpeaking ? 'bg-green-500/5' : 'bg-white/3 hover:bg-white/5',
        canModerate && 'cursor-pointer ring-1 ring-transparent hover:ring-red-500/40',
      )}
      title={canModerate ? 'Moderieren' : undefined}
    >
      <div className="relative">
        <div className={clsx(
          'rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br select-none',
          avatarSizes[size],
          getGradient(participant.username),
          participant.isSpeaking ? 'speaking-glow ring-2 ring-green-400' : '',
        )}>
          {getInitials(participant.username)}
        </div>

        {participant.isMuted && (
          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}

        {isCurrentUser && !participant.isMuted && (
          <div className={clsx(
            'absolute -bottom-1 -right-1 rounded-full w-3.5 h-3.5 border-2 border-[#0a0a0f]',
            participant.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-500',
          )} />
        )}
      </div>

      <div className={clsx('text-center', textSizes[size])}>
        <p className={clsx(
          'font-medium truncate max-w-[80px]',
          participant.isSpeaking ? 'text-green-300' : 'text-white/90',
        )}>
          {isCurrentUser ? 'You' : participant.username}
        </p>
        {isCurrentUser && (
          <p className="text-white/40 text-xs mt-0.5">
            {participant.isMuted ? 'muted' : participant.isSpeaking ? 'speaking' : 'listening'}
          </p>
        )}
      </div>
    </div>
  );
}
