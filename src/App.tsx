import { useAppStore } from './store/useAppStore';
import { useSupabase } from './hooks/useSupabase';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { AuthScreen } from './components/AuthScreen';
import { RoomCategory } from './types';

export default function App() {
  const { currentRoom, isAuthenticated } = useAppStore();
  const supabase = useSupabase();

  if (!isAuthenticated) {
    return <AuthScreen onSignIn={supabase.signInWithApple} />;
  }

  const handleCreateRoom = (data: {
    name: string; description: string; category: RoomCategory;
    maxParticipants: number; isPrivate: boolean; tags: string[];
  }) => {
    supabase.createRoom(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar onSetUsername={supabase.setUsername} onSignOut={supabase.signOut} />

      {currentRoom ? (
        <Room
          onLeave={supabase.leaveRoom}
          onSendMessage={supabase.sendMessage}
          onReaction={supabase.sendReaction}
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
