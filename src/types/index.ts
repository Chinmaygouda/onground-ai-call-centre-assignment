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
  provider?: 'exotel' | 'demo' | 'native';
  isDemoRecord?: boolean;
  callSid?: string;
}

export interface RecentCall {
  id: string;
  name: string;
  initials: string;
  timeText: string;
  duration: string;
  type: 'inbound' | 'outbound' | 'missed';
  phone?: string;
  sopScore?: number;
  greetingPassed?: boolean;
  notes?: string;
  transcript?: { speaker: string; text: string; time: string }[];
  provider?: 'exotel' | 'exotel_ai' | 'demo' | 'native';
  callMode?: 'employee_pstn' | 'ai_voicebot' | 'webrtc_peer' | 'native_dialer';
  isDemoRecord?: boolean;
  callSid?: string;
  recordingUrl?: string;
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
  channelId?: string;
  weekId?: string;
  issueId?: string;
  sender: string;
  initials: string;
  timestamp: string;
  content: string;
  isAgent: boolean;
  prefixBadge?: string;
  senderRole?: 'manager' | 'agent' | 'bot' | 'customer';
  edited?: boolean;
}

export interface PulseChannel {
  id: string;
  name: string;
  category: 'role' | 'task' | 'general';
  categoryLabel: string;
  topic: string;
  membersCount: number;
  unreadCount: number;
  iconType: 'users' | 'zap' | 'target' | 'whatsapp';
  metric?: {
    label: string;
    value: number;
    color: string;
  };
}

export interface PulseWeek {
  id: string;
  label: string;
  dateRange: string;
  isCurrent: boolean;
}

export interface ShiftNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'call' | 'qa' | 'lead' | 'calendar';
  read: boolean;
  actionRoute?: AppRoute;
  actionSubTab?: 'calls' | 'incoming' | 'recent';
  actionLeadIndex?: number;
  actionLabel?: string;
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
export type CallEngineMode = 'AI_VOICE' | 'WEBRTC_PEER' | 'PHONE' | 'EXOTEL_REAL' | 'EXOTEL_AI';

export type ExotelCallStatus =
  | 'initiating'
  | 'calling_employee'
  | 'employee_answered'
  | 'calling_client'
  | 'calling_customer'
  | 'customer_answered'
  | 'ai_connected'
  | 'ai_speaking'
  | 'ai_listening'
  | 'connected'
  | 'completed'
  | 'busy'
  | 'no_answer'
  | 'failed'
  | 'cancelled';

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
  // Exotel Telephony metadata
  exotelCallSid?: string;
  exotelStatus?: ExotelCallStatus;
  exotelCallerId?: string;
  recordingUrl?: string;
  providerError?: string;
  isConfigured?: boolean;
  voiceSessionId?: string;
  aiTranscript?: string | Array<{ speaker: 'ai' | 'customer'; text: string; time?: string }>;
}


