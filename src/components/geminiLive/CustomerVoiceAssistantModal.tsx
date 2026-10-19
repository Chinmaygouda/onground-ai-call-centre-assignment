import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  X,
  AlertTriangle,
  RefreshCw,
  Database,
  CheckCircle2,
  Volume2,
  Radio,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Zap
} from 'lucide-react';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './CustomerVoiceAssistantModal.module.css';

export const CustomerVoiceAssistantModal: React.FC = () => {
  const {
    isModalOpen,
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
  } = useGeminiLive();

  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(true);
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const isConnected =
    connectionState === 'LISTENING' || connectionState === 'SPEAKING';
  const isBusy =
    connectionState === 'REQUESTING_MIC' ||
    connectionState === 'FETCHING_TOKEN' ||
    connectionState === 'CONNECTING';

  // Render 28 dynamic waveform bars based on live audio level
  const renderWaveform = () => {
    return Array.from({ length: 24 }).map((_, index) => {
      let height = 4;
      if (isConnected) {
        // Vary height with audioLevel and sine wave distribution
        const offset = Math.sin(index / 3) * 0.3;
        const normalized = Math.max(0.1, audioLevel + offset);
        height = Math.max(4, Math.min(32, normalized * 36));
      }
      return (
        <div
          key={index}
          className={`${styles.waveBar} ${
            isAiSpeaking
              ? styles.waveBarSpeaking
              : isConnected
              ? styles.waveBarListening
              : ''
          }`}
          style={{ height: `${height}px` }}
        />
      );
    });
  };

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
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrapper}>
              <Sparkles size={20} color="#ffffff" />
            </div>
            <div>
              <h2 className={styles.headerTitle}>Customer Voice Assistant</h2>
              <div className={styles.headerSubtitle}>
                <span>Gemini Live API</span>
                <span className={styles.badgeLive}>
                  <Radio size={10} /> Live WebSocket ({activeModel || serverModel})
                </span>
                {activeModel && serverModel && activeModel !== serverModel && (
                  <span className={styles.badgeSecondary} style={{ fontSize: '10px' }}>
                    Fallback Model Active
                  </span>
                )}
                <span>· Catalogue v{catalogVersion}</span>
              </div>
            </div>
          </div>

          <button
            className={styles.closeBtn}
            onClick={closeModal}
            title="Close Assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Missing API Key Warning Banner */}
          {!isConfigured && (
            <div className={styles.setupAlert}>
              <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  Server Configuration Required (Gemini Live Mode)
                </div>
                <div>
                  <code className={styles.setupAlertCode}>GEMINI_API_KEY</code> is not set in your local <code className={styles.setupAlertCode}>.env</code>.
                  To experience real-time two-way audio with Gemini Live, obtain an API key from Google AI Studio, add it to <code className={styles.setupAlertCode}>.env</code>, and restart.
                </div>
                <div style={{ marginTop: 4, color: '#fcd34d', fontSize: '11.5px' }}>
                  ✓ Security Standard: Keys are loaded server-side only. Ephemeral session tokens are minted for the client.
                </div>
              </div>
            </div>
          )}

          {/* Model Fallback Transition Alert Banner */}
          {(connectionState === 'RECONNECTING_FALLBACK' || modelSwitchEvent) && (
            <div className={styles.fallbackAlert}>
              <RefreshCw size={18} className={styles.spinIcon} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '12.5px' }}>
                  Automatic Voice Model Fallback Active
                </div>
                <div style={{ fontSize: '11.5px', marginTop: 2 }}>
                  {modelSwitchEvent
                    ? `Switched model: ${modelSwitchEvent.fromModel} → ${modelSwitchEvent.toModel} (${modelSwitchEvent.reason}). Audio pipeline preserved.`
                    : `Switching to next verified live voice model in chain (${fallbackChain.join(' → ')})...`}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className={styles.setupAlert} style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
              <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Connection Notice</div>
                <div>{errorMessage}</div>
              </div>
              <button
                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
                onClick={clearError}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Live Audio Visualizer Stage */}
          <div className={styles.stageCard}>
            <div
              className={`${styles.statusIndicator} ${
                connectionState === 'IDLE'
                  ? styles.statusIdle
                  : isBusy || connectionState === 'RECONNECTING_FALLBACK'
                  ? styles.statusConnecting
                  : connectionState === 'LISTENING'
                  ? styles.statusListening
                  : connectionState === 'SPEAKING'
                  ? styles.statusSpeaking
                  : styles.statusError
              }`}
            >
              <span>
                {connectionState === 'IDLE' && 'Ready to Connect'}
                {connectionState === 'REQUESTING_MIC' && 'Requesting Microphone Access...'}
                {connectionState === 'FETCHING_TOKEN' && `Authenticating Session Token (${activeModel})...`}
                {connectionState === 'CONNECTING' && `Connecting to Gemini Live WebSocket (${activeModel})...`}
                {connectionState === 'RECONNECTING_FALLBACK' && `Reconnecting with Fallback Model (${activeModel})...`}
                {connectionState === 'LISTENING' && `Listening · Speak Naturally (${activeModel})`}
                {connectionState === 'SPEAKING' && `AI Speaking · Gemini Voice Active (${activeModel})`}
                {connectionState === 'ERROR' && 'Connection Interrupted'}
                {connectionState === 'DISCONNECTED' && 'Session Concluded'}
              </span>
            </div>

            <div
              className={`${styles.orbVisualizer} ${
                isAiSpeaking
                  ? styles.orbSpeaking
                  : isConnected
                  ? styles.orbListening
                  : ''
              }`}
            >
              {isAiSpeaking ? (
                <Volume2 size={40} color="#ffffff" />
              ) : isConnected ? (
                <Mic size={40} color="#ffffff" />
              ) : (
                <Sparkles size={40} color="#ffffff" />
              )}
            </div>

            <div className={styles.waveformDisplay}>{renderWaveform()}</div>

            <p className={styles.stageHelpText}>
              {isConnected
                ? isAiSpeaking
                  ? 'Gemini is responding aloud. You can speak to interrupt anytime.'
                  : isMuted
                  ? 'Microphone is muted. Unmute to speak.'
                  : 'Speak into your microphone. Inquire about prices, offers, warranty, EMI, or trial terms.'
                : 'Click "Start Conversation" below to connect your microphone directly to Gemini Live.'}
            </p>
          </div>

          {/* Real-time Transcription Stream */}
          <div className={styles.transcriptCard}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Dialogue Transcription
            </div>
            {userTranscript && (
              <div className={styles.transcriptRow}>
                <span className={styles.userLabel}>Customer:</span>
                <span>&ldquo;{userTranscript}&rdquo;</span>
              </div>
            )}
            {aiTranscript && (
              <div className={styles.transcriptRow}>
                <span className={styles.aiLabel}>Assistant:</span>
                <span>&ldquo;{aiTranscript}&rdquo;</span>
              </div>
            )}
            {!userTranscript && !aiTranscript && (
              <div className={styles.emptyTranscript}>
                Live conversation transcripts will appear here as speech is detected.
              </div>
            )}
          </div>

          {/* Verified Tool Invocations Activity Feed */}
          <div className={styles.toolFeedSection}>
            <div className={styles.toolFeedHeader}>
              <div className={styles.toolFeedTitle}>
                <Database size={14} color="#38bdf8" />
                <span>Verified Business Data Tool Invocations</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {toolEvents.length} call(s) executed
              </span>
            </div>

            {toolEvents.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                No tools called yet. Ask for a mattress price, active offer, EMI plan, or warranty to observe live tool execution.
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

          {/* Live Data Synchronization & Price Invalidation Test Panel */}
          <div className={styles.syncDrawer}>
            <div
              className={styles.syncHeader}
              onClick={() => setIsSyncDrawerOpen(!isSyncDrawerOpen)}
            >
              <div className={styles.syncTitle}>
                <RefreshCw size={14} />
                <span>Live Catalogue Synchronization & Price Invalidation Test Bench</span>
              </div>
              {isSyncDrawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isSyncDrawerOpen && (
              <div className={styles.syncContent}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  Modify a product price below to test <strong>Requirement H (Live Synchronization & Cache Invalidation)</strong>.
                  When you update the price, the cache is instantly invalidated, version increments, and Gemini Live will quote the updated amount upon your next spoken query.
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

          {/* Voice Model Discovery & Diagnostics Bench */}
          <div className={styles.diagnosticsDrawer}>
            <div
              className={styles.diagnosticsHeader}
              onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
            >
              <div className={styles.diagnosticsTitleGroup}>
                <Cpu size={15} color="#38bdf8" />
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#e2e8f0' }}>
                  Voice Model Discovery, Diagnostics & Fallback Chain
                </span>
                <span className={styles.badgePrimary}>
                  Active: {activeModel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className={styles.checkModelsBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    checkAvailableModels(true);
                  }}
                  disabled={isCheckingModels}
                  title="Interrogate Google Gemini models API"
                >
                  <RefreshCw size={12} className={isCheckingModels ? styles.spinIcon : ''} />
                  <span>{isCheckingModels ? 'Probing Google API...' : 'Check Available Voice Models'}</span>
                </button>
                {isDiagnosticsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isDiagnosticsOpen && (
              <div className={styles.diagnosticsContent}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  This diagnostics bench directly interrogates Google's official Gemini API (<code className={styles.setupAlertCode}>models.list()</code>) using your server credentials. It performs non-intrusive Live API handshakes to verify genuine account access, displays deterministic fallback priorities, and tests graceful degradation under rate limits.
                </p>

                {/* Models Table */}
                {discoveredModels.length > 0 ? (
                  <div className={styles.modelTableWrapper}>
                    <table className={styles.modelTable}>
                      <thead>
                        <tr>
                          <th>Model ID</th>
                          <th>Official Live</th>
                          <th>Account Access</th>
                          <th>Live Handshake</th>
                          <th>Status / Detail</th>
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
                                  {isActive && <span className={styles.badgePrimary}>ACTIVE</span>}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>{m.displayName}</div>
                              </td>
                              <td>
                                {m.isOfficialLiveSupported ? (
                                  <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Yes</span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>Standard</span>
                                )}
                              </td>
                              <td>
                                {m.inAccountListing ? (
                                  <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Listed</span>
                                ) : (
                                  <span style={{ color: '#ef4444' }}>Not Listed</span>
                                )}
                              </td>
                              <td>
                                {m.liveHandshakeStatus === 'PASS' && (
                                  <span className={styles.badgePass}>✓ PASS</span>
                                )}
                                {m.liveHandshakeStatus === 'FAIL' && (
                                  <span className={styles.badgeFail}>✕ FAIL</span>
                                )}
                                {m.liveHandshakeStatus === 'CONFIG_REQUIRED' && (
                                  <span className={styles.badgeConfig}>CONFIG REQ</span>
                                )}
                                {m.liveHandshakeStatus === 'UNTESTED' && (
                                  <span style={{ color: '#94a3b8' }}>Untested</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '11px', color: m.failureDetail ? '#cbd5e1' : '#64748b' }}>
                                  {m.failureDetail || 'Ready'}
                                </span>
                              </td>
                              <td>
                                {m.fallbackRank === 1 && <span className={styles.badgePrimary}>1 (Primary)</span>}
                                {m.fallbackRank === 2 && <span className={styles.badgeSecondary}>2 (Secondary)</span>}
                                {m.fallbackRank === 3 && <span className={styles.badgeTertiary}>3 (Tertiary)</span>}
                                {m.fallbackRank > 3 && <span style={{ color: '#94a3b8' }}>Rank {m.fallbackRank}</span>}
                                {m.fallbackRank === 0 && <span style={{ color: '#64748b' }}>Optional</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '12px' }}>
                    Click "Check Available Voice Models" to discover models accessible to your API key.
                  </div>
                )}

                {/* Quota & Access Explanation Disclaimer */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#fcd34d', fontSize: '11.5px' }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>Tier & Quota Notice:</strong> Google AI Studio accounts provide different RPM/TPM quotas per model. If a model returns 429 Rate Limit or Quota Exhausted, the system automatically and transparently falls back through the verified chain (<code className={styles.setupAlertCode}>{fallbackChain.join(' → ')}</code>) without dropping the audio stream.
                  </div>
                </div>

                {/* Fallback Simulation Controls (for verification testing) */}
                <div className={styles.simControls}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, width: '100%' }}>
                    <Zap size={14} color="#f59e0b" />
                    <span>Simulated Error Verification (Test Fallback Machine Gracefully)</span>
                  </div>
                  <button
                    className={styles.simBtn}
                    onClick={() => simulateFallback('RATE_LIMIT_429', 'Simulated 429 Rate Limit')}
                  >
                    Simulate 429 Rate Limit
                  </button>
                  <button
                    className={styles.simBtn}
                    onClick={() => simulateFallback('QUOTA_EXHAUSTED', 'Simulated Quota Exhaustion')}
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

                {/* Fallback History Log */}
                {fallbackHistory.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: '11px', color: '#94a3b8' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#e2e8f0' }}>Recent Model Transitions:</div>
                    {fallbackHistory.map((h, i) => (
                      <div key={i} style={{ padding: '3px 0' }}>
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
              <span>Streaming: 16kHz PCM input · 24kHz PCM output</span>
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
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}

            {!isConnected ? (
              <button
                className={styles.startBtn}
                onClick={startSession}
                disabled={isBusy}
              >
                <Mic size={16} />
                <span>{isBusy ? 'Connecting...' : 'Start Voice Conversation'}</span>
              </button>
            ) : (
              <button className={styles.endBtn} onClick={endSession}>
                <PhoneOff size={16} />
                <span>End Conversation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
