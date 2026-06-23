import { useAppStore } from './store/useAppStore';
import { useFirebase } from './hooks/useFirebase';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { RoomCategory } from './types';

export default function App() {
  const { currentRoom } = useAppStore();
  const firebase = useFirebase();

  const handleCreateRoom = (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants: number;
    isPrivate: boolean;
    tags: string[];
  }) => {
    firebase.createRoom(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar onSetUsername={firebase.setUsername} />

      {currentRoom ? (
        <Room
          onLeave={firebase.leaveRoom}
          onSendMessage={firebase.sendMessage}
          onReaction={firebase.sendReaction}
          onToggleMute={firebase.toggleMute}
          onSpeaking={firebase.setSpeaking}
          onWebRTCOffer={firebase.sendWebRTCOffer}
          onWebRTCAnswer={firebase.sendWebRTCAnswer}
          onIceCandidate={firebase.sendIceCandidate}
          listenToSignals={firebase.listenToSignals}
        />
      ) : (
        <Lobby
          onJoinRoom={firebase.joinRoom}
          onCreateRoom={handleCreateRoom}
        />
      )}
    </div>
  );
}
