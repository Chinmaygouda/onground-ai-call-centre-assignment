import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  Search,
  Star,
  Users,
  CheckCircle2,
  Trophy,
  ArrowLeft,
  Pin,
  Send,
  Smile,
  Bot,
  Zap,
  Target
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './PulseView.module.css';

export const PulseView: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    pinnedDecision,
    confirmPinnedDecision,
    reschedulePinnedDecision
  } = useAppState();

  const [isInChannel, setIsInChannel] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      addChatMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className={styles.pulseContainer}>
      {!isInChannel ? (
        /* PULSE HOME VIEW */
        <>
          {/* Header */}
          <div className={styles.pulseHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Pulse</h2>
                <div style={{ fontSize: '12px', color: '#e9d5ff' }}>The Sleep Company · Koramangala</div>
              </div>
            </div>
          </div>

          <div className={styles.homeBody}>
            {/* Search Bar */}
            <div className={styles.searchBar}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Ask AvaniBot or search Pulse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* AvaniBot "Always On" AI Banner */}
            <div className={styles.avaniBanner}>
              <div className={styles.avaniTop}>
                <Sparkles size={20} color="#fef08a" />
                <span style={{ fontWeight: 800, fontSize: '15px' }}>AvaniBot</span>
                <span className={styles.alwaysOnPill}>ALWAYS ON</span>
                <div className={styles.starBadge}>
                  <Star size={11} fill="#000000" />
                  <span>2</span>
                </div>
              </div>

              <p className={styles.avaniDesc}>
                Ask me about anything happening in Pulse — daily briefs, action items, quick answers
              </p>

              <div className={styles.avaniActions}>
                <button
                  className={styles.avaniBtn}
                  onClick={() => setIsInChannel(true)}
                  title="Open Daily Brief in Channel"
                >
                  <Sparkles size={14} />
                  <span>Daily Brief</span>
                </button>

                <button
                  className={styles.avaniBtn}
                  onClick={() => setIsInChannel(true)}
                  title="Ask AvaniBot a question"
                >
                  <MessageSquare size={14} />
                  <span>Ask a question</span>
                </button>
              </div>
            </div>

            {/* Custom Agents Section */}
            <div className={styles.agentsSection}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Custom Agents</h3>
                <p style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Set up by your manager — already live, tap to open
                </p>
              </div>

              <span className={styles.categoryTitle}>ROLE AGENTS · run a team</span>
              <div className={styles.agentCard} onClick={() => setIsInChannel(true)}>
                <div className={styles.agentLeft}>
                  <div className={styles.agentIconSquare} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div className={styles.agentName}># callcentre-agent</div>
                    <div className={styles.agentDesc}>Call Centre Agent · Active team channel</div>
                  </div>
                </div>
              </div>

              <span className={styles.categoryTitle}>TASK AGENTS · move one metric</span>
              {/* Agent 1 */}
              <div className={styles.agentCard} onClick={() => setIsInChannel(true)}>
                <div className={styles.agentLeft}>
                  <div className={styles.agentIconSquare} style={{ backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className={styles.agentName}># cross-sell-agent</div>
                    <div className={styles.agentDesc}>Your Attach rate · 5 members</div>
                  </div>
                </div>
                <div className={styles.agentMetricBar}>
                  <span className={styles.metricPct}>24%</span>
                  <div className={styles.metricTrack}>
                    <div className={styles.metricFill} style={{ width: '24%', backgroundColor: '#c026d3' }} />
                  </div>
                </div>
              </div>

              {/* Agent 2 */}
              <div className={styles.agentCard} onClick={() => setIsInChannel(true)}>
                <div className={styles.agentLeft}>
                  <div className={styles.agentIconSquare} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                    <Target size={18} />
                  </div>
                  <div>
                    <div className={styles.agentName}># sop-agent</div>
                    <div className={styles.agentDesc}>Your SOP adherence · 5 members</div>
                  </div>
                </div>
                <div className={styles.agentMetricBar}>
                  <span className={styles.metricPct}>81%</span>
                  <div className={styles.metricTrack}>
                    <div className={styles.metricFill} style={{ width: '81%', backgroundColor: '#059669' }} />
                  </div>
                </div>
              </div>

              {/* Agent 3 */}
              <div className={styles.agentCard} onClick={() => setIsInChannel(true)}>
                <div className={styles.agentLeft}>
                  <div className={styles.agentIconSquare} style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
                    <Target size={18} />
                  </div>
                  <div>
                    <div className={styles.agentName}># lead-conversion-agent</div>
                    <div className={styles.agentDesc}>Lead Conversion Agent</div>
                  </div>
                </div>
              </div>

              {/* Agent 4 */}
              <div className={styles.agentCard} onClick={() => setIsInChannel(true)}>
                <div className={styles.agentLeft}>
                  <div className={styles.agentIconSquare} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className={styles.agentName}># capture-agent</div>
                    <div className={styles.agentDesc}>Your Capture coverage · 5 members</div>
                  </div>
                </div>
                <div className={styles.agentMetricBar}>
                  <span className={styles.metricPct}>78%</span>
                  <div className={styles.metricTrack}>
                    <div className={styles.metricFill} style={{ width: '78%', backgroundColor: '#16a34a' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Kudos Banner */}
            <div className={styles.kudosBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={18} color="#fef08a" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#fef3c7' }}>
                    KUDOS · 3 NEW
                  </div>
                  <div className={styles.kudosQuote}>
                    &ldquo;Great work with Mukunda — closed that objection beautifully!&rdquo; · Sunita Rao
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fef3c7', whiteSpace: 'nowrap' }}>
                12 ALL-TIME
              </div>
            </div>
          </div>
        </>
      ) : (
        /* PULSE CHANNEL CHAT VIEW (#callcentre-team) */
        <div className={styles.channelViewBody}>
          {/* Channel Header */}
          <div className={styles.channelHeader}>
            <button
              className={styles.backArrowBtn}
              onClick={() => setIsInChannel(false)}
              title="Back to Pulse Home"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 className={styles.channelTitle}>#callcentre-team</h3>
          </div>

          {/* Pinned "Needs your input" card */}
          <div className={styles.pinnedCard}>
            <div className={styles.pinnedTopRow}>
              <Pin size={14} />
              <span>Needs your input · 1 pinned</span>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {pinnedDecision.title}
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                {pinnedDecision.customerName} · {pinnedDecision.issue}
              </div>
            </div>

            {pinnedDecision.status === 'PENDING' ? (
              <div className={styles.pinnedButtonsRow}>
                <button className={styles.confirmBtn} onClick={confirmPinnedDecision}>
                  Confirmed
                </button>
                <button className={styles.rescheduleBtn} onClick={reschedulePinnedDecision}>
                  Reschedule
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#047857' }}>
                <CheckCircle2 size={16} />
                <span>
                  {pinnedDecision.status === 'CONFIRMED'
                    ? `Confirmed by ${pinnedDecision.confirmedBy}`
                    : `Rescheduled by ${pinnedDecision.confirmedBy}`}
                </span>
              </div>
            )}
          </div>

          {/* Conversational Chat Stream */}
          <div className={styles.chatStream}>
            <div className={styles.dateDivider}>Today · Call Centre Team</div>

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={msg.isAgent ? styles.msgRowRight : styles.msgRowLeft}
              >
                {!msg.isAgent && (
                  <div className={styles.senderAvatar}>{msg.initials}</div>
                )}
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px', textAlign: msg.isAgent ? 'right' : 'left' }}>
                    {msg.sender} <span className={styles.msgTime}>{msg.timestamp}</span>
                  </div>
                  <div className={msg.isAgent ? styles.bubbleRight : styles.bubbleLeft}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Composer */}
          <form className={styles.chatComposer} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.composerInput}
              placeholder="Message #callcentre-team..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="button" style={{ color: '#94a3b8', padding: '6px' }} title="Add emoji">
              <Smile size={20} />
            </button>
            <button type="submit" className={styles.sendBtn} title="Send message">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
