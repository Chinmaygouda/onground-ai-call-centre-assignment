import React from 'react';
import { Mic, MicOff, PhoneOff, Phone, Grid, Radio } from 'lucide-react';
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
                <span>
                  {callState.lifecycle === 'DIALING' && 'Dialing Outbound...'}
                  {callState.lifecycle === 'RINGING' && 'Ringing Lead...'}
                  {callState.lifecycle === 'CONNECTED' && 'Active Call Connected'}
                  {callState.lifecycle === 'ENDED' && 'Call Terminated'}
                </span>
              </div>

              <div className={styles.avatarLarge}>
                {callState.contactInitials || 'MK'}
              </div>

              <h3 className={styles.contactName}>{callState.contactName || 'Lead Contact'}</h3>
              <div className={styles.contactMeta}>
                {callState.contactPhone}
                {callState.productInterest && ` · ${callState.productInterest}`}
                {callState.expectedValue ? ` · ₹${callState.expectedValue.toLocaleString()}` : ''}
              </div>

              {callState.lifecycle === 'CONNECTED' && (
                <div className={styles.durationClock}>
                  {formatDuration(callState.durationSeconds)}
                </div>
              )}
            </div>

            {/* Live Audio Waveform & Speech Display */}
            <div className={styles.visualizerSection}>
              <div className={styles.waveformBars}>{renderWaveform()}</div>

              {/* Live Dialogue & Transcription box */}
              <div className={styles.dialogueBox}>
                <span className={styles.dialogueLabel}>
                  {callState.mode === 'AI_VOICE' ? 'AI Customer Dialogue' : 'Audio Channel Stream'}
                </span>
                {callState.aiResponseText && (
                  <div style={{ marginBottom: '6px', color: '#a78bfa' }}>
                    {callState.aiResponseText}
                  </div>
                )}
                {aiSpeechTranscript && (
                  <div className={styles.transcriptLive}>
                    You: &ldquo;{aiSpeechTranscript}&rdquo;
                  </div>
                )}
                {!callState.aiResponseText && !aiSpeechTranscript && (
                  <div style={{ color: '#64748b' }}>
                    Speak into your microphone. Voice AI agent is actively listening...
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
