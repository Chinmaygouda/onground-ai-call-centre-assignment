import {
  AgentProfile,
  Lead,
  MissedCall,
  RecentCall,
  CalendarEvent,
  ChatMessage,
  PinnedDecision
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

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'Sunita Rao',
    initials: 'SR',
    timestamp: '2:05pm',
    content: '👥 STAKEHOLDERS: @You (Arvind R.), whole call centre shift',
    isAgent: false
  },
  {
    id: 'msg-2',
    sender: 'Sunita Rao',
    initials: 'SR',
    timestamp: '2:05pm',
    content: '📋 ISSUE DEFINITION: Greeting-in-first-10s QA score is at 71% this week, below our 85% target.',
    isAgent: false
  },
  {
    id: 'msg-3',
    sender: 'Sunita Rao',
    initials: 'SR',
    timestamp: '2:05pm',
    content: "➡️ SUGGESTED RESOLUTION: Let's push that up 💪 — open every call with the greeting script. I'll check back Friday.",
    isAgent: false
  },
  {
    id: 'msg-4',
    sender: 'Arvind Rajan',
    initials: 'You',
    timestamp: '2:10pm',
    content: 'On it! Will make sure I open every call with the greeting script 🙌',
    isAgent: true
  },
  {
    id: 'msg-5',
    sender: 'Sunita Rao',
    initials: 'SR',
    timestamp: '2:14pm',
    content: 'Great attitude Arvind 🌟',
    isAgent: false
  }
];
