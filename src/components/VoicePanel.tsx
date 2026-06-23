import { Users } from 'lucide-react';
import { Participant } from '../types';
import { UserCard } from './UserCard';

interface VoicePanelProps {
  participants: Participant[];
  currentUserId: string | null;
  isAdmin?: boolean;
  onModerate?: (participant: Participant) => void;
}

export function VoicePanel({ participants, currentUserId, isAdmin, onModerate }: VoicePanelProps) {
  if (participants.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-medium">No one here yet</p>
          <p className="text-white/20 text-sm mt-1">Invite friends to join!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 auto-rows-max">
        {participants.map(p => (
          <UserCard
            key={p.id}
            participant={p}
            isCurrentUser={p.id === currentUserId}
            size="lg"
            isAdmin={isAdmin}
            onModerate={onModerate}
          />
        ))}
      </div>

      {participants.length === 1 && participants[0].id === currentUserId && (
        <div className="mt-8 text-center">
          <p className="text-white/30 text-sm">You&apos;re the only one here. Share the room link to invite others!</p>
        </div>
      )}
    </div>
  );
}
