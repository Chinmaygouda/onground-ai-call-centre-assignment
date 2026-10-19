import { Bell, Calendar as CalendarIcon, Star, Headphones, Menu } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './Topbar.module.css';

export const Topbar: React.FC = () => {
  const { agent, currentRoute, setCurrentRoute, isMobileNavOpen, setIsMobileNavOpen } = useAppState();
  const { openModal, connectionState } = useGeminiLive();

  const handleDateClick = () => {
    setCurrentRoute('calendar');
  };

  const isLive = connectionState === 'LISTENING' || connectionState === 'SPEAKING';

  return (
    <header className={styles.topbar}>
      {/* Brand & Mobile Hamburger */}
      <div className={styles.brandSection}>
        <button
          className={styles.hamburgerBtn}
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          title="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
        <div className={styles.brandBadge}>OG</div>
        <span className={styles.brandName}>On-Ground.ai</span>
      </div>

      {/* User Controls & Status */}
      <div className={styles.userSection}>
        {/* Customer Voice Assistant (Gemini Live) */}
        <button
          className={`${styles.geminiVoiceBtn} ${isLive ? styles.geminiVoiceBtnActive : ''}`}
          onClick={openModal}
          title="Voice Assistant (Gemini Live multimodal voice AI)"
          aria-label="Voice Assistant"
        >
          <Headphones size={14} className={styles.geminiSparkleIcon} />
          <span>{isLive ? 'Voice Assistant (Live)' : 'Voice Assistant'}</span>
        </button>

        {/* On Queue Indicator */}
        <div className={styles.queuePill}>
          <span className={styles.queueDot}></span>
          <span>{agent.queueStatus}</span>
        </div>

        {/* Date Filter Pill */}
        <button
          className={styles.dateFilterBtn}
          onClick={handleDateClick}
          title="Jump to Calendar"
        >
          <CalendarIcon size={14} />
          <span>{currentRoute.startsWith('plan') ? 'Fri, 9' : 'This Week'}</span>
        </button>

        {/* Notification Bell */}
        <button className={styles.notificationBtn} title="4 pending notifications">
          <Bell size={16} />
        </button>

        {/* Score Pill */}
        <div className={styles.badgePill} title="Current OG Score™">
          <span>{agent.ogScore}</span>
        </div>

        {/* Rank Pill */}
        <div className={styles.starPill} title="Leaderboard Shift Rank">
          <Star size={12} fill="#f59e0b" />
          <span>{agent.rank}</span>
        </div>

        {/* Agent Avatar */}
        <div className={styles.avatar} title={`${agent.name} (${agent.company})`}>
          {agent.initials}
        </div>
      </div>
    </header>
  );
};
