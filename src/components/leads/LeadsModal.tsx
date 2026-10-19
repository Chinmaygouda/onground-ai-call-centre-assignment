import React, { useState } from 'react';
import {
  Users,
  X,
  Target,
  ChevronRight,
  ChevronDown,
  FileText,
  Shield,
  Phone,
  AlertCircle
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useCalling } from '../../context/CallingContext';
import styles from './LeadsModal.module.css';

export const LeadsModal: React.FC = () => {
  const { isLeadsModalOpen, closeLeadsModal, leads, activeLeadIndex, setActiveLeadIndex } =
    useAppState();
  const { startCall } = useCalling();

  const [isSignalsExpanded, setIsSignalsExpanded] = useState<boolean>(true);
  const [isIcpExpanded, setIsIcpExpanded] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  if (!isLeadsModalOpen) return null;

  const currentLead = leads[activeLeadIndex] || leads[0];

  const handleNext = () => {
    setActiveLeadIndex((activeLeadIndex + 1) % leads.length);
  };

  const handlePrev = () => {
    setActiveLeadIndex((activeLeadIndex - 1 + leads.length) % leads.length);
  };

  const handleInAppCall = () => {
    closeLeadsModal();
    startCall({
      name: currentLead.name,
      phone: currentLead.phone,
      mode: 'WEBRTC_PEER',
      value: currentLead.price,
      product: currentLead.product
    });
  };

  const handlePhoneCall = () => {
    closeLeadsModal();
    startCall({
      name: currentLead.name,
      phone: currentLead.phone,
      mode: 'PHONE',
      value: currentLead.price,
      product: currentLead.product
    });
  };

  return (
    <div className={styles.modalBackdrop} onClick={closeLeadsModal}>
      <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
        {/* Deep Purple Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <Users size={20} />
            <div>
              <h3 className={styles.headerTitle}>Leads</h3>
              <div className={styles.headerSubtitle}>
                Lead {activeLeadIndex + 1} of {leads.length} · SLA to close
              </div>
            </div>
          </div>
          <button className={styles.closeCircleBtn} onClick={closeLeadsModal} title="Close Lead Modal">
            <X size={16} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Carousel Navigation Bar */}
          <div className={styles.carouselBar}>
            <button
              className={styles.carouselNavBtn}
              onClick={handlePrev}
              title="Previous Lead"
            >
              ‹
            </button>
            <div className={styles.dotsRow}>
              {leads.map((_, i) => (
                <div
                  key={i}
                  className={`${styles.dot} ${i === activeLeadIndex ? styles.dotActive : ''}`}
                  onClick={() => setActiveLeadIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
            <button
              className={styles.carouselNavBtn}
              onClick={handleNext}
              title="Next Lead"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Status & SLA */}
          <div className={styles.statusRow}>
            <div className={styles.openBadge}>
              <span style={{ fontSize: '16px' }}>●</span>
              <span>{currentLead.status}</span>
            </div>
            <div className={styles.slaPill}>{currentLead.slaLeft}</div>
          </div>

          {/* Contact Details */}
          <div className={styles.contactRow}>
            <div className={styles.avatarMK}>{currentLead.initials}</div>
            <div>
              <div className={styles.contactNameText}>{currentLead.name}</div>
              <div className={styles.productText}>
                Interested: {currentLead.product} · ₹{currentLead.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Quote Tag Pill */}
          <div className={styles.quotePill}>
            <FileText size={15} />
            <span>{currentLead.quoteTag}</span>
          </div>

          {/* Scores Box */}
          <div className={styles.scoresSection}>
            <div className={styles.scoreRow}>
              <div className={styles.scoreLabel}>
                <Target size={15} color="#047857" />
                <span>ICP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={styles.icpTrack}>
                  <div
                    className={styles.icpFill}
                    style={{ width: `${currentLead.icpScore}%` }}
                  />
                </div>
                <span className={styles.scoreValue}>{currentLead.icpScore}%</span>
              </div>
            </div>

            <div className={styles.scoreRow}>
              <div className={styles.scoreLabel}>
                <Target size={15} color="#047857" />
                <span>Lead Intent Score</span>
              </div>
              <span className={styles.intentBadge}>{currentLead.intentScore}</span>
            </div>
          </div>

          {/* Accordion 1: ICP Fit Breakdown */}
          <button
            className={styles.accordionBtn}
            onClick={() => setIsIcpExpanded(!isIcpExpanded)}
          >
            <span>ICP FIT BREAKDOWN</span>
            {isIcpExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {isIcpExpanded && (
            <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 12px', lineHeight: 1.4 }}>
              Match based on homeowner profile in Bengaluru, master bedroom requirement, and verified budget bracket above ₹8,000.
            </div>
          )}

          {/* Accordion 2: How We Got Here */}
          <button
            className={styles.accordionBtn}
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <span>HOW WE GOT HERE</span>
            {isHistoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {isHistoryExpanded && (
            <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 12px', lineHeight: 1.4 }}>
              {currentLead.notes || 'In-store conversation analyzed by OnGround.ai speech models.'}
            </div>
          )}

          {/* Accordion 3: Where We Picked Up Signals (Default Expanded) */}
          <button
            className={styles.accordionBtn}
            onClick={() => setIsSignalsExpanded(!isSignalsExpanded)}
          >
            <span>WHERE WE PICKED UP SIGNALS</span>
            {isSignalsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {isSignalsExpanded && (
            <div className={styles.accordionSignals}>
              {/* Financing */}
              <div className={styles.signalItem}>
                <div className={styles.signalTitle}>
                  <span>₹</span>
                  <span>Financing Related</span>
                </div>
                <p className={styles.signalDesc}>
                  &ldquo;{currentLead.signals.financing}&rdquo;
                </p>
              </div>

              {/* Quotation */}
              <div className={styles.signalItem}>
                <div className={styles.signalTitle}>
                  <FileText size={13} />
                  <span>Quotation Demanded</span>
                </div>
                <p className={styles.signalDesc}>
                  &ldquo;{currentLead.signals.quotation}&rdquo;
                </p>
              </div>

              {/* Warranty */}
              <div className={styles.signalItem}>
                <div className={styles.signalTitle}>
                  <Shield size={13} />
                  <span>Warranty Related</span>
                </div>
                <p className={styles.signalDesc}>
                  &ldquo;{currentLead.signals.warranty}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Cumulative Missed Alert Footer */}
          <div className={styles.alertFooter}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>CUMULATIVE MISSED: 2</strong> · expired without close, visible to manager
            </div>
          </div>

          {/* Direct Calling Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              style={{
                flex: 1,
                backgroundColor: '#047857',
                color: '#ffffff',
                padding: '10px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(4, 120, 87, 0.25)'
              }}
              onClick={handleInAppCall}
            >
              <Phone size={14} />
              <span>In-app call</span>
            </button>

            <button
              style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '10px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={handlePhoneCall}
            >
              <Phone size={14} />
              <span>Phone call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
