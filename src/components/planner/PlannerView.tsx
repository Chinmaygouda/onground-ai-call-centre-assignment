import React, { useState } from 'react';
import {
  PhoneCall,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  Check
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useCalling } from '../../context/CallingContext';
import { RecentCall } from '../../types';
import { ClickToCallButton } from '../common/ClickToCallButton';
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
    openCallbackModal,
    setIsCreateLeadModalOpen
  } = useAppState();

  const { startCall } = useCalling();
  const [activeTab, setActiveTab] = useState<'calls' | 'incoming' | 'recent'>(defaultSubTab);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isSopApproved, setIsSopApproved] = useState<boolean>(false);

  // Search & filter states
  const [leadSearch, setLeadSearch] = useState<string>('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'high-icp' | 'high-intent'>('all');
  const [incomingSearch, setIncomingSearch] = useState<string>('');
  const [recentSearch, setRecentSearch] = useState<string>('');
  const [recentTypeFilter, setRecentTypeFilter] = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all');

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.phone.includes(leadSearch) ||
      lead.product.toLowerCase().includes(leadSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (leadFilter === 'high-icp') return lead.icpScore >= 80;
    if (leadFilter === 'high-intent') return lead.intentScore >= 85;
    return true;
  });

  // Pagination for filtered leads (2 records per page)
  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Filtered Incoming calls
  const filteredIncoming = missedCalls.filter((call) =>
    call.name.toLowerCase().includes(incomingSearch.toLowerCase()) ||
    call.phone.includes(incomingSearch)
  );

  // Filtered Recent calls
  const filteredRecent = recentCalls.filter((call) => {
    const matchesSearch =
      call.name.toLowerCase().includes(recentSearch.toLowerCase()) ||
      (call.phone && call.phone.includes(recentSearch));
    if (!matchesSearch) return false;
    if (recentTypeFilter !== 'all' && call.type !== recentTypeFilter) return false;
    return true;
  });

  const handleCallbackClick = (call: (typeof missedCalls)[0]) => {
    openCallbackModal(call);
  };

  const handleRecentCallClick = (call: RecentCall) => {
    setSelectedCallReview(call);
    setIsSopApproved(false);
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
            <div className={styles.actionHeaderRow}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Planned outgoing calls</h2>
                <p className={styles.sectionSubtitle}>
                  Ranked by lead attractiveness score — tap a lead for the full picture
                </p>
              </div>
              <button
                className={styles.newLeadBtn}
                onClick={() => setIsCreateLeadModalOpen(true)}
                title="Add a new lead to today's queue"
              >
                <Plus size={15} />
                <span>+ New Lead</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className={styles.filterControlsRow}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter leads by name, phone, product..."
                  value={leadSearch}
                  onChange={(e) => {
                    setLeadSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.pillsRow}>
                <button
                  className={`${styles.filterPill} ${leadFilter === 'all' ? styles.filterPillActive : ''}`}
                  onClick={() => { setLeadFilter('all'); setCurrentPage(1); }}
                >
                  All ({leads.length})
                </button>
                <button
                  className={`${styles.filterPill} ${leadFilter === 'high-icp' ? styles.filterPillActive : ''}`}
                  onClick={() => { setLeadFilter('high-icp'); setCurrentPage(1); }}
                >
                  ICP ≥ 80%
                </button>
                <button
                  className={`${styles.filterPill} ${leadFilter === 'high-intent' ? styles.filterPillActive : ''}`}
                  onClick={() => { setLeadFilter('high-intent'); setCurrentPage(1); }}
                >
                  Intent ≥ 85
                </button>
              </div>
            </div>

            {filteredLeads.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                No leads match &ldquo;{leadSearch}&rdquo;. Try another filter or create a new lead above.
              </div>
            ) : (
              <>
                <div className={styles.listCard}>
                  {paginatedLeads.map((lead) => {
                    const leadGlobalIndex = leads.findIndex((l) => l.id === lead.id);
                    return (
                      <div
                        key={lead.id}
                        className={styles.listItem}
                        onClick={() => openLeadsModal(leadGlobalIndex >= 0 ? leadGlobalIndex : 0)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles.itemLeft}>
                          <div className={`${styles.avatarCircle} ${leadGlobalIndex % 2 === 1 ? styles.avatarGreen : ''}`}>
                            {lead.initials}
                          </div>
                          <div className={styles.itemInfo}>
                            <div className={styles.itemNameRow}>
                              <span className={styles.itemName}>{lead.name}</span>
                              <span
                                className={styles.itemPhone}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCall({
                                    name: lead.name,
                                    phone: lead.phone,
                                    mode: 'EXOTEL_REAL',
                                    value: lead.price,
                                    product: lead.product
                                  });
                                }}
                                title={`Click to initiate real phone call to ${lead.name} (${lead.phone}) via Exotel`}
                                style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                              >
                                {lead.phone}
                              </span>
                              <button
                                style={{
                                  background: 'rgba(2, 132, 199, 0.12)',
                                  border: '1px solid rgba(2, 132, 199, 0.4)',
                                  color: '#0284c7',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCall({
                                    name: lead.name,
                                    phone: lead.phone,
                                    mode: 'EXOTEL_REAL',
                                    value: lead.price,
                                    product: lead.product
                                  });
                                }}
                                title={`Initiate Real Exotel Telephone Call to ${lead.name}`}
                              >
                                <Phone size={11} />
                                <span>Call Client</span>
                              </button>
                              <ClickToCallButton phone={lead.phone} customerName={lead.name} size="sm" />
                            </div>
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
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={styles.pageText}>
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
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

            {/* Incoming Search Bar */}
            <div className={styles.filterControlsRow}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter missed calls by caller name or phone..."
                  value={incomingSearch}
                  onChange={(e) => setIncomingSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {filteredIncoming.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                No missed calls match &ldquo;{incomingSearch}&rdquo;.
              </div>
            ) : (
              <div className={styles.listCard}>
                {filteredIncoming.map((call) => (
                  <div key={call.id} className={styles.listItem}>
                    <div className={styles.itemLeft}>
                      <div className={`${styles.iconCircle} ${styles.iconMissed}`}>
                        <PhoneMissed size={18} />
                      </div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName}>{call.name}</span>
                          <span className={styles.itemPhone}>{call.phone}</span>
                          {call.isDemoRecord && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '9999px', color: '#fbbf24', fontWeight: 700 }}>
                              Demo Record
                            </span>
                          )}
                          <ClickToCallButton phone={call.phone} customerName={call.name} size="sm" />
                        </div>
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

                      {call.isResolved && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#059669',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            marginRight: '8px'
                          }}
                        >
                          {call.tag && call.tag.includes('Callback Requested') ? 'Callback Scheduled' : 'Callback Handled'}
                        </span>
                      )}

                      <button
                        className={styles.callbackBtn}
                        onClick={() => handleCallbackClick(call)}
                        title={`Call back ${call.name}`}
                      >
                        <PhoneCall size={14} />
                        <span>Call back</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW 3: Recent Calls */}
        {activeTab === 'recent' && (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent calls</h2>
              <p className={styles.sectionSubtitle}>Tap a call to review it against SOP</p>
            </div>

            {/* Filter & Search Bar */}
            <div className={styles.filterControlsRow}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter recent calls by name or phone..."
                  value={recentSearch}
                  onChange={(e) => setRecentSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.pillsRow}>
                <button
                  className={`${styles.filterPill} ${recentTypeFilter === 'all' ? styles.filterPillActive : ''}`}
                  onClick={() => setRecentTypeFilter('all')}
                >
                  All ({recentCalls.length})
                </button>
                <button
                  className={`${styles.filterPill} ${recentTypeFilter === 'inbound' ? styles.filterPillActive : ''}`}
                  onClick={() => setRecentTypeFilter('inbound')}
                >
                  Inbound
                </button>
                <button
                  className={`${styles.filterPill} ${recentTypeFilter === 'outbound' ? styles.filterPillActive : ''}`}
                  onClick={() => setRecentTypeFilter('outbound')}
                >
                  Outbound
                </button>
                <button
                  className={`${styles.filterPill} ${recentTypeFilter === 'missed' ? styles.filterPillActive : ''}`}
                  onClick={() => setRecentTypeFilter('missed')}
                >
                  Missed
                </button>
              </div>
            </div>

            {filteredRecent.length === 0 ? (
              <div className={styles.emptyStateMessage}>
                No recent calls match your search.
              </div>
            ) : (
              <div className={styles.listCard}>
                {filteredRecent.map((call) => (
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
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName}>{call.name}</span>
                          {call.provider === 'exotel' && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(2, 132, 199, 0.4)', borderRadius: '9999px', color: '#0284c7', fontWeight: 700 }}>
                              Exotel PSTN
                            </span>
                          )}
                          {call.isDemoRecord && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '9999px', color: '#fbbf24', fontWeight: 700 }}>
                              Demo Record
                            </span>
                          )}
                          {call.phone ? (
                            <>
                              <span className={styles.itemPhone}>{call.phone}</span>
                              <ClickToCallButton phone={call.phone} customerName={call.name} size="sm" />
                            </>
                          ) : (
                            <ClickToCallButton phone={null} customerName={call.name} size="sm" />
                          )}
                        </div>
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
            )}
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
                <div className={styles.drawerSubRow}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedCallReview.name} · {selectedCallReview.duration}
                  </span>
                  {selectedCallReview.phone && (
                    <span className={styles.drawerPhone}>{selectedCallReview.phone}</span>
                  )}
                  <ClickToCallButton
                    phone={selectedCallReview.phone}
                    customerName={selectedCallReview.name}
                    size="sm"
                  />
                </div>
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <button
                  style={{
                    backgroundColor: isSopApproved ? '#ecfdf5' : '#f8fafc',
                    color: isSopApproved ? '#047857' : '#334155',
                    border: isSopApproved ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setIsSopApproved(!isSopApproved)}
                >
                  <Check size={15} color={isSopApproved ? '#047857' : '#64748b'} />
                  <span>{isSopApproved ? '✓ QA / SOP Check Passed & Logged' : 'Mark SOP Audit Complete'}</span>
                </button>

                <div className={styles.drawerActions}>
                  <button
                    className={styles.callbackBtn}
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0284c7' }}
                    onClick={() => {
                      const phoneToCall = selectedCallReview.phone || '+919535584969';
                      setSelectedCallReview(null);
                      startCall({
                        name: selectedCallReview.name,
                        phone: phoneToCall,
                        mode: 'EXOTEL_REAL'
                      });
                    }}
                    title={`Call ${selectedCallReview.name} via Exotel Telephony`}
                  >
                    <Phone size={14} />
                    <span>Call via Exotel (PSTN)</span>
                  </button>
                  <button
                    className={styles.callbackBtn}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => {
                      const phoneToCall = selectedCallReview.phone || '+91 95355 84969';
                      setSelectedCallReview(null);
                      startCall({
                        name: selectedCallReview.name,
                        phone: phoneToCall,
                        mode: 'AI_VOICE'
                      });
                    }}
                    title={`Call ${selectedCallReview.name} with AI voice assistant`}
                  >
                    <PhoneCall size={14} />
                    <span>In-App AI Call</span>
                  </button>
                  <ClickToCallButton
                    phone={selectedCallReview.phone}
                    customerName={selectedCallReview.name}
                    variant="pill"
                    showNumber
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
