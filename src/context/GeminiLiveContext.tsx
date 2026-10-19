import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  GeminiLiveClient,
  LiveConnectionState,
  ToolExecutionEvent,
  AudioTelemetry
} from '../services/geminiLive/geminiLiveClient';
import {
  ModelSwitchEvent,
  ModelFailureCategory,
  DEFAULT_FALLBACK_CHAIN
} from '../services/geminiLive/modelFallbackManager';
import {
  BrowserSpeechRecognition,
  SpeechTranscriptEvent
} from '../services/geminiLive/browserSpeechRecognition';
import { businessDataProvider } from '../services/businessData/BusinessDataProvider';
import { VerifiedProduct } from '../services/businessData/types';
import type { DiscoveredModelInfo } from '../../server/modelDiscoveryService';

export type VoiceActivityState =
  | 'MIC_OFF'
  | 'LISTENING'
  | 'VOICE_DETECTED'
  | 'SENDING_AUDIO'
  | 'AI_THINKING'
  | 'AI_SPEAKING'
  | 'ERROR';

export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isPartial?: boolean;
}

interface GeminiLiveContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connectionState: LiveConnectionState;
  voiceActivityState: VoiceActivityState;
  audioTelemetry: AudioTelemetry;
  turns: ConversationTurn[];
  sessionDuration: number;
  formattedDuration: string;
  clearTranscript: () => void;
  isConfigured: boolean | null;
  serverModel: string;
  activeModel: string;
  fallbackChain: string[];
  discoveredModels: DiscoveredModelInfo[];
  isCheckingModels: boolean;
  checkAvailableModels: (refresh?: boolean) => Promise<void>;
  modelSwitchEvent: ModelSwitchEvent | null;
  fallbackHistory: ModelSwitchEvent[];
  simulateFallback: (category: ModelFailureCategory, reason: string) => boolean;
  errorMessage: string | null;
  userTranscript: string;
  aiTranscript: string;
  toolEvents: ToolExecutionEvent[];
  audioLevel: number;
  isAiSpeaking: boolean;
  isAiThinking: boolean;
  isMuted: boolean;
  startSession: () => Promise<void>;
  endSession: () => void;
  toggleMute: () => void;
  clearError: () => void;

  // Live Data Sync & Mutation Test Harness
  products: VerifiedProduct[];
  updateProductPrice: (productId: string, size: string, newPrice: number) => boolean;
  resetCatalog: () => void;
  catalogVersion: string;
}

const GeminiLiveContext = createContext<GeminiLiveContextType | undefined>(undefined);

export const GeminiLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('IDLE');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [serverModel, setServerModel] = useState<string>('gemini-3.8-live');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.8-live');
  const [fallbackChain, setFallbackChain] = useState<string[]>(DEFAULT_FALLBACK_CHAIN);
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModelInfo[]>([]);
  const [isCheckingModels, setIsCheckingModels] = useState<boolean>(false);
  const [modelSwitchEvent, setModelSwitchEvent] = useState<ModelSwitchEvent | null>(null);
  const [fallbackHistory, setFallbackHistory] = useState<ModelSwitchEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiTranscript, setAiTranscript] = useState<string>('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [toolEvents, setToolEvents] = useState<ToolExecutionEvent[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [audioTelemetry, setAudioTelemetry] = useState<AudioTelemetry>({
    inputLevel: 0,
    outputLevel: 0,
    isVoiceDetected: false,
    isSendingAudio: false,
    chunksSent: 0,
    bytesSent: 0
  });

  // Live business data state
  const [products, setProducts] = useState<VerifiedProduct[]>([]);
  const [catalogVersion, setCatalogVersion] = useState<string>('2026.10.1');

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Formatted duration MM:SS
  const formattedDuration = useMemo(() => {
    const mins = Math.floor(sessionDuration / 60);
    const secs = sessionDuration % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [sessionDuration]);

  // Compute prominent, unmistakable 7-state voice activity
  const voiceActivityState = useMemo<VoiceActivityState>(() => {
    if (errorMessage || connectionState === 'ERROR') {
      return 'ERROR';
    }
    if (connectionState === 'IDLE' || connectionState === 'DISCONNECTED' || connectionState === 'REQUESTING_MIC' || isMuted) {
      return 'MIC_OFF';
    }
    if (isAiSpeaking || connectionState === 'SPEAKING') {
      return 'AI_SPEAKING';
    }
    if (isAiThinking) {
      return 'AI_THINKING';
    }
    if (audioTelemetry.isSendingAudio) {
      return 'SENDING_AUDIO';
    }
    if (audioTelemetry.isVoiceDetected) {
      return 'VOICE_DETECTED';
    }
    if (connectionState === 'LISTENING') {
      return 'LISTENING';
    }
    return 'MIC_OFF';
  }, [
    errorMessage,
    connectionState,
    isMuted,
    isAiSpeaking,
    isAiThinking,
    audioTelemetry.isSendingAudio,
    audioTelemetry.isVoiceDetected
  ]);

  // Check server configuration status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.configured);
        if (data.targetModel) {
          setServerModel(data.targetModel);
          if (!activeModel || activeModel === 'gemini-3.8-live') {
            setActiveModel(data.targetModel);
          }
        }
      } else {
        setIsConfigured(false);
      }
    } catch {
      setIsConfigured(false);
    }
  };

  // Model discovery check against GET /api/gemini/models
  const checkAvailableModels = async (refresh = false) => {
    setIsCheckingModels(true);
    try {
      const url = `/api/gemini/models${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.models) {
          setDiscoveredModels(data.models);
        }
        if (data.fallbackChain && data.fallbackChain.length > 0) {
          setFallbackChain(data.fallbackChain);
          if (clientRef.current) {
            clientRef.current.getFallbackManager().updateChainFromDiscovery(data.fallbackChain);
          }
        }
        if (data.primaryModel) {
          setServerModel(data.primaryModel);
          setActiveModel(data.primaryModel);
        }
      }
    } catch (e) {
      console.warn('[GeminiLiveContext] Model discovery check error:', e);
    } finally {
      setIsCheckingModels(false);
    }
  };

  // Sync products on mount and subscribe to business-data-updated events
  const refreshProducts = async () => {
    const res = await businessDataProvider.searchProducts('');
    if (res.verified && res.data) {
      setProducts(res.data);
      if (res.metadata?.version) setCatalogVersion(res.metadata.version);
    }
  };

  useEffect(() => {
    checkStatus();
    refreshProducts();

    const handleUpdate = () => {
      refreshProducts();
    };

    window.addEventListener('business-data-updated', handleUpdate);
    return () => {
      window.removeEventListener('business-data-updated', handleUpdate);
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechRecRef.current) speechRecRef.current.stop();
      if (clientRef.current) clientRef.current.disconnect();
    };
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    checkStatus();
    checkAvailableModels(false);
  };

  const closeModal = () => {
    if (connectionState !== 'IDLE' && connectionState !== 'DISCONNECTED') {
      endSession();
    }
    setIsModalOpen(false);
  };

  const clearTranscript = () => {
    setTurns([]);
    setUserTranscript('');
    setAiTranscript('');
  };

  const startSession = async () => {
    setErrorMessage(null);
    setIsAiThinking(false);
    setAudioLevel(0);
    setSessionDuration(0);

    // Human-friendly error translation helper
    const translateError = (err: any): string => {
      const msg = err.message || '';
      const name = err.name || '';
      if (name === 'NotAllowedError' || msg.includes('Permission denied') || msg.includes('not allowed')) {
        return 'Microphone access was denied. Please allow microphone permissions in your browser address bar to speak with the Voice Assistant.';
      }
      if (name === 'NotFoundError' || msg.includes('DevicesNotFoundError')) {
        return 'No microphone was detected on your computer. Please connect a headset or microphone and try again.';
      }
      if (name === 'NotReadableError') {
        return 'Your microphone is currently being used by another application. Please close other voice apps and retry.';
      }
      if (msg.includes('1008') || msg.includes('Unregistered callers') || msg.includes('API key')) {
        return 'API credential authentication notice. Please verify your GEMINI_API_KEY in .env.';
      }
      return msg || 'Failed to establish Gemini Live voice session.';
    };

    // Start session timer when connection succeeds
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    // Initialize Browser Speech Recognition for instant user STT
    try {
      const speechRec = new BrowserSpeechRecognition(
        (evt: SpeechTranscriptEvent) => {
          setTurns((prev) => {
            const lastIndex = prev.length - 1;
            const lastTurn = prev[lastIndex];

            // If last turn was from the user and still partial, update in place
            if (lastTurn && lastTurn.speaker === 'user' && lastTurn.isPartial) {
              const updated = [...prev];
              updated[lastIndex] = {
                ...lastTurn,
                text: evt.text,
                isPartial: !evt.isFinal,
                timestamp: evt.timestamp
              };
              return updated;
            }

            // If last turn was final and from user, avoid duplicate immediate repeats
            if (lastTurn && lastTurn.speaker === 'user' && !lastTurn.isPartial && !evt.isFinal) {
              if (lastTurn.text === evt.text) return prev;
            }

            // Create new user turn
            return [
              ...prev,
              {
                id: Math.random().toString(36).substring(2, 9),
                speaker: 'user',
                text: evt.text,
                timestamp: evt.timestamp,
                isPartial: !evt.isFinal
              }
            ];
          });
          setUserTranscript(evt.text);
        },
        (err) => {
          console.warn('[GeminiLiveContext] Speech recognition notice:', err);
        }
      );
      speechRec.start();
      speechRecRef.current = speechRec;
    } catch (e) {
      console.warn('[GeminiLiveContext] Speech recognition initialization notice:', e);
    }

    const client = new GeminiLiveClient({
      primaryModel: activeModel || serverModel,
      fallbackChain: fallbackChain.length > 0 ? fallbackChain : undefined,
      onStateChange: (state) => {
        setConnectionState(state);
        setIsAiSpeaking(state === 'SPEAKING');
        if (state === 'SPEAKING') {
          setIsAiThinking(false);
        }
      },
      onError: (err) => {
        setErrorMessage(translateError(err));
        if (speechRecRef.current) speechRecRef.current.stop();
        if (timerRef.current) clearInterval(timerRef.current);
      },
      onUserTranscript: (text) => {
        // Fallback user transcript from Gemini Live if browser speech API was quiet
        setUserTranscript((prev) => (prev ? `${prev} ${text}` : text));
        setTurns((prev) => {
          const lastIndex = prev.length - 1;
          const lastTurn = prev[lastIndex];
          if (lastTurn && lastTurn.speaker === 'user') {
            if (!lastTurn.text.includes(text)) {
              const updated = [...prev];
              updated[lastIndex] = {
                ...lastTurn,
                text: `${lastTurn.text} ${text}`,
                isPartial: false
              };
              return updated;
            }
            return prev;
          }
          return [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              speaker: 'user',
              text: text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isPartial: false
            }
          ];
        });
      },
      onAiTranscript: (text) => {
        setAiTranscript((prev) => (prev ? `${prev} ${text}` : text));
        setTurns((prev) => {
          const lastIndex = prev.length - 1;
          const lastTurn = prev[lastIndex];
          if (lastTurn && lastTurn.speaker === 'assistant') {
            // Append streaming text chunks without duplication
            if (lastTurn.text.endsWith(text) || lastTurn.text.includes(text)) {
              return prev;
            }
            const updated = [...prev];
            updated[lastIndex] = {
              ...lastTurn,
              text: lastTurn.text ? `${lastTurn.text} ${text}` : text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return updated;
          }
          return [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              speaker: 'assistant',
              text: text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isPartial: false
            }
          ];
        });
      },
      onToolExecuted: (event) => {
        setToolEvents((prev) => [event, ...prev]);
        refreshProducts();
      },
      onInterrupted: () => {
        console.log('[GeminiLiveContext] AI speech interrupted by user speech');
        setIsAiSpeaking(false);
        setIsAiThinking(false);
      },
      onAudioLevel: (level, isAi) => {
        setAudioLevel(level);
        setIsAiSpeaking(isAi);
      },
      onAudioTelemetry: (telemetry) => {
        setAudioTelemetry(telemetry);
      },
      onAiThinkingChange: (thinking) => {
        setIsAiThinking(thinking);
      },
      onModelFallback: (switchEvent) => {
        setModelSwitchEvent(switchEvent);
        setFallbackHistory((prev) => [switchEvent, ...prev]);
        setActiveModel(switchEvent.toModel);
      },
      onActiveModelChanged: (model) => {
        setActiveModel(model);
      }
    });

    clientRef.current = client;
    try {
      await client.connect();
    } catch (connectErr: any) {
      setErrorMessage(translateError(connectErr));
      if (speechRecRef.current) speechRecRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const endSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecRef.current) {
      speechRecRef.current.stop();
      speechRecRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnectionState('IDLE');
    setIsAiSpeaking(false);
    setIsAiThinking(false);
    setAudioLevel(0);
    setAudioTelemetry({
      inputLevel: 0,
      outputLevel: 0,
      isVoiceDetected: false,
      isSendingAudio: false,
      chunksSent: 0,
      bytesSent: 0
    });
    setModelSwitchEvent(null);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (clientRef.current) {
      clientRef.current.setMute(nextMuted);
    }
    if (speechRecRef.current) {
      if (nextMuted) {
        speechRecRef.current.stop();
      } else {
        speechRecRef.current.start();
      }
    }
  };

  const clearError = () => {
    setErrorMessage(null);
  };

  const simulateFallback = (category: ModelFailureCategory, reason: string): boolean => {
    if (clientRef.current) {
      return clientRef.current.simulateFallbackTest(category, reason);
    }
    return false;
  };

  const updateProductPrice = (productId: string, size: string, newPrice: number): boolean => {
    const success = businessDataProvider.updateProductPrice(productId, size, newPrice);
    if (success) {
      refreshProducts();
    }
    return success;
  };

  const resetCatalog = () => {
    businessDataProvider.resetToDefault();
    refreshProducts();
  };

  return (
    <GeminiLiveContext.Provider
      value={{
        isModalOpen,
        openModal,
        closeModal,
        connectionState,
        voiceActivityState,
        audioTelemetry,
        turns,
        sessionDuration,
        formattedDuration,
        clearTranscript,
        isConfigured,
        serverModel,
        activeModel,
        fallbackChain,
        discoveredModels,
        isCheckingModels,
        checkAvailableModels,
        modelSwitchEvent,
        fallbackHistory,
        simulateFallback,
        errorMessage,
        userTranscript,
        aiTranscript,
        toolEvents,
        audioLevel,
        isAiSpeaking,
        isAiThinking,
        isMuted,
        startSession,
        endSession,
        toggleMute,
        clearError,
        products,
        updateProductPrice,
        resetCatalog,
        catalogVersion
      }}
    >
      {children}
    </GeminiLiveContext.Provider>
  );
};

export const useGeminiLive = (): GeminiLiveContextType => {
  const context = useContext(GeminiLiveContext);
  if (!context) {
    throw new Error('useGeminiLive must be used within a GeminiLiveProvider');
  }
  return context;
};
