import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Grid,
  Radio,
  AlertCircle,
  Clock,
  Sparkles,
  Volume2,
  Bot,
  User,
  Headphones
} from 'lucide-react';
import { useCalling } from '../../context/CallingContext';
import { LiveConversationMessage } from '../../types';
import styles from './CallingModal.module.css';

export const CallingModal: React.FC = () => {
  const {
    callState,
    startCall,
    endCall,
    clearSessionLock,
    toggleMute,
    audioFrequencyData,
    incomingPeerCall,
    acceptIncomingPeerCall,
    rejectIncomingPeerCall
  } = useCalling();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of live conversation whenever messages or speaking status updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [callState.conversationMessages, callState.liveSpeakingStatus]);

  if (callState.lifecycle === 'IDLE' && !incomingPeerCall) {
    return null;
  }

  // Format MM:SS duration
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render 24 mini waveform bars
  const barsCount = 24;
  const renderWaveform = () => {
    return Array.from({ length: barsCount }).map((_, index) => {
      let height = 4;
      if (audioFrequencyData && audioFrequencyData.length > 0) {
        const dataIndex = Math.floor((index / barsCount) * audioFrequencyData.length);
        const value = audioFrequencyData[dataIndex] || 0;
        height = Math.max(4, (value / 255) * 22);
      } else if (callState.lifecycle === 'CONNECTED') {
        // Subtle ambient rhythm when connected
        height = 4 + (Math.sin(Date.now() / 200 + index) + 1) * 4;
      }
      return (
        <div
          key={index}
          className={styles.bar}
          style={{ height: `${height}px` }}
        />
      );
    });
  };

  const getStatusLabel = () => {
    if (callState.mode === 'TWILIO_AI') {
      const s = callState.twilioStatus;
      if (s === 'initiating') return 'Initiating call...';
      if (s === 'queued') return 'Call queued...';
      if (s === 'ringing') return `Calling customer (${callState.contactName || 'Lead'})...`;
      if (s === 'customer_answered') return 'Customer answered';
      if (s === 'ai_speaking') return 'AI speaking';
      if (s === 'listening') return 'Listening to customer';
      if (s === 'processing') return 'Processing customer question';
      if (s === 'completed') return 'Call completed';
      if (s === 'busy') return 'Customer line busy';
      if (s === 'no-answer') return 'Customer did not answer';
      if (s === 'failed') return 'Call failed';
      if (s === 'canceled') return 'Call canceled';
    }

    if (callState.mode === 'EXOTEL_AI') {
      const s = callState.exotelStatus;
      if (s === 'initiating') return 'Initiating AI Outbound Call...';
      if (s === 'calling_customer') return `Ringing ${callState.contactName || 'Customer'}...`;
      if (s === 'customer_answered') return 'Customer Answered · Voicebot Connecting';
      if (s === 'ai_speaking') return 'AI Voice Assistant Speaking';
      if (s === 'ai_listening') return 'Listening to Customer...';
      if (s === 'connected') return 'AI Voice Call Connected';
      if (s === 'completed') return 'AI Call Completed';
      if (s === 'busy') return 'Customer Line Busy';
      if (s === 'no_answer') return 'Customer Did Not Answer';
      if (s === 'failed') return 'AI Call Failed';
      if (s === 'cancelled') return 'Call Cancelled';
    }

    if (callState.mode === 'EXOTEL_REAL') {
      const s = callState.exotelStatus;
      if (s === 'initiating') return 'Initiating Call...';
      if (s === 'calling_employee') return 'Calling Employee (Leg A)...';
      if (s === 'employee_answered') return 'Employee Answered...';
      if (s === 'calling_client') return `Calling ${callState.contactName || 'Client'}...`;
      if (s === 'connected') return 'PSTN Call Active & Bridged';
      if (s === 'completed') return 'Call Completed';
      if (s === 'busy') return 'Line Busy';
      if (s === 'no_answer') return 'No Answer';
      if (s === 'failed') return 'Call Failed';
      if (s === 'cancelled') return 'Call Cancelled';
    }

    if (callState.lifecycle === 'DIALING') return 'Dialing Outbound...';
    if (callState.lifecycle === 'RINGING') return 'Ringing Lead...';
    if (callState.lifecycle === 'CONNECTED') return 'Active Call Connected';
    if (callState.lifecycle === 'ENDED') return 'Call Terminated';
    return 'Calling...';
  };

  // Determine active conversation messages (with fallback for connected calls)
  const conversationMessages: LiveConversationMessage[] = (() => {
    if (callState.conversationMessages && callState.conversationMessages.length > 0) {
      return callState.conversationMessages;
    }

    // Default conversational greeting when call is answered but before first poll return
    if (callState.lifecycle === 'CONNECTED') {
      const name = (callState.contactName || '').trim();
      const product = (callState.productInterest || 'our SmartGRID mattresses').trim();
      const greeting = `Hello ${name ? name + ',' : ''} this is the AI assistant from The Sleep Company. I'm calling regarding your enquiry about ${product.startsWith('our') ? product : 'the ' + product}. How are you doing today?`;

      return [
        {
          id: 'initial-greeting-default',
          speaker: 'ai',
          speakerLabel: 'The Sleep Company Assistant',
          text: greeting,
          time: '00:01',
          status: 'speaking'
        }
      ];
    }

    return [];
  })();

  return (
    <>
      {/* Incoming WebRTC Call Banner across browser tabs */}
      {incomingPeerCall && callState.lifecycle === 'IDLE' && (
        <div className={styles.peerCallBanner}>
          <Phone className={styles.pulseIcon} size={20} color="#38bdf8" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>Incoming WebRTC In-App Call</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {incomingPeerCall.callerName}
              {incomingPeerCall.callerTabId && ` · [${incomingPeerCall.callerTabId}]`}
            </div>
            {incomingPeerCall.productInterest && (
              <div style={{ fontSize: '11px', color: '#38bdf8' }}>
                {incomingPeerCall.productInterest}
                {incomingPeerCall.expectedValue ? ` · ₹${incomingPeerCall.expectedValue.toLocaleString()}` : ''}
              </div>
            )}
          </div>
          <div className={styles.bannerActions}>
            <button className={styles.acceptBtn} onClick={acceptIncomingPeerCall}>
              Accept
            </button>
            <button className={styles.rejectBtn} onClick={rejectIncomingPeerCall}>
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Main Calling Modal */}
      {callState.lifecycle !== 'IDLE' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            {/* Header: Lead/Contact Information, Status & Duration Clock */}
            <div className={styles.modalHeader}>
              <div className={styles.headerTopRow}>
                <div
                  className={`${styles.statusPill} ${
                    callState.lifecycle === 'DIALING' || callState.lifecycle === 'RINGING'
                      ? styles.statusDialing
                      : callState.lifecycle === 'CONNECTED'
                      ? styles.statusConnected
                      : styles.statusEnded
                  }`}
                >
                  <Radio size={12} />
                  <span>{getStatusLabel()}</span>
                </div>

                {callState.lifecycle === 'CONNECTED' && (
                  <div className={styles.durationClock}>
                    <Clock size={13} />
                    <span>{formatDuration(callState.durationSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Contact Card Details */}
              <div className={styles.contactInfoRow}>
                <div className={styles.avatarLarge}>
                  {callState.contactInitials || 'AK'}
                </div>

                <div className={styles.contactDetails}>
                  <h3 className={styles.contactName}>{callState.contactName || 'Lead'}</h3>
                  <div className={styles.contactMeta}>
                    <span>{callState.contactPhone}</span>
                    {callState.productInterest && (
                      <span className={styles.productBadge}>{callState.productInterest}</span>
                    )}
                    {callState.expectedValue && (
                      <span className={styles.valueBadge}>₹{callState.expectedValue.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Twilio Call Rejection Diagnostic Notice (if rejected) */}
              {callState.mode === 'TWILIO_AI' && (callState.providerError || callState.twilioStage === 'rejected') && (
                <div style={{
                  margin: '10px 0 0 0',
                  padding: '10px 12px',
                  background: 'rgba(127, 29, 29, 0.45)',
                  border: '1px solid rgba(248, 113, 113, 0.45)',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  color: '#fee2e2'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                    <AlertCircle size={14} />
                    <span>{callState.providerError || 'Call Not Accepted by Provider'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => clearSessionLock(callState.contactPhone)}
                      style={{
                        padding: '4px 10px',
                        background: '#059669',
                        border: 'none',
                        borderRadius: '5px',
                        color: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Clear Stale Session
                    </button>
                    <button
                      onClick={() => {
                        startCall({
                          name: callState.contactName,
                          phone: callState.contactPhone,
                          mode: 'TWILIO_AI',
                          isTrialSample: false,
                          product: callState.productInterest,
                          value: callState.expectedValue,
                          force: false,
                          clearStale: false
                        });
                      }}
                      style={{
                        padding: '4px 10px',
                        background: '#2563eb',
                        border: 'none',
                        borderRadius: '5px',
                        color: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Retry Call
                    </button>
                    <button
                      onClick={endCall}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '5px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      End &amp; Close
                    </button>
                  </div>
                </div>
              )}

              {/* Mini Waveform Visualizer */}
              <div className={styles.waveformMini}>
                {renderWaveform()}
              </div>
            </div>

            {/* Conversation Area: Two-Sided Live Chat Bubbles with Auto-scroll */}
            <div className={styles.conversationSection}>
              <div className={styles.conversationHeader}>
                <div className={styles.conversationTitle}>
                  <div className={styles.liveIndicatorPulse} />
                  <span>Live Conversation Stream</span>
                </div>

                {callState.liveSpeakingStatus === 'speaking' && (
                  <div className={`${styles.liveStateBadge} ${styles.stateSpeaking}`}>
                    <Volume2 size={11} />
                    <span>Assistant Speaking</span>
                  </div>
                )}
                {callState.liveSpeakingStatus === 'listening' && (
                  <div className={`${styles.liveStateBadge} ${styles.stateListening}`}>
                    <Headphones size={11} />
                    <span>Listening to Customer</span>
                  </div>
                )}
                {callState.liveSpeakingStatus === 'generating' && (
                  <div className={`${styles.liveStateBadge} ${styles.stateGenerating}`}>
                    <Sparkles size={11} />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>

              {/* Scrollable messages container */}
              <div className={styles.messagesScrollArea} ref={scrollAreaRef}>
                {conversationMessages.length === 0 ? (
                  <div className={styles.emptyConversationState}>
                    <Bot size={28} color="#64748b" />
                    <div>
                      {callState.lifecycle === 'DIALING' || callState.lifecycle === 'RINGING' ? (
                        <span>Connecting with customer line... Live chat transcript will appear once answered.</span>
                      ) : (
                        <span>Voice conversation will be transcribed here in real-time.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  conversationMessages.map((msg) => {
                    const isAi = msg.speaker === 'ai';

                    return (
                      <div
                        key={msg.id}
                        className={isAi ? styles.messageRowAi : styles.messageRowCustomer}
                      >
                        <div className={isAi ? styles.avatarAi : styles.avatarCustomer}>
                          {isAi ? <Bot size={17} /> : <User size={17} />}
                        </div>

                        <div className={styles.bubbleWrapper}>
                          <div className={isAi ? styles.metaRowAi : styles.metaRowCustomer}>
                            <span className={isAi ? styles.speakerLabelAi : styles.speakerLabelCustomer}>
                              {isAi ? 'The Sleep Company Assistant' : 'You'}
                            </span>
                            {msg.time && <span className={styles.msgTime}>{msg.time}</span>}
                          </div>

                          <div
                            className={`
                              ${isAi ? styles.bubbleAi : styles.bubbleCustomer}
                              ${isAi && msg.status === 'speaking' ? styles.bubbleAiSpeaking : ''}
                            `}
                          >
                            {msg.text}

                            {/* Status tags & tool badges */}
                            <div className={styles.bubbleToolsRow}>
                              {isAi && msg.status === 'speaking' && (
                                <span className={styles.activeSpeechTag}>
                                  <Volume2 size={10} /> Speaking on call...
                                </span>
                              )}
                              {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                                <>
                                  {msg.toolsExecuted.map((tool, idx) => (
                                    <span key={idx} className={styles.toolTag}>
                                      ✓ {tool.replace(/^get/, '')}
                                    </span>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Animated thinking/generating bubble if AI is processing a turn */}
                {callState.liveSpeakingStatus === 'generating' && (
                  <div className={styles.messageRowAi}>
                    <div className={styles.avatarAi}>
                      <Bot size={17} />
                    </div>
                    <div className={styles.bubbleWrapper}>
                      <div className={styles.metaRowAi}>
                        <span className={styles.speakerLabelAi}>The Sleep Company Assistant</span>
                        <span className={styles.msgTime}>Processing...</span>
                      </div>
                      <div className={`${styles.bubbleAi} ${styles.generatingRow}`}>
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Invisible anchor element for auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Pinned Bottom Call Controls */}
            <div className={styles.actionsSection}>
              {/* Audio player if recording exists */}
              {callState.recordingUrl && (
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, marginBottom: '3px' }}>
                    Call Audio Recording:
                  </div>
                  <audio controls src={callState.recordingUrl} style={{ width: '100%', height: '30px' }} />
                </div>
              )}

              <div className={styles.buttonsRow}>
                <button
                  className={`${styles.actionBtn} ${styles.muteBtn} ${
                    callState.isMuted ? styles.mutedActive : ''
                  }`}
                  onClick={toggleMute}
                  title={callState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {callState.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.endCallBtn}`}
                  onClick={endCall}
                  title="End Call (Disconnects live telephone call & releases session lock)"
                >
                  <PhoneOff size={22} />
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.keypadBtn}`}
                  title="Keypad"
                >
                  <Grid size={22} />
                </button>
              </div>

              <div className={styles.carrierNotice}>
                {callState.mode === 'TWILIO_AI' && 'Twilio Programmable Voice · The Sleep Company Frontline Telephony'}
                {callState.mode === 'EXOTEL_AI' && 'Exotel Voicebot · Gemini Live Telephony Bridge'}
                {callState.mode === 'EXOTEL_REAL' && 'Exotel PSTN Telecom Network · Billed to business'}
                {callState.mode === 'AI_VOICE' && 'In-Browser Speech AI · The Sleep Company Assistant'}
                {callState.mode === 'WEBRTC_PEER' && 'WebRTC Browser-to-Browser Audio Call'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
