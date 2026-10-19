import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useCalling } from '../../context/CallingContext';
import { RecentCall } from '../../types';
import styles from './PlannerView.module.css';

export const PlannerView: React.FC<{ defaultSubTab?: 'calls' | 'incoming' | 'recent' }> = ({
  defaultSubTab = 'calls'
}) => {
  const {
    leads,
    missedCalls,
    recentCalls,
    openLeadsModal,
    selectedCallReview,
    setSelectedCallReview,
    resolveMissedCall
  } = useAppState();

  const { startCall } = useCalling();
  const [activeTab, setActiveTab] = useState<'calls' | 'incoming' | 'recent'>(defaultSubTab);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Pagination for Calls to Make (2 records per page)
  const pageSize = 2;
  const totalPages = Math.ceil(leads.length / pageSize) || 3;
  const paginatedLeads = leads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCallbackClick = (callId: string, name: string, phone: string, value: number) => {
    resolveMissedCall(callId);
    startCall({
      name,
      phone,
      mode: 'AI_VOICE',
      value,
      product: 'Sleep Company Follow-up'
    });
  };

  const handleRecentCallClick = (call: RecentCall) => {
    setSelectedCallReview(call);
  };

  // Compute total value at stake
  const totalValueAtStake = missedCalls.reduce((acc, curr) => acc + (curr.expectedValue || 0), 0);

  return (
    <div className={styles.plannerContainer}>
      {/* Dark Navy Header Banner */}
      <section className={styles.headerBanner}>
        <div className={styles.bannerTitles}>
          <span className={styles.bannerSub}>Today&apos;s calling plan</span>
          <h1 className={styles.bannerMain}>Planner</h1>
        </div>
        <div className={styles.bannerDate}>Fri, 9</div>
      </section>

      {/* Sub-tabs row */}
      <div className={styles.subTabsRow}>
        <button
          className={`${styles.subTabBtn} ${activeTab === 'calls' ? styles.subTabActive : ''}`}
          onClick={() => setActiveTab('calls')}
        >
          Calls to make ({leads.length})
        </button>
        <button
          className={`${styles.subTabBtn} ${activeTab === 'incoming' ? styles.subTabActive : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Incoming ({missedCalls.length})
        </button>
        <button
          className={`${styles.subTabBtn} ${activeTab === 'recent' ? styles.subTabActive : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent ({recentCalls.length})
        </button>
      </div>

      {/* Body Area */}
      <div className={styles.plannerBody}>
        {/* VIEW 1: Calls to Make */}
        {activeTab === 'calls' && (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Planned outgoing calls</h2>
              <p className={styles.sectionSubtitle}>
                Ranked by lead attractiveness score — tap a lead for the full picture
              </p>
            </div>

            <div className={styles.listCard}>
              {paginatedLeads.map((lead, index) => {
                const leadGlobalIndex = (currentPage - 1) * pageSize + index;
                return (
                  <div
                    key={lead.id}
                    className={styles.listItem}
                    onClick={() => openLeadsModal(leadGlobalIndex)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.itemLeft}>
                      <div className={`${styles.avatarCircle} ${leadGlobalIndex % 2 === 1 ? styles.avatarGreen : ''}`}>
                        {lead.initials}
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>{lead.name}</div>
                        <div className={styles.itemDetail}>
                          Interested: {lead.product} · ₹{lead.price.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <div className={styles.scoreBadge}>
                        <span className={styles.scoreNumber}>{lead.attractivenessScore}</span>
                        <span className={styles.scoreText}>SCORE</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className={styles.paginationRow}>
              <button
                className={styles.pageBtn}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.pageText}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* VIEW 2: Incoming (Missed Calls) */}
        {activeTab === 'incoming' && (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Missed calls</h2>
              <p className={styles.sectionSubtitle}>
                Ranked by expected value — call the highest-value leads back first
              </p>
            </div>

            {/* Metrics Bar */}
            <div className={styles.incomingStatsRow}>
              <div className={styles.statItem}>
                <span className={styles.statVal}>{missedCalls.length}</span>
                <span className={styles.statLabel}>MISSED TODAY</span>
              </div>
              <div className={styles.statItem}>
                <span className={`${styles.statVal} ${styles.statValGreen}`}>
                  ₹{totalValueAtStake.toLocaleString()}
                </span>
                <span className={styles.statLabel}>EXPECTED VALUE AT STAKE</span>
              </div>
            </div>

            <div className={styles.listCard}>
              {missedCalls.map((call) => (
                <div key={call.id} className={styles.listItem}>
                  <div className={styles.itemLeft}>
                    <div className={`${styles.iconCircle} ${styles.iconMissed}`}>
                      <PhoneMissed size={18} />
                    </div>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{call.name}</div>
                      <div className={styles.itemDetail}>{call.missedText}</div>
                    </div>
                  </div>

                  <div className={styles.itemRight}>
                    <div className={styles.valueTag}>
                      {call.expectedValue > 0 ? (
                        <>
                          ₹{call.expectedValue.toLocaleString()}
                          <span className={styles.valueLabel}>expected value</span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px' }}>New contact</span>
                      )}
                    </div>

                    <button
                      className={styles.callbackBtn}
                      onClick={() =>
                        handleCallbackClick(call.id, call.name, call.phone, call.expectedValue)
                      }
                      title={`Call back ${call.name}`}
                    >
                      <PhoneCall size={14} />
                      <span>Call back</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 3: Recent Calls */}
        {activeTab === 'recent' && (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent calls</h2>
              <p className={styles.sectionSubtitle}>Tap a call to review it against SOP</p>
            </div>

            <div className={styles.listCard}>
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className={styles.listItem}
                  onClick={() => handleRecentCallClick(call)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.itemLeft}>
                    <div
                      className={`${styles.iconCircle} ${
                        call.type === 'inbound'
                          ? styles.iconInbound
                          : call.type === 'outbound'
                          ? styles.iconOutbound
                          : styles.iconMissed
                      }`}
                    >
                      {call.type === 'inbound' && <PhoneIncoming size={18} />}
                      {call.type === 'outbound' && <PhoneOutgoing size={18} />}
                      {call.type === 'missed' && <PhoneMissed size={18} />}
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{call.name}</div>
                      <div className={styles.itemDetail}>
                        {call.timeText}
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemRight}>
                    {call.sopScore && call.sopScore > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#047857',
                          backgroundColor: '#ecfdf5',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        SOP: {call.sopScore}%
                      </span>
                    )}
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SOP Call Review Drawer Overlay */}
      {selectedCallReview && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedCallReview(null)}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>SOP Call Review</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedCallReview.name} · {selectedCallReview.duration}
                </span>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedCallReview(null)}
                title="Close Drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Audio Playback Bar */}
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <button
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#047857',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                >
                  <Play size={16} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                    <span>{isPlayingAudio ? 'Playing call audio...' : 'Audio Recording'}</span>
                    <span>{selectedCallReview.duration}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: isPlayingAudio ? '65%' : '0%', backgroundColor: '#047857', transition: 'width 2s' }}></div>
                  </div>
                </div>
              </div>

              {/* SOP Checklist */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                  Quality Assurance Checklist
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <CheckCircle2 size={16} color="#047857" />
                    <span>Greeting delivered within first 10 seconds</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <CheckCircle2 size={16} color="#047857" />
                    <span>Customer name acknowledged ({selectedCallReview.name})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <CheckCircle2 size={16} color="#047857" />
                    <span>Product warranty and 100-night trial highlighted</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <CheckCircle2 size={16} color="#047857" />
                    <span>Clear next step / SLA follow-up scheduled</span>
                  </div>
                </div>
              </div>

              {/* Call Transcript */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={15} />
                  <span>Call Transcript</span>
                </h4>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {selectedCallReview.transcript && selectedCallReview.transcript.length > 0 ? (
                    selectedCallReview.transcript.map((line, idx) => (
                      <div key={idx} style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
                        <strong style={{ color: line.speaker === 'Arvind' ? '#047857' : '#1e3a8a' }}>
                          {line.speaker} ({line.time}):{' '}
                        </strong>
                        <span style={{ color: '#334155' }}>{line.text}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Audio recorded on Mon Oct 9, 2026. Automated transcript summary: Customer inquired about product delivery timeline and requested written quotation.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                className={styles.callbackBtn}
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                onClick={() => {
                  setSelectedCallReview(null);
                  startCall({
                    name: selectedCallReview.name,
                    phone: '+91 98450 12345',
                    mode: 'AI_VOICE'
                  });
                }}
              >
                <PhoneCall size={14} />
                <span>Call {selectedCallReview.name} Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
