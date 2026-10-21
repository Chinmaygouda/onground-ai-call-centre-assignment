import React, { useState } from 'react';
import { Phone, ShieldCheck, Headphones } from 'lucide-react';
import { useCalling } from '../../context/CallingContext';
import { useAppState } from '../../context/AppStateContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './FloatingActionPill.module.css';

export const FloatingActionPill: React.FC = () => {
  const { startCall, tabSessionId } = useCalling();
  const { openLeadsModal } = useAppState();
  const { openModal, connectionState } = useGeminiLive();
  const [showSecurityTooltip, setShowSecurityTooltip] = useState(false);

  const isLive = connectionState === 'LISTENING' || connectionState === 'SPEAKING';

  const handleDemoClick = () => {
    // Open Leads Modal as the showcase demo
    openLeadsModal(0);
  };

  const handleInAppCall = () => {
    startCall({
      name: 'Arvind Rajan (Peer Tab)',
      phone: '+91 95355 84969',
      mode: 'WEBRTC_PEER',
      value: 8490,
      product: 'Ortho GRID'
    });
  };


  return (
    <div className={styles.floatingWrapper}>
      <button className={styles.demoBadge} onClick={handleDemoClick} title="Launch Showcase Lead Modal Demo">
        DEMO
      </button>

      {/* Voice Assistant Floating Action Button */}
      <button
        className={`${styles.pillButton} ${styles.voiceAssistantBtn} ${isLive ? styles.voiceAssistantActive : ''}`}
        onClick={openModal}
        title="Voice Assistant (Gemini Live real-time voice conversation)"
        aria-label="Voice Assistant"
      >
        <Headphones size={13} className={styles.voiceAssistantIcon} />
        <span>Voice Assistant</span>
        {isLive && <span className={styles.liveIndicatorDot} />}
      </button>

      <button
        className={styles.pillButton}
        onClick={handleInAppCall}
        title={`Start Live WebRTC In-App Call across browser tabs (Session: ${tabSessionId})`}
      >
        <Phone size={13} />
        <span>In-app call</span>
      </button>

      <button
        className={styles.pillButton}
        onClick={() => {
          startCall({
            name: 'Davana H S',
            phone: '+919535584969',
            mode: 'EXOTEL_REAL',
            value: 8490,
            product: 'Ortho GRID'
          });
        }}
        title="Initiate Real Phone Call to Davana H S (+919535584969) via Exotel Telephony"
        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
      >
        <Phone size={13} />
        <span>Exotel call</span>
      </button>

      <a
        href="tel:+919535584969"
        className={styles.pillButton}
        title="Call client Davana H S at +91 95355 84969 (opens device dialer)"
        aria-label="Call Davana H S at +91 95355 84969 using device dialer"
      >
        <Phone size={13} />
        <span>Phone call</span>
      </a>

      <button
        className={styles.shieldIcon}
        onClick={() => setShowSecurityTooltip(!showSecurityTooltip)}
        title="Privacy & Audio Shield: End-to-end local in-browser processing active"
      >
        <ShieldCheck size={16} />
      </button>

      {showSecurityTooltip && (
        <div className={styles.securityTooltip}>
          <div style={{ fontWeight: 700, marginBottom: '2px' }}>Audio & Privacy Shield</div>
          <div>Tab Identity: <code>{tabSessionId}</code></div>
          <div>Signaling: BroadcastChannel (Peer)</div>
        </div>
      )}
    </div>
  );
};
