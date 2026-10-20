import React, { useState } from 'react';
import { CalendarPlus, X, Check } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import styles from './CreateEventModal.module.css';

export const CreateEventModal: React.FC = () => {
  const { isCreateEventModalOpen, setIsCreateEventModalOpen, addNewCalendarEvent } =
    useAppState();

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('2026-10-09');
  const [time, setTime] = useState('11:00 AM - 12:00 PM');
  const [type, setType] = useState<'store_visit' | 'coaching' | 'meeting' | 'callback'>('meeting');
  const [attendee, setAttendee] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isCreateEventModalOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Event title is required';
    }
    if (!time.trim()) {
      newErrors.time = 'Time window is required';
    }
    if (!dateStr) {
      newErrors.dateStr = 'Date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dayNumber = parseInt(dateStr.split('-')[2], 10) || 9;

    addNewCalendarEvent({
      dateStr,
      dayNumber,
      title: title.trim(),
      time: time.trim(),
      type,
      attendee: attendee.trim() || undefined
    });

    setIsCreateEventModalOpen(false);
  };

  return (
    <div className={styles.backdrop} onClick={() => setIsCreateEventModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <CalendarPlus size={18} color="#047857" />
            <h3 className={styles.title}>Schedule Shift Event</h3>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setIsCreateEventModalOpen(false)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Event Title <span className={styles.req}>*</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="e.g. In-store Product Demo with Store Manager"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          {/* Date & Time Row */}
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Date <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Time Window <span className={styles.req}>*</span>
              </label>
              <input
                type="text"
                className={`${styles.input} ${errors.time ? styles.inputError : ''}`}
                placeholder="e.g. 02:00 PM - 03:00 PM"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (errors.time) setErrors((prev) => ({ ...prev, time: '' }));
                }}
              />
              {errors.time && <span className={styles.errorText}>{errors.time}</span>}
            </div>
          </div>

          {/* Type & Attendee Row */}
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Event Type</label>
              <select
                className={styles.select}
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="meeting">Shift Meeting</option>
                <option value="coaching">Coaching / QA Sync</option>
                <option value="store_visit">Store Visit</option>
                <option value="callback">Customer Callback</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Attendee / Location</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Sunita Rao / Koramangala Hub"
                value={attendee}
                onChange={(e) => setAttendee(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setIsCreateEventModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <Check size={16} />
              <span>Save Event</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
