import React, { useRef, useEffect } from 'react';
import { Trophy, Star, X, Award } from 'lucide-react';
import { useAppState } from '../../../context/AppStateContext';
import styles from './LeaderboardPopover.module.css';

export const LeaderboardPopover: React.FC = () => {
  const { isLeaderboardOpen, setIsLeaderboardOpen } = useAppState();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsLeaderboardOpen(false);
      }
    };
    if (isLeaderboardOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLeaderboardOpen, setIsLeaderboardOpen]);

  if (!isLeaderboardOpen) return null;

  const leaderboardData = [
    {
      rank: 1,
      name: 'Arvind Rajan (You)',
      score: 76,
      csat: '94%',
      calls: 14,
      isCurrentUser: true
    },
    {
      rank: 2,
      name: 'Priya Iyer',
      score: 72,
      csat: '91%',
      calls: 11,
      isCurrentUser: false
    },
    {
      rank: 3,
      name: 'Suresh Nair',
      score: 69,
      csat: '88%',
      calls: 9,
      isCurrentUser: false
    },
    {
      rank: 4,
      name: 'Kavitha R.',
      score: 65,
      csat: '85%',
      calls: 8,
      isCurrentUser: false
    }
  ];

  return (
    <div className={styles.popover} ref={popoverRef}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Trophy size={16} color="#d97706" />
          <span className={styles.title}>Hub Leaderboard · Koramangala</span>
        </div>
        <button
          className={styles.closeBtn}
          onClick={() => setIsLeaderboardOpen(false)}
          title="Close leaderboard"
        >
          <X size={15} />
        </button>
      </div>

      {/* Current Position Banner */}
      <div className={styles.currentPositionBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={styles.rankMedal}>#1</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#92400e' }}>
              Shift Leader · Arvind Rajan
            </div>
            <div style={{ fontSize: '11.5px', color: '#b45309' }}>
              OG Score™ 76 · Top 5% in regional network
            </div>
          </div>
        </div>
        <Award size={20} color="#d97706" />
      </div>

      {/* Leaderboard List */}
      <div className={styles.list}>
        {leaderboardData.map((item) => (
          <div
            key={item.rank}
            className={`${styles.item} ${
              item.isCurrentUser ? styles.itemCurrentUser : ''
            }`}
          >
            <span className={styles.rankNum}>#{item.rank}</span>
            <div className={styles.itemInfo}>
              <div className={styles.itemName}>{item.name}</div>
              <div className={styles.itemSub}>
                {item.calls} calls handled · {item.csat} CSAT
              </div>
            </div>
            <div className={styles.itemScore}>
              <Star size={12} fill="#d97706" color="#d97706" />
              <span>{item.score}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Score Formula Breakdown */}
      <div className={styles.footerBreakdown}>
        <div className={styles.breakdownTitle}>OG SCORE™ FORMULA PILLARS</div>
        <div className={styles.pillarsGrid}>
          <div className={styles.pillar}>
            <span className={styles.pillarVal}>81%</span>
            <span className={styles.pillarLabel}>SOP Adherence</span>
          </div>
          <div className={styles.pillar}>
            <span className={styles.pillarVal}>94%</span>
            <span className={styles.pillarLabel}>CSAT Rating</span>
          </div>
          <div className={styles.pillar}>
            <span className={styles.pillarVal}>4m 12s</span>
            <span className={styles.pillarLabel}>Avg Handle</span>
          </div>
          <div className={styles.pillar}>
            <span className={styles.pillarVal}>24%</span>
            <span className={styles.pillarLabel}>Attach Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};
