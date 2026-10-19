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
  ChevronUp
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
                  <Radio size={10} /> Live WebSocket ({serverModel})
                </span>
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
                  : isBusy
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
                {connectionState === 'FETCHING_TOKEN' && 'Authenticating Session with Ephemeral Token...'}
                {connectionState === 'CONNECTING' && 'Connecting to Gemini Live WebSocket...'}
                {connectionState === 'LISTENING' && 'Listening · Speak Naturally'}
                {connectionState === 'SPEAKING' && 'AI Speaking · Gemini Voice Active'}
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
