import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  GeminiLiveClient,
  LiveConnectionState,
  ToolExecutionEvent
} from '../services/geminiLive/geminiLiveClient';
import { businessDataProvider } from '../services/businessData/BusinessDataProvider';
import { VerifiedProduct } from '../services/businessData/types';

interface GeminiLiveContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connectionState: LiveConnectionState;
  isConfigured: boolean | null;
  serverModel: string;
  errorMessage: string | null;
  userTranscript: string;
  aiTranscript: string;
  toolEvents: ToolExecutionEvent[];
  audioLevel: number;
  isAiSpeaking: boolean;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiTranscript, setAiTranscript] = useState<string>('');
  const [toolEvents, setToolEvents] = useState<ToolExecutionEvent[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Live business data state
  const [products, setProducts] = useState<VerifiedProduct[]>([]);
  const [catalogVersion, setCatalogVersion] = useState<string>('2026.10.1');

  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Check server configuration status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(data.configured);
        if (data.targetModel) setServerModel(data.targetModel);
      } else {
        setIsConfigured(false);
      }
    } catch {
      setIsConfigured(false);
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
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    checkStatus();
  };

  const closeModal = () => {
    if (connectionState !== 'IDLE' && connectionState !== 'DISCONNECTED') {
      endSession();
    }
    setIsModalOpen(false);
  };

  const startSession = async () => {
    setErrorMessage(null);
    setUserTranscript('');
    setAiTranscript('');
    setToolEvents([]);

    const client = new GeminiLiveClient({
      onStateChange: (state) => {
        setConnectionState(state);
        setIsAiSpeaking(state === 'SPEAKING');
      },
      onError: (err) => {
        setErrorMessage(err.message);
      },
      onUserTranscript: (text) => {
        setUserTranscript((prev) => (prev ? `${prev} ${text}` : text));
      },
      onAiTranscript: (text) => {
        setAiTranscript((prev) => (prev ? `${prev} ${text}` : text));
      },
      onToolExecuted: (event) => {
        setToolEvents((prev) => [event, ...prev]);
        refreshProducts();
      },
      onInterrupted: () => {
        console.log('[GeminiLiveContext] AI speech interrupted by user speech');
      },
      onAudioLevel: (level, isAi) => {
        setAudioLevel(level);
        setIsAiSpeaking(isAi);
      }
    });

    clientRef.current = client;
    await client.connect();
  };

  const endSession = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnectionState('IDLE');
    setIsAiSpeaking(false);
    setAudioLevel(0);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (clientRef.current) {
      clientRef.current.setMute(nextMuted);
    }
  };

  const clearError = () => {
    setErrorMessage(null);
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
        isConfigured,
        serverModel,
        errorMessage,
        userTranscript,
        aiTranscript,
        toolEvents,
        audioLevel,
        isAiSpeaking,
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
