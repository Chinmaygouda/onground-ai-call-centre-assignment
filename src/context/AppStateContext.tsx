import React, { createContext, useContext, useState } from 'react';
import {
  AppRoute,
  Lead,
  MissedCall,
  RecentCall,
  CalendarEvent,
  ChatMessage,
  PinnedDecision,
  AgentProfile,
  PulseChannel,
  PulseWeek,
  ShiftNotification
} from '../types';
import {
  mockAgent,
  mockLeads,
  mockMissedCalls,
  mockRecentCalls,
  mockCalendarEvents,
  mockChatMessages,
  mockPinnedDecision,
  mockPulseChannels,
  mockPulseWeeks,
  mockNotifications
} from '../data/mockData';

interface AppStateContextType {
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
  isPlanSubmenuOpen: boolean;
  setIsPlanSubmenuOpen: (open: boolean) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  agent: AgentProfile;
  updateAgentQueueStatus: (status: 'On Queue' | 'Paused' | 'Break') => void;
  leads: Lead[];
  addNewLead: (lead: Omit<Lead, 'id'>) => void;
  missedCalls: MissedCall[];
  recentCalls: RecentCall[];
  calendarEvents: CalendarEvent[];
  addNewCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  chatMessages: ChatMessage[];
  pinnedDecision: PinnedDecision;
  isLeadsModalOpen: boolean;
  activeLeadIndex: number;
  openLeadsModal: (index?: number) => void;
  closeLeadsModal: () => void;
  setActiveLeadIndex: (index: number) => void;
  // Pulse multi-channel & multi-week state
  pulseChannels: PulseChannel[];
  pulseWeeks: PulseWeek[];
  activePulseChannelId: string;
  setActivePulseChannelId: (channelId: string) => void;
  activePulseWeekId: string;
  setActivePulseWeekId: (weekId: string) => void;
  addChatMessage: (content: string, channelId?: string, weekId?: string) => void;
  deleteChatMessage: (id: string) => void;
  editChatMessage: (id: string, newContent: string) => void;
  confirmPinnedDecision: () => void;
  reschedulePinnedDecision: () => void;
  // Notifications state
  notifications: ShiftNotification[];
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  // Profile & Status Menu
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;
  // Leaderboard Modal
  isLeaderboardOpen: boolean;
  setIsLeaderboardOpen: (open: boolean) => void;
  // Quick Search / Command Palette
  isQuickSearchOpen: boolean;
  setIsQuickSearchOpen: (open: boolean) => void;
  // Create Lead Modal
  isCreateLeadModalOpen: boolean;
  setIsCreateLeadModalOpen: (open: boolean) => void;
  // Create Calendar Event Modal
  isCreateEventModalOpen: boolean;
  setIsCreateEventModalOpen: (open: boolean) => void;
  // AvaniBot Daily Brief Modal
  isDailyBriefModalOpen: boolean;
  setIsDailyBriefModalOpen: (open: boolean) => void;
  // SOP Call Review
  selectedCallReview: RecentCall | null;
  setSelectedCallReview: (call: RecentCall | null) => void;
  resolveMissedCall: (id: string) => void;
  callbackCustomer: MissedCall | null;
  isCallbackModalOpen: boolean;
  openCallbackModal: (customer: MissedCall) => void;
  closeCallbackModal: () => void;
  recordHumanCallback: (payload: {
    customerId: string;
    customerName: string;
    phone: string;
    preferredTime: string;
    notes?: string;
    expectedValue?: number;
  }) => void;
  recordCallInteraction: (call: RecentCall) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');
  const [isPlanSubmenuOpen, setIsPlanSubmenuOpen] = useState<boolean>(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [agent, setAgent] = useState<AgentProfile>(mockAgent);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>(mockMissedCalls);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(mockRecentCalls);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [pinnedDecision, setPinnedDecision] = useState<PinnedDecision>(mockPinnedDecision);

  // Pulse Channels & Weeks
  const [pulseChannels] = useState<PulseChannel[]>(mockPulseChannels);
  const [pulseWeeks] = useState<PulseWeek[]>(mockPulseWeeks);
  const [activePulseChannelId, setActivePulseChannelId] = useState<string>('callcentre-team');
  const [activePulseWeekId, setActivePulseWeekId] = useState<string>('w41');

  // Notifications
  const [notifications, setNotifications] = useState<ShiftNotification[]>(mockNotifications);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Profile & Status Menu
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

  // Leaderboard Modal
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  // Quick Search / Command Palette
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);

  // Create Lead Modal
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState<boolean>(false);

  // Create Calendar Event Modal
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState<boolean>(false);

  // AvaniBot Daily Brief Modal
  const [isDailyBriefModalOpen, setIsDailyBriefModalOpen] = useState<boolean>(false);

  // Leads Modal
  const [isLeadsModalOpen, setIsLeadsModalOpen] = useState<boolean>(false);
  const [activeLeadIndex, setActiveLeadIndex] = useState<number>(0);

  // SOP Call Review
  const [selectedCallReview, setSelectedCallReview] = useState<RecentCall | null>(null);

  // Customer Callback Modal
  const [callbackCustomer, setCallbackCustomer] = useState<MissedCall | null>(null);
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState<boolean>(false);

  const updateAgentQueueStatus = (status: 'On Queue' | 'Paused' | 'Break') => {
    setAgent((prev) => ({
      ...prev,
      queueStatus: status
    }));
  };

  const addNewLead = (newLeadData: Omit<Lead, 'id'>) => {
    const newLead: Lead = {
      ...newLeadData,
      id: `lead-${Date.now()}`
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  const addNewCalendarEvent = (newEventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...newEventData,
      id: `ev-${Date.now()}`
    };
    setCalendarEvents((prev) => [...prev, newEvent]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const openCallbackModal = (customer: MissedCall) => {
    setCallbackCustomer(customer);
    setIsCallbackModalOpen(true);
  };

  const closeCallbackModal = () => {
    setIsCallbackModalOpen(false);
    setCallbackCustomer(null);
  };

  const openLeadsModal = (index: number = 0) => {
    setActiveLeadIndex(index);
    setIsLeadsModalOpen(true);
  };

  const closeLeadsModal = () => {
    setIsLeadsModalOpen(false);
  };

  const addChatMessage = (content: string, channelId?: string, weekId?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    const targetChannel = channelId || activePulseChannelId;
    const targetWeek = weekId || activePulseWeekId;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: targetChannel,
      weekId: targetWeek,
      sender: 'Arvind Rajan',
      initials: 'You',
      senderRole: 'agent',
      timestamp: timeStr,
      content,
      isAgent: true
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  const deleteChatMessage = (id: string) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const editChatMessage = (id: string, newContent: string) => {
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: newContent, edited: true } : m
      )
    );
  };

  const confirmPinnedDecision = () => {
    setPinnedDecision((prev) => ({
      ...prev,
      status: 'CONFIRMED',
      confirmedBy: 'Arvind Rajan'
    }));
    addChatMessage('I have confirmed the 4:30pm callback with Priya Iyer.', 'callcentre-team', 'w41');
  };

  const reschedulePinnedDecision = () => {
    setPinnedDecision((prev) => ({
      ...prev,
      status: 'RESCHEDULED',
      confirmedBy: 'Arvind Rajan'
    }));
    addChatMessage('Requested reschedule for Priya Iyer callback to 5:15pm.', 'callcentre-team', 'w41');
  };

  const resolveMissedCall = (id: string) => {
    setMissedCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isResolved: true } : c))
    );
  };

  const recordHumanCallback = (payload: {
    customerId: string;
    customerName: string;
    phone: string;
    preferredTime: string;
    notes?: string;
    expectedValue?: number;
  }) => {
    // 1. Mark missed call as resolved with Callback Requested tag
    setMissedCalls((prev) =>
      prev.map((c) =>
        c.id === payload.customerId
          ? { ...c, isResolved: true, tag: `Callback Requested (${payload.preferredTime})` }
          : c
      )
    );

    // 2. Add high-priority callback task into leads queue
    const initials = payload.customerName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CB';

    const newLeadTask: Lead = {
      id: `lead-cb-${Date.now()}`,
      name: payload.customerName,
      initials,
      product: payload.notes || 'In-store inquiry follow-up',
      price: payload.expectedValue || 24990,
      attractivenessScore: 94,
      icpScore: 89,
      intentScore: 95,
      slaLeft: payload.preferredTime,
      status: 'IN_PROGRESS',
      quoteTag: 'Callback Requested',
      signals: {
        financing: 'Frontline human callback requested',
        quotation: 'Product details inquiry',
        warranty: 'Standard 10-Yr Sleep Co. Coverage'
      },
      phone: payload.phone,
      notes: `Scheduled callback window: ${payload.preferredTime}. Preferred time logged by frontline agent.`
    };

    setLeads((prev) => [newLeadTask, ...prev]);

    // 3. Add calendar reminder event for the agent
    const newEvent: CalendarEvent = {
      id: `evt-cb-${Date.now()}`,
      dateStr: '2026-10-09',
      dayNumber: 9,
      title: `Callback: ${payload.customerName} (${payload.preferredTime})`,
      time: payload.preferredTime.includes('Morning')
        ? '11:00 AM'
        : payload.preferredTime.includes('Evening')
        ? '5:30 PM'
        : '2:30 PM',
      type: 'callback',
      attendee: payload.customerName
    };
    setCalendarEvents((prev) => [...prev, newEvent]);

    addChatMessage(`Logged callback request for ${payload.customerName} (${payload.preferredTime}).`, 'callcentre-team', 'w41');
  };

  const recordCallInteraction = (call: RecentCall) => {
    setRecentCalls((prev) => [call, ...prev]);
    // Also resolve missed call if phone matches
    if (call.phone) {
      setMissedCalls((prev) =>
        prev.map((c) => (c.phone === call.phone ? { ...c, isResolved: true } : c))
      );
    }
  };

  return (
    <AppStateContext.Provider
      value={{
        currentRoute,
        setCurrentRoute: (route: AppRoute) => {
          setCurrentRoute(route);
          setIsMobileNavOpen(false); // Auto-close mobile drawer on route transition
        },
        isPlanSubmenuOpen,
        setIsPlanSubmenuOpen,
        isMobileNavOpen,
        setIsMobileNavOpen,
        agent,
        updateAgentQueueStatus,
        leads,
        addNewLead,
        missedCalls,
        recentCalls,
        calendarEvents,
        addNewCalendarEvent,
        chatMessages,
        pinnedDecision,
        isLeadsModalOpen,
        activeLeadIndex,
        openLeadsModal,
        closeLeadsModal,
        setActiveLeadIndex,
        // Pulse multi-channel & multi-week
        pulseChannels,
        pulseWeeks,
        activePulseChannelId,
        setActivePulseChannelId,
        activePulseWeekId,
        setActivePulseWeekId,
        addChatMessage,
        deleteChatMessage,
        editChatMessage,
        confirmPinnedDecision,
        reschedulePinnedDecision,
        // Notifications
        notifications,
        isNotificationsOpen,
        setIsNotificationsOpen,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        // Profile & Status
        isProfileMenuOpen,
        setIsProfileMenuOpen,
        // Leaderboard
        isLeaderboardOpen,
        setIsLeaderboardOpen,
        // Quick Search
        isQuickSearchOpen,
        setIsQuickSearchOpen,
        // Creation Modals
        isCreateLeadModalOpen,
        setIsCreateLeadModalOpen,
        isCreateEventModalOpen,
        setIsCreateEventModalOpen,
        // Daily Brief Modal
        isDailyBriefModalOpen,
        setIsDailyBriefModalOpen,
        // Call review & callbacks
        selectedCallReview,
        setSelectedCallReview,
        resolveMissedCall,
        callbackCustomer,
        isCallbackModalOpen,
        openCallbackModal,
        closeCallbackModal,
        recordHumanCallback,
        recordCallInteraction
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

