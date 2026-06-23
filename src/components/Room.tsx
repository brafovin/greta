import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, LogOut, Users, MessageSquare, Copy, Check, Crown, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { VoicePanel } from './VoicePanel';
import { ChatPanel } from './ChatPanel';
import { ModerationMenu } from './ModerationMenu';
import { CATEGORY_LABELS, CATEGORY_COLORS, Participant } from '../types';
import clsx from 'clsx';

interface RoomProps {
  onLeave: () => void;
  onSendMessage: (text: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMuteUser: (userId: string, muted: boolean) => void;
  onKickUser: (userId: string) => void;
  onBanUser: (userId: string, username: string, minutes?: number) => void;
  onToggleMute: (muted: boolean) => void;
  onSpeaking: (isSpeaking: boolean) => void;
  onWebRTCOffer: (targetId: string, offer: RTCSessionDescriptionInit) => void;
  onWebRTCAnswer: (targetId: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate: (targetId: string, candidate: RTCIceCandidateInit) => void;
  listenToSignals: (
    roomId: string,
    userId: string,
    callbacks: {
      onOffer: (fromId: string, offer: RTCSessionDescriptionInit) => void;
      onAnswer: (fromId: string, answer: RTCSessionDescriptionInit) => void;
      onIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => void;
    }
  ) => () => void;
}

type Tab = 'voice' | 'chat';

export function Room({
  onLeave,
  onSendMessage,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  onMuteUser,
  onKickUser,
  onBanUser,
  onToggleMute,
  onSpeaking,
  onWebRTCOffer,
  onWebRTCAnswer,
  onIceCandidate,
  listenToSignals,
}: RoomProps) {
  const { currentRoom, messages, userId, isMuted, setMuted, updateParticipant, hasAudioPermission, isAdmin } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('voice');
  const [copied, setCopied] = useState(false);
  const [moderating, setModerating] = useState<Participant | null>(null);
  const streamInitialized = useRef(false);
  const prevParticipantsRef = useRef<Set<string>>(new Set());

  const webRTC = useWebRTC({
    onOffer: onWebRTCOffer,
    onAnswer: onWebRTCAnswer,
    onIceCandidate: onIceCandidate,
    onSpeaking: (speaking) => {
      onSpeaking(speaking);
      if (userId) updateParticipant(userId, { isSpeaking: speaking });
    },
  });

  // Initialize local audio stream on mount
  useEffect(() => {
    if (!currentRoom || !userId) return;

    webRTC.initLocalStream().then((success) => {
      streamInitialized.current = success;
      if (!success) return;

      // Initiate WebRTC with participants already in the room
      const initial = new Set<string>();
      currentRoom.participants.forEach((p) => {
        if (p.id !== userId) {
          webRTC.handleUserJoined(p.id);
          initial.add(p.id);
        } else {
          initial.add(p.id);
        }
      });
      prevParticipantsRef.current = initial;
    });

    return () => {
      webRTC.cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up Firebase signaling listeners
  useEffect(() => {
    if (!currentRoom || !userId) return;
    return listenToSignals(currentRoom.id, userId, {
      onOffer: (fromId, offer) => webRTC.handleOffer(fromId, offer),
      onAnswer: (fromId, answer) => webRTC.handleAnswer(fromId, answer),
      onIceCandidate: (fromId, candidate) => webRTC.handleIceCandidate(fromId, candidate),
    });
  }, [currentRoom?.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to admin-forced mute: sync our WebRTC mute state when DB changes
  const selfMuted = currentRoom?.participants.find(p => p.id === userId)?.isMuted;
  useEffect(() => {
    if (selfMuted === undefined || selfMuted === isMuted) return;
    setMuted(selfMuted);
    webRTC.toggleMute(selfMuted);
    onToggleMute(selfMuted);
  }, [selfMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect new / left participants and update WebRTC accordingly
  const participantsKey = currentRoom?.participants.map(p => p.id).sort().join(',') ?? '';
  useEffect(() => {
    if (!streamInitialized.current || !currentRoom || !userId) return;

    const currentIds = new Set(currentRoom.participants.map(p => p.id));

    for (const id of currentIds) {
      if (id !== userId && !prevParticipantsRef.current.has(id)) {
        webRTC.handleUserJoined(id);
      }
    }
    for (const id of prevParticipantsRef.current) {
      if (!currentIds.has(id)) {
        webRTC.removePeer(id);
      }
    }

    prevParticipantsRef.current = currentIds;
  }, [participantsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setMuted(newMuted);
    webRTC.toggleMute(newMuted);
    onToggleMute(newMuted);
    if (userId) updateParticipant(userId, { isMuted: newMuted });
  };

  const handleLeave = () => {
    webRTC.cleanup();
    onLeave();
  };

  const copyRoomId = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(`${window.location.origin}?room=${currentRoom.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentRoom) return null;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Room header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-[#0d0d15]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', CATEGORY_COLORS[currentRoom.category])}>
              {CATEGORY_LABELS[currentRoom.category]}
            </span>
            {currentRoom.hostId === userId && (
              <span className="flex items-center gap-1 text-xs text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
                <Crown className="w-3 h-3" /> Host
              </span>
            )}
          </div>
          <h2 className="font-bold text-white text-base truncate">{currentRoom.name}</h2>
          {currentRoom.description && (
            <p className="text-white/40 text-xs truncate">{currentRoom.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-white/40 text-sm">
          <Users className="w-4 h-4" />
          <span>{currentRoom.participantCount}/{currentRoom.maxParticipants}</span>
        </div>

        <button
          onClick={copyRoomId}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {hasAudioPermission === false && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 text-yellow-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Microphone access denied. Allow mic in browser settings to enable voice chat.</span>
        </div>
      )}

      {/* Tab switcher (mobile) */}
      <div className="flex md:hidden border-b border-white/5">
        {(['voice', 'chat'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
              activeTab === tab
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-white/40 hover:text-white/60',
            )}
          >
            {tab === 'voice' ? <Mic className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {tab === 'voice' ? 'Voice' : 'Chat'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={clsx(
          'flex flex-col flex-1 md:flex-none md:flex',
          activeTab === 'voice' ? 'flex' : 'hidden md:flex',
          'md:flex-1',
        )}>
          <VoicePanel
            participants={currentRoom.participants}
            currentUserId={userId}
            isAdmin={isAdmin}
            onModerate={setModerating}
          />
        </div>

        <div className={clsx(
          'flex flex-col border-l border-white/5',
          activeTab === 'chat' ? 'flex flex-1' : 'hidden md:flex',
          'md:w-72 lg:w-80',
        )}>
          <ChatPanel
            messages={messages}
            currentUserId={userId}
            isAdmin={isAdmin}
            onSendMessage={onSendMessage}
            onReaction={onReaction}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#0d0d15]">
        <button
          onClick={handleToggleMute}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
            isMuted
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30',
          )}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 rounded-xl font-medium text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Leave Room</span>
        </button>
      </div>

      {moderating && (
        <ModerationMenu
          participant={moderating}
          onClose={() => setModerating(null)}
          onMute={(muted) => onMuteUser(moderating.id, muted)}
          onKick={() => onKickUser(moderating.id)}
          onTimeout={(minutes) => onBanUser(moderating.id, moderating.username, minutes)}
          onBan={() => onBanUser(moderating.id, moderating.username)}
        />
      )}
    </div>
  );
}
