import React, { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { useCalling } from '../../context/CallingContext';
import { useAppState } from '../../context/AppStateContext';
import styles from './FloatingActionPill.module.css';

export const FloatingActionPill: React.FC = () => {
  const { startCall, tabSessionId } = useCalling();
  const { openLeadsModal } = useAppState();
  const [showSecurityTooltip, setShowSecurityTooltip] = useState(false);

  const handleDemoClick = () => {
    // Open Leads Modal as the showcase demo
    openLeadsModal(0);
  };

  const handleInAppCall = () => {
    startCall({
      name: 'Arvind Rajan (Peer Tab)',
      phone: '+91 72041 04491',
      mode: 'WEBRTC_PEER',
      value: 8490,
      product: 'Ortho GRID'
    });
  };

  const handlePhoneCall = () => {
    startCall({
      name: 'Mukunda (Demo Customer)',
      phone: '+91 72041 04491',
      mode: 'PHONE',
      value: 8490,
      product: 'Ortho GRID'
    });
  };

  return (
    <div className={styles.floatingWrapper}>
      <button className={styles.demoBadge} onClick={handleDemoClick} title="Launch Showcase Lead Modal Demo">
        DEMO
      </button>

      <button
        className={styles.pillButton}
        onClick={handleInAppCall}
        title={`Start Live WebRTC In-App Call across browser tabs (Session: ${tabSessionId})`}
      >
        <Phone size={13} />
        <span>In-app call</span>
      </button>

      <button className={styles.pillButton} onClick={handlePhoneCall} title="Trigger Phone Dialer (tel: protocol)">
        <Phone size={13} />
        <span>Phone call</span>
      </button>

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
