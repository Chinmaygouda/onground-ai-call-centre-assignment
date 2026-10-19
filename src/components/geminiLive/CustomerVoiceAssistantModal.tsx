import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Headphones,
  X,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle2,
  Volume2,
  VolumeX,
  Radio,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './CustomerVoiceAssistantModal.module.css';

const DEMO_QUESTIONS = [
  'What are the current offers on Ortho GRID mattresses?',
  'What is the Queen size price for SmartGRID Ortho?',
  'Can you explain the 100-night trial and warranty terms?',
  'What No-Cost EMI options are available?'
];

export const CustomerVoiceAssistantModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    connectionState,
    voiceActivityState,
    audioTelemetry,
    turns,
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
    toolEvents,
    isAiSpeaking,
    isAiThinking,
    isMuted,
    startSession,
    endSession,
    cancelConnecting,
    toggleMute,
    clearError,
    askQuestion,
    isVoiceOutputEnabled,
    toggleVoiceOutput,
    products,
    updateProductPrice,
    resetCatalog,
    catalogVersion
  } = useGeminiLive();

  const [isToolsDrawerOpen, setIsToolsDrawerOpen] = useState(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript container on new messages or updates
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, isAiSpeaking]);

  if (!isModalOpen) return null;

  const isConnected =
    connectionState === 'LISTENING' || connectionState === 'SPEAKING';
  const isBusy =
    connectionState === 'REQUESTING_MIC' ||
    connectionState === 'FETCHING_TOKEN' ||
    connectionState === 'CONNECTING' ||
    connectionState === 'WAITING_FOR_SETUP';

  // Helper for connection status pill with detailed state descriptions
  const renderConnectionPill = () => {
    if (errorMessage || connectionState === 'ERROR') {
      return (
        <span className={`${styles.statusPill} ${styles.statusError}`}>
          <AlertTriangle size={12} />
          <span>Connection Error</span>
        </span>
      );
    }
    if (connectionState === 'REQUESTING_MIC') {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnecting}`}>
          <RefreshCw size={12} className={styles.spinIcon} />
          <span>Requesting Mic...</span>
        </span>
      );
    }
    if (connectionState === 'FETCHING_TOKEN') {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnecting}`}>
          <RefreshCw size={12} className={styles.spinIcon} />
          <span>Authorizing Token...</span>
        </span>
      );
    }
    if (connectionState === 'CONNECTING') {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnecting}`}>
          <RefreshCw size={12} className={styles.spinIcon} />
          <span>Opening WebSocket...</span>
        </span>
      );
    }
    if (connectionState === 'WAITING_FOR_SETUP') {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnecting}`}>
          <RefreshCw size={12} className={styles.spinIcon} />
          <span>Confirming Setup...</span>
        </span>
      );
    }
    if (connectionState === 'RECONNECTING_FALLBACK') {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnecting}`}>
          <RefreshCw size={12} className={styles.spinIcon} />
          <span>Switching Model...</span>
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className={`${styles.statusPill} ${styles.statusConnected}`}>
          <CheckCircle2 size={12} />
          <span>Connected</span>
        </span>
      );
    }
    return (
      <span className={`${styles.statusPill} ${styles.statusDisconnected}`}>
        <PhoneOff size={12} />
        <span>Disconnected</span>
      </span>
    );
  };

  // Helper for 7 voice activity states (Requirement 4 - HIGHEST PRIORITY)
  const renderVoiceActivityStatus = () => {
    switch (voiceActivityState) {
      case 'MIC_OFF':
        return {
          badgeClass: styles.stateMicOff,
          icon: <MicOff size={15} />,
          label: isMuted ? 'Microphone Muted' : 'Microphone Off',
          hint: isMuted
            ? 'Microphone is currently muted. Click "Unmute Microphone" below to speak.'
            : 'Microphone is inactive. Click "Start Conversation" below to connect with Gemini.'
        };
      case 'LISTENING':
        return {
          badgeClass: styles.stateListening,
          icon: <Mic size={15} />,
          label: 'Listening',
          hint: 'Microphone is active and ready for your voice. Speak naturally.'
        };
      case 'VOICE_DETECTED':
        return {
          badgeClass: styles.stateVoiceDetected,
          icon: <Activity size={15} />,
          label: 'Voice Detected',
          hint: 'Microphone audio detected. Encoding 16kHz PCM audio stream.'
        };
      case 'SENDING_AUDIO':
        return {
          badgeClass: styles.stateSendingAudio,
          icon: <Radio size={15} />,
          label: 'Sending Audio',
          hint: 'Audio frames actively transmitting through live Gemini Live WebSocket pipeline.'
        };
      case 'AI_THINKING':
        return {
          badgeClass: styles.stateAiThinking,
          icon: <Sparkles size={15} className={styles.spinIcon} />,
          label: 'AI Thinking',
          hint: 'Gemini is processing your question and querying business records...'
        };
      case 'AI_SPEAKING':
        return {
          badgeClass: styles.stateAiSpeaking,
          icon: <Volume2 size={15} />,
          label: 'AI Speaking',
          hint: 'Gemini is speaking response aloud. You can speak to interrupt anytime.'
        };
      case 'ERROR':
        return {
          badgeClass: styles.stateError,
          icon: <AlertTriangle size={15} />,
          label: 'Connection Error',
          hint: errorMessage || 'Audio pipeline or connection failed. Please retry.'
        };
    }
  };

  const currentVoiceStatus = renderVoiceActivityStatus();

  // 24 Dynamic waveform sound bars
  const renderSoundWave = () => {
    const isAi = isAiSpeaking || voiceActivityState === 'AI_SPEAKING';
    const effectiveLevel = isAi ? audioTelemetry.outputLevel : audioTelemetry.inputLevel;

    return Array.from({ length: 24 }).map((_, index) => {
      let height = 4;
      if (isConnected) {
        const offset = Math.sin((index / 24) * Math.PI) * 0.4;
        const normalized = Math.max(0.08, effectiveLevel + offset);
        height = Math.max(4, Math.min(28, normalized * 32));
      }
      return (
        <div
          key={index}
          className={`${styles.waveBar} ${
            isAi
              ? styles.waveBarAi
              : voiceActivityState === 'VOICE_DETECTED' || voiceActivityState === 'SENDING_AUDIO'
              ? styles.waveBarMicActive
              : isConnected
              ? styles.waveBarMic
              : ''
          }`}
          style={{ height: `${height}px` }}
        />
      );
    });
  };

  // Level meter percentage
  const currentLevelPct = Math.min(
    100,
    Math.round(
      (isAiSpeaking ? audioTelemetry.outputLevel : audioTelemetry.inputLevel) * 100 * 2.5
    )
  );

  const handlePriceUpdate = (productId: string, size: string) => {
    const newPrice = editingPrice[`${productId}-${size}`];
    if (newPrice && !isNaN(newPrice)) {
      updateProductPrice(productId, size, newPrice);
      setSyncStatusMsg(`Updated ${productId} (${size}) price to ₹${newPrice.toLocaleString()} (v${catalogVersion})`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrapper}>
              <Headphones size={22} color="#ffffff" />
            </div>
            <div>
              <h2 className={styles.headerTitle}>Customer Voice Assistant</h2>
              <div className={styles.headerMetaRow}>
                {renderConnectionPill()}
                <span className={styles.badgeModel} title="Active Gemini Live Voice Model">
                  Model: {activeModel || serverModel}
                </span>
                {isConnected && (
                  <span className={styles.badgeTimer} title="Active Session Duration">
                    ⏱ {formattedDuration}
                  </span>
                )}
                <span>· Catalogue v{catalogVersion}</span>
                <button
                  type="button"
                  className={`${styles.soundToggleBtn} ${isVoiceOutputEnabled ? styles.soundToggleActive : ''}`}
                  onClick={toggleVoiceOutput}
                  title={isVoiceOutputEnabled ? 'Spoken AI Voice Output: ON' : 'Spoken AI Voice Output: OFF'}
                  aria-label="Toggle voice output"
                >
                  {isVoiceOutputEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>{isVoiceOutputEnabled ? 'Voice Output ON' : 'Voice Output OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            className={styles.closeBtn}
            onClick={closeModal}
            title="Close Voice Assistant"
            aria-label="Close Voice Assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Missing Configuration Notice */}
          {!isConfigured && (
            <div className={styles.setupAlert}>
              <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  Server Configuration Required
                </div>
                <div>
                  <code className={styles.setupAlertCode}>GEMINI_API_KEY</code> is not configured in your <code className={styles.setupAlertCode}>.env</code>.
                  To experience real-time two-way audio with Gemini Live, obtain an API key from Google AI Studio, add it to <code className={styles.setupAlertCode}>.env</code>, and restart.
                </div>
              </div>
            </div>
          )}

          {/* Fallback Notice */}
          {(connectionState === 'RECONNECTING_FALLBACK' || modelSwitchEvent) && (
            <div className={styles.setupAlert} style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#bae6fd' }}>
              <RefreshCw size={18} className={styles.spinIcon} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Automatic Voice Model Fallback Active</div>
                <div style={{ fontSize: '11.5px', marginTop: 2 }}>
                  {modelSwitchEvent
                    ? `Switched voice model: ${modelSwitchEvent.fromModel} → ${modelSwitchEvent.toModel} (${modelSwitchEvent.reason}). Audio pipeline preserved.`
                    : `Transitioning to fallback voice model in chain (${fallbackChain.join(' → ')})...`}
                </div>
              </div>
            </div>
          )}

          {/* Plain English Error Message */}
          {errorMessage && (
            <div className={styles.setupAlert} style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
              <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Microphone / Connection Notice</div>
                <div>{errorMessage}</div>
              </div>
              <button
                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
                onClick={clearError}
                aria-label="Dismiss notice"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* PROMINENT LIVE VOICE ACTIVITY & TRANSMISSION STATUS BAR (Requirement 4) */}
          <div className={styles.voiceStatusCard}>
            <div className={styles.voiceStatusHeader}>
              <div className={`${styles.voiceStateBadge} ${currentVoiceStatus.badgeClass}`}>
                {currentVoiceStatus.icon}
                <span>{currentVoiceStatus.label}</span>
              </div>

              {/* Verified Audio Telemetry Metric */}
              <div
                className={styles.telemetryBadge}
                title="Verified PCM frames and volume transferred through WebSocket"
              >
                PCM Uplink: {audioTelemetry.chunksSent} frames ({((audioTelemetry.bytesSent || 0) / 1024).toFixed(1)} KB)
              </div>
            </div>

            <p className={styles.voiceHintText}>{currentVoiceStatus.hint}</p>

            {/* Level Meter and Waveform Sound Bars */}
            <div className={styles.meterAndWaveRow}>
              <div className={styles.audioLevelMeterWrapper}>
                <div className={styles.levelMeterLabels}>
                  <span>{isAiSpeaking ? 'AI Output Energy' : 'Microphone Input Energy'}</span>
                  <span>{currentLevelPct}%</span>
                </div>
                <div className={styles.audioLevelMeterTrack}>
                  <div
                    className={`${styles.audioLevelMeterFill} ${
                      isAiSpeaking ? styles.levelFillAi : styles.levelFillMic
                    }`}
                    style={{ width: `${currentLevelPct}%` }}
                  />
                </div>
              </div>

              {/* Sound Bars */}
              <div className={styles.soundWaveContainer} title="Real-time audio frequency visualizer">
                {renderSoundWave()}
              </div>
            </div>
          </div>

          {/* CONVERSATION TRANSCRIPT AREA (Requirements 3 & 5) */}
          <div className={styles.transcriptCard}>
            <div className={styles.transcriptHeader}>
              <div className={styles.transcriptTitle}>
                <MessageSquare size={14} color="#38bdf8" />
                <span>Conversation Transcript</span>
                {turns.length > 0 && <span>({turns.length} turns)</span>}
              </div>
              {turns.length > 0 && (
                <button
                  className={styles.clearTranscriptBtn}
                  onClick={clearTranscript}
                  title="Clear transcript history"
                >
                  Clear Transcript
                </button>
              )}
            </div>

            <div className={styles.transcriptList}>
              {turns.length === 0 ? (
                <div className={styles.emptyTranscriptState}>
                  <div className={styles.emptyStateIcon}>
                    <Mic size={24} />
                  </div>
                  <div className={styles.emptyStateTitle}>Speak normally to converse with Gemini</div>
                  <p style={{ margin: 0, fontSize: '12px', maxWidth: '420px' }}>
                    Your speech is transcribed live as you speak. Gemini Live answers aloud with verified product specifications, prices, offers, and warranty terms.
                  </p>

                  <div className={styles.promptChipsGrid}>
                    {DEMO_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={styles.promptChip}
                        onClick={() => askQuestion(q)}
                        disabled={isAiThinking}
                        aria-label={`Ask demo question: ${q}`}
                      >
                        <Sparkles size={12} color="#38bdf8" style={{ marginRight: 6, flexShrink: 0 }} />
                        <span>&ldquo;{q}&rdquo;</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                turns.map((turn) => {
                  const isUser = turn.speaker === 'user';
                  return (
                    <div
                      key={turn.id}
                      className={`${styles.turnRow} ${isUser ? styles.turnUser : styles.turnAssistant}`}
                    >
                      <div className={styles.turnSpeakerMeta}>
                        <span className={isUser ? styles.userSpeakerBadge : styles.assistantSpeakerBadge}>
                          {isUser ? 'You' : 'AI Assistant'}
                        </span>
                        <span>· {turn.timestamp}</span>
                        {turn.isPartial && (
                          <span className={styles.partialPill}>
                            <Activity size={10} /> Transcribing...
                          </span>
                        )}
                      </div>

                      <div
                        className={`${styles.turnBubble} ${
                          isUser
                            ? turn.isPartial
                              ? styles.bubbleUserPartial
                              : styles.bubbleUser
                            : styles.bubbleAssistant
                        }`}
                      >
                        {turn.text}
                      </div>
                    </div>
                  );
                })
              )}

              {isAiThinking && (
                <div className={`${styles.turnRow} ${styles.turnAssistant}`}>
                  <div className={styles.turnSpeakerMeta}>
                    <span className={styles.assistantSpeakerBadge}>AI Assistant</span>
                    <span>· Processing</span>
                  </div>
                  <div
                    className={`${styles.turnBubble} ${styles.bubbleAssistant}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Sparkles size={15} color="#38bdf8" className={styles.spinIcon} />
                    <span>Gemini is generating response & querying business data...</span>
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Demo Question Suggestions when conversation has started */}
            {turns.length > 0 && (
              <div style={{ display: 'flex', gap: 6, padding: '6px 14px', overflowX: 'auto', background: 'rgba(15, 23, 42, 0.4)' }}>
                {DEMO_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={styles.promptChip}
                    style={{ fontSize: '11px', padding: '4px 8px', whiteSpace: 'nowrap' }}
                    onClick={() => askQuestion(q)}
                    disabled={isAiThinking}
                    aria-label={`Ask demo question: ${q}`}
                  >
                    <Sparkles size={11} color="#38bdf8" style={{ marginRight: 4, flexShrink: 0 }} />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Customer Question Input Composer */}
            <form
              className={styles.chatInputRow}
              onSubmit={(e) => {
                e.preventDefault();
                if (customInput.trim()) {
                  askQuestion(customInput.trim());
                  setCustomInput('');
                }
              }}
            >
              <input
                type="text"
                className={styles.chatInput}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder={
                  isAiThinking
                    ? 'Gemini is responding...'
                    : 'Ask any question (e.g. recommend a queen-size mattress)...'
                }
                disabled={isAiThinking}
              />
              <button
                type="submit"
                className={styles.chatSendBtn}
                disabled={isAiThinking || !customInput.trim()}
                aria-label="Send question to Gemini"
              >
                {isAiThinking ? (
                  <RefreshCw size={14} className={styles.spinIcon} />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>Ask</span>
              </button>
            </form>
          </div>

          {/* VERIFIED TOOL INVOCATIONS DRAWER */}
          <div className={styles.drawerSection}>
            <div
              className={styles.drawerHeader}
              onClick={() => setIsToolsDrawerOpen(!isToolsDrawerOpen)}
            >
              <div className={styles.drawerTitleGroup}>
                <Database size={15} color="#38bdf8" />
                <span>Verified Business Tools Executed</span>
                <span className={styles.badgeModel} style={{ fontSize: '10.5px' }}>
                  {toolEvents.length} call(s)
                </span>
              </div>
              {isToolsDrawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isToolsDrawerOpen && (
              <div className={styles.drawerBody}>
                {toolEvents.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                    No tools called yet. Inquire about prices, offers, warranty, or delivery to see live tool calls.
                  </div>
                ) : (
                  <div className={styles.toolList}>
                    {toolEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`${styles.toolItem} ${
                          evt.verified ? styles.toolItemVerified : styles.toolItemUnverified
                        }`}
                      >
                        <div>
                          <span className={styles.toolNameBadge}>{evt.toolName}()</span>
                          <span style={{ color: '#cbd5e1' }}>{evt.summary}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: '#94a3b8' }}>
                          {evt.verified ? (
                            <CheckCircle2 size={13} color="#10b981" />
                          ) : (
                            <AlertTriangle size={13} color="#ef4444" />
                          )}
                          <span>{evt.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CATALOGUE SYNCHRONIZATION DRAWER */}
          <div className={styles.drawerSection}>
            <div
              className={styles.drawerHeader}
              onClick={() => setIsSyncDrawerOpen(!isSyncDrawerOpen)}
            >
              <div className={styles.drawerTitleGroup}>
                <RefreshCw size={14} color="#34d399" />
                <span>Live Catalogue Sync & Price Invalidation Test Bench</span>
              </div>
              {isSyncDrawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isSyncDrawerOpen && (
              <div className={styles.drawerBody}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  Modify a product price below to verify cache invalidation. Gemini Live will quote the updated amount upon your next spoken query.
                </p>

                {syncStatusMsg && (
                  <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                    ✓ {syncStatusMsg}
                  </div>
                )}

                {products.slice(0, 3).map((prod) => {
                  const baseVariant = prod.variants[0];
                  const key = `${prod.id}-${baseVariant.size}`;
                  return (
                    <div key={key} className={styles.syncRow}>
                      <div>
                        <strong>{prod.name}</strong> ({baseVariant.size})
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          Current Store Price: ₹{baseVariant.currentPrice.toLocaleString()} (MRP: ₹{baseVariant.mrp.toLocaleString()})
                        </div>
                      </div>

                      <div className={styles.priceInputGroup}>
                        <input
                          type="number"
                          className={styles.priceInput}
                          placeholder={baseVariant.currentPrice.toString()}
                          value={editingPrice[key] ?? baseVariant.currentPrice}
                          onChange={(e) =>
                            setEditingPrice({
                              ...editingPrice,
                              [key]: parseInt(e.target.value, 10) || 0
                            })
                          }
                        />
                        <button
                          className={styles.updatePriceBtn}
                          onClick={() => handlePriceUpdate(prod.id, baseVariant.size)}
                        >
                          Sync Price
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button className={styles.resetBtn} onClick={resetCatalog}>
                  Reset Catalogue to Default Baseline
                </button>
              </div>
            )}
          </div>

          {/* MODEL DISCOVERY & DIAGNOSTICS BENCH DRAWER */}
          <div className={styles.drawerSection}>
            <div
              className={styles.drawerHeader}
              onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
            >
              <div className={styles.drawerTitleGroup}>
                <Cpu size={15} color="#38bdf8" />
                <span>Voice Model Discovery & Diagnostics Bench</span>
                <span className={styles.badgeModel} style={{ fontSize: '10.5px' }}>
                  Active: {activeModel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className={styles.simBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAvailableModels(true);
                  }}
                  disabled={isCheckingModels}
                  title="Interrogate Google Gemini models API"
                >
                  <RefreshCw size={11} className={isCheckingModels ? styles.spinIcon : ''} />
                  <span>{isCheckingModels ? 'Probing...' : 'Check Available Models'}</span>
                </button>
                {isDiagnosticsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isDiagnosticsOpen && (
              <div className={styles.drawerBody}>
                {discoveredModels.length > 0 ? (
                  <div className={styles.modelTableWrapper}>
                    <table className={styles.modelTable}>
                      <thead>
                        <tr>
                          <th>Model ID</th>
                          <th>Official Live</th>
                          <th>Account Access</th>
                          <th>Live Handshake</th>
                          <th>Fallback Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discoveredModels.map((m) => {
                          const isActive = m.modelId === activeModel;
                          return (
                            <tr
                              key={m.modelId}
                              style={{
                                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.08)' : undefined
                              }}
                            >
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, color: isActive ? '#38bdf8' : '#f1f5f9' }}>
                                    {m.modelId}
                                  </span>
                                  {isActive && <span className={styles.badgeModel}>ACTIVE</span>}
                                </div>
                              </td>
                              <td>{m.isOfficialLiveSupported ? '✓ Yes' : 'Standard'}</td>
                              <td>{m.inAccountListing ? '✓ Listed' : 'Not Listed'}</td>
                              <td>
                                {m.liveHandshakeStatus === 'PASS' && <span className={styles.badgePass}>✓ PASS</span>}
                                {m.liveHandshakeStatus === 'FAIL' && <span className={styles.badgeFail}>✕ FAIL</span>}
                                {m.liveHandshakeStatus === 'CONFIG_REQUIRED' && <span className={styles.badgeConfig}>CONFIG REQ</span>}
                                {m.liveHandshakeStatus === 'UNTESTED' && 'Untested'}
                              </td>
                              <td>{m.fallbackRank > 0 ? `Rank ${m.fallbackRank}` : 'Optional'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '12px' }}>
                    Click &ldquo;Check Available Models&rdquo; to discover models accessible to your API key.
                  </div>
                )}

                {/* Simulation controls */}
                <div className={styles.simControls}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Test Fallback Machine:</span>
                  <button
                    className={styles.simBtn}
                    onClick={() => simulateFallback('RATE_LIMIT_429', 'Simulated 429 Rate Limit')}
                  >
                    Simulate 429 Rate Limit
                  </button>
                  <button
                    className={styles.simBtn}
                    onClick={() => simulateFallback('QUOTA_EXHAUSTED', 'Simulated Quota Limit')}
                  >
                    Simulate Quota Limit
                  </button>
                  <button
                    className={styles.simBtn}
                    onClick={() => simulateFallback('UNSUPPORTED_MODEL', 'Simulated 404 Model Unsupported')}
                  >
                    Simulate Unsupported Model
                  </button>
                </div>

                {fallbackHistory.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#e2e8f0' }}>Recent Model Transitions:</div>
                    {fallbackHistory.map((h, i) => (
                      <div key={i} style={{ padding: '2px 0' }}>
                        • {new Date(h.timestamp).toLocaleTimeString()}: {h.fromModel} → <span style={{ color: '#38bdf8', fontWeight: 600 }}>{h.toModel}</span> ({h.reason})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className={styles.modalFooter}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {isConnected ? (
              <span>Streaming: 16kHz PCM audio input · 24kHz PCM speech playback</span>
            ) : (
              <span>Offline · Ephemeral tokens enabled</span>
            )}
          </div>

          <div className={styles.footerActions}>
            {isConnected && (
              <button
                className={`${styles.muteBtn} ${isMuted ? styles.muteBtnActive : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>
            )}

            {isBusy ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className={styles.startBtn} disabled style={{ opacity: 0.9 }}>
                  <RefreshCw size={16} className={styles.spinIcon} />
                  <span>
                    {connectionState === 'REQUESTING_MIC'
                      ? 'Requesting Mic...'
                      : connectionState === 'FETCHING_TOKEN'
                      ? 'Authorizing Token...'
                      : connectionState === 'CONNECTING'
                      ? 'Connecting WebSocket...'
                      : 'Confirming Setup...'}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={cancelConnecting}
                  aria-label="Cancel Connection Attempt"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            ) : !isConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {connectionState === 'ERROR' && (
                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={startSession}
                    aria-label="Retry Voice Connection"
                  >
                    <RefreshCw size={14} />
                    <span>Retry Voice</span>
                  </button>
                )}
                <button
                  type="button"
                  className={styles.startBtn}
                  onClick={startSession}
                  aria-label="Start Voice Conversation"
                >
                  <Mic size={18} />
                  <span>Start Voice Conversation</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.endBtn}
                onClick={endSession}
                aria-label="End Voice Conversation"
              >
                <PhoneOff size={18} />
                <span>End Conversation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
