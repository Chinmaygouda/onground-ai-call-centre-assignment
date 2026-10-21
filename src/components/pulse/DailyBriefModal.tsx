import React from 'react';
import {
  Sparkles,
  X,
  PhoneCall,
  Users,
  Trophy,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './DailyBriefModal.module.css';

export const DailyBriefModal: React.FC = () => {
  const {
    isDailyBriefModalOpen,
    setIsDailyBriefModalOpen,
    setCurrentRoute,
    openLeadsModal,
    setActivePulseChannelId
  } = useAppState();

  if (!isDailyBriefModalOpen) return null;

  const handleGoCallbacks = () => {
    setIsDailyBriefModalOpen(false);
    setCurrentRoute('plan/incoming');
  };

  const handleGoLeads = () => {
    setIsDailyBriefModalOpen(false);
    openLeadsModal(0);
  };

  const handleGoSop = () => {
    setIsDailyBriefModalOpen(false);
    setActivePulseChannelId('sop-agent');
    setCurrentRoute('pulse');
  };

  return (
    <div className={styles.backdrop} onClick={() => setIsDailyBriefModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.sparkleIcon}>
              <Sparkles size={18} color="#fef08a" />
            </div>
            <div>
              <h3 className={styles.title}>AvaniBot · Daily Shift Brief</h3>
              <div className={styles.subtitle}>
                Friday, October 9, 2026 · Koramangala Hub
              </div>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setIsDailyBriefModalOpen(false)}
            title="Close Daily Brief"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Executive Summary Card */}
          <div className={styles.summaryCard}>
            <p className={styles.summaryText}>
              Good day, Arvind! Today&apos;s shift is focused on converting 2 high-intent warm leads
              and addressing the first-10s greeting QA compliance across all incoming customer calls.
            </p>
          </div>

          {/* Action Items List */}
          <div className={styles.itemsList}>
            {/* Item 1 */}
            <div className={styles.briefItem}>
              <div className={styles.itemIconCircle} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <PhoneCall size={16} />
              </div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeading}>
                  <span>2 Callbacks Scheduled for 4:30 PM</span>
                  <span className={styles.badgeUrgent}>High Value</span>
                </div>
                <p className={styles.itemDesc}>
                  Priya Iyer (billing dispute) and Faizan A. (₹24,990 SmartGRID Ortho query).
                </p>
                <button className={styles.actionBtn} onClick={handleGoCallbacks}>
                  <span>Open Missed Callbacks</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Item 2 */}
            <div className={styles.briefItem}>
              <div className={styles.itemIconCircle} style={{ backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                <Users size={16} />
              </div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeading}>
                  <span>2 Hot In-CRM Leads Pending</span>
                  <span className={styles.badgeAmber}>SLA &lt; 2h</span>
                </div>
                <p className={styles.itemDesc}>
                  Chinmaygouda (87% ICP) and Ritu S. (94% ICP) visited store yesterday.
                </p>
                <button className={styles.actionBtn} onClick={handleGoLeads}>
                  <span>Review Lead Details</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Item 3 */}
            <div className={styles.briefItem}>
              <div className={styles.itemIconCircle} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <ShieldCheck size={16} />
              </div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeading}>
                  <span>Greeting-in-first-10s Coaching Focus</span>
                  <span className={styles.badgeGreen}>Target: 85%</span>
                </div>
                <p className={styles.itemDesc}>
                  Shift average is currently at 71%. Open every call with the official Sleep Company greeting script.
                </p>
                <button className={styles.actionBtn} onClick={handleGoSop}>
                  <span>Check SOP Channel Guidelines</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Kudos Recognition */}
            <div className={styles.kudosBox}>
              <Trophy size={18} color="#d97706" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#92400e' }}>
                  TEAM RECOGNITION
                </div>
                <div style={{ fontSize: '12px', color: '#78350f', fontStyle: 'italic' }}>
                  &ldquo;Great work with Chinmaygouda — closed that objection beautifully!&rdquo; · Sunita Rao
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.closeMainBtn}
            onClick={() => setIsDailyBriefModalOpen(false)}
          >
            Got it, Let&apos;s Start Shift
          </button>
        </div>
      </div>
    </div>
  );
};
