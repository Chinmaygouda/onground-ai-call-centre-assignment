import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Mail,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  Plus
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './CalendarView.module.css';

export const CalendarView: React.FC = () => {
  const { calendarEvents, setIsCreateEventModalOpen } = useAppState();

  // Reference date: October 2026, today = Oct 9th
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(9); // 0-indexed: 9 = October
  const [selectedDay, setSelectedDay] = useState<number>(9);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleTodayClick = () => {
    setCurrentYear(2026);
    setCurrentMonthIndex(9);
    setSelectedDay(9);
  };

  // Calculate days in month and starting weekday (0 = Sunday)
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

  // Find events for selected day
  const formattedSelectedDate = `${currentYear}-${(currentMonthIndex + 1)
    .toString()
    .padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

  const dayEvents = calendarEvents.filter(
    (ev) => ev.dateStr === formattedSelectedDate || (currentMonthIndex === 9 && ev.dayNumber === selectedDay)
  );

  return (
    <div className={styles.calendarContainer}>
      {/* Header */}
      <div className={styles.calendarHeader}>
        <div className={styles.headerTopRow}>
          <div>
            <div className={styles.titleRow}>
              <CalendarIcon size={18} color="#047857" />
              <h2 className={styles.calendarTitle}>Calendar</h2>
            </div>
            <p className={styles.calendarSubtitle}>
              Mirrored from your mailbox — invites created here land there too
            </p>
          </div>
          <button
            className={styles.scheduleBtn}
            onClick={() => setIsCreateEventModalOpen(true)}
            title="Schedule a new coaching session or store visit"
          >
            <Plus size={15} />
            <span>+ Schedule Event</span>
          </button>
        </div>
      </div>

      {/* Sync notice banner */}
      <div className={styles.syncNoticeBanner}>
        <Mail size={16} />
        <span>
          Store visits, coaching sessions, and meeting invites all show up here — and in your mailbox.
        </span>
      </div>

      {/* Calendar Grid Card */}
      <div className={styles.calendarBody}>
        <div className={styles.gridCard}>
          <div className={styles.monthNavHeader}>
            <button
              className={styles.navArrowBtn}
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <span className={styles.monthTitle}>
              {monthNames[currentMonthIndex]} {currentYear}
            </span>

            <div className={styles.navControls}>
              <button className={styles.todayBtn} onClick={handleTodayClick}>
                Today
              </button>
              <button
                className={styles.navArrowBtn}
                onClick={handleNextMonth}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className={styles.weekdaysHeader}>
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Month Days Grid */}
          <div className={styles.daysGrid}>
            {/* Empty offset cells before day 1 */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} style={{ opacity: 0 }} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = currentYear === 2026 && currentMonthIndex === 9 && day === 9;
              const isSelected = selectedDay === day;

              const cellDateStr = `${currentYear}-${(currentMonthIndex + 1)
                .toString()
                .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

              // Dynamic check across all calendar events
              const hasEvents = calendarEvents.some(
                (ev) => ev.dateStr === cellDateStr || (currentMonthIndex === 9 && ev.dayNumber === day)
              );

              return (
                <div
                  key={day}
                  className={`${styles.dayCell} ${isToday ? styles.dayToday : ''} ${
                    isSelected ? styles.daySelected : ''
                  }`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span>{day}</span>
                  {hasEvents && <span className={styles.eventDot} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda Section */}
        <div className={styles.agendaSection}>
          <span className={styles.agendaTitle}>
            Agenda · {monthNames[currentMonthIndex]} {selectedDay}, {currentYear}
          </span>

          {dayEvents.length > 0 ? (
            dayEvents.map((ev) => (
              <div key={ev.id} className={styles.agendaCard}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      {ev.time}
                    </span>
                    {ev.attendee && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={13} />
                        {ev.attendee}
                      </span>
                    )}
                  </div>
                </div>

                <span className={styles.agendaTimeBadge}>{ev.type.replace('_', ' ')}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}
            >
              No scheduled events for this date. Click on October 23, 26, or 28 to view scheduled store visits & coaching.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
