import {
  AgentProfile,
  Lead,
  MissedCall,
  RecentCall,
  CalendarEvent,
  ChatMessage,
  PinnedDecision,
  PulseChannel,
  PulseWeek,
  ShiftNotification
} from '../types';

export const mockAgent: AgentProfile = {
  name: 'Arvind Rajan',
  initials: 'AR',
  role: 'Frontline Shift Agent',
  company: 'The Sleep Company',
  department: 'Call Centre',
  ogScore: 76,
  rank: '#3',
  queueStatus: 'On Queue'
};

export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Mukunda',
    initials: 'MK',
    product: 'Ortho GRID',
    price: 8490,
    attractivenessScore: 90,
    icpScore: 87,
    intentScore: 91,
    slaLeft: '2h left',
    status: 'OPEN',
    quoteTag: 'Quote to be given to customer',
    phone: '+91 72041 04491',
    signals: {
      financing: 'Asked specifically about EMI options on the Ortho GRID — budget is a live concern, not a blocker',
      quotation: 'Compared pricing with a competitor before reaching out — price-anchored, expects a competitive number',
      warranty: "Hasn't raised this yet — worth proactively mentioning the 100-night trial to reduce perceived risk"
    },
    notes: 'Visited Koramangala experience center on Wednesday. High purchase intent for master bedroom setup.'
  },
  {
    id: 'lead-2',
    name: 'Ritu S.',
    initials: 'RS',
    product: 'Smart Luxe Mattress',
    price: 13390,
    attractivenessScore: 96,
    icpScore: 94,
    intentScore: 95,
    slaLeft: '4h left',
    status: 'OPEN',
    quoteTag: 'Quote sent — awaiting final confirmation',
    phone: '+91 98451 23456',
    signals: {
      financing: 'Wants 0% interest 6-month cardless EMI with instant approval.',
      quotation: 'Requested official quotation with GST breakup for corporate reimbursement.',
      warranty: 'Asked for written confirmation of 10-year warranty coverage and home delivery timeline.'
    },
    notes: 'Shopper tested luxury firm mattress in store. Expressed interest in queen size.'
  },
  {
    id: 'lead-3',
    name: 'Faizan A.',
    initials: 'FA',
    product: 'Elevate Adjustable Bed',
    price: 24990,
    attractivenessScore: 88,
    icpScore: 85,
    intentScore: 89,
    slaLeft: '6h left',
    status: 'OPEN',
    quoteTag: 'Missed callback today · high expected value',
    phone: '+91 98452 34567',
    signals: {
      financing: 'Pre-approved credit card ready; needs swift checkout link.',
      quotation: 'Looking for bundle discount with contour memory pillow.',
      warranty: 'Standard warranty accepted; wants assembly assistance in Bengaluru.'
    },
    notes: 'Visited store yesterday 10:05 AM. Urgent requirement before weekend housewarming.'
  },
  {
    id: 'lead-4',
    name: 'Kavitha R.',
    initials: 'KR',
    product: 'ErgoTech Recliner',
    price: 19990,
    attractivenessScore: 82,
    icpScore: 80,
    intentScore: 84,
    slaLeft: '12h left',
    status: 'OPEN',
    quoteTag: 'Warm lead · asked for fabric color swatch',
    phone: '+91 98453 45678',
    signals: {
      financing: 'Flexible payment; prefers net banking.',
      quotation: 'Received digital catalog; reviewing grey fabric edition.',
      warranty: '5-year structural warranty on motor mechanism requested.'
    },
    notes: 'Spoke yesterday for 2m 05s. Follow-up agreed for today.'
  },
  {
    id: 'lead-5',
    name: 'Divya P.',
    initials: 'DP',
    product: 'Dual Comfort Latex',
    price: 18490,
    attractivenessScore: 79,
    icpScore: 76,
    intentScore: 78,
    slaLeft: '1d left',
    status: 'OPEN',
    quoteTag: 'Cold lead · needs spine health reassurance',
    phone: '+91 98454 56789',
    signals: {
      financing: 'Budget conscious; comparing with Duroflex alternatives.',
      quotation: 'Needs written pricing comparison with standard foam.',
      warranty: 'Reassured by 100-night trial proposition.'
    },
    notes: 'Inquired about orthopedic certification.'
  }
];

export const mockMissedCalls: MissedCall[] = [
  {
    id: 'missed-1',
    name: 'Faizan A.',
    initials: 'FA',
    missedText: 'Missed Today 10:05 AM · Visited store / in CRM',
    tag: 'Visited store / in CRM',
    expectedValue: 24990,
    phone: '+91 98452 34567',
    isResolved: false
  },
  {
    id: 'missed-2',
    name: 'Kavitha R.',
    initials: 'KR',
    missedText: 'Missed Yesterday 4:40 PM · Warm lead',
    tag: 'Warm lead',
    expectedValue: 24990,
    phone: '+91 98453 45678',
    isResolved: false
  },
  {
    id: 'missed-3',
    name: 'Divya P.',
    initials: 'DP',
    missedText: 'Missed Yesterday 2:15 PM · Cold lead',
    tag: 'Cold lead',
    expectedValue: 18490,
    phone: '+91 98454 56789',
    isResolved: false
  },
  {
    id: 'missed-4',
    name: 'Ritu S.',
    initials: 'RS',
    missedText: 'Missed Today 11:20 AM · Visited store / in CRM',
    tag: 'Visited store / in CRM',
    expectedValue: 13390,
    phone: '+91 98451 23456',
    isResolved: false
  },
  {
    id: 'missed-5',
    name: 'Unknown',
    initials: 'UN',
    missedText: 'Missed Yesterday · No prior record',
    tag: 'New contact',
    expectedValue: 0,
    phone: '+91 98111 99999',
    isResolved: false
  }
];

export const mockRecentCalls: RecentCall[] = [
  {
    id: 'rec-1',
    name: 'Mukunda R.',
    initials: 'MK',
    timeText: '10:42 AM · 4m 12s',
    duration: '4m 12s',
    type: 'inbound',
    phone: '+91 72041 04491',
    sopScore: 92,
    greetingPassed: true,
    notes: 'Closed pricing query smoothly; discussed Ortho GRID 100-night trial.',
    transcript: [
      { speaker: 'Arvind', text: 'Good morning! Welcome to The Sleep Company. My name is Arvind Rajan, how may I assist your sleep comfort today?', time: '0:05' },
      { speaker: 'Mukunda', text: 'Hi Arvind, I visited the Koramangala store yesterday and was looking at the Ortho GRID mattress.', time: '0:22' },
      { speaker: 'Arvind', text: 'Excellent choice Mr. Mukunda! The patented SmartGRID technology provides targeted orthopedic support without trapping heat.', time: '0:45' },
      { speaker: 'Mukunda', text: 'What EMI options do you provide for the King size?', time: '1:15' },
      { speaker: 'Arvind', text: 'We offer 0% no-cost EMI across all major credit cards, starting from just ₹1,415 per month with a 100-night risk-free home trial.', time: '1:40' }
    ]
  },
  {
    id: 'rec-2',
    name: 'Kavitha R.',
    initials: 'KR',
    timeText: 'Yesterday · 2m 05s',
    duration: '2m 05s',
    type: 'outbound',
    phone: '+91 98453 45678',
    sopScore: 88,
    greetingPassed: true,
    notes: 'Sent digital brochure and fabric sample link.'
  },
  {
    id: 'rec-3',
    name: 'Unknown',
    initials: 'UN',
    timeText: 'Yesterday · —',
    duration: '—',
    type: 'missed',
    phone: '',
    sopScore: 0,
    greetingPassed: false,
    notes: 'No answer on initial callback attempt.'
  },
  {
    id: 'rec-4',
    name: 'Ritu S.',
    initials: 'RS',
    timeText: 'Today 11:20 AM · —',
    duration: '—',
    type: 'missed',
    phone: '+91 98451 23456',
    sopScore: 0,
    greetingPassed: false
  },
  {
    id: 'rec-5',
    name: 'Faizan A.',
    initials: 'FA',
    timeText: 'Today 10:05 AM · —',
    duration: '—',
    type: 'missed',
    phone: '+91 98452 34567',
    sopScore: 0,
    greetingPassed: false
  },
  {
    id: 'rec-6',
    name: 'Kavitha R.',
    initials: 'KR',
    timeText: 'Yesterday 4:40 PM · —',
    duration: '—',
    type: 'missed',
    phone: '+91 98453 45678',
    sopScore: 0,
    greetingPassed: false
  },
  {
    id: 'rec-7',
    name: 'Divya P.',
    initials: 'DP',
    timeText: 'Yesterday 2:15 PM · —',
    duration: '—',
    type: 'missed',
    phone: '+91 98454 56789',
    sopScore: 0,
    greetingPassed: false
  },
  {
    id: 'rec-8',
    name: 'Faizan A.',
    initials: 'FA',
    timeText: 'Mon · 6m 40s',
    duration: '6m 40s',
    type: 'outbound',
    phone: '+91 98452 34567',
    sopScore: 94,
    greetingPassed: true,
    notes: 'Comprehensive consultation on adjustable bed ergonomics.'
  }
];

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: 'ev-1',
    dateStr: '2026-10-09',
    dayNumber: 9,
    title: 'Shift Active · Today',
    time: '09:00 AM - 06:00 PM',
    type: 'meeting',
    attendee: 'Call Centre Floor'
  },
  {
    id: 'ev-2',
    dateStr: '2026-10-09',
    dayNumber: 9,
    title: 'Daily QA Check-in with Sunita Rao',
    time: '02:00 PM',
    type: 'coaching',
    attendee: 'Sunita Rao'
  },
  {
    id: 'ev-3',
    dateStr: '2026-10-23',
    dayNumber: 23,
    title: 'The Sleep Company Store Visit · Koramangala',
    time: '11:00 AM - 01:00 PM',
    type: 'store_visit',
    attendee: 'Floor Staff & Store Manager'
  },
  {
    id: 'ev-4',
    dateStr: '2026-10-26',
    dayNumber: 26,
    title: 'Pitch Coaching & Roleplay with Mukunda Dwarkanath',
    time: '03:00 PM - 04:00 PM',
    type: 'coaching',
    attendee: 'Mukunda Dwarkanath'
  },
  {
    id: 'ev-5',
    dateStr: '2026-10-28',
    dayNumber: 28,
    title: 'Monthly Shift Review & CSAT Recognition',
    time: '04:30 PM - 05:30 PM',
    type: 'meeting',
    attendee: 'Shift Team'
  }
];

export const mockPinnedDecision: PinnedDecision = {
  id: 'pin-1',
  title: 'Confirm the 4:30pm callback',
  customerName: 'Priya Iyer',
  issue: 'likely billing dispute',
  status: 'PENDING'
};

export const mockPulseWeeks: PulseWeek[] = [
  {
    id: 'w41',
    label: 'Oct 5 - Oct 11, 2026',
    dateRange: 'Current Active Shift Week',
    isCurrent: true
  },
  {
    id: 'w40',
    label: 'Sep 28 - Oct 4, 2026',
    dateRange: 'Previous Shift Cycle',
    isCurrent: false
  },
  {
    id: 'w39',
    label: 'Sep 21 - Sep 27, 2026',
    dateRange: 'Shift Coaching Cycle',
    isCurrent: false
  }
];

export const mockPulseChannels: PulseChannel[] = [
  {
    id: 'callcentre-team',
    name: '# callcentre-agent',
    category: 'role',
    categoryLabel: 'ROLE AGENTS · run a team',
    topic: 'Call Centre Agent · Active team channel',
    membersCount: 14,
    unreadCount: 0,
    iconType: 'users'
  },
  {
    id: 'cross-sell-agent',
    name: '# cross-sell-agent',
    category: 'task',
    categoryLabel: 'TASK AGENTS · move one metric',
    topic: 'Your Attach rate · 5 members',
    membersCount: 5,
    unreadCount: 1,
    iconType: 'zap',
    metric: {
      label: 'Attach rate',
      value: 24,
      color: '#c026d3'
    }
  },
  {
    id: 'sop-agent',
    name: '# sop-agent',
    category: 'task',
    categoryLabel: 'TASK AGENTS · move one metric',
    topic: 'Your SOP adherence · 5 members',
    membersCount: 5,
    unreadCount: 0,
    iconType: 'target',
    metric: {
      label: 'SOP adherence',
      value: 81,
      color: '#059669'
    }
  },
  {
    id: 'lead-conversion-agent',
    name: '# lead-conversion-agent',
    category: 'task',
    categoryLabel: 'TASK AGENTS · move one metric',
    topic: 'Lead Conversion Agent · High-intent leads',
    membersCount: 6,
    unreadCount: 2,
    iconType: 'target'
  },
  {
    id: 'capture-agent',
    name: '# capture-agent',
    category: 'task',
    categoryLabel: 'TASK AGENTS · move one metric',
    topic: 'Your Capture coverage · 5 members',
    membersCount: 5,
    unreadCount: 0,
    iconType: 'zap',
    metric: {
      label: 'Capture coverage',
      value: 78,
      color: '#16a34a'
    }
  },
  {
    id: 'customer-discussions',
    name: 'customer-discussions',
    category: 'general',
    categoryLabel: 'GENERAL · channels',
    topic: 'Relayed via WhatsApp Business',
    membersCount: 8,
    unreadCount: 1,
    iconType: 'whatsapp'
  }
];

export const mockNotifications: ShiftNotification[] = [
  {
    id: 'notif-1',
    title: 'High-Value Missed Call',
    description: 'Faizan A. (₹24,990) missed call on SmartGRID Ortho. Callback recommended.',
    timestamp: '10m ago',
    type: 'call',
    read: false,
    actionRoute: 'plan/incoming',
    actionSubTab: 'incoming',
    actionLabel: 'Call Back'
  },
  {
    id: 'notif-2',
    title: 'SOP Greeting QA Alert',
    description: 'Greeting in first 10s dropped to 71%. Review team coaching notes.',
    timestamp: '25m ago',
    type: 'qa',
    read: false,
    actionRoute: 'pulse',
    actionLabel: 'View Channel'
  },
  {
    id: 'notif-3',
    title: 'Hot Lead SLA Warning',
    description: 'Mukunda (₹8,490 Ortho GRID) SLA expires in 2 hours.',
    timestamp: '45m ago',
    type: 'lead',
    read: false,
    actionRoute: 'plan/calls',
    actionSubTab: 'calls',
    actionLeadIndex: 0,
    actionLabel: 'Open Lead'
  },
  {
    id: 'notif-4',
    title: 'Shift QA Sync Today',
    description: 'Daily QA Check-in with Sunita Rao at 2:00 PM.',
    timestamp: '1h ago',
    type: 'calendar',
    read: true,
    actionRoute: 'calendar',
    actionLabel: 'View Schedule'
  }
];

export const mockChatMessages: ChatMessage[] = [
  // --- CHANNEL: callcentre-team (Week 41: Current) ---
  {
    id: 'msg-1',
    channelId: 'callcentre-team',
    weekId: 'w41',
    issueId: 'greeting-sop',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '2:05pm',
    content: '👥 STAKEHOLDERS: @You (Arvind R.), whole call centre shift',
    isAgent: false
  },
  {
    id: 'msg-2',
    channelId: 'callcentre-team',
    weekId: 'w41',
    issueId: 'greeting-sop',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '2:05pm',
    content: '📋 ISSUE DEFINITION: Greeting-in-first-10s QA score is at 71% this week, below our 85% target.',
    isAgent: false
  },
  {
    id: 'msg-3',
    channelId: 'callcentre-team',
    weekId: 'w41',
    issueId: 'greeting-sop',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '2:05pm',
    content: "➡️ SUGGESTED RESOLUTION: Let's push that up 💪 — open every call with the greeting script. I'll check back Friday.",
    isAgent: false
  },
  {
    id: 'msg-4',
    channelId: 'callcentre-team',
    weekId: 'w41',
    issueId: 'greeting-sop',
    sender: 'Arvind Rajan',
    initials: 'You',
    senderRole: 'agent',
    timestamp: '2:10pm',
    content: 'On it! Will make sure I open every call with the greeting script 🙌',
    isAgent: true
  },
  {
    id: 'msg-5',
    channelId: 'callcentre-team',
    weekId: 'w41',
    issueId: 'greeting-sop',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '2:14pm',
    content: 'Great attitude Arvind 🌟',
    isAgent: false
  },

  // --- CHANNEL: callcentre-team (Week 40: Previous) ---
  {
    id: 'msg-w40-1',
    channelId: 'callcentre-team',
    weekId: 'w40',
    issueId: 'weekly-wrap',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: 'Oct 3, 5:30pm',
    content: '🎉 Week 40 Wrap-Up: Koramangala hub achieved 92% CSAT average across all inbound calls!',
    isAgent: false
  },
  {
    id: 'msg-w40-2',
    channelId: 'callcentre-team',
    weekId: 'w40',
    issueId: 'weekly-wrap',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: 'Oct 3, 5:35pm',
    content: 'Special shoutout to Arvind Rajan for handling 22 calls on Thursday with zero escalations.',
    isAgent: false
  },
  {
    id: 'msg-w40-3',
    channelId: 'callcentre-team',
    weekId: 'w40',
    issueId: 'weekly-wrap',
    sender: 'Arvind Rajan',
    initials: 'You',
    senderRole: 'agent',
    timestamp: 'Oct 3, 5:40pm',
    content: 'Thank you Sunita! The new objection playbook on 100-night trial made a huge difference.',
    isAgent: true
  },

  // --- CHANNEL: callcentre-team (Week 39: Two Weeks Ago) ---
  {
    id: 'msg-w39-1',
    channelId: 'callcentre-team',
    weekId: 'w39',
    issueId: 'q4-kickoff',
    sender: 'Mukunda Dwarkanath',
    initials: 'MD',
    senderRole: 'manager',
    timestamp: 'Sep 25, 10:00am',
    content: '🚀 Q4 Shift Kickoff: Festive season demand starts next week. Expect higher Smart Luxe inquiries.',
    isAgent: false
  },
  {
    id: 'msg-w39-2',
    channelId: 'callcentre-team',
    weekId: 'w39',
    issueId: 'q4-kickoff',
    sender: 'Arvind Rajan',
    initials: 'You',
    senderRole: 'agent',
    timestamp: 'Sep 25, 10:15am',
    content: 'Will review the festive promotional pricing and 0% EMI tiers before calls start.',
    isAgent: true
  },

  // --- CHANNEL: cross-sell-agent (Week 41) ---
  {
    id: 'msg-cs-1',
    channelId: 'cross-sell-agent',
    weekId: 'w41',
    issueId: 'attach-metric',
    sender: 'Attach Bot',
    initials: 'AB',
    senderRole: 'bot',
    timestamp: '11:15am',
    content: '📊 METRIC UPDATE: Current Attach Rate is 24% (Target: 30%). 3 deals closed without accessory attach today.',
    isAgent: false
  },
  {
    id: 'msg-cs-2',
    channelId: 'cross-sell-agent',
    weekId: 'w41',
    issueId: 'attach-metric',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '11:20am',
    content: '@shift Remember that SmartGRID mattresses pair perfectly with All-Weather Bamboo Protectors. Offer the bundle discount!',
    isAgent: false
  },
  {
    id: 'msg-cs-3',
    channelId: 'cross-sell-agent',
    weekId: 'w41',
    issueId: 'attach-metric',
    sender: 'Arvind Rajan',
    initials: 'You',
    senderRole: 'agent',
    timestamp: '11:45am',
    content: 'Understood. I will pitch the Smart Ergonomic Pillow combo on the upcoming Faizan A. callback.',
    isAgent: true
  },

  // --- CHANNEL: sop-agent (Week 41) ---
  {
    id: 'msg-sop-1',
    channelId: 'sop-agent',
    weekId: 'w41',
    issueId: 'trial-disclosure',
    sender: 'SOP Guardian',
    initials: 'SG',
    senderRole: 'bot',
    timestamp: '9:30am',
    content: '📋 QA SPOTLIGHT: 100-Night Risk-Free Trial disclosure adherence reached 81% across 18 audited calls.',
    isAgent: false
  },
  {
    id: 'msg-sop-2',
    channelId: 'sop-agent',
    weekId: 'w41',
    issueId: 'trial-disclosure',
    sender: 'Sunita Rao',
    initials: 'SR',
    senderRole: 'manager',
    timestamp: '9:45am',
    content: 'Be sure to explain that the 100-night trial requires zero return shipping fees for customers in Bengaluru.',
    isAgent: false
  },

  // --- CHANNEL: lead-conversion-agent (Week 41) ---
  {
    id: 'msg-lead-1',
    channelId: 'lead-conversion-agent',
    weekId: 'w41',
    issueId: 'hot-leads',
    sender: 'Conversion AI',
    initials: 'CA',
    senderRole: 'bot',
    timestamp: '1:00pm',
    content: '🎯 HOT LEADS: Mukunda (Ortho GRID) and Ritu S. (Smart Luxe) have intent scores above 90. Call window recommended now.',
    isAgent: false
  },
  {
    id: 'msg-lead-2',
    channelId: 'lead-conversion-agent',
    weekId: 'w41',
    issueId: 'hot-leads',
    sender: 'Mukunda Dwarkanath',
    initials: 'MD',
    senderRole: 'manager',
    timestamp: '1:10pm',
    content: 'Mukunda visited the Koramangala store yesterday. Emphasize that in-store discounts can be matched immediately over the phone.',
    isAgent: false
  },

  // --- CHANNEL: capture-agent (Week 41) ---
  {
    id: 'msg-cap-1',
    channelId: 'capture-agent',
    weekId: 'w41',
    issueId: 'crm-capture',
    sender: 'Capture Bot',
    initials: 'CB',
    senderRole: 'bot',
    timestamp: '10:00am',
    content: '📝 CAPTURE AUDIT: Capture coverage at 78%. Ensure delivery pin code is verified during the first 2 minutes of the call.',
    isAgent: false
  },

  // --- CHANNEL: customer-discussions (Week 41) ---
  {
    id: 'msg-cust-1',
    channelId: 'customer-discussions',
    weekId: 'w41',
    issueId: 'whatsapp-relay',
    sender: 'WhatsApp Relay',
    initials: 'WA',
    senderRole: 'customer',
    timestamp: '12:30pm',
    content: '💬 Customer +91 98452 34567: "Hello, does the Koramangala store have the King Size Ortho GRID on display for a trial?"',
    isAgent: false
  },
  {
    id: 'msg-cust-2',
    channelId: 'customer-discussions',
    weekId: 'w41',
    issueId: 'whatsapp-relay',
    sender: 'Arvind Rajan',
    initials: 'You',
    senderRole: 'agent',
    timestamp: '12:35pm',
    content: 'Yes! Floor display is available in store and our warehouse has 14 units ready for immediate 24h dispatch.',
    isAgent: true
  }
];

