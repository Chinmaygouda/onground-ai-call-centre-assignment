import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CallEngineMode, ActiveCallState } from '../types';

interface CallingContextType {
  callState: ActiveCallState;
  startCall: (params: {
    name: string;
    phone: string;
    mode?: CallEngineMode;
    value?: number;
    product?: string;
  }) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  audioFrequencyData: Uint8Array | null;
  aiSpeechTranscript: string;
  isMicActive: boolean;
  incomingPeerCall: { callerName: string; channelId: string } | null;
  acceptIncomingPeerCall: () => void;
  rejectIncomingPeerCall: () => void;
}

const initialCallState: ActiveCallState = {
  lifecycle: 'IDLE',
  mode: 'AI_VOICE',
  contactName: '',
  contactInitials: '',
  contactPhone: '',
  durationSeconds: 0,
  isMuted: false
};

const CallingContext = createContext<CallingContextType | undefined>(undefined);

export const CallingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [callState, setCallState] = useState<ActiveCallState>(initialCallState);
  const [audioFrequencyData, setAudioFrequencyData] = useState<Uint8Array | null>(null);
  const [aiSpeechTranscript, setAiSpeechTranscript] = useState<string>('');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [incomingPeerCall, setIncomingPeerCall] = useState<{
    callerName: string;
    channelId: string;
    offer?: RTCSessionDescriptionInit;
  } | null>(null);

  // References for Web Audio & Media
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // References for Web Speech API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null);

  // References for Multi-Tab WebRTC
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Helper to construct RTCPeerConnection with STUN servers and local tracks
  const setupPeerConnection = () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'ICE_CANDIDATE',
            payload: { candidate: event.candidate.toJSON() }
          });
        }
      };

      pc.ontrack = (event) => {
        let audioEl = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = 'webrtc-remote-audio';
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = event.streams[0];
      };

      return pc;
    } catch (e) {
      console.warn('RTCPeerConnection creation failed', e);
      return null;
    }
  };

  // Initialize BroadcastChannel for tab-to-tab peer calling signaling
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('onground-callcentre-signaling');
      broadcastChannelRef.current = channel;

      channel.onmessage = async (event) => {
        const { type, payload } = event.data;
        if (type === 'OFFER_CALL' && callState.lifecycle === 'IDLE') {
          setIncomingPeerCall({
            callerName: payload.callerName || 'Arvind Rajan (Tab)',
            channelId: payload.channelId,
            offer: payload.offer
          });
        } else if (type === 'CALL_ACCEPTED') {
          if (peerConnectionRef.current && payload.answer) {
            try {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } catch (err) {
              console.warn('Error setting remote description on offerer', err);
            }
            setCallState((prev) => ({ ...prev, lifecycle: 'CONNECTED' }));
          }
        } else if (type === 'ICE_CANDIDATE') {
          if (peerConnectionRef.current && payload.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.warn('Error adding ICE candidate', err);
            }
          }
        } else if (type === 'CALL_ENDED') {
          endCall();
        }
      };

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }, [callState.lifecycle]);

  // Clean up Web Audio & Stream on unmount
  const stopMediaCapture = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {
        // ignore
      }
      peerConnectionRef.current = null;
    }
    const audioEl = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.srcObject = null;
    }
    setIsMicActive(false);
    setAudioFrequencyData(null);
  };

  // Start real Audio Capture & Waveform Visualizer
  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsMicActive(true);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWave = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioFrequencyData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(updateWave);
        }
      };
      updateWave();
    } catch (err) {
      console.warn('Microphone permission not granted or device not found; using simulated audio waveform.', err);
      // Fallback synthetic audio stream so peer connection has audio tracks
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const fallbackCtx = new AudioCtx();
        const osc = fallbackCtx.createOscillator();
        const gain = fallbackCtx.createGain();
        gain.gain.value = 0.01;
        const dest = fallbackCtx.createMediaStreamDestination();
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        mediaStreamRef.current = dest.stream;
      } catch (fallbackErr) {
        console.warn('Synthetic audio track fallback error', fallbackErr);
      }

      // Simulated audio waveform fallback for devices without mic or in restricted env
      const simulatedArray = new Uint8Array(32);
      const updateSimulatedWave = () => {
        for (let i = 0; i < 32; i++) {
          simulatedArray[i] = Math.floor(128 + Math.sin(Date.now() / 200 + i) * 60 + Math.random() * 20);
        }
        setAudioFrequencyData(new Uint8Array(simulatedArray));
        animationFrameRef.current = requestAnimationFrame(updateSimulatedWave);
      };
      updateSimulatedWave();
    }
  };

  // Speech Recognition & Voice AI customer logic
  const startVoiceAI = (contactName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((result: any) => result[0].transcript)
          .join('');
        setAiSpeechTranscript(transcript);

        // Auto-respond to keywords from the contact
        const lower = transcript.toLowerCase();
        if (lower.includes('emi') || lower.includes('price') || lower.includes('discount')) {
          triggerAISpokenResponse(
            contactName,
            "I'm specifically comparing the Ortho GRID price with competitors. Does the ₹8,490 include 0% interest EMI?"
          );
        } else if (lower.includes('trial') || lower.includes('warranty') || lower.includes('night')) {
          triggerAISpokenResponse(
            contactName,
            'That 100-night trial sounds reassuring! How does the return pickup work if my back needs more time to adapt?'
          );
        }
      };

      try {
        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch {
        // ignore already started
      }
    }

    // Initial greeting from the AI customer
    setTimeout(() => {
      triggerAISpokenResponse(
        contactName,
        `Hello Arvind, this is ${contactName}. I visited your store yesterday and was looking at the Ortho GRID mattress.`
      );
    }, 2500);
  };

  const triggerAISpokenResponse = (speaker: string, text: string) => {
    setCallState((prev) => ({
      ...prev,
      aiResponseText: `${speaker}: "${text}"`
    }));

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const startCall = async ({
    name,
    phone,
    mode = 'AI_VOICE',
    value,
    product
  }: {
    name: string;
    phone: string;
    mode?: CallEngineMode;
    value?: number;
    product?: string;
  }) => {
    stopMediaCapture();

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    setCallState({
      lifecycle: 'DIALING',
      mode,
      contactName: name,
      contactInitials: initials,
      contactPhone: phone,
      expectedValue: value,
      productInterest: product,
      durationSeconds: 0,
      isMuted: false,
      aiResponseText: 'Connecting secure audio stream...'
    });

    if (mode === 'PHONE') {
      window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
      return;
    }

    await startAudioVisualizer();

    // Transition from DIALING -> RINGING -> CONNECTED
    setTimeout(() => {
      setCallState((prev) => ({ ...prev, lifecycle: 'RINGING' }));

      // If WebRTC multi-tab mode, broadcast offer
      if (mode === 'WEBRTC_PEER' && broadcastChannelRef.current) {
        const pc = setupPeerConnection();
        if (pc) {
          pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer).then(() => {
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'OFFER_CALL',
                  payload: { callerName: name, channelId: 'onground-peer', offer }
                });
              }
            });
          }).catch((err) => {
            console.warn('WebRTC offer error', err);
          });
        }
      }

      setTimeout(() => {
        setCallState((prev) => ({ ...prev, lifecycle: 'CONNECTED' }));

        // Start call duration timer
        timerIntervalRef.current = window.setInterval(() => {
          setCallState((prev) => ({
            ...prev,
            durationSeconds: prev.durationSeconds + 1
          }));
        }, 1000);

        if (mode === 'AI_VOICE') {
          startVoiceAI(name);
        }
      }, 1800);
    }, 1200);
  };

  const endCall = () => {
    stopMediaCapture();
    setCallState((prev) => ({
      ...prev,
      lifecycle: 'ENDED'
    }));

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'CALL_ENDED' });
    }

    // Auto-reset to IDLE after 2 seconds or on user close
    setTimeout(() => {
      setCallState(initialCallState);
    }, 3000);
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const acceptIncomingPeerCall = async () => {
    if (!incomingPeerCall) return;
    const { callerName, offer } = incomingPeerCall;
    setIncomingPeerCall(null);
    await startAudioVisualizer();

    setCallState({
      lifecycle: 'CONNECTED',
      mode: 'WEBRTC_PEER',
      contactName: callerName,
      contactInitials: 'PE',
      contactPhone: 'In-App WebRTC Peer',
      durationSeconds: 0,
      isMuted: false
    });

    const pc = setupPeerConnection();
    if (pc && offer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'CALL_ACCEPTED',
            payload: { answer }
          });
        }
      } catch (err) {
        console.warn('Error negotiating WebRTC answer', err);
      }
    }

    timerIntervalRef.current = window.setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1
      }));
    }, 1000);
  };

  const rejectIncomingPeerCall = () => {
    setIncomingPeerCall(null);
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'CALL_ENDED' });
    }
  };

  return (
    <CallingContext.Provider
      value={{
        callState,
        startCall,
        endCall,
        toggleMute,
        audioFrequencyData,
        aiSpeechTranscript,
        isMicActive,
        incomingPeerCall,
        acceptIncomingPeerCall,
        rejectIncomingPeerCall
      }}
    >
      {children}
    </CallingContext.Provider>
  );
};

export const useCalling = (): CallingContextType => {
  const context = useContext(CallingContext);
  if (!context) {
    throw new Error('useCalling must be used within a CallingProvider');
  }
  return context;
};
