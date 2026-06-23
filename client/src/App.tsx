import { useAppStore } from './store/useAppStore';
import { useSocket } from './hooks/useSocket';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { RoomCategory } from './types';

export default function App() {
  const { currentRoom, rooms } = useAppStore();
  const {
    socket,
    joinRoom,
    leaveRoom,
    createRoom,
    sendMessage,
    sendReaction,
    toggleMute,
    setSpeaking,
    setUsername,
    sendWebRTCOffer,
    sendWebRTCAnswer,
    sendIceCandidate,
  } = useSocket();

  const handleCreateRoom = (data: {
    name: string;
    description: string;
    category: RoomCategory;
    maxParticipants: number;
    isPrivate: boolean;
    tags: string[];
  }) => {
    createRoom(data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar onSetUsername={setUsername} />

      {currentRoom ? (
        <Room
          onLeave={leaveRoom}
          onSendMessage={sendMessage}
          onReaction={sendReaction}
          onToggleMute={toggleMute}
          onSpeaking={setSpeaking}
          onWebRTCOffer={sendWebRTCOffer}
          onWebRTCAnswer={sendWebRTCAnswer}
          onIceCandidate={sendIceCandidate}
          socket={socket}
        />
      ) : (
        <Lobby
          rooms={rooms}
          onJoinRoom={joinRoom}
          onCreateRoom={handleCreateRoom}
        />
      )}
    </div>
  );
}
