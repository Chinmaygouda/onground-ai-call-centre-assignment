import React, { useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  PhoneCall,
  ShieldAlert,
  Users,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';
import { useAppState } from '../../../context/AppStateContext';
import styles from './NotificationsPopover.module.css';

export const NotificationsPopover: React.FC = () => {
  const {
    notifications,
    isNotificationsOpen,
    setIsNotificationsOpen,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    setCurrentRoute,
    openLeadsModal
  } = useAppState();

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, setIsNotificationsOpen]);

  if (!isNotificationsOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <PhoneCall size={16} className={styles.iconCall} />;
      case 'qa':
        return <ShieldAlert size={16} className={styles.iconQa} />;
      case 'lead':
        return <Users size={16} className={styles.iconLead} />;
      case 'calendar':
        return <Calendar size={16} className={styles.iconCalendar} />;
      default:
        return <Bell size={16} />;
    }
  };

  const handleAction = (notification: (typeof notifications)[0]) => {
    markNotificationRead(notification.id);
    setIsNotificationsOpen(false);
    if (notification.actionRoute) {
      setCurrentRoute(notification.actionRoute);
    }
    if (notification.actionLeadIndex !== undefined) {
      openLeadsModal(notification.actionLeadIndex);
    }
  };

  return (
    <div className={styles.popover} ref={popoverRef}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Bell size={16} color="#059669" />
          <span className={styles.title}>Shift Notifications</span>
          {unreadCount > 0 && <span className={styles.badge}>{unreadCount} new</span>}
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button
              className={styles.markAllBtn}
              onClick={markAllNotificationsRead}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span>Mark read</span>
            </button>
          )}
          <button
            className={styles.closeBtn}
            onClick={() => setIsNotificationsOpen(false)}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>No notifications right now</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}
            >
              <div className={styles.itemIcon}>{getIcon(n.type)}</div>
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>{n.title}</span>
                  <span className={styles.itemTime}>{n.timestamp}</span>
                </div>
                <p className={styles.itemDesc}>{n.description}</p>
                {n.actionLabel && (
                  <button
                    className={styles.actionLink}
                    onClick={() => handleAction(n)}
                  >
                    <span>{n.actionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <button
                className={styles.dismissBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(n.id);
                }}
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
