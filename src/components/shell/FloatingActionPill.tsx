import React, { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { useCalling } from '../../context/CallingContext';
import { useAppState } from '../../context/AppStateContext';
import styles from './FloatingActionPill.module.css';

export const FloatingActionPill: React.FC = () => {
  const { startCall } = useCalling();
  const { openLeadsModal } = useAppState();
  const [showSecurityTooltip, setShowSecurityTooltip] = useState(false);

  const handleDemoClick = () => {
    // Open Leads Modal as the showcase demo
    openLeadsModal(0);
  };

  const handleInAppCall = () => {
    startCall({
      name: 'Mukunda (AI Customer)',
      phone: '+91 72041 04491',
      mode: 'AI_VOICE',
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

      <button className={styles.pillButton} onClick={handleInAppCall} title="Start Live In-App Audio Voice Call">
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
    </div>
  );
};
