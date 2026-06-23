import { Ban } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { useSupabase } from './hooks/useSupabase';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { RoomCategory } from './types';

function BannedScreen({ until, reason }: { until: string | null; reason: string }) {
  const isTimeout = !!until;
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center bg-white/5 border border-red-500/20 rounded-2xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          {isTimeout ? 'Du hast einen Timeout' : 'Du wurdest gebannt'}
        </h1>
        <p className="text-white/50 text-sm mb-1">
          {isTimeout
            ? `Du kannst FunFlow wieder nutzen ab:`
            : 'Der Zugriff auf FunFlow wurde gesperrt.'}
        </p>
        {isTimeout && (
          <p className="text-white font-medium mb-3">{new Date(until!).toLocaleString()}</p>
        )}
        {reason && <p className="text-white/40 text-xs mb-4">Grund: {reason}</p>}
        <button onClick={() => window.location.reload()} className="btn-primary w-full mt-2">
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { currentRoom, myBan } = useAppStore();
  const supabase = useSupabase();

  if (myBan) {
    return <BannedScreen until={myBan.until} reason={myBan.reason} />;
  }

  const handleCreateRoom = (data: {
    name: string; description: string; category: RoomCategory;
    maxParticipants: number; isPrivate: boolean; tags: string[];
  }) => {
    supabase.createRoom(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar
        onSetUsername={supabase.setUsername}
        onSignIn={supabase.signInWithEmail}
        onSignUp={supabase.signUpWithEmail}
        onSignOut={supabase.signOut}
      />

      {currentRoom ? (
        <Room
          onLeave={supabase.leaveRoom}
          onSendMessage={supabase.sendMessage}
          onReaction={supabase.sendReaction}
          onEditMessage={supabase.editMessage}
          onDeleteMessage={supabase.deleteMessage}
          onMuteUser={supabase.muteUser}
          onKickUser={supabase.kickUser}
          onBanUser={supabase.banUser}
          onToggleMute={supabase.toggleMute}
          onSpeaking={supabase.setSpeaking}
          onWebRTCOffer={supabase.sendWebRTCOffer}
          onWebRTCAnswer={supabase.sendWebRTCAnswer}
          onIceCandidate={supabase.sendIceCandidate}
          listenToSignals={supabase.listenToSignals}
        />
      ) : (
        <Lobby onJoinRoom={supabase.joinRoom} onCreateRoom={handleCreateRoom} />
      )}
    </div>
  );
}
