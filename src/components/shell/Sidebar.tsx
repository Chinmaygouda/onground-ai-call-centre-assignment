import React from 'react';
import {
  LayoutDashboard,
  Phone,
  PhoneOutgoing,
  PhoneIncoming,
  History,
  PhoneCall,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useCalling } from '../../context/CallingContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  const { currentRoute, setCurrentRoute, isPlanSubmenuOpen, setIsPlanSubmenuOpen } = useAppState();
  const { startCall } = useCalling();
  const { openModal, connectionState } = useGeminiLive();

  const isPlanActive = currentRoute.startsWith('plan');

  const handlePlanClick = () => {
    setIsPlanSubmenuOpen(!isPlanSubmenuOpen);
    if (!isPlanActive) {
      setCurrentRoute('plan/calls');
    }
  };

  const handlePractiseCall = () => {
    setCurrentRoute('plan/practise');
    startCall({
      name: 'Mukunda (AI Customer)',
      phone: '+91 72041 04491',
      mode: 'AI_VOICE',
      value: 8490,
      product: 'Ortho GRID'
    });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <span className={styles.logoText}>On-Ground.ai</span>
      </div>

      <nav className={styles.navContainer}>
        {/* Dashboard */}
        <button
          className={`${styles.navItem} ${currentRoute === 'dashboard' ? styles.navItemActive : ''}`}
          onClick={() => setCurrentRoute('dashboard')}
        >
          <LayoutDashboard className={styles.navIcon} />
          <span>Dashboard</span>
        </button>

        {/* Plan with Submenu */}
        <button
          className={`${styles.navItem} ${isPlanActive ? styles.navItemActive : ''}`}
          onClick={handlePlanClick}
        >
          <Phone className={styles.navIcon} />
          <span>Plan</span>
          {isPlanSubmenuOpen ? (
            <ChevronDown className={styles.chevronIcon} />
          ) : (
            <ChevronRight className={styles.chevronIcon} />
          )}
        </button>

        {isPlanSubmenuOpen && (
          <div className={styles.submenu}>
            <button
              className={`${styles.subItem} ${currentRoute === 'plan/calls' ? styles.subItemActive : ''}`}
              onClick={() => setCurrentRoute('plan/calls')}
            >
              <PhoneOutgoing className={styles.subIcon} />
              <span>Calls to make</span>
            </button>

            <button
              className={`${styles.subItem} ${currentRoute === 'plan/incoming' ? styles.subItemActive : ''}`}
              onClick={() => setCurrentRoute('plan/incoming')}
            >
              <PhoneIncoming className={styles.subIcon} />
              <span>Incoming</span>
            </button>

            <button
              className={`${styles.subItem} ${currentRoute === 'plan/recent' ? styles.subItemActive : ''}`}
              onClick={() => setCurrentRoute('plan/recent')}
            >
              <History className={styles.subIcon} />
              <span>Recent</span>
            </button>

            <button
              className={`${styles.subItem} ${currentRoute === 'plan/practise' ? styles.subItemActive : ''}`}
              onClick={handlePractiseCall}
            >
              <PhoneCall className={styles.subIcon} />
              <span>Practise a call</span>
            </button>
          </div>
        )}

        {/* Calendar */}
        <button
          className={`${styles.navItem} ${currentRoute === 'calendar' ? styles.navItemActive : ''}`}
          onClick={() => setCurrentRoute('calendar')}
        >
          <Calendar className={styles.navIcon} />
          <span>Calendar</span>
        </button>

        {/* Pulse */}
        <button
          className={`${styles.navItem} ${currentRoute.startsWith('pulse') ? styles.navItemActive : ''}`}
          onClick={() => setCurrentRoute('pulse')}
        >
          <MessageSquare className={styles.navIcon} />
          <span>Pulse</span>
        </button>

        {/* Gemini Live Mode 3: Customer Voice Assistant */}
        <div className={styles.sectionDivider}>AI Voice Assistant</div>
        <button
          className={`${styles.navItem} ${styles.geminiNavItem}`}
          onClick={openModal}
          title="Open Gemini Live Customer Voice Assistant"
        >
          <Sparkles className={styles.navIconGemini} />
          <span>Customer Voice AI</span>
          <span className={styles.liveBadge}>
            {connectionState === 'LISTENING' || connectionState === 'SPEAKING' ? 'LIVE' : 'LIVE API'}
          </span>
        </button>
      </nav>
    </aside>
  );
};
