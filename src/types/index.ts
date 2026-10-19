export type AppRoute =
  | 'dashboard'
  | 'plan/calls'
  | 'plan/incoming'
  | 'plan/recent'
  | 'plan/practise'
  | 'calendar'
  | 'pulse'
  | 'pulse/channel';

export interface AgentProfile {
  name: string;
  initials: string;
  role: string;
  company: string;
  department: string;
  ogScore: number;
  rank: string;
  queueStatus: 'On Queue' | 'Paused' | 'Break';
}

export interface BuyingSignals {
  financing: string;
  quotation: string;
  warranty: string;
}

export interface Lead {
  id: string;
  name: string;
  initials: string;
  product: string;
  price: number;
  attractivenessScore: number;
  icpScore: number;
  intentScore: number;
  slaLeft: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  quoteTag: string;
  signals: BuyingSignals;
  phone: string;
  notes?: string;
}

export interface MissedCall {
  id: string;
  name: string;
  initials: string;
  missedText: string;
  tag: string;
  expectedValue: number;
  phone: string;
  isResolved?: boolean;
}

export interface RecentCall {
  id: string;
  name: string;
  initials: string;
  timeText: string;
  duration: string;
  type: 'inbound' | 'outbound' | 'missed';
  sopScore?: number;
  greetingPassed?: boolean;
  notes?: string;
  transcript?: { speaker: string; text: string; time: string }[];
}

export interface CalendarEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  title: string;
  time: string;
  type: 'store_visit' | 'coaching' | 'meeting' | 'callback';
  attendee?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  initials: string;
  timestamp: string;
  content: string;
  isAgent: boolean;
  prefixBadge?: string;
}

export interface PinnedDecision {
  id: string;
  title: string;
  customerName: string;
  issue: string;
  status: 'PENDING' | 'CONFIRMED' | 'RESCHEDULED';
  confirmedBy?: string;
}

export type CallLifecycle = 'IDLE' | 'DIALING' | 'RINGING' | 'CONNECTED' | 'ENDED';
export type CallEngineMode = 'AI_VOICE' | 'WEBRTC_PEER' | 'PHONE';

export interface ActiveCallState {
  lifecycle: CallLifecycle;
  mode: CallEngineMode;
  contactName: string;
  contactInitials: string;
  contactPhone: string;
  expectedValue?: number;
  productInterest?: string;
  durationSeconds: number;
  isMuted: boolean;
  transcriptSnippet?: string;
  aiResponseText?: string;
}
