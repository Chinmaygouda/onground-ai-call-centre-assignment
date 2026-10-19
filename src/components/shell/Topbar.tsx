import React from 'react';
import { Bell, Calendar as CalendarIcon, Star, Sparkles } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import styles from './Topbar.module.css';

export const Topbar: React.FC = () => {
  const { agent, currentRoute, setCurrentRoute } = useAppState();
  const { openModal, connectionState } = useGeminiLive();

  const handleDateClick = () => {
    setCurrentRoute('calendar');
  };

  return (
    <header className={styles.topbar}>
      {/* Brand */}
      <div className={styles.brandSection}>
        <div className={styles.brandBadge}>OG</div>
        <span className={styles.brandName}>On-Ground.ai</span>
      </div>

      {/* User Controls & Status */}
      <div className={styles.userSection}>
        {/* Customer Voice Assistant (Gemini Live) */}
        <button
          className={styles.geminiVoiceBtn}
          onClick={openModal}
          title="Launch Customer Voice Assistant (Gemini Live Multimodal Voice AI)"
        >
          <Sparkles size={14} className={styles.geminiSparkleIcon} />
          <span>
            {connectionState === 'LISTENING' || connectionState === 'SPEAKING'
              ? 'Voice Assistant (Live)'
              : 'Customer Voice Assistant'}
          </span>
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
