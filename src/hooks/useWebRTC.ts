import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

interface WebRTCCallbacks {
  onOffer: (targetId: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer: (targetId: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate: (targetId: string, candidate: RTCIceCandidateInit) => void;
  onSpeaking: (isSpeaking: boolean) => void;
}

export function useWebRTC(callbacks: WebRTCCallbacks) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingTimerRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const store = useAppStore();

  const initLocalStream = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      store.setHasAudioPermission(true);

      // Set up audio analysis for speaking detection
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectSpeaking = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const speaking = avg > 20;

        if (speaking !== isSpeakingRef.current) {
          isSpeakingRef.current = speaking;
          callbacks.onSpeaking(speaking);
        }

        speakingTimerRef.current = requestAnimationFrame(detectSpeaking);
      };
      detectSpeaking();

      return true;
    } catch {
      store.setHasAudioPermission(false);
      return false;
    }
  }, [callbacks, store]);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.play().catch(() => {});
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(peerId, event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnectionsRef.current.delete(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [callbacks]);

  const handleUserJoined = useCallback(async (userId: string) => {
    const pc = createPeerConnection(userId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    callbacks.onOffer(userId, offer);
  }, [createPeerConnection, callbacks]);

  const handleOffer = useCallback(async (fromId: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(fromId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    callbacks.onAnswer(fromId, answer);
  }, [createPeerConnection, callbacks]);

  const handleAnswer = useCallback(async (fromId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(fromId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async (fromId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(fromId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
  }, []);

  const toggleMute = useCallback((muted: boolean) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
  }, []);

  const cleanup = useCallback(() => {
    if (speakingTimerRef.current) {
      cancelAnimationFrame(speakingTimerRef.current);
    }
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    initLocalStream,
    handleUserJoined,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer,
    toggleMute,
    cleanup,
    localStream: localStreamRef.current,
  };
}
