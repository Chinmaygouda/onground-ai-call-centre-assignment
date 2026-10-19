import React, { createContext, useContext, useState } from 'react';
import {
  AppRoute,
  Lead,
  MissedCall,
  RecentCall,
  CalendarEvent,
  ChatMessage,
  PinnedDecision,
  AgentProfile
} from '../types';
import {
  mockAgent,
  mockLeads,
  mockMissedCalls,
  mockRecentCalls,
  mockCalendarEvents,
  mockChatMessages,
  mockPinnedDecision
} from '../data/mockData';

interface AppStateContextType {
  currentRoute: AppRoute;
  setCurrentRoute: (route: AppRoute) => void;
  isPlanSubmenuOpen: boolean;
  setIsPlanSubmenuOpen: (open: boolean) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  agent: AgentProfile;
  leads: Lead[];
  missedCalls: MissedCall[];
  recentCalls: RecentCall[];
  calendarEvents: CalendarEvent[];
  chatMessages: ChatMessage[];
  pinnedDecision: PinnedDecision;
  isLeadsModalOpen: boolean;
  activeLeadIndex: number;
  openLeadsModal: (index?: number) => void;
  closeLeadsModal: () => void;
  setActiveLeadIndex: (index: number) => void;
  addChatMessage: (content: string) => void;
  confirmPinnedDecision: () => void;
  reschedulePinnedDecision: () => void;
  selectedCallReview: RecentCall | null;
  setSelectedCallReview: (call: RecentCall | null) => void;
  resolveMissedCall: (id: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');
  const [isPlanSubmenuOpen, setIsPlanSubmenuOpen] = useState<boolean>(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [agent] = useState<AgentProfile>(mockAgent);
  const [leads] = useState<Lead[]>(mockLeads);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>(mockMissedCalls);
  const [recentCalls] = useState<RecentCall[]>(mockRecentCalls);
  const [calendarEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [pinnedDecision, setPinnedDecision] = useState<PinnedDecision>(mockPinnedDecision);
  
  // Leads Modal
  const [isLeadsModalOpen, setIsLeadsModalOpen] = useState<boolean>(false);
  const [activeLeadIndex, setActiveLeadIndex] = useState<number>(0);

  // SOP Call Review
  const [selectedCallReview, setSelectedCallReview] = useState<RecentCall | null>(null);

  const openLeadsModal = (index: number = 0) => {
    setActiveLeadIndex(index);
    setIsLeadsModalOpen(true);
  };

  const closeLeadsModal = () => {
    setIsLeadsModalOpen(false);
  };

  const addChatMessage = (content: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'Arvind Rajan',
      initials: 'You',
      timestamp: timeStr,
      content,
      isAgent: true
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  const confirmPinnedDecision = () => {
    setPinnedDecision((prev) => ({
      ...prev,
      status: 'CONFIRMED',
      confirmedBy: 'Arvind Rajan'
    }));
    addChatMessage('I have confirmed the 4:30pm callback with Priya Iyer.');
  };

  const reschedulePinnedDecision = () => {
    setPinnedDecision((prev) => ({
      ...prev,
      status: 'RESCHEDULED',
      confirmedBy: 'Arvind Rajan'
    }));
    addChatMessage('Requested reschedule for Priya Iyer callback to 5:15pm.');
  };

  const resolveMissedCall = (id: string) => {
    setMissedCalls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isResolved: true } : c))
    );
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
        leads,
        missedCalls,
        recentCalls,
        calendarEvents,
        chatMessages,
        pinnedDecision,
        isLeadsModalOpen,
        activeLeadIndex,
        openLeadsModal,
        closeLeadsModal,
        setActiveLeadIndex,
        addChatMessage,
        confirmPinnedDecision,
        reschedulePinnedDecision,
        selectedCallReview,
        setSelectedCallReview,
        resolveMissedCall
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
