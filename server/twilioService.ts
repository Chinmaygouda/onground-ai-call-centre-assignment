/**
 * Twilio Programmable Voice & AI Customer Assistant Service
 *
 * Implements customer-first outbound telephone calling via Twilio Programmable Voice:
 * 1. Twilio calls the customer directly (employee phone is never dialed).
 * 2. When customer answers, Twilio fetches initial TwiML (/api/twilio/voice) with personalized greeting.
 * 3. Twilio <Gather> captures customer speech (Speech-to-Text).
 * 4. Twilio POSTs recognition result to /api/twilio/ai-turn.
 * 5. Gemini text AI reasons over lead context, conversation history, and verified Sleep Company tools.
 * 6. Twilio <Say> speaks the verified response (Text-to-Speech) and begins next <Gather>.
 * 7. Call status and full transcript are tracked and recorded in call history.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import twilio from 'twilio';
import { executeGeminiQuery, ToolExecutionEvent } from './geminiQueryService';
import { businessDataProvider } from '../src/services/businessData/BusinessDataProvider';

const VoiceResponse = twilio.twiml.VoiceResponse;

export interface TwilioConversationTurn {
  turn: number;
  customerSpeech?: string;
  aiResponseText?: string;
  intent?: string;
  toolsExecuted?: string[];
  timestamp: string;
}

export interface TwilioVoiceSession {
  sessionId: string;
  callSid: string | null;
  leadId: string;
  customerName: string;
  customerPhone: string;
  product: string;
  value?: number;
  buyingSignals?: string[];
  notes?: string;
  status:
    | 'initiating'
    | 'queued'
    | 'ringing'
    | 'in-progress'
    | 'customer_answered'
    | 'ai_speaking'
    | 'listening'
    | 'processing'
    | 'completed'
    | 'busy'
    | 'no-answer'
    | 'failed'
    | 'canceled';
  currentTurn: number;
  maxTurns: number;
  turns: TwilioConversationTurn[];
  startedAt?: number;
  answeredAt?: number;
  endedAt?: number;
  durationSeconds: number;
  createdAt: number;
  updatedAt: number;
  recordingUrl?: string;
  providerError?: string;
  lastCustomerSpeech?: string;
  lastAiResponse?: string;
  isTrialSample?: boolean;
  trialSampleUrl?: string;
  lastTwilioCheckAt?: number;
}

export interface StructuredAiTurnResponse {
  intent: string;
  responseText: string;
  shouldContinue: boolean;
  shouldHandoff: boolean;
  shouldEndCall: boolean;
  toolsExecuted?: string[];
}

export const TERMINAL_TWILIO_STATUSES = new Set<string>([
  'completed',
  'failed',
  'busy',
  'no-answer',
  'canceled'
]);

export interface RawTwilioLogEntry {
  timestamp: string;
  operation: string;
  httpStatus?: number;
  twilioErrorCode?: number | string;
  message?: string;
  moreInfo?: string;
  callSid?: string;
  toMasked?: string;
  success: boolean;
}

// In-memory ring buffer for recent raw Twilio API logs (diagnostics & tests)
export const rawTwilioLogHistory: RawTwilioLogEntry[] = [];

/**
 * Logs raw Twilio response separately, capturing HTTP status, Twilio error code, message, and more_info.
 * Never logs credentials, auth tokens, or unmasked sensitive data.
 */
export function logRawTwilioResponse(
  operation: string,
  resultOrError: any,
  context?: { callSid?: string; to?: string; sessionId?: string }
): RawTwilioLogEntry {
  const isError = resultOrError instanceof Error || Boolean(resultOrError?.code && resultOrError?.status >= 400);
  const rawStatus = resultOrError?.status;
  const httpStatus = typeof rawStatus === 'number' ? rawStatus : parseInt(rawStatus, 10) || (isError ? 500 : 200);
  const twilioErrorCode = resultOrError?.code || (isError ? 'TWILIO_ERROR' : undefined);
  const message = resultOrError?.message || (isError ? 'Unknown Twilio error' : 'Success');
  const moreInfo = resultOrError?.moreInfo || resultOrError?.more_info || undefined;
  const callSid = context?.callSid || resultOrError?.sid || undefined;
  const toMasked = context?.to ? maskPhoneNumber(context.to) : undefined;

  const logEntry: RawTwilioLogEntry = {
    timestamp: new Date().toISOString(),
    operation,
    httpStatus,
    twilioErrorCode,
    message,
    moreInfo,
    callSid,
    toMasked,
    success: !isError
  };

  rawTwilioLogHistory.unshift(logEntry);
  if (rawTwilioLogHistory.length > 50) {
    rawTwilioLogHistory.pop();
  }

  if (isError) {
    console.error(
      `[TwilioService:RawResponse:ERROR] Op: ${operation} | HTTP Status: ${httpStatus} | Twilio Code: ${twilioErrorCode || 'NONE'} | Message: ${message}${moreInfo ? ` | MoreInfo: ${moreInfo}` : ''} | CallSID: ${callSid || 'NONE'} | Recipient: ${toMasked || 'NONE'}`
    );
  } else {
    console.log(
      `[TwilioService:RawResponse:SUCCESS] Op: ${operation} | HTTP Status: ${httpStatus} | CallSID: ${callSid || 'NONE'} | Recipient: ${toMasked || 'NONE'}`
    );
  }

  return logEntry;
}

// In-memory active session registries
const activeSessions = new Map<string, TwilioVoiceSession>();
const sidToSessionId = new Map<string, string>();

// Concurrency mutex: In-flight outbound call initiation set to prevent race-condition duplicate calls
export const inFlightInitiations = new Set<string>();

/**
 * Idempotently clears or marks an active Twilio session as terminal.
 * Repeated calls with the same ID cannot cause double mutations or errors.
 */
export function clearTwilioSession(
  sessionIdOrSid: string,
  reason?: string,
  terminalStatus: TwilioVoiceSession['status'] = 'completed'
): TwilioVoiceSession | undefined {
  const session = getTwilioSession(sessionIdOrSid);
  if (!session) return undefined;

  // Idempotent guard: if already terminal, ensure endedAt is set and return safely
  if (TERMINAL_TWILIO_STATUSES.has(session.status)) {
    if (!session.endedAt) session.endedAt = Date.now();
    return session;
  }

  session.status = terminalStatus;
  session.updatedAt = Date.now();
  if (!session.endedAt) {
    session.endedAt = Date.now();
  }
  if (session.answeredAt && (!session.durationSeconds || session.durationSeconds === 0)) {
    session.durationSeconds = Math.max(0, Math.round((session.endedAt - session.answeredAt) / 1000));
  }
  if (reason) {
    session.notes = session.notes ? `${session.notes} | ${reason}` : reason;
  }
  console.log(`[TwilioService] Idempotently cleared session ${session.sessionId} (CallSid: ${session.callSid || 'none'}), status=${terminalStatus}, reason=${reason || 'none'}`);
  return session;
}

/**
 * Session Registry Helpers
 */
export function createTwilioVoiceSession(params: {
  leadId: string;
  customerName: string;
  customerPhone: string;
  product: string;
  value?: number;
  buyingSignals?: string[];
  notes?: string;
  maxTurns?: number;
}): TwilioVoiceSession {
  const sessionId = 'twses_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const normalizedPhone = normalizePhoneNumber(params.customerPhone);
  let resolvedName = (params.customerName || '').trim();
  if (!resolvedName || resolvedName.toLowerCase() === 'valued customer' || resolvedName.toLowerCase() === 'customer' || resolvedName.toLowerCase() === 'there') {
    if (normalizedPhone.includes('7204104491')) {
      resolvedName = 'Chinmay';
    } else {
      resolvedName = 'Valued Customer';
    }
  }

  const session: TwilioVoiceSession = {
    sessionId,
    callSid: null,
    leadId: params.leadId || 'lead-1',
    customerName: resolvedName,
    customerPhone: normalizedPhone,
    product: params.product || 'Ortho GRID Mattress',
    value: params.value,
    buyingSignals: params.buyingSignals || [],
    notes: params.notes,
    status: 'initiating',
    currentTurn: 0,
    maxTurns: params.maxTurns || 6,
    turns: [],
    durationSeconds: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function getTwilioSession(sessionIdOrSid: string): TwilioVoiceSession | undefined {
  if (activeSessions.has(sessionIdOrSid)) {
    return activeSessions.get(sessionIdOrSid);
  }
  const mappedSessionId = sidToSessionId.get(sessionIdOrSid);
  if (mappedSessionId && activeSessions.has(mappedSessionId)) {
    return activeSessions.get(mappedSessionId);
  }
  return undefined;
}

export function bindTwilioCallSid(sessionId: string, callSid: string) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.callSid = callSid;
    session.updatedAt = Date.now();
  }
  sidToSessionId.set(callSid, sessionId);
}

export function updateTwilioSessionStatus(
  sessionIdOrSid: string,
  status: TwilioVoiceSession['status'],
  extra?: Partial<TwilioVoiceSession>
) {
  const session = getTwilioSession(sessionIdOrSid);
  if (!session) return;

  if (extra) {
    Object.assign(session, extra);
  }

  if (TERMINAL_TWILIO_STATUSES.has(status)) {
    clearTwilioSession(session.sessionId, extra?.notes, status);
    if (typeof extra?.durationSeconds === 'number') {
      session.durationSeconds = extra.durationSeconds;
    }
    return;
  }

  session.status = status;
  session.updatedAt = Date.now();

  if (status === 'in-progress' || status === 'customer_answered') {
    if (!session.answeredAt) {
      session.answeredAt = Date.now();
    }
  }
}

/**
 * Phone Number Normalization and Allowlist
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '[NONE]';
  const clean = phone.trim();
  if (clean.length < 8) return '***';
  return `${clean.slice(0, 3)}*****${clean.slice(-4)}`;
}

export function isAllowedTwilioRecipient(phone: string, env: Record<string, string | undefined>): {
  allowed: boolean;
  reason?: string;
  allowedList: string[];
} {
  const requireAllowlist = env.TWILIO_ALLOWLIST_REQUIRED !== 'false';
  const rawAllowed = env.TWILIO_ALLOWED_TO_NUMBERS || env.TWILIO_TEST_TO_NUMBER || '+917204104491';
  const allowedList = rawAllowed
    .split(',')
    .map((p) => normalizePhoneNumber(p.trim()))
    .filter(Boolean);

  if (!requireAllowlist) {
    return { allowed: true, allowedList };
  }

  const normalized = normalizePhoneNumber(phone);
  const isMatch = allowedList.includes(normalized);

  if (!isMatch) {
    return {
      allowed: false,
      reason: `Destination phone number ${maskPhoneNumber(normalized)} is not in TWILIO_ALLOWED_TO_NUMBERS. In trial/safety mode, calls are restricted to verified test recipients (${allowedList.map(maskPhoneNumber).join(', ')}).`,
      allowedList
    };
  }

  return { allowed: true, allowedList };
}

/**
 * Credentials Validation
 */
export function validateTwilioCredentials(env: Record<string, string | undefined>): {
  valid: boolean;
  accountSid?: string;
  fromNumber?: string;
  errors: string[];
  isTrial: boolean;
} {
  const accountSid = (env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (env.TWILIO_FROM_NUMBER || '').trim();
  const errors: string[] = [];

  if (!accountSid) {
    errors.push('TWILIO_ACCOUNT_SID is missing in environment configuration.');
  } else if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
    errors.push('TWILIO_ACCOUNT_SID format is invalid (must begin with "AC" and be 34 characters).');
  }

  if (!authToken) {
    errors.push('TWILIO_AUTH_TOKEN is missing in environment configuration.');
  } else if (authToken.length !== 32) {
    errors.push('TWILIO_AUTH_TOKEN format is invalid (must be a 32-character hex token).');
  }

  if (!fromNumber) {
    errors.push('TWILIO_FROM_NUMBER is missing (must be configured with your Twilio phone number).');
  }

  return {
    valid: errors.length === 0,
    accountSid: accountSid ? `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}` : undefined,
    fromNumber: fromNumber ? maskPhoneNumber(fromNumber) : undefined,
    errors,
    isTrial: env.TWILIO_TRIAL_MODE !== 'false'
  };
}

/**
 * Validates Twilio Webhook Signature using official Twilio SDK validator
 */
export function validateTwilioWebhookSignature(
  authToken: string,
  twilioSignature: string | undefined,
  url: string,
  params: Record<string, any>
): boolean {
  if (!authToken || !twilioSignature) {
    return false;
  }
  try {
    return twilio.validateRequest(authToken, twilioSignature, url, params);
  } catch (err) {
    console.warn('[TwilioService] Signature validation error:', err);
    return false;
  }
}

/**
 * Checks if an active call is already ongoing for this destination number.
 * Real Twilio Call SIDs are never auto-cleared based on inactivity alone.
 */
export function hasActiveCallForLeadOrPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  const now = Date.now();
  for (const session of activeSessions.values()) {
    if (session.customerPhone === normalized) {
      if (TERMINAL_TWILIO_STATUSES.has(session.status)) {
        continue;
      }
      // Definitively failed initiations without Call SID do not block
      if (!session.callSid && (session.status === 'failed' || Boolean(session.providerError))) {
        clearTwilioSession(session.sessionId, 'Initiation failed without Call SID', 'failed');
        continue;
      }
      // Orphaned initiation timeout (>60s) without in-flight request
      if (!session.callSid && now - session.createdAt > 60000 && !inFlightInitiations.has(session.customerPhone)) {
        clearTwilioSession(session.sessionId, 'Orphaned initiation timed out (>60s)', 'failed');
        continue;
      }
      // Simulation timeout: 30 seconds (simulation only, has no real Twilio Call SID)
      if (session.callSid && session.callSid.startsWith('CASIM_') && now - session.createdAt > 30000) {
        clearTwilioSession(session.sessionId, 'Simulation call expired', 'completed');
        continue;
      }
      // Real Twilio sessions or in-flight initiations hold the lock until confirmed terminal or explicitly ended
      return true;
    }
  }
  return false;
}

/**
 * Verifies live status against Twilio REST API before blocking or initiating calls.
 * Ensures stale sessions (where customer hung up on mobile) are cleared automatically.
 * Safety Rules:
 * 1. Never auto-clears valid Call SIDs based on inactivity alone.
 * 2. Does not clear pending initiations merely for being 10s old; checks whether Twilio request is in flight.
 * 3. Preserves lock on Twilio API/network verification errors.
 */
export async function verifyAndClearStaleActiveCall(
  phone: string,
  env: Record<string, string | undefined>,
  forceClear = false
): Promise<{
  hasActiveCall: boolean;
  activeSession?: TwilioVoiceSession;
  liveTwilioStatus?: string;
  verificationError?: string;
}> {
  const normalized = normalizePhoneNumber(phone);
  const now = Date.now();

  const matchingSessions: TwilioVoiceSession[] = [];
  for (const session of activeSessions.values()) {
    if (session.customerPhone === normalized && !TERMINAL_TWILIO_STATUSES.has(session.status)) {
      matchingSessions.push(session);
    }
  }

  if (matchingSessions.length === 0) {
    return { hasActiveCall: false };
  }

  if (forceClear) {
    for (const s of matchingSessions) {
      clearTwilioSession(s.sessionId, 'Force-cleared by user before new call', 'completed');
    }
    return { hasActiveCall: false };
  }

  for (const session of matchingSessions) {
    // 1. Sessions without Call SID: check whether Twilio API request is in flight or definitively failed
    if (!session.callSid) {
      // If Twilio API request is currently in-flight, keep lock
      if (inFlightInitiations.has(session.customerPhone)) {
        return {
          hasActiveCall: true,
          activeSession: session,
          liveTwilioStatus: 'initiating_in_flight'
        };
      }
      // If creation definitively failed, safely clear the session
      if (session.status === 'failed' || Boolean(session.providerError)) {
        clearTwilioSession(session.sessionId, 'Call initiation definitively failed without Call SID', 'failed');
        continue;
      }
      // If orphaned initiation is older than 60s without Call SID, clean up
      if (now - session.createdAt > 60000) {
        clearTwilioSession(session.sessionId, 'Orphaned initiation without Call SID after timeout (>60s)', 'failed');
        continue;
      }
      // Otherwise initiation is still pending: preserve lock
      return {
        hasActiveCall: true,
        activeSession: session,
        liveTwilioStatus: 'initiating_pending'
      };
    }

    // 2. Simulation call timeout (>30s) - only for CASIM_ simulated calls
    if (session.callSid && session.callSid.startsWith('CASIM_')) {
      if (now - session.createdAt > 30000) {
        clearTwilioSession(session.sessionId, 'Simulation call expired', 'completed');
        continue;
      }
    }

    // 3. Live Twilio REST API check if real CallSid exists
    if (
      session.callSid &&
      session.callSid.startsWith('CA') &&
      !session.callSid.startsWith('CASIM_') &&
      env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN
    ) {
      try {
        const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        const liveCall = await client.calls(session.callSid).fetch();
        logRawTwilioResponse('client.calls.fetch:verifyActive', liveCall, { callSid: session.callSid, sessionId: session.sessionId });
        const liveStatus = (liveCall.status || '').toLowerCase();
        console.log(`[TwilioService] Live Twilio status check for ${session.callSid}: ${liveStatus}`);

        if (TERMINAL_TWILIO_STATUSES.has(liveStatus)) {
          console.log(`[TwilioService] Twilio confirms call ${session.callSid} is ${liveStatus}. Releasing local active session lock.`);
          clearTwilioSession(session.sessionId, `Twilio live call confirmed as ${liveStatus}`, 'completed');
          if (liveCall.duration) {
            session.durationSeconds = parseInt(liveCall.duration, 10);
          }
          continue;
        } else {
          // Genuinely active call (queued, initiated, ringing, in-progress) -> Keep lock
          return {
            hasActiveCall: true,
            activeSession: session,
            liveTwilioStatus: liveStatus
          };
        }
      } catch (err: any) {
        logRawTwilioResponse('client.calls.fetch:verifyActive', err, { callSid: session.callSid, sessionId: session.sessionId });
        console.warn(`[TwilioService] Error verifying live Twilio status for ${session.callSid}: ${err?.message || err}.`);
        if (err?.status === 404 || err?.code === 20404) {
          clearTwilioSession(session.sessionId, `Twilio call not found (${err?.code || '404'})`, 'completed');
          continue;
        }
        // Network or API error verifying status: PRESERVE THE LOCK! (Safety Review Requirement 4)
        return {
          hasActiveCall: true,
          activeSession: session,
          liveTwilioStatus: 'verification_error',
          verificationError: err?.message || 'Network or provider error while verifying live Twilio call status'
        };
      }
    }
  }

  // Re-check if any active session remains
  for (const session of activeSessions.values()) {
    if (session.customerPhone === normalized && !TERMINAL_TWILIO_STATUSES.has(session.status)) {
      return { hasActiveCall: true, activeSession: session };
    }
  }

  return { hasActiveCall: false };
}

/**
 * Cleans up expired sessions older than maxAgeMs
 */
export function cleanupExpiredSessions(maxAgeMs = 3600000): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.updatedAt > maxAgeMs) {
      activeSessions.delete(id);
      if (session.callSid) {
        sidToSessionId.delete(session.callSid);
      }
      cleaned++;
    }
  }
  return cleaned;
}

/**
 * Generates the personalized AI greeting for The Sleep Company
 */
export function generateTwilioGreeting(session: TwilioVoiceSession): string {
  let name = (session.customerName || '').trim();
  if (!name || name.toLowerCase() === 'valued customer' || name.toLowerCase() === 'customer' || name.toLowerCase() === 'there') {
    if (session.customerPhone && session.customerPhone.includes('7204104491')) {
      name = 'Chinmay';
    } else {
      name = 'there';
    }
  }
  const product = session.product || 'Ortho GRID Mattress';
  return `Hello ${name}! This is Arvind Rajan calling from The Sleep Company regarding your enquiry on the ${product}. How are you doing today?`;
}

/**
 * Constructs initial TwiML with <Gather> and nested <Say>
 */
export function generateInitialTwiML(session: TwilioVoiceSession, webhookBaseUrl: string): string {
  const response = new VoiceResponse();
  const greeting = generateTwilioGreeting(session);
  const actionUrl = `${webhookBaseUrl}/api/twilio/ai-turn?sessionId=${encodeURIComponent(session.sessionId)}`;

  const gather = response.gather({
    input: ['speech'],
    language: 'en-IN',
    speechTimeout: 'auto',
    action: actionUrl,
    method: 'POST'
  });

  gather.say(
    {
      voice: 'Polly.Aditi',
      language: 'en-IN'
    },
    greeting
  );

  // If customer stays silent:
  response.say(
    {
      voice: 'Polly.Aditi',
      language: 'en-IN'
    },
    "We didn't receive any response. Feel free to call us back anytime. Have a great day from The Sleep Company."
  );
  response.hangup();

  return response.toString();
}

/**
 * Constructs AI conversation turn TwiML
 */
export function generateAiTurnTwiML(
  session: TwilioVoiceSession,
  aiTurn: StructuredAiTurnResponse,
  webhookBaseUrl: string
): string {
  const response = new VoiceResponse();
  const actionUrl = `${webhookBaseUrl}/api/twilio/ai-turn?sessionId=${encodeURIComponent(session.sessionId)}`;

  if (aiTurn.shouldEndCall || session.currentTurn >= session.maxTurns) {
    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      aiTurn.responseText
    );
    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      'Thank you for speaking with The Sleep Company. Have a wonderful day!'
    );
    response.hangup();
    return response.toString();
  }

  // Continue multi-turn conversation
  const gather = response.gather({
    input: ['speech'],
    language: 'en-IN',
    speechTimeout: 'auto',
    action: actionUrl,
    method: 'POST'
  });

  gather.say(
    {
      voice: 'Polly.Aditi',
      language: 'en-IN'
    },
    aiTurn.responseText
  );

  // Fallback prompt if user hasn't spoken
  response.say(
    {
      voice: 'Polly.Aditi',
      language: 'en-IN'
    },
    'Are you still there? You can ask me any question about our mattress sizes, 0% EMI, or 100-night trial.'
  );

  const fallbackGather = response.gather({
    input: ['speech'],
    language: 'en-IN',
    speechTimeout: 'auto',
    action: actionUrl,
    method: 'POST'
  });

  response.say(
    {
      voice: 'Polly.Aditi',
      language: 'en-IN'
    },
    'Thank you for your time. Goodbye from The Sleep Company.'
  );
  response.hangup();

  return response.toString();
}

/**
 * Processes customer speech with Gemini and verified Sleep Company tools
 */
export async function processCustomerSpeechWithGemini(
  session: TwilioVoiceSession,
  customerSpeech: string,
  apiKey?: string
): Promise<StructuredAiTurnResponse> {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;

  // Format multi-turn conversation history for Gemini API
  const historyForGemini = session.turns.map((t) => [
    ...(t.customerSpeech ? [{ speaker: 'user' as const, text: t.customerSpeech }] : []),
    ...(t.aiResponseText ? [{ speaker: 'assistant' as const, text: t.aiResponseText }] : [])
  ]).flat();

  // Multi-turn summary of all previous conversation exchanges in this active call
  const priorTurnsSummary = session.turns.length > 0
    ? session.turns.map((t) => `Turn ${t.turn}: Customer asked "${t.customerSpeech || ''}" -> Assistant answered "${t.aiResponseText || ''}"`).join('\n')
    : `Turn 0: Greeting delivered ("${generateTwilioGreeting(session)}")`;

  // Construct context-enriched query prompt
  const leadContextPrompt = `You are on a telephone call for The Sleep Company.
Customer Name: ${session.customerName}
Customer Phone: ${session.customerPhone}
Product of Interest: ${session.product}
Customer Enquiry Signals: ${session.buyingSignals?.join(', ') || 'General mattress enquiry'}
Customer Note: ${session.notes || 'None'}
Conversation Turn: ${session.currentTurn} of ${session.maxTurns}

Conversation history so far in this call:
${priorTurnsSummary}

Customer just said on telephone: "${customerSpeech}"

CRITICAL INSTRUCTIONS:
1. Address the customer's question directly, accurately, and naturally in 2 to 3 spoken sentences suitable for phone audio.
2. NEVER output markdown symbols (no asterisks, bolding, dashes, or bullet lists) because they sound unnatural when read aloud.
3. If customer asks about available mattresses, options, or overall prices and discounts:
   - Call 'getAllMattresses'.
   - Present both models clearly:
     a) SmartGRID Ortho (Queen ₹8,490 / Single ₹5,990 / King ₹10,990) with doctor-approved back support.
     b) SmartGRID Luxe (Queen ₹13,390 / King ₹16,990) with 5-star hotel ultra-plush comfort and free contour pillow worth ₹2,499.
     c) Mention festive offer code FESTIVE1000 for flat ₹1,000 instant discount on orders above ₹10,000.
4. If customer asks about delivery fees or shipping:
   - Call 'getDeliveryPolicy'.
   - Clearly confirm that delivery is 100% Free (₹0 delivery charge) across India on all mattresses, 48-72h in metros, and 3-5 days pan-India.
5. If customer asks about prices, discounts, EMI, warranty, or trials:
   - Retrieve all numbers from verified tools (e.g. 'getCurrentPrice', 'getActiveOffers', 'getEMIOptions', 'getWarrantyPolicy', 'getTrialAndReturnPolicy'). Never guess unapproved numbers.
6. Speech-to-text resilience:
   - "auto grid" / "all the grid" = Ortho GRID mattress
   - "messages" / "matrices" = mattresses
   - "watch the amount" / "watch discount" = what is the amount / what discount
   - "Kannada options" = kind of options / mattress types
7. End your response with a friendly, conversational follow-up question (e.g. "Would you like me to send you the quotation or help you choose the right size?").
8. If customer says goodbye or indicates they are done, set shouldEndCall to true.
9. If customer requests a human agent or manager, set shouldHandoff to true and shouldEndCall to true.`;

  try {
    const geminiResult = await executeGeminiQuery(
      leadContextPrompt,
      activeKey,
      process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',
      historyForGemini
    );

    const rawText = geminiResult.text.trim();
    const toolsExecuted = (geminiResult.toolsExecuted || []).map((t) => t.toolName);

    // Check for closing or human handoff intent
    const lower = customerSpeech.toLowerCase();
    const isGoodbye = lower.includes('bye') || lower.includes('thank you that is all') || lower.includes('no thanks') || lower.includes('not interested');
    const isHandoff = lower.includes('human') || lower.includes('agent') || lower.includes('manager') || lower.includes('representative') || lower.includes('speak to someone');

    let responseText = rawText;
    let shouldEndCall = isGoodbye;
    let shouldHandoff = isHandoff;

    if (isHandoff) {
      responseText = "I will connect you with a senior sleep specialist right away. Arvind Rajan will follow up with you directly. Thank you for your time!";
      shouldEndCall = true;
    }

    return {
      intent: isHandoff ? 'handoff_human' : isGoodbye ? 'goodbye' : 'product_inquiry',
      responseText,
      shouldContinue: !shouldEndCall,
      shouldHandoff,
      shouldEndCall,
      toolsExecuted
    };
  } catch (err: any) {
    console.warn('[TwilioService] Gemini query error; falling back to verified catalog fallback:', err?.message || err);

    // Fallback response grounded in verified Sleep Company data
    const lower = customerSpeech.toLowerCase();
    let responseText = `Our ${session.product} features patented SmartGRID Japanese technology with a 100-night trial and 0% No-Cost EMI. Would you like me to send sizing options to your WhatsApp?`;

    if (
      lower.includes('mattress') ||
      lower.includes('option') ||
      lower.includes('message') ||
      lower.includes('model') ||
      lower.includes('discount') ||
      lower.includes('kannada')
    ) {
      responseText = `We offer two patented SmartGRID mattresses: the doctor-approved Ortho GRID starting at ₹8,490 Queen size, and the ultra-plush SmartGRID Luxe starting at ₹13,390 with a complimentary contour pillow worth ₹2,499. You can also use code FESTIVE1000 for ₹1,000 off orders over ₹10,000.`;
    } else if (
      lower.includes('delivery') ||
      lower.includes('shipping') ||
      lower.includes('fee') ||
      lower.includes('charge') ||
      lower.includes('free delivery')
    ) {
      responseText = `Delivery is 100% Free across 18,000+ PIN codes in India on all our mattresses, with express 48 to 72 hours delivery in metro cities like Bengaluru and zero shipping fees.`;
    } else if (
      lower.includes('store') ||
      lower.includes('bangalore') ||
      lower.includes('bengaluru') ||
      lower.includes('experience') ||
      lower.includes('location') ||
      lower.includes('visit')
    ) {
      responseText = `You can experience our SmartGRID mattresses in person at our Bangalore experience centers in Indiranagar, Koramangala, and Whitefield.`;
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('mrp') || lower.includes('amount') || lower.includes('watch')) {
      responseText = `The Ortho GRID Mattress starts at ₹8,490 for Queen size and ₹5,990 for Single size, with 10-year warranty, 100-night trial, and free doorstep delivery.`;
    } else if (lower.includes('emi') || lower.includes('loan') || lower.includes('finance')) {
      responseText = `Yes, we offer 0% interest No-Cost EMI starting from ₹1,415 per month with zero down payment across leading banks.`;
    } else if (lower.includes('trial') || lower.includes('return') || lower.includes('exchange')) {
      responseText = `You receive a risk-free 100-night trial at home. If it doesn't suit you, we offer a 100% money-back guarantee with free doorstep return pickup.`;
    } else if (lower.includes('bye') || lower.includes('thank') || lower.includes('not interested')) {
      return {
        intent: 'goodbye',
        responseText: 'Thank you for your time. Have a wonderful day from The Sleep Company!',
        shouldContinue: false,
        shouldHandoff: false,
        shouldEndCall: true,
        toolsExecuted: []
      };
    }

    return {
      intent: 'product_inquiry_fallback',
      responseText,
      shouldContinue: true,
      shouldHandoff: false,
      shouldEndCall: false,
      toolsExecuted: []
    };
  }
}

/**
 * Initiates an outbound Twilio call to customer
 */
export async function initiateTwilioOutboundCall(
  payload: {
    to: string;
    clientName?: string;
    leadId?: string;
    product?: string;
    value?: number;
    buyingSignals?: string[];
    notes?: string;
    isTrialSample?: boolean;
    sampleTwiMLUrl?: string;
    clearStale?: boolean;
    force?: boolean;
  },
  env: Record<string, string | undefined>
): Promise<{
  success: boolean;
  stage?: string;
  callSid?: string;
  sessionId?: string;
  status: string;
  to: string;
  from: string;
  isTrial: boolean;
  liveCallEnabled: boolean;
  isSimulation?: boolean;
  isTrialSample?: boolean;
  trialSampleUrl?: string;
  trialLimitation?: boolean;
  rejectedParameters?: string[];
  troubleshooting?: string;
  message?: string;
  error?: string;
}> {
  const creds = validateTwilioCredentials(env);
  if (!creds.valid) {
    return {
      success: false,
      status: 'failed',
      to: maskPhoneNumber(payload.to),
      from: creds.fromNumber || '[NONE]',
      isTrial: creds.isTrial,
      liveCallEnabled: false,
      error: 'TWILIO_CREDENTIALS_INVALID',
      message: creds.errors.join(' ')
    };
  }

  const normalizedTo = normalizePhoneNumber(payload.to);

  // Concurrency guard: reject simultaneous initiation requests for the same recipient
  if (inFlightInitiations.has(normalizedTo)) {
    console.warn(`[TwilioService] Concurrent call initiation rejected for ${maskPhoneNumber(normalizedTo)}: request already in flight`);
    return {
      success: false,
      stage: 'idle',
      status: 'rejected',
      callSid: undefined,
      to: maskPhoneNumber(normalizedTo),
      from: creds.fromNumber || '[NONE]',
      isTrial: creds.isTrial,
      liveCallEnabled: false,
      error: 'CONCURRENT_CALL_INITIATION',
      message: `A call initiation is currently in progress for ${maskPhoneNumber(normalizedTo)}. Please wait a few seconds before trying again.`,
      troubleshooting: 'Concurrent requests for the same recipient are serialized to prevent accidental duplicate telephone calls.'
    };
  }

  inFlightInitiations.add(normalizedTo);
  try {
    const allowCheck = isAllowedTwilioRecipient(normalizedTo, env);

    if (!allowCheck.allowed) {
      return {
        success: false,
        stage: 'idle',
        status: 'rejected',
        callSid: undefined,
        to: maskPhoneNumber(normalizedTo),
        from: creds.fromNumber!,
        isTrial: creds.isTrial,
        liveCallEnabled: false,
        error: 'RECIPIENT_NOT_ALLOWED',
        message: allowCheck.reason,
        troubleshooting: `In Twilio trial accounts, you must verify destination numbers in Twilio Console > Phone Numbers > Verified Caller IDs, or add them to TWILIO_ALLOWED_TO_NUMBERS.`
      };
    }

    // Pre-call validation: Check if a genuine active call is ongoing, clearing stale sessions automatically
    // Strictly preserve genuine active calls unless explicitly forced by user
    const activeCheck = await verifyAndClearStaleActiveCall(
      normalizedTo,
      env,
      Boolean(payload.force)
    );

    if (activeCheck.hasActiveCall) {
      const isVerificationError = activeCheck.liveTwilioStatus === 'verification_error';
      return {
        success: false,
        stage: 'idle',
        status: 'rejected',
        callSid: undefined,
        to: maskPhoneNumber(normalizedTo),
        from: creds.fromNumber!,
        isTrial: creds.isTrial,
        liveCallEnabled: false,
        error: isVerificationError ? 'TWILIO_VERIFICATION_UNAVAILABLE' : 'DUPLICATE_CALL_IN_PROGRESS',
        message: isVerificationError
          ? `Unable to verify call status with Twilio (${activeCheck.verificationError || 'network error'}). Lock preserved for safety.`
          : `An active call session is already ongoing for ${maskPhoneNumber(normalizedTo)}. Please wait for the current call to conclude or clear the session lock.`,
        troubleshooting: isVerificationError
          ? 'Twilio REST API status check encountered a temporary network or API error. The active call lock was preserved to prevent accidental duplicate calls. You can click "Clear Stale Session" if you are certain the call has ended.'
          : 'If the previous call has already finished on your telephone, click "Clear Stale Session" to release the local active session.'
      };
    }

    // Create session
    const maxTurns = parseInt(env.TWILIO_MAX_CONVERSATION_TURNS || '6', 10);
    const isTrialSample = Boolean(payload.isTrialSample || env.TWILIO_USE_SAMPLE_URL === 'true');
    const sampleTwiMLUrl = payload.sampleTwiMLUrl || 'http://demo.twilio.com/docs/voice.xml';

    const session = createTwilioVoiceSession({
      leadId: payload.leadId || 'lead-1',
      customerName: payload.clientName || 'Valued Customer',
      customerPhone: normalizedTo,
      product: payload.product || 'Ortho GRID Mattress',
      value: payload.value,
      buyingSignals: payload.buyingSignals,
      notes: payload.notes,
      maxTurns
    });
    session.isTrialSample = isTrialSample;
    session.trialSampleUrl = isTrialSample ? sampleTwiMLUrl : undefined;

    const webhookBaseUrl = (env.TWILIO_WEBHOOK_BASE_URL || 'https://YOUR-NGROK-DOMAIN.ngrok-free.app').replace(/\/+$/, '');
    const voiceWebhookUrl = `${webhookBaseUrl}${env.TWILIO_VOICE_WEBHOOK_PATH || '/api/twilio/voice'}?sessionId=${encodeURIComponent(session.sessionId)}`;
    const statusCallbackUrl = `${webhookBaseUrl}${env.TWILIO_STATUS_WEBHOOK_PATH || '/api/twilio/status'}?sessionId=${encodeURIComponent(session.sessionId)}`;
    const effectiveVoiceUrl = isTrialSample ? sampleTwiMLUrl : voiceWebhookUrl;

    const liveCallEnabled = env.TWILIO_ENABLE_LIVE_CALLS === 'true';

    console.log(`[TwilioService] Initiating Outbound call: To=${maskPhoneNumber(normalizedTo)}, From=${maskPhoneNumber(env.TWILIO_FROM_NUMBER!)}, SessionId=${session.sessionId}, Live=${liveCallEnabled}, SampleMode=${isTrialSample}`);

    if (!liveCallEnabled) {
      // Simulated outbound call progression (Safety Mode)
      // Use clear simulation prefix to avoid confusing with real Twilio Call SIDs
      const simulatedCallSid = 'CASIM_' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
      bindTwilioCallSid(session.sessionId, simulatedCallSid);
      updateTwilioSessionStatus(session.sessionId, 'queued', { callSid: simulatedCallSid, startedAt: Date.now() });

      // Transition to ringing after short delay
      setTimeout(() => {
        const s = getTwilioSession(session.sessionId);
        if (s && s.status === 'queued') {
          updateTwilioSessionStatus(session.sessionId, 'ringing');
        }
      }, 1500);

      return {
        success: true,
        stage: 'call_created',
        callSid: simulatedCallSid,
        sessionId: session.sessionId,
        status: 'queued',
        to: maskPhoneNumber(normalizedTo),
        from: maskPhoneNumber(env.TWILIO_FROM_NUMBER!),
        isTrial: creds.isTrial,
        liveCallEnabled: false,
        isSimulation: true,
        isTrialSample,
        trialSampleUrl: isTrialSample ? sampleTwiMLUrl : undefined,
        message: isTrialSample
          ? 'Twilio call initiated in Trial Sample Simulation mode (http://demo.twilio.com/docs/voice.xml). Customer phone is safe. NOTE: This is a static carrier test and NOT an AI conversation.'
          : 'Twilio call initiated in Safety Simulation mode (TWILIO_ENABLE_LIVE_CALLS=false). Customer phone is safe.'
      };
    }

    // Real Twilio Outbound Call via Programmable Voice API
    try {
      const client = twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
      const maxDuration = parseInt(env.TWILIO_MAX_CALL_DURATION_SECONDS || '600', 10);

      // Build call creation options according to account tier:
      // Trial accounts strictly disallow statusCallbackEvent and timeLimit (HTTP 400 rejection).
      // Upgraded accounts unlock the full parameter set.
      const callOptions: any = {
        from: env.TWILIO_FROM_NUMBER!,
        to: normalizedTo,
        url: effectiveVoiceUrl
      };

      if (!creds.isTrial) {
        callOptions.statusCallback = statusCallbackUrl;
        callOptions.statusCallbackMethod = 'POST';
        callOptions.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
        callOptions.timeLimit = maxDuration;
      }

      const call = await client.calls.create(callOptions);
      logRawTwilioResponse('client.calls.create', call, { callSid: call.sid, to: normalizedTo, sessionId: session.sessionId });

      bindTwilioCallSid(session.sessionId, call.sid);
      updateTwilioSessionStatus(session.sessionId, 'queued', { callSid: call.sid, startedAt: Date.now() });

      return {
        success: true,
        stage: 'call_created',
        callSid: call.sid,
        sessionId: session.sessionId,
        status: call.status || 'queued',
        to: maskPhoneNumber(normalizedTo),
        from: maskPhoneNumber(env.TWILIO_FROM_NUMBER!),
        isTrial: creds.isTrial,
        liveCallEnabled: true,
        isSimulation: false,
        isTrialSample,
        trialSampleUrl: isTrialSample ? sampleTwiMLUrl : undefined,
        message: isTrialSample
          ? `Twilio official carrier test call created: ${call.sid}. Dispatching static demo audio (${sampleTwiMLUrl}) to customer mobile. NOTE: This is a static carrier test and NOT an AI conversation.`
          : `Twilio outbound call successfully created: ${call.sid}. Dispatching to customer mobile.`
      };
    } catch (err: any) {
      logRawTwilioResponse('client.calls.create', err, { to: normalizedTo, sessionId: session.sessionId });
      console.error('[TwilioService] Outbound call API error:', err?.message || err);
      updateTwilioSessionStatus(session.sessionId, 'failed', { providerError: err?.message || 'Twilio API failure' });

      const isTrialParamError =
        typeof err?.message === 'string' &&
        (err.message.toLowerCase().includes('trial accounts have limited parameter access') ||
         err.message.toLowerCase().includes('invalid or disallowed parameters'));

      let troubleshooting = 'Verify your Twilio credentials, verified numbers, and international permissions in Twilio Console.';
      if (isTrialParamError || creds.isTrial) {
        troubleshooting = 'Trial Account Parameter Limitation: Advanced parameters (such as statusCallbackEvent, timeLimit, custom SIP/recording) are restricted on free trial accounts. Upgrading your account unlocks full parameter access.';
      } else if (err?.code === 21216) {
        troubleshooting = 'Trial account limitation: The destination number is not verified in your Twilio Console.';
      } else if (err?.code === 21215) {
        troubleshooting = 'Geographic Permissions: India (+91) voice calling must be enabled under Twilio Console > Voice > Settings > Geo permissions.';
      } else if (err?.code === 21403) {
        troubleshooting = 'Webhook URL error: Ensure TWILIO_WEBHOOK_BASE_URL points to an active public HTTPS tunnel (ngrok).';
      }

      return {
        success: false,
        stage: 'request_accepted', // Stage 1 was accepted, Stage 2 (call creation) failed
        status: 'rejected',
        callSid: undefined, // Never display a fake or successful Call SID on failure
        sessionId: session.sessionId,
        to: maskPhoneNumber(normalizedTo),
        from: maskPhoneNumber(env.TWILIO_FROM_NUMBER!),
        isTrial: creds.isTrial,
        trialLimitation: isTrialParamError,
        rejectedParameters: isTrialParamError ? ['statusCallbackEvent', 'timeLimit'] : [],
        liveCallEnabled: true,
        isSimulation: false,
        error: `TWILIO_${err?.code || '400_REJECTED'}`,
        message: err?.message || 'Twilio call creation failed',
        troubleshooting
      };
    }
  } finally {
    inFlightInitiations.delete(normalizedTo);
  }
}

/**
 * Webhook: Initial Voice Webhook (POST /api/twilio/voice)
 */
export async function handleTwilioVoiceWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'text/xml');

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const sessionId = url.searchParams.get('sessionId') || '';

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const params = new URLSearchParams(bodyStr);
      const callSid = params.get('CallSid') || '';
      const direction = params.get('Direction') || 'outbound-api';
      const fromNumber = params.get('From') || '';
      const toNumber = params.get('To') || '';

      let session = getTwilioSession(sessionId) || (callSid ? getTwilioSession(callSid) : undefined);

      const isChinmay =
        fromNumber.includes('7204104491') ||
        toNumber.includes('7204104491') ||
        (session && session.customerPhone.includes('7204104491'));

      if (!session) {
        const callerPhone = (toNumber && !toNumber.includes('17372508034') && !toNumber.includes('17075328034')) ? toNumber : fromNumber || '+917204104491';
        const callerName = isChinmay ? 'Chinmay' : 'Valued Customer';
        console.log(`[TwilioService:Voice] ${direction === 'inbound' ? 'Inbound customer call' : 'Session not found for'} CallSid=${callSid}, From=${maskPhoneNumber(fromNumber)}, To=${maskPhoneNumber(toNumber)}. Initializing interactive Gemini Voice AI session for ${callerName}.`);

        session = createTwilioVoiceSession({
          leadId: direction === 'inbound' ? 'inbound-call' : 'lead-1',
          customerName: callerName,
          customerPhone: callerPhone,
          product: 'Ortho GRID'
        });
        if (callSid) bindTwilioCallSid(session.sessionId, callSid);
      } else {
        if (isChinmay && (!session.customerName || session.customerName.toLowerCase() === 'valued customer' || session.customerName.toLowerCase() === 'customer' || session.customerName.toLowerCase() === 'there')) {
          session.customerName = 'Chinmay';
        }
      }

      if (callSid && !session.callSid) {
        bindTwilioCallSid(session.sessionId, callSid);
      }

      updateTwilioSessionStatus(session.sessionId, 'customer_answered', {
        answeredAt: Date.now(),
        lastAiResponse: generateTwilioGreeting(session)
      });

      console.log(`[TwilioService:Voice] Customer answered for ${session.customerName} (${maskPhoneNumber(session.customerPhone)}). Sending initial TwiML greeting.`);

      const webhookBaseUrl = (env.TWILIO_WEBHOOK_BASE_URL || `https://${req.headers.host}`).replace(/\/+$/, '');
      const twiml = generateInitialTwiML(session, webhookBaseUrl);

      res.statusCode = 200;
      res.end(twiml);
    } catch (err: any) {
      console.error('[TwilioService:Voice] Error handling voice webhook:', err);
      const response = new VoiceResponse();
      response.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Welcome to The Sleep Company. Connecting your assistant.');
      response.hangup();
      res.statusCode = 200;
      res.end(response.toString());
    }
  });
}

/**
 * Serves an explicit static TwiML audio sample for trial carrier testing (Non-AI)
 */
export function handleTwilioSampleTwiml(
  _req: IncomingMessage,
  res: ServerResponse
) {
  res.setHeader('Content-Type', 'text/xml');
  const response = new VoiceResponse();
  response.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    'This is an official Twilio carrier connectivity test from The Sleep Company. Your telephone line is functioning properly. This is a non-AI sample verification call.'
  );
  response.play('http://demo.twilio.com/docs/classic.mp3');
  response.hangup();
  res.statusCode = 200;
  res.end(response.toString());
}

/**
 * Webhook: Multi-Turn Conversation Webhook (POST /api/twilio/ai-turn)
 */
export async function handleTwilioAiTurnWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'text/xml');

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const sessionId = url.searchParams.get('sessionId') || '';

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const params = new URLSearchParams(bodyStr);
      const callSid = params.get('CallSid') || '';
      const speechResult = (params.get('SpeechResult') || '').trim();
      const confidence = params.get('Confidence') || '';

      const session = getTwilioSession(sessionId) || (callSid ? getTwilioSession(callSid) : undefined);

      if (!session) {
        console.warn(`[TwilioService:AiTurn] Session not found for sessionId=${sessionId}, callSid=${callSid}`);
        const response = new VoiceResponse();
        response.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Thank you for calling The Sleep Company. Have a great day!');
        response.hangup();
        res.statusCode = 200;
        res.end(response.toString());
        return;
      }

      console.log(`[TwilioService:AiTurn] Received SpeechResult from ${session.customerName}: "${speechResult}" (Confidence: ${confidence})`);

      const webhookBaseUrl = (env.TWILIO_WEBHOOK_BASE_URL || `https://${req.headers.host}`).replace(/\/+$/, '');

      // Handle empty / no speech detected
      if (!speechResult) {
        console.log(`[TwilioService:AiTurn] Empty speech detected for turn ${session.currentTurn}. Prompting clarification.`);
        const response = new VoiceResponse();
        const actionUrl = `${webhookBaseUrl}/api/twilio/ai-turn?sessionId=${encodeURIComponent(session.sessionId)}`;

        const gather = response.gather({
          input: ['speech'],
          language: 'en-IN',
          speechTimeout: 'auto',
          action: actionUrl,
          method: 'POST'
        });

        gather.say({ voice: 'Polly.Aditi', language: 'en-IN' }, "I didn't quite catch that. Could you please repeat your question?");
        response.say({ voice: 'Polly.Aditi', language: 'en-IN' }, "We didn't receive any response. Feel free to call us back. Goodbye from The Sleep Company!");
        response.hangup();

        res.statusCode = 200;
        res.end(response.toString());
        return;
      }

      // Customer spoke: update state and increment turn
      updateTwilioSessionStatus(session.sessionId, 'processing', { lastCustomerSpeech: speechResult });
      session.currentTurn += 1;

      // Process question with Gemini and verified Sleep Company tools
      const aiResponse = await processCustomerSpeechWithGemini(session, speechResult, env.GEMINI_API_KEY);

      session.turns.push({
        turn: session.currentTurn,
        customerSpeech: speechResult,
        aiResponseText: aiResponse.responseText,
        intent: aiResponse.intent,
        toolsExecuted: aiResponse.toolsExecuted,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      updateTwilioSessionStatus(session.sessionId, aiResponse.shouldEndCall ? 'completed' : 'ai_speaking', {
        lastAiResponse: aiResponse.responseText
      });

      const twiml = generateAiTurnTwiML(session, aiResponse, webhookBaseUrl);
      res.statusCode = 200;
      res.end(twiml);
    } catch (err: any) {
      console.error('[TwilioService:AiTurn] Error handling AI turn:', err);
      const response = new VoiceResponse();
      response.say(
        { voice: 'Polly.Aditi', language: 'en-IN' },
        'Our Sleep Company showroom team is available to assist you. Arvind Rajan will contact you shortly. Goodbye!'
      );
      response.hangup();
      res.statusCode = 200;
      res.end(response.toString());
    }
  });
}

/**
 * Webhook: Call Status Callback Webhook (POST /api/twilio/status)
 */
export async function handleTwilioStatusCallbackWebhook(
  req: IncomingMessage,
  res: ServerResponse,
  _env: Record<string, string | undefined>
) {
  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', () => {
    try {
      const params = new URLSearchParams(bodyStr);
      const callSid = params.get('CallSid') || '';
      const callStatus = (params.get('CallStatus') || '').toLowerCase();
      const callDuration = parseInt(params.get('CallDuration') || '0', 10);
      const recordingUrl = params.get('RecordingUrl') || '';

      console.log(`[TwilioService:Status] Received status callback for CallSid=${callSid}: status=${callStatus}, duration=${callDuration}s`);

      const session = getTwilioSession(callSid);
      if (session) {
        let mappedStatus: TwilioVoiceSession['status'] = 'in-progress';
        if (callStatus === 'initiated' || callStatus === 'queued') mappedStatus = 'queued';
        else if (callStatus === 'ringing') mappedStatus = 'ringing';
        else if (callStatus === 'in-progress') mappedStatus = 'in-progress';
        else if (callStatus === 'completed') mappedStatus = 'completed';
        else if (callStatus === 'busy') mappedStatus = 'busy';
        else if (callStatus === 'no-answer') mappedStatus = 'no-answer';
        else if (callStatus === 'failed') mappedStatus = 'failed';
        else if (callStatus === 'canceled') mappedStatus = 'canceled';

        if (TERMINAL_TWILIO_STATUSES.has(mappedStatus)) {
          clearTwilioSession(session.sessionId, `Twilio statusCallback: ${callStatus}`, mappedStatus);
          if (callDuration) session.durationSeconds = callDuration;
          if (recordingUrl) session.recordingUrl = recordingUrl;
        } else {
          updateTwilioSessionStatus(session.sessionId, mappedStatus, {
            durationSeconds: callDuration || session.durationSeconds,
            recordingUrl: recordingUrl || session.recordingUrl
          });
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/xml');
      res.end('<Response></Response>');
    } catch (err: any) {
      console.error('[TwilioService:Status] Error in status callback:', err);
      res.statusCode = 200;
      res.end('<Response></Response>');
    }
  });
}

/**
 * Endpoint: Frontend Poll Endpoint (GET /api/twilio/call-status)
 */
export async function handleTwilioCallStatusQuery(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const callSid = url.searchParams.get('callSid') || '';
  const sessionId = url.searchParams.get('sessionId') || '';

  const session = (sessionId ? getTwilioSession(sessionId) : undefined) || (callSid ? getTwilioSession(callSid) : undefined);

  if (!session) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: false,
        status: 'idle',
        message: 'No active Twilio session found'
      })
    );
    return;
  }

  // Periodic live Twilio REST API synchronization:
  // If session is active and has a real Twilio SID, check Twilio if >3s since last check
  if (
    !TERMINAL_TWILIO_STATUSES.has(session.status) &&
    session.callSid &&
    session.callSid.startsWith('CA') &&
    !session.callSid.startsWith('CASIM_') &&
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    Date.now() - (session.lastTwilioCheckAt || 0) > 3000
  ) {
    session.lastTwilioCheckAt = Date.now();
    try {
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      const liveCall = await client.calls(session.callSid).fetch();
      logRawTwilioResponse('client.calls.fetch:pollSync', liveCall, { callSid: session.callSid, sessionId: session.sessionId });
      const liveStatus = (liveCall.status || '').toLowerCase();
      if (TERMINAL_TWILIO_STATUSES.has(liveStatus)) {
        console.log(`[TwilioService:CallStatus] Discovered call ${session.callSid} finished on Twilio (${liveStatus}). Auto-syncing local session.`);
        clearTwilioSession(session.sessionId, `Twilio live call completed: ${liveStatus}`, 'completed');
        if (liveCall.duration) {
          session.durationSeconds = parseInt(liveCall.duration, 10);
        }
      }
    } catch (err: any) {
      logRawTwilioResponse('client.calls.fetch:pollSync', err, { callSid: session.callSid, sessionId: session.sessionId });
      console.warn('[TwilioService:CallStatus] Live poll check warning:', err?.message || err);
    }
  }

  // Calculate live elapsed seconds if active
  let duration = session.durationSeconds;
  if ((session.status === 'in-progress' || session.status === 'customer_answered' || session.status === 'ai_speaking' || session.status === 'listening' || session.status === 'processing') && session.answeredAt) {
    duration = Math.round((Date.now() - session.answeredAt) / 1000);
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      success: true,
      sessionId: session.sessionId,
      callSid: session.callSid,
      status: session.status,
      customerName: session.customerName,
      product: session.product,
      currentTurn: session.currentTurn,
      maxTurns: session.maxTurns,
      duration,
      transcriptSnippet: session.lastAiResponse || session.lastCustomerSpeech,
      transcript: session.turns,
      recordingUrl: session.recordingUrl,
      providerError: session.providerError
    })
  );
}

/**
 * Terminates a Twilio telephone call via REST API and clears the active session lock.
 */
export async function terminateTwilioCall(
  params: {
    callSid?: string;
    sessionId?: string;
    phone?: string;
  },
  env: Record<string, string | undefined>
): Promise<{
  success: boolean;
  callSid?: string;
  sessionId?: string;
  status: string;
  message: string;
}> {
  const targetSid = (params.callSid || '').trim();
  const targetSessionId = (params.sessionId || '').trim();
  const targetPhone = params.phone ? normalizePhoneNumber(params.phone) : '';

  let session = targetSessionId ? getTwilioSession(targetSessionId) : undefined;
  if (!session && targetSid) {
    session = getTwilioSession(targetSid);
  }
  if (!session && targetPhone) {
    for (const s of activeSessions.values()) {
      if (s.customerPhone === targetPhone && !TERMINAL_TWILIO_STATUSES.has(s.status)) {
        session = s;
        break;
      }
    }
  }

  const effectiveCallSid = targetSid || session?.callSid;
  const isRealTwilioSid =
    effectiveCallSid &&
    effectiveCallSid.startsWith('CA') &&
    !effectiveCallSid.startsWith('CASIM_');

  let twilioTerminated = false;
  let twilioNotice: string | undefined;

  if (isRealTwilioSid && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    try {
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      const updatedCall = await client.calls(effectiveCallSid).update({ status: 'completed' });
      twilioTerminated = true;
      logRawTwilioResponse('client.calls.update:terminate', updatedCall, { callSid: effectiveCallSid });
      console.log(`[TwilioService] Twilio REST API disconnected call ${effectiveCallSid}: status=${updatedCall.status}`);
    } catch (err: any) {
      logRawTwilioResponse('client.calls.update:terminate', err, { callSid: effectiveCallSid });
      console.warn(`[TwilioService] Notice while disconnecting call ${effectiveCallSid} via Twilio REST API: ${err?.message || err}`);
      twilioNotice = err?.message;
    }
  }

  if (session) {
    clearTwilioSession(session.sessionId, 'Terminated by frontline specialist via End Call', 'completed');
  }

  if (targetPhone) {
    for (const s of activeSessions.values()) {
      if (s.customerPhone === targetPhone && !TERMINAL_TWILIO_STATUSES.has(s.status)) {
        clearTwilioSession(s.sessionId, 'Terminated by frontline specialist (phone cleanup)', 'completed');
      }
    }
  }

  return {
    success: true,
    callSid: effectiveCallSid || undefined,
    sessionId: session?.sessionId || targetSessionId || undefined,
    status: 'completed',
    message: twilioTerminated
      ? `Twilio call ${effectiveCallSid} disconnected via Twilio REST API and session lock released.`
      : `Active call session lock released.${twilioNotice ? ` (${twilioNotice})` : ''}`
  };
}

/**
 * Endpoint: End Call Trigger (POST /api/twilio/end-call)
 */
export async function handleTwilioEndCallRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      let payload: any = {};
      if (bodyStr) {
        try {
          payload = JSON.parse(bodyStr);
        } catch {
          const params = new URLSearchParams(bodyStr);
          payload = {
            callSid: params.get('callSid'),
            sessionId: params.get('sessionId'),
            phone: params.get('phone')
          };
        }
      }
      const result = await terminateTwilioCall(payload, env);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err: any) {
      console.error('[TwilioService:EndCall] Error ending call:', err);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: 'END_CALL_FAILED',
          message: err?.message || 'Failed to terminate Twilio call'
        })
      );
    }
  });
}

/**
 * Endpoint: Frontend Outbound Call Trigger (POST /api/twilio/call)
 */
export async function handleTwilioCallRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  let bodyStr = '';
  req.on('data', (chunk) => {
    bodyStr += chunk;
  });

  req.on('end', async () => {
    try {
      const payload = bodyStr ? JSON.parse(bodyStr) : {};
      const result = await initiateTwilioOutboundCall(payload, env);

      res.statusCode = result.success ? 200 : 400;
      res.end(JSON.stringify(result));
    } catch (err: any) {
      console.error('[TwilioService:Call] Internal error:', err);
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          success: false,
          error: 'TWILIO_INTERNAL_ERROR',
          message: err?.message || 'Internal error in Twilio call dispatch'
        })
      );
    }
  });
}
