import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  GeminiLiveClient,
  LiveConnectionState,
  ToolExecutionEvent
} from '../services/geminiLive/geminiLiveClient';
import {
  ModelSwitchEvent,
  ModelFailureCategory,
  DEFAULT_FALLBACK_CHAIN
} from '../services/geminiLive/modelFallbackManager';
import { businessDataProvider } from '../services/businessData/BusinessDataProvider';
import { VerifiedProduct } from '../services/businessData/types';
import type { DiscoveredModelInfo } from '../../server/modelDiscoveryService';

interface GeminiLiveContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connectionState: LiveConnectionState;
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
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
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

  const startSession = async () => {
    setErrorMessage(null);
    setUserTranscript('');
    setAiTranscript('');
    setToolEvents([]);

    const client = new GeminiLiveClient({
      primaryModel: activeModel || serverModel,
      fallbackChain: fallbackChain.length > 0 ? fallbackChain : undefined,
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
    setModelSwitchEvent(null);
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
