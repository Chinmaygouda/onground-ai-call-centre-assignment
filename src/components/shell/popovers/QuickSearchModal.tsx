import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  PhoneIncoming,
  MessageSquare,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';
import { useAppState } from '../../../context/AppStateContext';
import styles from './QuickSearchModal.module.css';

export const QuickSearchModal: React.FC = () => {
  const {
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    leads,
    missedCalls,
    pulseChannels,
    calendarEvents,
    setCurrentRoute,
    openLeadsModal,
    setActivePulseChannelId
  } = useAppState();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(!isQuickSearchOpen);
      }
      if (e.key === 'Escape' && isQuickSearchOpen) {
        setIsQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickSearchOpen, setIsQuickSearchOpen]);

  useEffect(() => {
    if (isQuickSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isQuickSearchOpen]);

  if (!isQuickSearchOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const matchingLeads = cleanQuery
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(cleanQuery) ||
          l.product.toLowerCase().includes(cleanQuery) ||
          l.phone.includes(cleanQuery)
      )
    : leads.slice(0, 3);

  const matchingMissed = cleanQuery
    ? missedCalls.filter(
        (m) =>
          m.name.toLowerCase().includes(cleanQuery) ||
          m.phone.includes(cleanQuery) ||
          m.tag.toLowerCase().includes(cleanQuery)
      )
    : missedCalls.slice(0, 2);

  const matchingChannels = cleanQuery
    ? pulseChannels.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.topic.toLowerCase().includes(cleanQuery)
      )
    : pulseChannels.slice(0, 3);

  const matchingEvents = cleanQuery
    ? calendarEvents.filter(
        (ev) =>
          ev.title.toLowerCase().includes(cleanQuery) ||
          (ev.attendee && ev.attendee.toLowerCase().includes(cleanQuery))
      )
    : calendarEvents.slice(0, 2);

  const handleSelectLead = (index: number) => {
    setIsQuickSearchOpen(false);
    openLeadsModal(index);
  };

  const handleSelectMissed = () => {
    setIsQuickSearchOpen(false);
    setCurrentRoute('plan/incoming');
  };

  const handleSelectChannel = (channelId: string) => {
    setIsQuickSearchOpen(false);
    setActivePulseChannelId(channelId);
    setCurrentRoute('pulse');
  };

  const handleSelectEvent = () => {
    setIsQuickSearchOpen(false);
    setCurrentRoute('calendar');
  };

  return (
    <div className={styles.backdrop} onClick={() => setIsQuickSearchOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className={styles.inputBar}>
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search leads, missed calls, pulse channels, schedule..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        {/* Results Body */}
        <div className={styles.resultsBody}>
          {/* Leads */}
          {matchingLeads.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <Users size={13} />
                <span>LEADS & CUSTOMERS</span>
              </div>
              {matchingLeads.map((lead, idx) => (
                <div
                  key={lead.id}
                  className={styles.resultItem}
                  onClick={() => handleSelectLead(idx)}
                >
                  <div className={styles.itemLeft}>
                    <div className={styles.avatarPill}>{lead.initials}</div>
                    <div>
                      <div className={styles.itemTitle}>{lead.name}</div>
                      <div className={styles.itemSub}>
                        {lead.product} · ₹{lead.price.toLocaleString()} · {lead.phone}
                      </div>
                    </div>
                  </div>
                  <span className={styles.badgeScore}>{lead.attractivenessScore} Score</span>
                </div>
              ))}
            </div>
          )}

          {/* Missed Calls */}
          {matchingMissed.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <PhoneIncoming size={13} />
                <span>MISSED CALLS & CALLBACKS</span>
              </div>
              {matchingMissed.map((call) => (
                <div
                  key={call.id}
                  className={styles.resultItem}
                  onClick={handleSelectMissed}
                >
                  <div className={styles.itemLeft}>
                    <div className={`${styles.avatarPill} ${styles.avatarRed}`}>
                      {call.initials}
                    </div>
                    <div>
                      <div className={styles.itemTitle}>{call.name}</div>
                      <div className={styles.itemSub}>
                        {call.missedText} · {call.phone}
                      </div>
                    </div>
                  </div>
                  <span className={styles.badgeValue}>
                    {call.expectedValue > 0 ? `₹${call.expectedValue.toLocaleString()}` : 'New contact'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pulse Channels */}
          {matchingChannels.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <MessageSquare size={13} />
                <span>PULSE CHANNELS & AGENTS</span>
              </div>
              {matchingChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={styles.resultItem}
                  onClick={() => handleSelectChannel(channel.id)}
                >
                  <div className={styles.itemLeft}>
                    <div className={`${styles.avatarPill} ${styles.avatarPurple}`}>#</div>
                    <div>
                      <div className={styles.itemTitle}>{channel.name}</div>
                      <div className={styles.itemSub}>{channel.topic}</div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="#94a3b8" />
                </div>
              ))}
            </div>
          )}

          {/* Calendar Events */}
          {matchingEvents.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <Calendar size={13} />
                <span>CALENDAR & COACHING</span>
              </div>
              {matchingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={styles.resultItem}
                  onClick={handleSelectEvent}
                >
                  <div className={styles.itemLeft}>
                    <div className={`${styles.avatarPill} ${styles.avatarGreen}`}>
                      {ev.dayNumber}
                    </div>
                    <div>
                      <div className={styles.itemTitle}>{ev.title}</div>
                      <div className={styles.itemSub}>
                        {ev.time} {ev.attendee ? `· ${ev.attendee}` : ''}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} color="#94a3b8" />
                </div>
              ))}
            </div>
          )}

          {matchingLeads.length === 0 &&
            matchingMissed.length === 0 &&
            matchingChannels.length === 0 &&
            matchingEvents.length === 0 && (
              <div className={styles.empty}>
                No matching results found for &ldquo;{query}&rdquo;
              </div>
            )}
        </div>

        {/* Footer shortcuts */}
        <div className={styles.footer}>
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span><strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
};
