import React from 'react';
import {
  Bell,
  Calendar as CalendarIcon,
  Star,
  Headphones,
  Menu,
  Search
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useGeminiLive } from '../../context/GeminiLiveContext';
import { NotificationsPopover } from './popovers/NotificationsPopover';
import { ProfileMenuPopover } from './popovers/ProfileMenuPopover';
import { LeaderboardPopover } from './popovers/LeaderboardPopover';
import { QuickSearchModal } from './popovers/QuickSearchModal';
import styles from './Topbar.module.css';

export const Topbar: React.FC = () => {
  const {
    agent,
    currentRoute,
    setCurrentRoute,
    isMobileNavOpen,
    setIsMobileNavOpen,
    notifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    isLeaderboardOpen,
    setIsLeaderboardOpen,
    setIsQuickSearchOpen
  } = useAppState();

  const { openModal, connectionState } = useGeminiLive();

  const handleDateClick = () => {
    setCurrentRoute('calendar');
  };

  const isLive = connectionState === 'LISTENING' || connectionState === 'SPEAKING';
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

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

        {/* Global Quick Search Shortcut */}
        <button
          className={styles.searchTriggerBtn}
          onClick={() => setIsQuickSearchOpen(true)}
          title="Quick Find Leads, Calls & Channels (Ctrl+K)"
        >
          <Search size={14} />
          <span className={styles.searchTriggerText}>Search...</span>
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </button>
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
        <button
          className={styles.queuePill}
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title="Click to change shift status (Ready / Break / Wrap-up)"
        >
          <span className={styles.queueDot}></span>
          <span>{agent.queueStatus}</span>
        </button>

        {/* Date Filter Pill */}
        <button
          className={styles.dateFilterBtn}
          onClick={handleDateClick}
          title="Jump to Calendar Schedule"
        >
          <CalendarIcon size={14} />
          <span>{currentRoute.startsWith('plan') ? 'Fri, 9' : 'This Week'}</span>
        </button>

        {/* Notification Bell */}
        <button
          className={styles.notificationBtn}
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          title={`${unreadNotifsCount} pending shift notifications`}
        >
          <Bell size={16} />
          {unreadNotifsCount > 0 && (
            <span className={styles.notifBadgeCount}>{unreadNotifsCount}</span>
          )}
        </button>

        {/* Score Pill */}
        <button
          className={styles.badgePill}
          onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
          title="Current OG Score™ — Click for Hub Leaderboard & Breakdown"
        >
          <span>{agent.ogScore}</span>
        </button>

        {/* Rank Pill */}
        <button
          className={styles.starPill}
          onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
          title="Leaderboard Shift Rank — Click for Hub Leaderboard"
        >
          <Star size={12} fill="#f59e0b" />
          <span>{agent.rank}</span>
        </button>

        {/* Agent Avatar */}
        <button
          className={styles.avatar}
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          title={`${agent.name} (${agent.company}) — Click for Profile & Shift Menu`}
        >
          {agent.initials}
        </button>
      </div>

      {/* Popovers */}
      <NotificationsPopover />
      <ProfileMenuPopover />
      <LeaderboardPopover />
      <QuickSearchModal />
    </header>
  );
};

