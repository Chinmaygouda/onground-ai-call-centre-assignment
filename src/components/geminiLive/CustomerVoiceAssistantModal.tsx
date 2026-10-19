import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  X,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle2,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Keyboard,
  Bug,
  Lightbulb,
  Play,
  Pause,
  User
} from 'lucide-react';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './CustomerVoiceAssistantModal.module.css';

export const SUGGESTED_QUESTIONS = [
  'What are the current prices?',
  'Which one is best value for money?',
  'Tell me about the warranty',
  'Do you have any discounts?'
];

export const DEMO_QUESTIONS = [
  'What is the Queen size price for SmartGRID Ortho?',
  'What are the current offers on Ortho GRID mattresses?',
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
    isConfigured,
    serverModel,
    activeModel,
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
    clearError,
    askQuestion,
    isVoiceOutputEnabled,
    toggleVoiceOutput,
    sessionId,
    speakAnswer,
    stopSpeaking,
    products,
    updateProductPrice,
    resetCatalog,
    catalogVersion
  } = useGeminiLive();

  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isFullDiagnosticsOpen, setIsFullDiagnosticsOpen] = useState(false);
  const [isToolsDrawerOpen, setIsToolsDrawerOpen] = useState(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript container on new messages or thinking updates
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, isAiSpeaking, isAiThinking]);

  // Reset playing turn state when audio playback ceases
  useEffect(() => {
    if (!isAiSpeaking) {
      setPlayingTurnId(null);
    }
  }, [isAiSpeaking]);

  if (!isModalOpen) return null;

  const isConnected =
    connectionState === 'LISTENING' || connectionState === 'SPEAKING';
  const isBusy =
    connectionState === 'REQUESTING_MIC' ||
    connectionState === 'FETCHING_TOKEN' ||
    connectionState === 'CONNECTING' ||
    connectionState === 'WAITING_FOR_SETUP' ||
    connectionState === 'RECONNECTING_FALLBACK';

  const isListeningOrVoice =
    voiceActivityState === 'LISTENING' ||
    voiceActivityState === 'VOICE_DETECTED' ||
    voiceActivityState === 'SENDING_AUDIO';

  // Helper for prominent circular microphone states
  const getMicState = () => {
    if (errorMessage || connectionState === 'ERROR') {
      return {
        stateClass: styles.micError,
        icon: <AlertTriangle size={22} color="#ffffff" />,
        tooltip: 'Connection or audio error. Click to retry.',
        label: 'Retry voice connection'
      };
    }
    if (connectionState === 'REQUESTING_MIC') {
      return {
        stateClass: styles.micRequesting,
        icon: <RefreshCw size={20} className={styles.spinIcon} color="#ffffff" />,
        tooltip: 'Requesting microphone permission...',
        label: 'Requesting microphone'
      };
    }
    if (isAiThinking || isBusy) {
      return {
        stateClass: styles.micProcessing,
        icon: <Sparkles size={20} className={styles.spinIcon} color="#ffffff" />,
        tooltip: 'Processing question with Gemini... Click to cancel.',
        label: 'Processing question'
      };
    }
    if (isAiSpeaking) {
      return {
        stateClass: styles.micSpeaking,
        icon: <Volume2 size={22} color="#ffffff" />,
        tooltip: 'AI is speaking response aloud. Click to pause.',
        label: 'AI speaking'
      };
    }
    if (voiceActivityState === 'VOICE_DETECTED' || voiceActivityState === 'SENDING_AUDIO') {
      return {
        stateClass: styles.micVoiceDetected,
        icon: <Activity size={22} color="#ffffff" />,
        tooltip: 'Voice detected. Click to finish speaking.',
        label: 'Voice detected'
      };
    }
    if (isConnected || voiceActivityState === 'LISTENING') {
      return {
        stateClass: styles.micListening,
        icon: isMuted ? <MicOff size={22} color="#ffffff" /> : <Mic size={22} color="#ffffff" />,
        tooltip: isMuted ? 'Microphone is muted. Click to speak.' : 'Listening... Speak now or click to stop.',
        label: isMuted ? 'Unmute microphone' : 'Stop listening'
      };
    }
    return {
      stateClass: styles.micReady,
      icon: <Mic size={22} color="#ffffff" />,
      tooltip: 'Click to start voice conversation',
      label: 'Start voice conversation'
    };
  };

  const micState = getMicState();

  const handleMicButtonClick = () => {
    if (isAiThinking || isBusy) {
      cancelConnecting();
      return;
    }
    if (connectionState === 'ERROR' || errorMessage) {
      clearError();
      startSession();
      return;
    }
    if (isAiSpeaking) {
      stopSpeaking();
      return;
    }
    if (isConnected || isListeningOrVoice) {
      endSession();
      return;
    }
    startSession();
  };

  const handleTogglePlayTurn = (turnId: string, text: string) => {
    if (playingTurnId === turnId && isAiSpeaking) {
      stopSpeaking();
      setPlayingTurnId(null);
    } else {
      setPlayingTurnId(turnId);
      speakAnswer(text);
    }
  };

  const handlePriceUpdate = (productId: string, size: string) => {
    const newPrice = editingPrice[`${productId}-${size}`];
    if (newPrice && !isNaN(newPrice)) {
      updateProductPrice(productId, size, newPrice);
      setSyncStatusMsg(`Updated ${productId} (${size}) price to ₹${newPrice.toLocaleString()} (v${catalogVersion})`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  // Render markdown paragraphs and bold text cleanly
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={styles.messageParagraph}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Compact Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerAvatar}>
              <Headphones size={22} color="#ffffff" />
            </div>
            <div>
              <h2 className={styles.headerTitle}>Customer Voice Assistant</h2>
              <div className={styles.headerSubtitle}>Ask by voice or type your message</div>
            </div>
          </div>

          <div className={styles.headerActions}>
            {/* Connection Status Pill */}
            <div
              className={`${styles.statusPill} ${
                isConnected
                  ? styles.statusConnected
                  : isBusy
                  ? styles.statusConnecting
                  : errorMessage || connectionState === 'ERROR'
                  ? styles.statusError
                  : styles.statusDisconnected
              }`}
            >
              <span className={styles.statusDot} />
              <span>
                {isConnected
                  ? 'Connected'
                  : connectionState === 'REQUESTING_MIC'
                  ? 'Requesting Mic...'
                  : connectionState === 'FETCHING_TOKEN'
                  ? 'Authorizing...'
                  : connectionState === 'CONNECTING'
                  ? 'Connecting...'
                  : connectionState === 'WAITING_FOR_SETUP'
                  ? 'Confirming...'
                  : errorMessage || connectionState === 'ERROR'
                  ? 'Error'
                  : 'Ready'}
              </span>
            </div>

            {/* Model Pill */}
            <div className={styles.modelPill} title="Active Gemini Live Model">
              <Sparkles size={12} color="#60a5fa" />
              <span>{activeModel || serverModel}</span>
            </div>

            {/* Spoken Voice Output Toggle */}
            <button
              type="button"
              className={`${styles.soundToggleBtn} ${isVoiceOutputEnabled ? styles.soundToggleActive : ''}`}
              onClick={toggleVoiceOutput}
              title={isVoiceOutputEnabled ? 'Spoken Voice Output: ON' : 'Spoken Voice Output: OFF'}
              aria-label="Toggle voice output"
            >
              {isVoiceOutputEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>{isVoiceOutputEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {/* Debug Button (matches reference mockup) */}
            <button
              type="button"
              className={`${styles.debugBtn} ${isDebugOpen ? styles.debugBtnActive : ''}`}
              onClick={() => setIsDebugOpen((prev) => !prev)}
              title="Toggle Debug Diagnostics Panel"
              aria-label="Debug Panel"
            >
              <Bug size={16} />
              <span>Debug</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeModal}
              title="Close Voice Assistant"
              aria-label="Close Voice Assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Debug Panel Popover (anchored at top-right below header) */}
        {isDebugOpen && (
          <div className={styles.debugPopover} role="dialog" aria-label="Debug Information">
            <div className={styles.debugHeader}>
              <div className={styles.debugTitleRow}>
                <span className={styles.debugTitle}>Debug Panel</span>
                <span className={styles.liveSessionBadge}>
                  <span className={styles.liveSessionDot} /> Live Session
                </span>
              </div>
              <button
                type="button"
                className={styles.debugCloseBtn}
                onClick={() => setIsDebugOpen(false)}
                aria-label="Close debug panel"
              >
                <X size={14} />
              </button>
            </div>

            <div className={styles.debugBody}>
              <div className={styles.debugRow}>
                <span className={styles.debugLabel}>Model</span>
                <span className={styles.debugValue}>
                  <Sparkles size={11} color="#60a5fa" />
                  <span>{activeModel || serverModel}</span>
                </span>
              </div>

              <div className={styles.debugRow}>
                <span className={styles.debugLabel}>Session ID</span>
                <span className={styles.debugValue} title={sessionId}>
                  {`live_${sessionId.replace('live_', '').slice(0, 6)}...`}
                </span>
              </div>

              <div className={styles.debugRow}>
                <span className={styles.debugLabel}>Status</span>
                <span className={styles.debugValue}>
                  <span
                    className={styles.statusIndicatorDot}
                    style={{
                      backgroundColor: isConnected
                        ? '#10b981'
                        : isBusy
                        ? '#f59e0b'
                        : errorMessage
                        ? '#ef4444'
                        : '#64748b'
                    }}
                  />
                  <span>
                    {isConnected ? 'Connected' : isBusy ? 'Connecting' : errorMessage ? 'Error' : 'Ready'}
                  </span>
                </span>
              </div>

              <div className={styles.debugRow}>
                <span className={styles.debugLabel}>Audio Input</span>
                <span className={styles.debugValue}>
                  <span
                    className={styles.statusIndicatorDot}
                    style={{
                      backgroundColor: isListeningOrVoice ? '#10b981' : isMuted ? '#f59e0b' : '#64748b'
                    }}
                  />
                  <span>
                    {voiceActivityState === 'VOICE_DETECTED'
                      ? 'Active'
                      : voiceActivityState === 'SENDING_AUDIO'
                      ? 'Sending'
                      : voiceActivityState === 'LISTENING'
                      ? 'Active'
                      : isMuted
                      ? 'Muted'
                      : 'Inactive'}
                  </span>
                </span>
              </div>

              <div className={styles.debugRow}>
                <span className={styles.debugLabel}>Audio Output</span>
                <span className={styles.debugValue}>
                  <span
                    className={styles.statusIndicatorDot}
                    style={{
                      backgroundColor: isAiSpeaking ? '#10b981' : '#38bdf8'
                    }}
                  />
                  <span>{isAiSpeaking ? 'Playing' : isVoiceOutputEnabled ? 'Ready' : 'Muted'}</span>
                </span>
              </div>

              <button
                type="button"
                className={styles.debugDetailsBtn}
                onClick={() => setIsFullDiagnosticsOpen((prev) => !prev)}
              >
                <span>{isFullDiagnosticsOpen ? 'Hide Full Diagnostics' : 'View Details'}</span>
                <ChevronRight
                  size={14}
                  style={{
                    transform: isFullDiagnosticsOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Server Configuration Notice */}
        {!isConfigured && (
          <div className={styles.setupAlert}>
            <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div>
              <code className={styles.setupAlertCode}>GEMINI_API_KEY</code> is not configured.
              Add it to <code className={styles.setupAlertCode}>.env</code> on the server to enable real-time Gemini connectivity.
            </div>
          </div>
        )}

        {/* Fallback Notice */}
        {(connectionState === 'RECONNECTING_FALLBACK' || modelSwitchEvent) && (
          <div className={styles.setupAlert} style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#bae6fd' }}>
            <RefreshCw size={16} className={styles.spinIcon} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {modelSwitchEvent
                ? `Switched voice model: ${modelSwitchEvent.fromModel} → ${modelSwitchEvent.toModel} (${modelSwitchEvent.reason}). Audio pipeline preserved.`
                : 'Transitioning to fallback model in hierarchy...'}
            </div>
          </div>
        )}

        {/* Error Notice with dismiss button */}
        {errorMessage && (
          <div className={styles.setupAlert} style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
            <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={startSession}
              aria-label="Retry Voice Connection"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
            <button
              style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 4 }}
              onClick={clearError}
              aria-label="Dismiss notice"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Main Clean Conversation Area */}
        <div className={styles.chatArea}>
          {/* Welcome Message when conversation is fresh */}
          {turns.length === 0 && (
            <div className={`${styles.messageRow} ${styles.aiMessageRow}`}>
              <div className={styles.aiAvatar}>
                <Headphones size={18} />
              </div>
              <div className={styles.aiBubbleWrapper}>
                <div className={styles.aiSenderLabel}>AI Assistant</div>
                <div className={styles.aiBubble}>
                  <p className={styles.messageParagraph}>
                    Hello! I am your AI assistant for The Sleep Company. How can I help you today?
                  </p>
                  <p className={styles.messageParagraph}>
                    You can click the microphone button below to speak naturally, type any question, or select one of the suggested questions.
                  </p>
                  <div className={styles.messageMeta}>
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversation History Turns */}
          {turns.map((turn) => {
            const isUser = turn.speaker === 'user';
            const isTurnPlaying = playingTurnId === turn.id && isAiSpeaking;

            if (isUser) {
              return (
                <div key={turn.id} className={`${styles.messageRow} ${styles.userMessageRow}`}>
                  <div className={styles.userBubbleWrapper}>
                    <div className={styles.userBubble}>{turn.text}</div>
                    <div className={styles.messageMeta}>
                      <span>{turn.timestamp}</span>
                      <span className={styles.checkMarks}>✔✔</span>
                    </div>
                  </div>
                  <div className={styles.userAvatar}>
                    <User size={18} />
                  </div>
                </div>
              );
            }

            return (
              <div key={turn.id} className={`${styles.messageRow} ${styles.aiMessageRow}`}>
                <div className={styles.aiAvatar}>
                  <Headphones size={18} />
                </div>
                <div className={styles.aiBubbleWrapper}>
                  <div className={styles.aiSenderLabel}>AI Assistant</div>
                  <div className={styles.aiBubble}>
                    {renderFormattedText(turn.text)}

                    {/* Attached Audio Player Widget */}
                    <div className={styles.audioPlayerBar}>
                      <button
                        type="button"
                        className={styles.audioPlayBtn}
                        onClick={() => handleTogglePlayTurn(turn.id, turn.text)}
                        title={isTurnPlaying ? 'Pause audio response' : 'Play audio response aloud'}
                        aria-label={isTurnPlaying ? 'Pause audio' : 'Play audio aloud'}
                      >
                        {isTurnPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
                      </button>

                      <div className={styles.audioWaveform}>
                        {Array.from({ length: 9 }).map((_, wIdx) => (
                          <div
                            key={wIdx}
                            className={`${styles.waveformBar} ${isTurnPlaying ? styles.waveformBarPlaying : ''}`}
                            style={{
                              height: isTurnPlaying ? undefined : `${4 + (wIdx % 3) * 3}px`
                            }}
                          />
                        ))}
                      </div>

                      <span className={styles.audioDuration}>
                        {isTurnPlaying
                          ? 'Speaking'
                          : `00:${Math.min(59, Math.max(12, Math.ceil(turn.text.split(' ').length / 2.5)))
                              .toString()
                              .padStart(2, '0')}`}
                      </span>
                    </div>

                    <div className={styles.messageMeta}>
                      <span>{turn.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI Thinking State Indicator */}
          {isAiThinking && (
            <div className={`${styles.messageRow} ${styles.aiMessageRow}`}>
              <div className={styles.aiAvatar}>
                <Headphones size={18} />
              </div>
              <div className={styles.aiBubbleWrapper}>
                <div className={styles.aiSenderLabel}>AI Assistant</div>
                <div className={styles.thinkingBubble}>
                  <Sparkles size={16} color="#38bdf8" className={styles.spinIcon} />
                  <span>Gemini is generating response & querying business data...</span>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={cancelConnecting}
                    aria-label="Cancel request"
                  >
                    <X size={12} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions Card (matches reference mockup) */}
          <div className={styles.suggestedCard}>
            <div className={styles.suggestedHeader}>
              <Lightbulb size={16} color="#38bdf8" />
              <span>Suggested Questions</span>
            </div>
            <div className={styles.suggestedChipsGrid}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={styles.suggestedChip}
                  onClick={() => askQuestion(q)}
                  disabled={isAiThinking}
                  aria-label={`Ask: ${q}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Demo Product Questions */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0' }}>
            {DEMO_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className={styles.promptChip || styles.suggestedChip}
                style={{
                  fontSize: '11.5px',
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
                onClick={() => askQuestion(q)}
                disabled={isAiThinking}
                aria-label={`Ask demo question: ${q}`}
              >
                <Sparkles size={11} color="#60a5fa" style={{ marginRight: 4, display: 'inline' }} />
                <span>{q}</span>
              </button>
            ))}
          </div>

          <div ref={transcriptEndRef} />
        </div>

        {/* Collapsible Full Diagnostics Drawer (Toggled from Debug Panel) */}
        {isFullDiagnosticsOpen && (
          <div className={styles.fullDiagnosticsSection}>
            {/* Business Tools Executed */}
            <div>
              <div
                className={styles.drawerTitleGroup}
                onClick={() => setIsToolsDrawerOpen((prev) => !prev)}
                style={{ cursor: 'pointer' }}
              >
                <Database size={15} color="#38bdf8" />
                <span>Verified Business Tools Executed ({toolEvents.length} calls)</span>
                {isToolsDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>

              {isToolsDrawerOpen && (
                <div className={styles.toolList}>
                  {toolEvents.length === 0 ? (
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                      No tools executed yet. Ask about prices, offers, warranty, or delivery to see live tools.
                    </div>
                  ) : (
                    toolEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`${styles.toolItem} ${
                          evt.verified ? styles.toolItemVerified : styles.toolItemUnverified
                        }`}
                      >
                        <div>
                          <span className={styles.toolNameBadge}>{evt.toolName}()</span>
                          <span>{evt.summary}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
                          {evt.verified ? (
                            <CheckCircle2 size={13} color="#10b981" />
                          ) : (
                            <AlertTriangle size={13} color="#ef4444" />
                          )}
                          <span>{evt.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Live Catalogue Sync Bench */}
            <div>
              <div
                className={styles.drawerTitleGroup}
                onClick={() => setIsSyncDrawerOpen((prev) => !prev)}
                style={{ cursor: 'pointer' }}
              >
                <RefreshCw size={14} color="#34d399" />
                <span>Live Catalogue Sync & Price Invalidation (v{catalogVersion})</span>
                {isSyncDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>

              {isSyncDrawerOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {syncStatusMsg && (
                    <div style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600 }}>
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
                            Store Price: ₹{baseVariant.currentPrice.toLocaleString()} (MRP: ₹{baseVariant.mrp.toLocaleString()})
                          </div>
                        </div>

                        <div className={styles.priceInputGroup}>
                          <input
                            type="number"
                            className={styles.priceInput}
                            value={editingPrice[key] ?? baseVariant.currentPrice}
                            onChange={(e) =>
                              setEditingPrice({
                                ...editingPrice,
                                [key]: parseInt(e.target.value, 10) || 0
                              })
                            }
                          />
                          <button
                            type="button"
                            className={styles.updatePriceBtn}
                            onClick={() => handlePriceUpdate(prod.id, baseVariant.size)}
                          >
                            Sync
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button type="button" className={styles.resetBtn} onClick={resetCatalog}>
                    Reset Catalogue Baseline
                  </button>
                </div>
              )}
            </div>

            {/* Model Discovery Bench */}
            <div>
              <div
                className={styles.drawerTitleGroup}
                onClick={() => setIsDiagnosticsOpen((prev) => !prev)}
                style={{ cursor: 'pointer' }}
              >
                <Cpu size={15} color="#38bdf8" />
                <span>Voice Model Discovery & Diagnostics Bench</span>
                {isDiagnosticsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>

              {isDiagnosticsOpen && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <button
                      type="button"
                      className={styles.simBtn}
                      onClick={() => checkAvailableModels(true)}
                      disabled={isCheckingModels}
                    >
                      <RefreshCw size={11} className={isCheckingModels ? styles.spinIcon : ''} />
                      <span>{isCheckingModels ? 'Probing...' : 'Check Available Models'}</span>
                    </button>
                  </div>

                  {discoveredModels.length > 0 && (
                    <table className={styles.modelTable}>
                      <thead>
                        <tr>
                          <th>Model ID</th>
                          <th>Official Live</th>
                          <th>Handshake</th>
                          <th>Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discoveredModels.map((m) => (
                          <tr key={m.modelId}>
                            <td>{m.modelId}</td>
                            <td>{m.isOfficialLiveSupported ? '✓ Yes' : 'Standard'}</td>
                            <td>{m.liveHandshakeStatus}</td>
                            <td>{m.fallbackRank > 0 ? `Rank ${m.fallbackRank}` : 'Optional'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className={styles.simControls}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Test Fallback:</span>
                    <button
                      type="button"
                      className={styles.simBtn}
                      onClick={() => simulateFallback('RATE_LIMIT_429', 'Simulated 429 Rate Limit')}
                    >
                      Simulate 429
                    </button>
                    <button
                      type="button"
                      className={styles.simBtn}
                      onClick={() => simulateFallback('QUOTA_EXHAUSTED', 'Simulated Quota Limit')}
                    >
                      Simulate Quota
                    </button>
                  </div>

                  {fallbackHistory.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 8 }}>
                      <strong style={{ color: '#cbd5e1' }}>Fallback History:</strong>
                      {fallbackHistory.map((h, i) => (
                        <div key={i} style={{ padding: '2px 0' }}>
                          • {h.fromModel} → {h.toModel} ({h.reason})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audio PCM Telemetry */}
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              PCM Telemetry: {audioTelemetry.chunksSent} frames ({((audioTelemetry.bytesSent || 0) / 1024).toFixed(1)} KB) · Level: {Math.round(audioTelemetry.inputLevel * 100)}%
            </div>
          </div>
        )}

        {/* Bottom Input Dock with Circular Microphone & Send Controls */}
        <div className={styles.bottomDockContainer}>
          <form
            className={styles.chatInputRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (customInput.trim() && !isAiThinking) {
                askQuestion(customInput.trim());
                setCustomInput('');
              }
            }}
          >
            <div className={styles.keyboardIconWrapper} aria-hidden="true">
              <Keyboard size={18} />
            </div>

            <input
              type="text"
              className={styles.chatInput}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (customInput.trim() && !isAiThinking) {
                    askQuestion(customInput.trim());
                    setCustomInput('');
                  }
                }
              }}
              placeholder={
                isAiThinking
                  ? 'Gemini is generating response...'
                  : 'Type your message...'
              }
              disabled={isAiThinking}
              aria-label="Message input"
            />

            {/* Prominent Circular Microphone Button */}
            <button
              type="button"
              className={`${styles.circularMicBtn} ${micState.stateClass}`}
              onClick={handleMicButtonClick}
              title={micState.tooltip}
              aria-label={micState.label}
            >
              {micState.icon}
              {isListeningOrVoice && <span className={styles.micPulseRing} />}
            </button>

            {/* Circular Send Button */}
            <button
              type="submit"
              className={styles.chatSendBtn}
              disabled={isAiThinking || !customInput.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>

          <div className={styles.chatFooterNote}>
            Voice assistant powered by Gemini · Your conversation is private and secure
          </div>
        </div>
      </div>
    </div>
  );
};
