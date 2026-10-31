import React from 'react';
import { Mic, MicOff, PhoneOff, Phone, Grid, Radio, AlertCircle, ShieldCheck } from 'lucide-react';
import { useCalling } from '../../context/CallingContext';
import styles from './CallingModal.module.css';

export const CallingModal: React.FC = () => {
  const {
    callState,
    endCall,
    toggleMute,
    audioFrequencyData,
    aiSpeechTranscript,
    incomingPeerCall,
    acceptIncomingPeerCall,
    rejectIncomingPeerCall
  } = useCalling();

  if (callState.lifecycle === 'IDLE' && !incomingPeerCall) {
    return null;
  }

  // Format MM:SS duration
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render 28 waveform bars
  const barsCount = 28;
  const renderWaveform = () => {
    return Array.from({ length: barsCount }).map((_, index) => {
      let height = 6;
      if (audioFrequencyData && audioFrequencyData.length > 0) {
        const dataIndex = Math.floor((index / barsCount) * audioFrequencyData.length);
        const value = audioFrequencyData[dataIndex] || 0;
        height = Math.max(4, (value / 255) * 40);
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
            <div className={styles.modalHeader}>
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

              {/* Exotel Telephony Provider Pill */}
              {/* Exotel Telephony Provider Pill */}
              {callState.mode === 'EXOTEL_REAL' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#93c5fd',
                  backgroundColor: 'rgba(30, 58, 138, 0.4)',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  width: 'fit-content',
                  margin: '0 auto 12px auto'
                }}>
                  <ShieldCheck size={12} />
                  <span>Exotel Telephony Network (Call Myself)</span>
                  {callState.exotelCallSid && (
                    <span style={{ fontFamily: 'monospace', color: '#e0e7ff' }}>
                      · SID: {callState.exotelCallSid.substring(0, 14)}...
                    </span>
                  )}
                </div>
              )}

              {/* Exotel Voice AI Provider Pill */}
              {callState.mode === 'EXOTEL_AI' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#d8b4fe',
                  backgroundColor: 'rgba(88, 28, 135, 0.45)',
                  border: '1px solid rgba(192, 132, 252, 0.35)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  width: 'fit-content',
                  margin: '0 auto 12px auto'
                }}>
                  <ShieldCheck size={12} color="#c084fc" />
                  <span>Exotel Connect Voice AI · Gemini Live Stream</span>
                  {callState.exotelCallSid && (
                    <span style={{ fontFamily: 'monospace', color: '#f3e8ff' }}>
                      · SID: {callState.exotelCallSid.substring(0, 14)}...
                    </span>
                  )}
                </div>
              )}

              <div className={styles.avatarLarge}>
                {callState.contactInitials || 'AK'}
              </div>

              <h3 className={styles.contactName}>{callState.contactName || 'Ashray K'}</h3>
              <div className={styles.contactMeta}>
                {callState.contactPhone}
                {callState.productInterest && ` · ${callState.productInterest}`}
                {callState.expectedValue ? ` · ₹${callState.expectedValue.toLocaleString()}` : ''}
              </div>

              {/* Exotel Two-Leg Progression Stepper (Mode 1: Call Myself) */}
              {callState.mode === 'EXOTEL_REAL' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  marginTop: '8px'
                }}>
                  <span style={{ color: callState.exotelStatus === 'calling_employee' ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                    1. Employee Phone
                  </span>
                  <span>──▶</span>
                  <span style={{ color: callState.exotelStatus === 'calling_client' ? '#fbbf24' : callState.exotelStatus === 'connected' ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                    2. ExoPhone
                  </span>
                  <span>──▶</span>
                  <span style={{ color: callState.exotelStatus === 'connected' ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
                    3. Customer Mobile
                  </span>
                </div>
              )}

              {/* Exotel Voicebot Progression Stepper (Mode 2: Call Using AI Agent) */}
              {callState.mode === 'EXOTEL_AI' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  marginTop: '8px'
                }}>
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>
                    1. ExoPhone ({callState.exotelCallerId || '08047355774'})
                  </span>
                  <span>──▶</span>
                  <span style={{
                    color: callState.exotelStatus === 'calling_customer' ? '#fbbf24' : '#34d399',
                    fontWeight: 600
                  }}>
                    2. Customer Mobile ({callState.contactPhone || 'Customer'})
                  </span>
                  <span>──▶</span>
                  <span style={{
                    color: (callState.exotelStatus === 'ai_speaking' || callState.exotelStatus === 'ai_listening' || callState.exotelStatus === 'connected')
                      ? '#a855f7'
                      : '#64748b',
                    fontWeight: 600
                  }}>
                    3. Gemini Live Voicebot
                  </span>
                </div>
              )}

              {callState.lifecycle === 'CONNECTED' && (
                <div className={styles.durationClock}>
                  {formatDuration(callState.durationSeconds)}
                </div>
              )}
            </div>

            {/* Unconfigured Credentials Helper */}
            {callState.isConfigured === false && (
              <div style={{
                margin: '12px 18px',
                padding: '12px',
                background: 'rgba(76, 29, 149, 0.35)',
                border: '1px solid rgba(192, 132, 252, 0.4)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#e9d5ff'
              }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#f0abfc' }}>
                  <AlertCircle size={15} />
                  <span>Exotel Credentials Setup Ready</span>
                </div>
                <div>
                  The server endpoint is active. Once ready, configure <code>EXOTEL_ACCOUNT_SID</code>, <code>EXOTEL_API_KEY</code>, <code>EXOTEL_API_TOKEN</code>, <code>EXOTEL_CALLER_ID</code>, and <code>EXOTEL_AGENT_PHONE</code> in your local <code>.env</code> file or Netlify site settings.
                </div>
              </div>
            )}

            {/* Provider Error Notice */}
            {callState.providerError && (
              <div style={{
                margin: '8px 18px',
                padding: '10px',
                background: 'rgba(127, 29, 29, 0.35)',
                border: '1px solid rgba(248, 113, 113, 0.4)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{callState.providerError}</span>
              </div>
            )}

            {/* Live Audio Waveform & Speech Display */}
            <div className={styles.visualizerSection}>
              <div className={styles.waveformBars}>{renderWaveform()}</div>

              {/* Live Dialogue & Transcription box */}
              <div className={styles.dialogueBox}>
                <span className={styles.dialogueLabel}>
                  {callState.mode === 'EXOTEL_REAL'
                    ? 'PSTN Audio Stream & Status'
                    : callState.mode === 'EXOTEL_AI'
                    ? 'AI Voicebot & Gemini Live Stream'
                    : callState.mode === 'AI_VOICE'
                    ? 'AI Customer Dialogue'
                    : 'Audio Channel Stream'}
                </span>
                {callState.aiResponseText && (
                  <div style={{ marginBottom: '6px', color: '#a78bfa' }}>
                    {callState.aiResponseText}
                  </div>
                )}
                {callState.mode === 'EXOTEL_AI' && callState.aiTranscript && (
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '8px',
                    borderRadius: '6px',
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace',
                    lineHeight: '1.4'
                  }}>
                    {typeof callState.aiTranscript === 'string'
                      ? callState.aiTranscript
                      : callState.aiTranscript.map((t) => `${t.speaker === 'ai' ? 'AI Voicebot' : 'Customer'}: ${t.text}`).join('\n')}
                  </div>
                )}
                {aiSpeechTranscript && callState.mode !== 'EXOTEL_AI' && (
                  <div className={styles.transcriptLive}>
                    You: &ldquo;{aiSpeechTranscript}&rdquo;
                  </div>
                )}
                {!callState.aiResponseText && !aiSpeechTranscript && !callState.aiTranscript && (
                  <div style={{ color: '#64748b' }}>
                    {callState.mode === 'EXOTEL_REAL'
                      ? 'Live telephone call in progress over telecom network...'
                      : callState.mode === 'EXOTEL_AI'
                      ? 'AI Outbound call in progress. Customer phone ringing directly...'
                      : 'Speak into your microphone. Voice AI agent is actively listening...'}
                  </div>
                )}

                {/* Genuine Provider Recording Link / Player (Only if returned by Exotel) */}
                {callState.recordingUrl && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                      Official Provider Audio Recording:
                    </div>
                    <audio controls src={callState.recordingUrl} style={{ width: '100%', height: '32px' }} />
                  </div>
                )}

                {/* Transparent Billing Notice */}
                {callState.mode === 'EXOTEL_REAL' && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>
                    Exotel Two-Legged Call · Billed to business Exotel account · Free for recipient {callState.contactName || 'Customer'}
                  </div>
                )}
                {callState.mode === 'EXOTEL_AI' && (
                  <div style={{ fontSize: '10px', color: '#c084fc', marginTop: '6px' }}>
                    Exotel Connect Voice AI · Direct Outbound to {callState.contactPhone || 'Customer'} · WSS Audio Stream to Gemini Live · Employee Phone Bypassed
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsSection}>
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
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>

              <button
                className={`${styles.actionBtn} ${styles.keypadBtn}`}
                title="Dial Keypad"
              >
                <Grid size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
