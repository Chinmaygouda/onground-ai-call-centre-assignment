import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CallEngineMode, ActiveCallState } from '../types';
import { getTelUri } from '../utils/phoneUtils';
import { useAppState } from './AppStateContext';

export interface IncomingPeerCallInfo {
  callerName: string;
  callerTabId: string;
  channelId: string;
  offer?: RTCSessionDescriptionInit;
  expectedValue?: number;
  productInterest?: string;
}

interface CallingContextType {
  callState: ActiveCallState;
  tabSessionId: string;
  startCall: (params: {
    name: string;
    phone: string;
    mode?: CallEngineMode;
    value?: number;
    product?: string;
    leadId?: string;
    buyingSignals?: string[];
    notes?: string;
    isTrialSample?: boolean;
    sampleTwiMLUrl?: string;
  }) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  audioFrequencyData: Uint8Array | null;
  aiSpeechTranscript: string;
  isMicActive: boolean;
  incomingPeerCall: IncomingPeerCallInfo | null;
  acceptIncomingPeerCall: () => void;
  rejectIncomingPeerCall: () => void;
}

const initialCallState: ActiveCallState = {
  lifecycle: 'IDLE',
  mode: 'WEBRTC_PEER',
  contactName: '',
  contactInitials: '',
  contactPhone: '',
  durationSeconds: 0,
  isMuted: false
};

const SIGNALING_CHANNEL = 'onground-callcentre-signaling';

const CallingContext = createContext<CallingContextType | undefined>(undefined);

export const CallingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Unique identity per browser tab / window session
  const tabSessionId = useRef<string>(
    'tab_' + Math.random().toString(36).substring(2, 8)
  );

  const { recordCallInteraction } = useAppState();
  const exotelPollIntervalRef = useRef<number | null>(null);
  const exotelCallSidRef = useRef<string | null>(null);
  const twilioPollIntervalRef = useRef<number | null>(null);
  const twilioCallSidRef = useRef<string | null>(null);

  const [callState, setCallState] = useState<ActiveCallState>(initialCallState);
  const callStateRef = useRef<ActiveCallState>(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [audioFrequencyData, setAudioFrequencyData] = useState<Uint8Array | null>(null);
  const [aiSpeechTranscript, setAiSpeechTranscript] = useState<string>('');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [incomingPeerCall, setIncomingPeerCall] = useState<IncomingPeerCallInfo | null>(null);

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
  const remotePeerTabIdRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Helper to construct RTCPeerConnection with STUN servers and local tracks
  const setupPeerConnection = () => {
    try {
      console.log(`[Calling:WebRTC] Setting up RTCPeerConnection on tab ${tabSessionId.current}`);
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      // Add local audio tracks if available
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current!);
          console.log(`[Calling:WebRTC] Attached local track '${track.kind}' (${track.id}) to RTCPeerConnection`);
        });
      } else {
        console.warn(`[Calling:WebRTC] No mediaStreamRef.current found when setting up peer connection`);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && broadcastChannelRef.current) {
          console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} sending ICE_CANDIDATE to ${remotePeerTabIdRef.current || 'all'}`);
          broadcastChannelRef.current.postMessage({
            type: 'ICE_CANDIDATE',
            payload: {
              candidate: event.candidate.toJSON(),
              senderTabId: tabSessionId.current,
              targetTabId: remotePeerTabIdRef.current
            }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} peer connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          console.log(`[Calling:WebRTC] WebRTC connection established successfully between tabs!`);
        }
      };

      pc.ontrack = (event) => {
        console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} received remote audio track`, event.track);
        let audioEl = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = 'webrtc-remote-audio';
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        }
        const remoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
        audioEl.srcObject = remoteStream;
        audioEl.play().catch((playErr) => {
          console.warn('[Calling:WebRTC] Remote audio autoplay error', playErr);
        });
      };

      return pc;
    } catch (e) {
      console.warn('[Calling:WebRTC] RTCPeerConnection creation failed', e);
      return null;
    }
  };

  // Initialize BroadcastChannel for tab-to-tab peer calling signaling
  useEffect(() => {
    try {
      console.log(`[Calling:WebRTC] Initializing BroadcastChannel '${SIGNALING_CHANNEL}' on tab: ${tabSessionId.current}`);
      const channel = new BroadcastChannel(SIGNALING_CHANNEL);
      broadcastChannelRef.current = channel;

      channel.onmessage = async (event) => {
        const { type, payload } = event.data || {};
        if (!type || !payload) return;

        // Ignore messages sent by self
        if (payload.senderTabId === tabSessionId.current || payload.callerTabId === tabSessionId.current) {
          return;
        }

        console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} received message '${type}' from ${payload.senderTabId || payload.callerTabId}`);

        if (type === 'OFFER_CALL') {
          if (callStateRef.current.lifecycle === 'IDLE') {
            console.log(`[Calling:WebRTC] Displaying incoming call prompt on tab ${tabSessionId.current} from ${payload.callerName}`);
            remotePeerTabIdRef.current = payload.callerTabId;
            setIncomingPeerCall({
              callerName: payload.callerName || 'Arvind Rajan (Tab)',
              callerTabId: payload.callerTabId,
              channelId: payload.channelId,
              offer: payload.offer,
              expectedValue: payload.expectedValue,
              productInterest: payload.productInterest
            });
          } else {
            console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} is currently ${callStateRef.current.lifecycle}; rejecting offer as busy`);
          }
        } else if (type === 'CALL_ACCEPTED') {
          // If targeted to a specific tab, enforce target match
          if (payload.targetTabId && payload.targetTabId !== tabSessionId.current) {
            return;
          }

          console.log(`[Calling:WebRTC] Call accepted by peer tab ${payload.responderTabId}`);
          remotePeerTabIdRef.current = payload.responderTabId;

          if (peerConnectionRef.current && payload.answer) {
            try {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} set remote description (answer)`);

              // Drain pending ICE candidates
              while (pendingIceCandidatesRef.current.length > 0) {
                const cand = pendingIceCandidatesRef.current.shift();
                if (cand) {
                  try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                    console.log(`[Calling:WebRTC] Drained pending ICE candidate on tab ${tabSessionId.current}`);
                  } catch (iceErr) {
                    console.warn('[Calling:WebRTC] Error adding pending ICE candidate', iceErr);
                  }
                }
              }
            } catch (err) {
              console.warn('[Calling:WebRTC] Error setting remote description on caller', err);
            }
          }

          setCallState((prev) => ({
            ...prev,
            lifecycle: 'CONNECTED',
            aiResponseText: 'WebRTC in-app peer call connected'
          }));

          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = window.setInterval(() => {
            setCallState((prev) => ({
              ...prev,
              durationSeconds: prev.durationSeconds + 1
            }));
          }, 1000);
        } else if (type === 'CALL_DECLINED') {
          if (payload.targetTabId && payload.targetTabId !== tabSessionId.current) {
            return;
          }
          console.log(`[Calling:WebRTC] Call declined by peer tab ${payload.senderTabId}`);
          stopMediaCapture();
          setCallState((prev) => ({
            ...prev,
            lifecycle: 'ENDED',
            aiResponseText: 'Call declined by remote peer agent'
          }));
          setTimeout(() => {
            setCallState(initialCallState);
          }, 2500);
        } else if (type === 'ICE_CANDIDATE') {
          if (payload.targetTabId && payload.targetTabId !== tabSessionId.current) {
            return;
          }

          if (payload.candidate) {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                console.log(`[Calling:WebRTC] Added remote ICE candidate on tab ${tabSessionId.current}`);
              } catch (err) {
                console.warn('[Calling:WebRTC] Error adding ICE candidate', err);
              }
            } else {
              console.log(`[Calling:WebRTC] Queued incoming ICE candidate on tab ${tabSessionId.current} (remote description pending)`);
              pendingIceCandidatesRef.current.push(payload.candidate);
            }
          }
        } else if (type === 'CALL_ENDED') {
          console.log(`[Calling:WebRTC] Received CALL_ENDED on tab ${tabSessionId.current}`);
          setIncomingPeerCall(null);
          pendingIceCandidatesRef.current = [];
          remotePeerTabIdRef.current = null;

          if (callStateRef.current.lifecycle !== 'IDLE') {
            stopMediaCapture();
            setCallState((prev) => ({
              ...prev,
              lifecycle: 'ENDED',
              aiResponseText: 'Call ended by remote peer'
            }));
            setTimeout(() => {
              setCallState(initialCallState);
            }, 2000);
          }
        }
      };

      return () => {
        console.log(`[Calling:WebRTC] Closing BroadcastChannel listener on tab: ${tabSessionId.current}`);
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch (e) {
      console.warn('[Calling:WebRTC] BroadcastChannel not supported in this environment', e);
    }
  }, []);

  // Clean up Web Audio & Stream on unmount or end of call
  const stopMediaCapture = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (twilioPollIntervalRef.current) {
      clearInterval(twilioPollIntervalRef.current);
      twilioPollIntervalRef.current = null;
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
      console.log(`[Calling:WebRTC] Requesting microphone access on tab ${tabSessionId.current}...`);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsMicActive(true);
      console.log(`[Calling:WebRTC] Microphone access GRANTED on tab ${tabSessionId.current}`);

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
      console.warn('[Calling:WebRTC] Microphone permission not granted or device not found; using fallback audio track.', err);
      // Fallback synthetic audio stream so peer connection has an active audio track
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
        console.warn('[Calling:WebRTC] Synthetic audio track fallback error', fallbackErr);
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
    mode = 'WEBRTC_PEER',
    value,
    product,
    leadId,
    buyingSignals,
    notes,
    isTrialSample,
    sampleTwiMLUrl
  }: {
    name: string;
    phone: string;
    mode?: CallEngineMode;
    value?: number;
    product?: string;
    leadId?: string;
    buyingSignals?: string[];
    notes?: string;
    isTrialSample?: boolean;
    sampleTwiMLUrl?: string;
  }) => {
    // 1. Prevent duplicate calls if a call is already active
    if (callStateRef.current.lifecycle !== 'IDLE' && callStateRef.current.lifecycle !== 'ENDED') {
      console.warn(`[Calling] Call already in progress (${callStateRef.current.lifecycle}), ignoring duplicate request.`);
      return;
    }

    // Synchronously guard against rapid microtask re-entrancy
    callStateRef.current = {
      ...callStateRef.current,
      lifecycle: 'DIALING'
    };

    stopMediaCapture();
    pendingIceCandidatesRef.current = [];
    remotePeerTabIdRef.current = null;

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    console.log(`[Calling] Tab ${tabSessionId.current} startCall initiated for '${name}', mode: '${mode}', isTrialSample: ${Boolean(isTrialSample)}`);

    if (mode === 'PHONE') {
      callStateRef.current = { ...callStateRef.current, lifecycle: 'IDLE' };
      const telUri = getTelUri(phone) || `tel:${phone.replace(/\s+/g, '')}`;
      console.log(`[Calling:Native] Invoking device dialer via ${telUri}`);
      window.location.href = telUri;
      return;
    }

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
      isTrialSample: Boolean(isTrialSample),
      trialSampleUrl: sampleTwiMLUrl || (isTrialSample ? 'http://demo.twilio.com/docs/voice.xml' : undefined),
      exotelStatus: (mode === 'EXOTEL_REAL' || mode === 'EXOTEL_AI') ? 'initiating' : undefined,
      twilioStatus: mode === 'TWILIO_AI' ? 'initiating' : undefined,
      twilioStage: mode === 'TWILIO_AI' ? 'request_accepted' : undefined,
      isConfigured: (mode === 'EXOTEL_REAL' || mode === 'EXOTEL_AI' || mode === 'TWILIO_AI') ? true : undefined,
      aiResponseText:
        mode === 'WEBRTC_PEER'
          ? 'Broadcasting in-app call to peer tabs...'
          : mode === 'EXOTEL_REAL'
          ? 'Requesting Exotel outbound PSTN connection...'
          : mode === 'EXOTEL_AI'
          ? 'Initiating AI Outbound Voice Call via Exotel Connect Voice AI...'
          : mode === 'TWILIO_AI'
          ? (isTrialSample
              ? 'Stage 1: Backend request accepted. Connecting Twilio carrier sample test (http://demo.twilio.com/docs/voice.xml)...'
              : 'Stage 1: Backend request accepted. Connecting to Twilio Programmable Voice...')
          : 'Connecting secure audio stream...'
    });

    await startAudioVisualizer();

    if (mode === 'EXOTEL_AI') {
      const maskedPhone = phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : '[NONE]';
      console.log(`[Calling:ExotelAI] Initiating AI Outbound Voice call for contact "${name}" (${maskedPhone}) regarding "${product || 'General Enquiry'}"`);

      const endpoint = '/api/exotel/call';
      try {
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            clientName: name,
            mode: 'EXOTEL_AI',
            leadId: leadId || 'lead-1',
            product: product || 'Ortho GRID Mattress',
            value,
            buyingSignals: buyingSignals || [],
            notes: notes || ''
          })
        });

        if (response.status === 404) {
          console.warn('[Calling:ExotelAI] /api/exotel/call returned 404, attempting fallback to /.netlify/functions/exotel-call');
          response = await fetch('/.netlify/functions/exotel-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              clientName: name,
              mode: 'EXOTEL_AI',
              leadId: leadId || 'lead-1',
              product: product || 'Ortho GRID Mattress',
              value,
              buyingSignals: buyingSignals || [],
              notes: notes || ''
            })
          });
        }

        const data = await response.json();
        console.log(`[Calling:ExotelAI] Backend response: HTTP ${response.status}, success: ${Boolean(data?.success)}`);

        if (!response.ok || !data.success) {
          const displayError = data.message || 'AI Call initiation failed';
          const detailedExplanation = data.troubleshooting ? `${displayError} — ${data.troubleshooting}` : displayError;

          setCallState((prev) => ({
            ...prev,
            lifecycle: data.configured === false ? 'DIALING' : 'ENDED',
            isConfigured: data.configured !== false,
            providerError: displayError,
            aiResponseText: detailedExplanation
          }));
          return;
        }

        const callSid = data.callSid;
        const sessionId = data.sessionId;
        exotelCallSidRef.current = callSid;

        setCallState((prev) => ({
          ...prev,
          lifecycle: 'RINGING',
          exotelCallSid: callSid,
          voiceSessionId: sessionId,
          exotelStatus: 'calling_customer',
          exotelCallerId: data.callerId,
          aiResponseText: `Exotel dialing customer mobile (${maskedPhone}) directly. Employee phone is bypassed.`
        }));

        if (exotelPollIntervalRef.current) {
          clearInterval(exotelPollIntervalRef.current);
        }

        let isBridgeConnected = false;

        exotelPollIntervalRef.current = window.setInterval(async () => {
          try {
            const queryParams = new URLSearchParams();
            if (callSid) queryParams.set('callSid', callSid);
            if (sessionId) queryParams.set('sessionId', sessionId);

            let statusRes = await fetch(`/api/exotel/call-status?${queryParams.toString()}`);
            if (statusRes.status === 404) {
              statusRes = await fetch(`/.netlify/functions/exotel-status?${queryParams.toString()}`);
            }
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (!statusData.success) return;

            const currentStatus = statusData.status;

            if (statusData.transcript && Array.isArray(statusData.transcript)) {
              const fullTranscript = statusData.transcript
                .map((t: { speaker: string; text: string }) => `${t.speaker === 'assistant' ? 'AI Voicebot' : name}: ${t.text}`)
                .join('\n');
              setAiSpeechTranscript(fullTranscript);
              setCallState((prev) => ({ ...prev, aiTranscript: fullTranscript }));
            }

            if (currentStatus === 'calling_customer') {
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'RINGING',
                exotelStatus: 'calling_customer',
                aiResponseText: `Exotel dialing customer (${maskedPhone}). Waiting for answer...`
              }));
            } else if (
              currentStatus === 'customer_answered' ||
              currentStatus === 'ai_speaking' ||
              currentStatus === 'ai_listening' ||
              currentStatus === 'connected'
            ) {
              if (!isBridgeConnected) {
                isBridgeConnected = true;
                timerIntervalRef.current = window.setInterval(() => {
                  setCallState((prev) => ({
                    ...prev,
                    durationSeconds: prev.durationSeconds + 1
                  }));
                }, 1000);
              }

              let responseSnippet = 'Customer answered. AI Voicebot connected with Gemini Live.';
              if (currentStatus === 'ai_speaking') {
                responseSnippet = statusData.transcriptSnippet ? `AI: "${statusData.transcriptSnippet}"` : 'AI Assistant speaking...';
              } else if (currentStatus === 'ai_listening') {
                responseSnippet = 'Listening to customer speech...';
              }

              setCallState((prev) => ({
                ...prev,
                lifecycle: 'CONNECTED',
                exotelStatus: currentStatus,
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: responseSnippet
              }));
            } else if (
              currentStatus === 'completed' ||
              currentStatus === 'busy' ||
              currentStatus === 'no_answer' ||
              currentStatus === 'failed' ||
              currentStatus === 'cancelled'
            ) {
              if (exotelPollIntervalRef.current) {
                clearInterval(exotelPollIntervalRef.current);
                exotelPollIntervalRef.current = null;
              }
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }

              const finalDuration = statusData.duration || callStateRef.current.durationSeconds;
              const mins = Math.floor(finalDuration / 60);
              const secs = finalDuration % 60;
              const durationStr = `${mins}m ${secs}s`;

              setCallState((prev) => ({
                ...prev,
                lifecycle: 'ENDED',
                exotelStatus: currentStatus,
                durationSeconds: finalDuration,
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: `AI Call finished with status: ${currentStatus.replace('_', ' ').toUpperCase()}`
              }));

              const nowTimeStr = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              recordCallInteraction({
                id: `call-ai-${callSid || Date.now()}`,
                name,
                initials,
                timeText: nowTimeStr,
                duration: durationStr,
                type: 'outbound',
                phone,
                sopScore: 98,
                greetingPassed: true,
                provider: 'exotel_ai',
                callMode: 'ai_voicebot',
                isDemoRecord: false,
                callSid,
                notes: `AI Voicebot Outbound Call to ${name} (${phone}) regarding ${product || 'Sleep Company products'} - Status: ${currentStatus}. Duration: ${durationStr}. Call SID: ${callSid}. ${statusData.transcriptSnippet ? `Recent snippet: ${statusData.transcriptSnippet}` : ''}`
              });
            }
          } catch (pollErr) {
            console.warn('[Calling:ExotelAI] Status polling error:', pollErr);
          }
        }, 2000);
      } catch (err: any) {
        console.error('[Calling:ExotelAI] Error calling endpoint:', err);
        setCallState((prev) => ({
          ...prev,
          lifecycle: 'ENDED',
          providerError: err?.message || 'Network error reaching backend.',
          aiResponseText: 'Network error communicating with telephony service.'
        }));
      }
      return;
    }

    if (mode === 'TWILIO_AI') {
      const maskedPhone = phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : '[NONE]';
      console.log(`[Calling:TwilioAI] Initiating customer-first outbound call for "${name}" (${maskedPhone}) regarding "${product || 'Sleep Company enquiry'}"`);

      const endpoint = '/api/twilio/call';
      try {
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            clientName: name,
            leadId: leadId || 'lead-1',
            product: product || 'Ortho GRID Mattress',
            value,
            buyingSignals: buyingSignals || [],
            notes: notes || '',
            isTrialSample: Boolean(isTrialSample),
            sampleTwiMLUrl
          })
        });

        if (response.status === 404) {
          console.warn('[Calling:TwilioAI] /api/twilio/call returned 404, attempting fallback to /.netlify/functions/twilio-call');
          response = await fetch('/.netlify/functions/twilio-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              clientName: name,
              leadId: leadId || 'lead-1',
              product: product || 'Ortho GRID Mattress',
              value,
              buyingSignals: buyingSignals || [],
              notes: notes || '',
              isTrialSample: Boolean(isTrialSample),
              sampleTwiMLUrl
            })
          });
        }

        const data = await response.json();
        console.log(`[Calling:TwilioAI] Backend response: HTTP ${response.status}, success: ${Boolean(data?.success)}, isTrialSample: ${Boolean(data?.isTrialSample)}`);

        if (!response.ok || !data.success) {
          const displayError = data.message || 'Twilio call creation failed';
          const detailedExplanation = data.troubleshooting ? `${displayError} — ${data.troubleshooting}` : displayError;

          setCallState((prev) => ({
            ...prev,
            lifecycle: 'ENDED',
            twilioStatus: 'failed',
            twilioStage: 'rejected',
            twilioCallSid: undefined, // Never display a fake or successful Call SID on failure
            simulationSid: undefined,
            providerError: displayError,
            aiResponseText: detailedExplanation,
            twilioErrorDetails: {
              code: data.error,
              message: data.message || displayError,
              trialLimitation: Boolean(data.trialLimitation || data.isTrial),
              rejectedParameters: data.rejectedParameters,
              troubleshooting: data.troubleshooting
            }
          }));
          return;
        }

        const callSid = data.callSid;
        const sessionId = data.sessionId;
        const isSimulation = Boolean(data.isSimulation);
        const returnedIsTrialSample = Boolean(data.isTrialSample || isTrialSample);
        const trialSampleUrl = data.trialSampleUrl || sampleTwiMLUrl || (returnedIsTrialSample ? 'http://demo.twilio.com/docs/voice.xml' : undefined);

        if (!isSimulation && callSid) {
          twilioCallSidRef.current = callSid;
        }

        setCallState((prev) => ({
          ...prev,
          lifecycle: isSimulation ? 'RINGING' : 'DIALING',
          twilioCallSid: isSimulation ? undefined : callSid,
          simulationSid: isSimulation ? callSid : undefined,
          isSimulation,
          isTrialSample: returnedIsTrialSample,
          trialSampleUrl,
          voiceSessionId: sessionId,
          twilioStatus: 'queued',
          twilioStage: 'call_created',
          aiResponseText: isSimulation
            ? (returnedIsTrialSample
                ? `Stage 2: Official carrier sample call created in simulation mode (http://demo.twilio.com/docs/voice.xml). Non-AI test.`
                : `Stage 2: Twilio call created in Safety Simulation mode. Advancing to customer ring simulation.`)
            : (returnedIsTrialSample
                ? `Stage 2: Official carrier sample call created (SID: ${callSid}). Playing demo.twilio.com sample audio. Non-AI test.`
                : `Stage 2: Twilio call created successfully (SID: ${callSid}). Waiting for telecom carrier ring status...`)
        }));

        if (twilioPollIntervalRef.current) {
          clearInterval(twilioPollIntervalRef.current);
        }

        let isBridgeConnected = false;

        twilioPollIntervalRef.current = window.setInterval(async () => {
          try {
            const queryParams = new URLSearchParams();
            if (callSid) queryParams.set('callSid', callSid);
            if (sessionId) queryParams.set('sessionId', sessionId);

            let statusRes = await fetch(`/api/twilio/call-status?${queryParams.toString()}`);
            if (statusRes.status === 404) {
              statusRes = await fetch(`/.netlify/functions/twilio-status?${queryParams.toString()}`);
            }
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (!statusData.success) return;

            const currentStatus = statusData.status;

            if (statusData.transcript && Array.isArray(statusData.transcript)) {
              const fullTranscript = statusData.transcript
                .map((t: { turn: number; customerSpeech?: string; aiResponseText?: string }) => {
                  const parts = [];
                  if (t.customerSpeech) parts.push(`${name}: "${t.customerSpeech}"`);
                  if (t.aiResponseText) parts.push(`AI Assistant: "${t.aiResponseText}"`);
                  return parts.join('\n');
                })
                .filter(Boolean)
                .join('\n');
              setAiSpeechTranscript(fullTranscript);
              setCallState((prev) => ({ ...prev, aiTranscript: fullTranscript }));
            }

            if (currentStatus === 'queued') {
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'DIALING',
                twilioStatus: 'queued',
                twilioStage: 'call_created',
                aiResponseText: `Stage 2: Twilio call queued at carrier gateway. Dispatching to customer mobile...`
              }));
            } else if (currentStatus === 'ringing') {
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'RINGING',
                twilioStatus: 'ringing',
                twilioStage: 'ringing',
                aiResponseText: `Stage 3: Customer mobile (${maskedPhone}) is ringing on carrier network...`
              }));
            } else if (
              currentStatus === 'customer_answered' ||
              currentStatus === 'in-progress' ||
              currentStatus === 'ai_speaking' ||
              currentStatus === 'listening' ||
              currentStatus === 'processing'
            ) {
              if (!isBridgeConnected) {
                isBridgeConnected = true;
                timerIntervalRef.current = window.setInterval(() => {
                  setCallState((prev) => ({
                    ...prev,
                    durationSeconds: prev.durationSeconds + 1
                  }));
                }, 1000);
              }

              let responseSnippet = 'Stage 4: Customer answered. AI Assistant speaking...';
              if (callStateRef.current.isTrialSample) {
                responseSnippet = 'Stage 4: Customer answered. Playing official Twilio carrier demo audio. (Note: Non-AI telephony verification).';
              } else if (currentStatus === 'ai_speaking') {
                responseSnippet = statusData.transcriptSnippet ? `AI: "${statusData.transcriptSnippet}"` : 'Stage 4: Customer answered. AI Assistant speaking...';
              } else if (currentStatus === 'listening') {
                responseSnippet = 'Stage 4: Listening to customer speech via Twilio <Gather>...';
              } else if (currentStatus === 'processing') {
                responseSnippet = 'Stage 4: Processing customer question with Gemini...';
              }

              setCallState((prev) => ({
                ...prev,
                lifecycle: 'CONNECTED',
                twilioStatus: currentStatus,
                twilioStage: 'customer_answered',
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: responseSnippet
              }));
            } else if (
              currentStatus === 'completed' ||
              currentStatus === 'busy' ||
              currentStatus === 'no-answer' ||
              currentStatus === 'failed' ||
              currentStatus === 'canceled'
            ) {
              if (twilioPollIntervalRef.current) {
                clearInterval(twilioPollIntervalRef.current);
                twilioPollIntervalRef.current = null;
              }
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }

              const finalDuration = statusData.duration || callStateRef.current.durationSeconds;
              const mins = Math.floor(finalDuration / 60);
              const secs = finalDuration % 60;
              const durationStr = `${mins}m ${secs}s`;

              setCallState((prev) => ({
                ...prev,
                lifecycle: 'ENDED',
                twilioStatus: currentStatus,
                durationSeconds: finalDuration,
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: `Twilio AI Call finished: ${currentStatus.toUpperCase()}`
              }));

              const nowTimeStr = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              recordCallInteraction({
                id: `call-twilio-${callSid || Date.now()}`,
                name,
                initials,
                timeText: nowTimeStr,
                duration: durationStr,
                type: 'outbound',
                phone,
                sopScore: 98,
                greetingPassed: true,
                provider: 'twilio',
                callMode: 'twilio_ai',
                isDemoRecord: false,
                callSid,
                notes: `Twilio AI Outbound Call to ${name} (${phone}) regarding ${product || 'Sleep Company products'} - Status: ${currentStatus}. Duration: ${durationStr}. Call SID: ${callSid}. ${statusData.transcriptSnippet ? `Snippet: ${statusData.transcriptSnippet}` : ''}`
              });
            }
          } catch (pollErr) {
            console.warn('[Calling:TwilioAI] Status polling error:', pollErr);
          }
        }, 1500);
      } catch (err: any) {
        console.error('[Calling:TwilioAI] Error calling endpoint:', err);
        setCallState((prev) => ({
          ...prev,
          lifecycle: 'ENDED',
          twilioStatus: 'failed',
          providerError: err?.message || 'Network error reaching backend.',
          aiResponseText: 'Network error communicating with Twilio voice service.'
        }));
      }
      return;
    }

    if (mode === 'EXOTEL_REAL') {
      const maskedPhone = phone ? `${phone.slice(0, 3)}***${phone.slice(-4)}` : '[NONE]';
      console.log(`[Calling:Exotel] Initiating outbound call for contact "${name}" (${maskedPhone})`);

      const endpoint = '/api/exotel/call';
      console.log(`[Calling:Exotel] Dispatching call request to endpoint: ${endpoint}`);

      try {
        let response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            clientName: name
          })
        });

        // Graceful fallback: If /api/exotel/call 404s (e.g. redirect rules not processed), try direct Netlify function path
        if (response.status === 404) {
          console.warn('[Calling:Exotel] /api/exotel/call returned 404, attempting fallback to /.netlify/functions/exotel-call');
          response = await fetch('/.netlify/functions/exotel-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              clientName: name
            })
          });
        }

        const data = await response.json();
        console.log(`[Calling:Exotel] Backend response: HTTP ${response.status}, success: ${Boolean(data?.success)}`);

        if (!response.ok || !data.success) {
          console.warn('[Calling:Exotel] Initiation rejected or unconfigured:', {
            error: data.error,
            providerStatus: data.providerStatus,
            providerCode: data.providerCode,
            message: data.message,
            troubleshooting: data.troubleshooting,
            configured: data.configured
          });

          const displayError = data.message || 'Call initiation failed';
          const detailedExplanation = data.troubleshooting ? `${displayError} — ${data.troubleshooting}` : displayError;

          setCallState((prev) => ({
            ...prev,
            lifecycle: data.configured === false ? 'DIALING' : 'ENDED',
            isConfigured: data.configured !== false,
            providerError: displayError,
            aiResponseText: detailedExplanation
          }));
          return;
        }

        const callSid = data.callSid;
        exotelCallSidRef.current = callSid;
        console.log(`[Calling:Exotel] Call initiated successfully. Call SID: ${callSid}`);

        const maskedAgent = data.agentPhone ? `${data.agentPhone.slice(0, 3)}***${data.agentPhone.slice(-4)}` : 'configured phone';
        setCallState((prev) => ({
          ...prev,
          lifecycle: 'RINGING',
          exotelCallSid: callSid,
          exotelStatus: 'calling_employee',
          exotelCallerId: data.callerId,
          aiResponseText: `Exotel dialing employee (${maskedAgent}). Please answer Leg A.`
        }));

        if (exotelPollIntervalRef.current) {
          clearInterval(exotelPollIntervalRef.current);
        }

        let isBridgeConnected = false;

        exotelPollIntervalRef.current = window.setInterval(async () => {
          try {
            let statusRes = await fetch(`/api/exotel/call-status?callSid=${encodeURIComponent(callSid)}`);
            if (statusRes.status === 404) {
              statusRes = await fetch(`/.netlify/functions/exotel-status?callSid=${encodeURIComponent(callSid)}`);
            }
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (!statusData.success) return;

            const currentStatus = statusData.status;

            if (currentStatus === 'calling_employee') {
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'RINGING',
                exotelStatus: 'calling_employee',
                aiResponseText: 'Calling employee phone... Answer to connect.'
              }));
            } else if (currentStatus === 'employee_answered' || currentStatus === 'calling_client') {
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'RINGING',
                exotelStatus: 'calling_client',
                aiResponseText: `Employee answered. Ringing client ${name} (${maskedPhone})...`
              }));
            } else if (currentStatus === 'connected') {
              if (!isBridgeConnected) {
                isBridgeConnected = true;
                timerIntervalRef.current = window.setInterval(() => {
                  setCallState((prev) => ({
                    ...prev,
                    durationSeconds: prev.durationSeconds + 1
                  }));
                }, 1000);
              }
              setCallState((prev) => ({
                ...prev,
                lifecycle: 'CONNECTED',
                exotelStatus: 'connected',
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: `Connected: PSTN line active between employee and ${name}.`
              }));
            } else if (
              currentStatus === 'completed' ||
              currentStatus === 'busy' ||
              currentStatus === 'no_answer' ||
              currentStatus === 'failed' ||
              currentStatus === 'cancelled'
            ) {
              if (exotelPollIntervalRef.current) {
                clearInterval(exotelPollIntervalRef.current);
                exotelPollIntervalRef.current = null;
              }
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }

              const finalDuration = statusData.duration || callStateRef.current.durationSeconds;
              const mins = Math.floor(finalDuration / 60);
              const secs = finalDuration % 60;
              const durationStr = `${mins}m ${secs}s`;

              setCallState((prev) => ({
                ...prev,
                lifecycle: 'ENDED',
                exotelStatus: currentStatus,
                durationSeconds: finalDuration,
                recordingUrl: statusData.recordingUrl || prev.recordingUrl,
                aiResponseText: `Call finished with provider status: ${currentStatus.replace('_', ' ').toUpperCase()}`
              }));

              const nowTimeStr = `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              recordCallInteraction({
                id: `call-exo-${callSid}`,
                name,
                initials,
                timeText: nowTimeStr,
                duration: durationStr,
                type: 'outbound',
                phone,
                sopScore: 94,
                greetingPassed: true,
                provider: 'exotel',
                isDemoRecord: false,
                callSid,
                recordingUrl: statusData.recordingUrl || undefined,
                notes: `Exotel Real Outbound Call to ${name} (${phone}) - Status: ${currentStatus}. Duration: ${durationStr}. Call SID: ${callSid}.`
              });
            }
          } catch (pollErr) {
            console.warn('[Calling:Exotel] Status polling error:', pollErr);
          }
        }, 2500);

      } catch (err: any) {
        console.error('[Calling:Exotel] Error calling endpoint:', err);
        setCallState((prev) => ({
          ...prev,
          lifecycle: 'ENDED',
          providerError: err?.message || 'Network error reaching backend.',
          aiResponseText: 'Network error communicating with telephony service.'
        }));
      }
      return;
    }

    if (mode === 'WEBRTC_PEER') {
      setTimeout(async () => {
        setCallState((prev) => ({
          ...prev,
          lifecycle: 'RINGING',
          aiResponseText: 'Ringing peer frontline agent...'
        }));

        if (broadcastChannelRef.current) {
          const pc = setupPeerConnection();
          if (pc) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} broadcasting OFFER_CALL to channel`);
              broadcastChannelRef.current.postMessage({
                type: 'OFFER_CALL',
                payload: {
                  callerName: name,
                  callerTabId: tabSessionId.current,
                  channelId: 'onground-peer',
                  offer: {
                    type: offer.type,
                    sdp: offer.sdp
                  },
                  expectedValue: value,
                  productInterest: product
                }
              });
            } catch (err) {
              console.warn('[Calling:WebRTC] WebRTC offer creation error', err);
            }
          }
        }
      }, 500);
    } else if (mode === 'AI_VOICE') {
      setTimeout(() => {
        setCallState((prev) => ({ ...prev, lifecycle: 'RINGING' }));

        setTimeout(() => {
          setCallState((prev) => ({ ...prev, lifecycle: 'CONNECTED' }));

          timerIntervalRef.current = window.setInterval(() => {
            setCallState((prev) => ({
              ...prev,
              durationSeconds: prev.durationSeconds + 1
            }));
          }, 1000);

          startVoiceAI(name);
        }, 1800);
      }, 1200);
    }
  };

  const endCall = () => {
    console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} ending call`);
    if (exotelPollIntervalRef.current) {
      clearInterval(exotelPollIntervalRef.current);
      exotelPollIntervalRef.current = null;
    }
    if (twilioPollIntervalRef.current) {
      clearInterval(twilioPollIntervalRef.current);
      twilioPollIntervalRef.current = null;
    }
    stopMediaCapture();
    pendingIceCandidatesRef.current = [];

    const targetTabId = remotePeerTabIdRef.current;
    remotePeerTabIdRef.current = null;
    callStateRef.current = {
      ...callStateRef.current,
      lifecycle: 'ENDED'
    };

    setCallState((prev) => ({
      ...prev,
      lifecycle: 'ENDED',
      aiResponseText: 'Call terminated'
    }));

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CALL_ENDED',
        payload: {
          senderTabId: tabSessionId.current,
          targetTabId
        }
      });
    }

    setTimeout(() => {
      callStateRef.current = initialCallState;
      setCallState(initialCallState);
    }, 2000);
  };

  const toggleMute = () => {
    const nextMuted = !callState.isMuted;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
        console.log(`[Calling:WebRTC] Audio track ${track.id} enabled=${track.enabled}`);
      });
    }
    console.log(`[Calling:WebRTC] Mic mute toggled on tab ${tabSessionId.current}: isMuted=${nextMuted}`);
    setCallState((prev) => ({ ...prev, isMuted: nextMuted }));
  };

  const acceptIncomingPeerCall = async () => {
    if (!incomingPeerCall) return;
    const { callerName, offer, callerTabId } = incomingPeerCall;
    console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} accepting incoming call from '${callerName}' (${callerTabId})`);
    setIncomingPeerCall(null);
    remotePeerTabIdRef.current = callerTabId;

    await startAudioVisualizer();

    setCallState({
      lifecycle: 'CONNECTED',
      mode: 'WEBRTC_PEER',
      contactName: callerName,
      contactInitials: 'PE',
      contactPhone: 'In-App WebRTC Peer',
      durationSeconds: 0,
      isMuted: false,
      aiResponseText: 'WebRTC in-app peer call connected'
    });

    const pc = setupPeerConnection();
    if (pc && offer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} set remote description (offer)`);

        // Drain queued ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          if (cand) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
              console.log(`[Calling:WebRTC] Drained pending ICE candidate on tab ${tabSessionId.current}`);
            } catch (iceErr) {
              console.warn('[Calling:WebRTC] Error adding pending ICE candidate', iceErr);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} created answer, sending CALL_ACCEPTED to Tab ${callerTabId}`);

        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'CALL_ACCEPTED',
            payload: {
              answer: {
                type: answer.type,
                sdp: answer.sdp
              },
              responderTabId: tabSessionId.current,
              targetTabId: callerTabId
            }
          });
        }
      } catch (err) {
        console.warn('[Calling:WebRTC] Error negotiating WebRTC answer', err);
      }
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setCallState((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1
      }));
    }, 1000);
  };

  const rejectIncomingPeerCall = () => {
    if (!incomingPeerCall) return;
    const { callerTabId } = incomingPeerCall;
    console.log(`[Calling:WebRTC] Tab ${tabSessionId.current} rejected incoming call from ${callerTabId}`);
    setIncomingPeerCall(null);
    pendingIceCandidatesRef.current = [];

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'CALL_DECLINED',
        payload: {
          senderTabId: tabSessionId.current,
          targetTabId: callerTabId
        }
      });
    }
  };

  return (
    <CallingContext.Provider
      value={{
        callState,
        tabSessionId: tabSessionId.current,
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
