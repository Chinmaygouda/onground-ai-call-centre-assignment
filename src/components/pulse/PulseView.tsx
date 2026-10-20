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
  ArrowRight,
  Pin,
  Send,
  Smile,
  Bot,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Check,
  X

} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './PulseView.module.css';

export const PulseView: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    deleteChatMessage,
    editChatMessage,
    pinnedDecision,
    confirmPinnedDecision,
    reschedulePinnedDecision,
    pulseChannels,
    pulseWeeks,
    activePulseChannelId,
    setActivePulseChannelId,
    activePulseWeekId,
    setActivePulseWeekId,
    setIsDailyBriefModalOpen
  } = useAppState();

  const [isInChannel, setIsInChannel] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [channelMessageFilter, setChannelMessageFilter] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [avaniAnswer, setAvaniAnswer] = useState<string | null>(null);

  const activeChannel =
    pulseChannels.find((c) => c.id === activePulseChannelId) || pulseChannels[0];

  const currentWeekIndex = pulseWeeks.findIndex((w) => w.id === activePulseWeekId);
  const activeWeek = pulseWeeks[currentWeekIndex] || pulseWeeks[0];

  const handlePrevWeek = () => {
    if (currentWeekIndex < pulseWeeks.length - 1) {
      setActivePulseWeekId(pulseWeeks[currentWeekIndex + 1].id);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex > 0) {
      setActivePulseWeekId(pulseWeeks[currentWeekIndex - 1].id);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setActivePulseChannelId(channelId);
    setIsInChannel(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const sentText = inputText.trim();
    addChatMessage(sentText, activePulseChannelId, activePulseWeekId);
    setInputText('');
    setShowEmojiPicker(false);

    // Realistic simulation: manager Sunita Rao responds when addressed or acknowledging shift SOP
    if (
      activePulseChannelId === 'callcentre-team' &&
      (sentText.toLowerCase().includes('sop') ||
        sentText.toLowerCase().includes('script') ||
        sentText.toLowerCase().includes('greeting') ||
        sentText.toLowerCase().includes('sunita') ||
        sentText.toLowerCase().includes('closed'))
    ) {
      setTimeout(() => {
        addChatMessage(
          'Excellent focus Arvind! Keep up the consistent greeting momentum on every call.',
          'callcentre-team',
          activePulseWeekId
        );
      }, 1200);
    }
  };

  const handleSaveEdit = (msgId: string) => {
    if (editingContent.trim()) {
      editChatMessage(msgId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleAvaniAsk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setIsDailyBriefModalOpen(true);
      return;
    }

    if (query.includes('sop') || query.includes('greeting')) {
      setAvaniAnswer(
        'AvaniBot QA Brief: Current Greeting-in-first-10s adherence is at 71%. SOP requires introducing yourself by name, welcoming the caller to The Sleep Company, and asking how you may assist their sleep comfort within the first 10 seconds.'
      );
    } else if (query.includes('attach') || query.includes('cross') || query.includes('rate')) {
      setAvaniAnswer(
        'AvaniBot Attach Brief: Your current attach rate is 24% (Target: 30%). Best practice is bundling the Bamboo Waterproof Mattress Protector (₹2,499) with Ortho GRID mattresses for 20% combo savings.'
      );
    } else if (query.includes('mukunda') || query.includes('faizan') || query.includes('lead')) {
      setAvaniAnswer(
        'AvaniBot Lead Brief: Mukunda visited Koramangala store yesterday and has an 87% ICP Fit score. Faizan A. requested an Ortho Queen quote and has ₹24,990 value at stake with 2h SLA.'
      );
    } else {
      setAvaniAnswer(
        `AvaniBot: Shift status for "${searchQuery}" is active. 2 callbacks scheduled at 4:30 PM, 2 hot leads pending in CRM, and CSAT is at 94% today.`
      );
    }
  };

  // Filter messages for current channel and week
  const filteredMessages = chatMessages.filter((msg) => {
    const channelMatch =
      !msg.channelId || msg.channelId === activePulseChannelId || activePulseChannelId === 'callcentre-team';
    const weekMatch = !msg.weekId || msg.weekId === activePulseWeekId;
    const textMatch =
      !channelMessageFilter.trim() ||
      msg.content.toLowerCase().includes(channelMessageFilter.toLowerCase()) ||
      msg.sender.toLowerCase().includes(channelMessageFilter.toLowerCase());

    return channelMatch && weekMatch && textMatch;
  });

  // Filter custom agents on Pulse Home based on search query
  const filteredAgents = pulseChannels.filter((ch) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.topic.toLowerCase().includes(q);
  });

  const quickEmojis = ['👍', '🙌', '🌟', '💪', '🎯', '📋', '✅', '❤️'];

  return (
    <div className={styles.pulseContainer}>
      {!isInChannel ? (
        /* ================= PULSE HOME VIEW ================= */
        <>
          {/* Header */}
          <div className={styles.pulseHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bot size={18} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Pulse</h2>
                <div style={{ fontSize: '12px', color: '#e9d5ff' }}>
                  The Sleep Company · Koramangala
                </div>
              </div>
            </div>
          </div>

          <div className={styles.homeBody}>
            {/* Search Bar */}
            <form className={styles.searchBar} onSubmit={handleAvaniAsk}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Ask AvaniBot or search Pulse channels..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (avaniAnswer) setAvaniAnswer(null);
                }}
              />
              {searchQuery && (
                <button
                  type="submit"
                  className={styles.askSubmitBtn}
                  title="Ask AvaniBot"
                >
                  <span>Ask</span>
                </button>
              )}
            </form>

            {/* AvaniBot Answer Card if asked */}
            {avaniAnswer && (
              <div className={styles.avaniAnswerBox}>
                <div className={styles.avaniAnswerTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#7c3aed" />
                    <strong>AvaniBot Live Intelligence</strong>
                  </div>
                  <button
                    className={styles.answerCloseBtn}
                    onClick={() => setAvaniAnswer(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className={styles.avaniAnswerText}>{avaniAnswer}</p>
              </div>
            )}

            {/* AvaniBot "Always On" AI Banner */}
            <div className={styles.avaniBanner}>
              <div className={styles.avaniTop}>
                <Sparkles size={20} color="#fef08a" />
                <span style={{ fontWeight: 800, fontSize: '15px' }}>AvaniBot</span>
                <span className={styles.alwaysOnPill}>ALWAYS ON</span>
                <div
                  className={styles.starBadge}
                  title="2 AvaniBot shift recommendations active"
                >
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
                  onClick={() => setIsDailyBriefModalOpen(true)}
                  title="Open Daily Shift Brief Modal"
                >
                  <Sparkles size={14} />
                  <span>Daily Brief</span>
                </button>

                <button
                  className={styles.avaniBtn}
                  onClick={() => handleAvaniAsk()}
                  title="Ask AvaniBot about current shift priorities"
                >
                  <MessageSquare size={14} />
                  <span>Ask a question</span>
                </button>
              </div>
            </div>

            {/* Custom Agents Section */}
            <div className={styles.agentsSection}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Custom Agents &amp; Channels
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Set up by your manager — live communication channels, tap any card to open
                </p>
              </div>

              {/* Role Agents */}
              <span className={styles.categoryTitle}>ROLE AGENTS · run a team</span>
              {filteredAgents
                .filter((a) => a.category === 'role')
                .map((agent) => (
                  <div
                    key={agent.id}
                    className={styles.agentCard}
                    onClick={() => handleSelectChannel(agent.id)}
                    title={`Open ${agent.name} chat`}
                  >
                    <div className={styles.agentLeft}>
                      <div
                        className={styles.agentIconSquare}
                        style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
                      >
                        <Users size={18} />
                      </div>
                      <div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentDesc}>{agent.topic}</div>
                      </div>
                    </div>
                    <ArrowRight size={16} color="#94a3b8" />
                  </div>
                ))}

              {/* Task Agents */}
              <span className={styles.categoryTitle}>TASK AGENTS · move one metric</span>
              {filteredAgents
                .filter((a) => a.category === 'task')
                .map((agent) => (
                  <div
                    key={agent.id}
                    className={styles.agentCard}
                    onClick={() => handleSelectChannel(agent.id)}
                    title={`Open ${agent.name} channel`}
                  >
                    <div className={styles.agentLeft}>
                      <div
                        className={styles.agentIconSquare}
                        style={{
                          backgroundColor:
                            agent.id === 'cross-sell-agent'
                              ? '#fdf4ff'
                              : agent.id === 'sop-agent'
                              ? '#ecfdf5'
                              : agent.id === 'capture-agent'
                              ? '#f0fdf4'
                              : '#fff1f2',
                          color:
                            agent.id === 'cross-sell-agent'
                              ? '#c026d3'
                              : agent.id === 'sop-agent'
                              ? '#059669'
                              : agent.id === 'capture-agent'
                              ? '#16a34a'
                              : '#e11d48'
                        }}
                      >
                        {agent.iconType === 'zap' ? <Zap size={18} /> : <Target size={18} />}
                      </div>
                      <div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentDesc}>{agent.topic}</div>
                      </div>
                    </div>

                    {agent.metric && (
                      <div className={styles.agentMetricBar}>
                        <span className={styles.metricPct}>{agent.metric.value}%</span>
                        <div className={styles.metricTrack}>
                          <div
                            className={styles.metricFill}
                            style={{
                              width: `${agent.metric.value}%`,
                              backgroundColor: agent.metric.color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {/* General Channels */}
              <span className={styles.categoryTitle}>GENERAL · customer relay</span>
              {filteredAgents
                .filter((a) => a.category === 'general')
                .map((agent) => (
                  <div
                    key={agent.id}
                    className={styles.agentCard}
                    onClick={() => handleSelectChannel(agent.id)}
                    title={`Open ${agent.name}`}
                  >
                    <div className={styles.agentLeft}>
                      <div
                        className={styles.agentIconSquare}
                        style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
                      >
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentDesc}>{agent.topic}</div>
                      </div>
                    </div>
                    <ArrowRight size={16} color="#94a3b8" />
                  </div>
                ))}
            </div>

            {/* Kudos Banner */}
            <div className={styles.kudosBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trophy size={18} color="#fef08a" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      color: '#fef3c7'
                    }}
                  >
                    KUDOS · 3 NEW TODAY
                  </div>
                  <div className={styles.kudosQuote}>
                    &ldquo;Great work with Mukunda — closed that objection beautifully!&rdquo; ·
                    Sunita Rao
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fef3c7',
                  whiteSpace: 'nowrap'
                }}
              >
                12 ALL-TIME
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ================= PULSE CHANNEL CHAT VIEW ================= */
        <div className={styles.channelViewBody}>
          {/* Channel Header */}
          <div className={styles.channelHeader}>
            <div className={styles.channelHeaderLeft}>
              <button
                className={styles.backArrowBtn}
                onClick={() => setIsInChannel(false)}
                title="Back to Pulse Home"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h3 className={styles.channelTitle}>{activeChannel.name}</h3>
                <div className={styles.channelSub}>
                  {activeChannel.topic} · {activeChannel.membersCount} members
                </div>
              </div>
            </div>

            {/* Week Navigation Switcher */}
            <div className={styles.weekSwitcher}>
              <button
                className={styles.weekBtn}
                onClick={handlePrevWeek}
                disabled={currentWeekIndex >= pulseWeeks.length - 1}
                title="Previous Week Messages"
              >
                <ChevronLeft size={15} />
              </button>
              <div className={styles.weekInfo}>
                <span className={styles.weekLabel}>{activeWeek.label}</span>
                {activeWeek.isCurrent && <span className={styles.weekActivePill}>Active</span>}
              </div>
              <button
                className={styles.weekBtn}
                onClick={handleNextWeek}
                disabled={currentWeekIndex <= 0}
                title="Next Week Messages"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Quick Channel Switcher Bar */}
          <div className={styles.channelTabsBar}>
            {pulseChannels.map((channel) => (
              <button
                key={channel.id}
                className={`${styles.channelTab} ${
                  channel.id === activePulseChannelId ? styles.channelTabActive : ''
                }`}
                onClick={() => setActivePulseChannelId(channel.id)}
              >
                <span>{channel.name}</span>
                {channel.unreadCount > 0 && (
                  <span className={styles.tabBadge}>{channel.unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search messages within this channel */}
          <div className={styles.channelSearchRow}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              className={styles.channelSearchInput}
              placeholder={`Filter messages in ${activeChannel.name}...`}
              value={channelMessageFilter}
              onChange={(e) => setChannelMessageFilter(e.target.value)}
            />
            {channelMessageFilter && (
              <button
                className={styles.filterClearBtn}
                onClick={() => setChannelMessageFilter('')}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Pinned "Needs your input" card (Featured in #callcentre-team) */}
          {activePulseChannelId === 'callcentre-team' && (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#047857'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {pinnedDecision.status === 'CONFIRMED'
                      ? `Confirmed by ${pinnedDecision.confirmedBy}`
                      : `Rescheduled by ${pinnedDecision.confirmedBy}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Conversational Chat Stream */}
          <div className={styles.chatStream}>
            <div className={styles.dateDivider}>
              {activeWeek.label} · {activeChannel.name}
            </div>

            {filteredMessages.length === 0 ? (
              <div className={styles.emptyMessages}>
                No messages found in this channel for {activeWeek.label}.
                <br />
                Type a message in the composer below to begin a conversation.
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isEditing = editingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={msg.isAgent ? styles.msgRowRight : styles.msgRowLeft}
                  >
                    {!msg.isAgent && (
                      <div
                        className={`${styles.senderAvatar} ${
                          msg.senderRole === 'bot'
                            ? styles.avatarBot
                            : msg.senderRole === 'customer'
                            ? styles.avatarCustomer
                            : ''
                        }`}
                      >
                        {msg.initials}
                      </div>
                    )}

                    <div className={styles.msgBodyContainer}>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          marginBottom: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: msg.isAgent ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{msg.sender}</span>
                        {msg.senderRole === 'manager' && (
                          <span className={styles.roleTagManager}>MANAGER</span>
                        )}
                        {msg.senderRole === 'bot' && (
                          <span className={styles.roleTagBot}>AI AGENT</span>
                        )}
                        <span className={styles.msgTime}>{msg.timestamp}</span>
                        {msg.edited && <span className={styles.editedTag}>(edited)</span>}
                      </div>

                      {/* Bubble */}
                      <div className={msg.isAgent ? styles.bubbleRight : styles.bubbleLeft}>
                        {isEditing ? (
                          <div className={styles.editRow}>
                            <input
                              type="text"
                              className={styles.editInput}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              autoFocus
                            />
                            <button
                              className={styles.editSaveBtn}
                              onClick={() => handleSaveEdit(msg.id)}
                              title="Save Edit"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className={styles.editCancelBtn}
                              onClick={() => setEditingMessageId(null)}
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Agent message actions (Edit / Delete) */}
                      {msg.isAgent && !isEditing && (
                        <div className={styles.agentMsgActions}>
                          <button
                            className={styles.msgActionBtn}
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingContent(msg.content);
                            }}
                            title="Edit your message"
                          >
                            <Edit2 size={11} />
                            <span>Edit</span>
                          </button>
                          <button
                            className={styles.msgActionBtn}
                            onClick={() => deleteChatMessage(msg.id)}
                            title="Delete message"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Emoji Bar */}
          {showEmojiPicker && (
            <div className={styles.emojiPickerBar}>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={styles.emojiBtn}
                  onClick={() => setInputText((prev) => prev + emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Chat Composer */}
          <form className={styles.chatComposer} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.composerInput}
              placeholder={`Message ${activeChannel.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="button"
              className={`${styles.composerToolBtn} ${showEmojiPicker ? styles.composerToolBtnActive : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction emoji"
            >
              <Smile size={19} />
            </button>
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!inputText.trim()}
              title="Send message to channel"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
