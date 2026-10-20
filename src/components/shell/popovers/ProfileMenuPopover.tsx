import React, { useRef, useEffect, useState } from 'react';
import {
  Coffee,
  PlayCircle,
  PauseCircle,
  Award,
  Clock,
  LogOut,
  Sliders,
  X
} from 'lucide-react';
import { useAppState } from '../../../context/AppStateContext';
import styles from './ProfileMenuPopover.module.css';

export const ProfileMenuPopover: React.FC = () => {
  const {
    agent,
    updateAgentQueueStatus,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    setIsLeaderboardOpen
  } = useAppState();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
        setConfirmSignOut(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen, setIsProfileMenuOpen]);

  if (!isProfileMenuOpen) return null;

  const handleStatusChange = (status: 'On Queue' | 'Paused' | 'Break') => {
    updateAgentQueueStatus(status);
  };

  const handleOpenLeaderboard = () => {
    setIsProfileMenuOpen(false);
    setIsLeaderboardOpen(true);
  };

  const handleSignOut = () => {
    updateAgentQueueStatus('Break');
    setConfirmSignOut(false);
    setIsProfileMenuOpen(false);
  };

  return (
    <div className={styles.popover} ref={popoverRef}>
      {/* Header Profile Badge */}
      <div className={styles.header}>
        <div className={styles.avatarLarge}>{agent.initials}</div>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{agent.name}</span>
            <span className={styles.roleBadge}>Frontline Lead</span>
          </div>
          <div className={styles.company}>
            {agent.company} · {agent.department}
          </div>
          <div className={styles.shiftTag}>
            <Clock size={11} />
            <span>Shift: 9:00 AM - 6:00 PM</span>
          </div>
        </div>
        <button
          className={styles.closeBtn}
          onClick={() => setIsProfileMenuOpen(false)}
          title="Close profile menu"
        >
          <X size={15} />
        </button>
      </div>

      {/* Queue Status Selector */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>CALL QUEUE STATUS</div>
        <div className={styles.statusButtonsRow}>
          <button
            className={`${styles.statusBtn} ${
              agent.queueStatus === 'On Queue' ? styles.statusBtnActiveReady : ''
            }`}
            onClick={() => handleStatusChange('On Queue')}
          >
            <PlayCircle size={14} />
            <span>On Queue</span>
          </button>

          <button
            className={`${styles.statusBtn} ${
              agent.queueStatus === 'Break' ? styles.statusBtnActiveBreak : ''
            }`}
            onClick={() => handleStatusChange('Break')}
          >
            <Coffee size={14} />
            <span>Break</span>
          </button>

          <button
            className={`${styles.statusBtn} ${
              agent.queueStatus === 'Paused' ? styles.statusBtnActiveWrap : ''
            }`}
            onClick={() => handleStatusChange('Paused')}
          >
            <PauseCircle size={14} />
            <span>Wrap-up</span>
          </button>
        </div>
      </div>

      {/* Shift Live Metrics */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>TODAY&apos;S SHIFT STATS</div>
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>76</span>
            <span className={styles.metricLabel}>OG Score</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>94%</span>
            <span className={styles.metricLabel}>CSAT Today</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>4m 12s</span>
            <span className={styles.metricLabel}>Avg Handle</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>14</span>
            <span className={styles.metricLabel}>Calls Handled</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actionsList}>
        <button className={styles.actionItem} onClick={handleOpenLeaderboard}>
          <Award size={15} color="#d97706" />
          <span>View Hub Leaderboard & Scores</span>
        </button>

        <button
          className={styles.actionItem}
          onClick={() => {
            setIsProfileMenuOpen(false);
          }}
        >
          <Sliders size={15} color="#475569" />
          <span>Frontline Workspace Settings</span>
        </button>

        {!confirmSignOut ? (
          <button
            className={`${styles.actionItem} ${styles.actionDanger}`}
            onClick={() => setConfirmSignOut(true)}
          >
            <LogOut size={15} />
            <span>End Active Shift</span>
          </button>
        ) : (
          <div className={styles.confirmBox}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
              Confirm ending shift and logging off queue?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={styles.confirmYesBtn} onClick={handleSignOut}>
                Yes, End Shift
              </button>
              <button
                className={styles.confirmNoBtn}
                onClick={() => setConfirmSignOut(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
