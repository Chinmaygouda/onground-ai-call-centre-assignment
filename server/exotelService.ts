import { IncomingMessage, ServerResponse } from 'http';

export interface ExotelConfig {
  accountSid?: string;
  apiKey?: string;
  apiToken?: string;
  subdomain?: string;
  callerId?: string;
  agentPhone?: string;
}

export function normalizePhone(rawPhone: string): { e164: string; national: string; isValid: boolean; digits: string } {
  if (!rawPhone) {
    return { e164: '', national: '', isValid: false, digits: '' };
  }
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  let digits = cleaned.replace(/\+/g, '');
  
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  const isValid = digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
  const e164 = `+91${digits}`;
  const national = `0${digits}`;

  return { e164, national, isValid, digits };
}

// Memory cache for recent webhook callbacks
const callbackCache = new Map<string, {
  callSid: string;
  status: string;
  duration?: number;
  recordingUrl?: string;
  updatedAt: string;
}>();

export function getCachedCallback(callSid: string) {
  return callbackCache.get(callSid) || null;
}

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function parseFormBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const result: Record<string, string> = {};
        params.forEach((v, k) => {
          result[k] = v;
        });
        resolve(result);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export async function handleExotelCallRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported' }));
    return;
  }

  const payload = await parseJsonBody(req);
  const to = typeof payload.to === 'string' ? payload.to.trim() : '';
  const clientName = typeof payload.clientName === 'string' ? payload.clientName.trim() : 'Chinmaygouda';

  const accountSid = env.EXOTEL_ACCOUNT_SID || process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = env.EXOTEL_API_KEY || process.env.EXOTEL_API_KEY;
  const apiToken = env.EXOTEL_API_TOKEN || process.env.EXOTEL_API_TOKEN;
  const subdomain = env.EXOTEL_SUBDOMAIN || process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const callerId = env.EXOTEL_CALLER_ID || process.env.EXOTEL_CALLER_ID;
  const agentPhone = env.EXOTEL_AGENT_PHONE || process.env.EXOTEL_AGENT_PHONE;

  // 1. Employee Phone Verification
  if (!agentPhone || !agentPhone.trim()) {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'EMPLOYEE_PHONE_REQUIRED',
      message: 'Employee phone number (EXOTEL_AGENT_PHONE) is not configured in server environment variables. An employee phone number is strictly required to receive Leg A of the call.'
    }));
    return;
  }

  // 2. Client Phone Verification
  if (!to) {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'CLIENT_PHONE_REQUIRED',
      message: 'Client phone number is required to place an outbound call.'
    }));
    return;
  }

  const clientNormalized = normalizePhone(to);
  const agentNormalized = normalizePhone(agentPhone);

  if (!clientNormalized.isValid) {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'INVALID_CLIENT_PHONE',
      message: `Invalid client phone number: "${to}". Must be a valid 10-digit Indian mobile number (e.g. +917204104491).`
    }));
    return;
  }

  if (!agentNormalized.isValid) {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'INVALID_EMPLOYEE_PHONE',
      message: `Configured employee phone number "${agentPhone}" is invalid. Must be a valid 10-digit Indian phone number.`
    }));
    return;
  }

  // 3. Self-Call Prevention Guard
  if (clientNormalized.digits === agentNormalized.digits) {
    res.statusCode = 400;
    res.end(JSON.stringify({
      success: false,
      error: 'SELF_CALL_PROHIBITED',
      message: `Employee phone and Client phone cannot be identical (${clientNormalized.e164}). Telephony providers cannot bridge a telephone call to itself. Please configure a distinct EXOTEL_AGENT_PHONE.`
    }));
    return;
  }

  // 4. Exotel API Credentials Check
  if (!accountSid || !apiKey || !apiToken || !callerId) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      success: false,
      configured: false,
      error: 'CREDENTIALS_MISSING',
      message: 'Exotel API credentials are not yet configured in server environment variables. Please add EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID to your .env file or Netlify settings.',
      requiredVariables: [
        'EXOTEL_ACCOUNT_SID',
        'EXOTEL_API_KEY',
        'EXOTEL_API_TOKEN',
        'EXOTEL_CALLER_ID',
        'EXOTEL_AGENT_PHONE'
      ],
      details: {
        hasAccountSid: Boolean(accountSid),
        hasApiKey: Boolean(apiKey),
        hasApiToken: Boolean(apiToken),
        hasCallerId: Boolean(callerId),
        hasAgentPhone: Boolean(agentPhone)
      }
    }));
    return;
  }

  // 5. Build Exotel Connect API Request (Official Exotel Connect Two Numbers)
  try {
    const exotelUrl = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect`;
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString('base64')}`;

    const sanitizedCallerId = callerId.trim().replace(/[\s-]/g, '');

    const formParams = new URLSearchParams();
    formParams.append('From', agentNormalized.e164);
    formParams.append('To', clientNormalized.e164);
    formParams.append('CallerId', sanitizedCallerId);
    formParams.append('CallType', 'trans');
    formParams.append('TimeLimit', '14400'); // 4 hours max
    formParams.append('TimeOut', '35'); // 35 sec ring timeout
    formParams.append('Record', 'true');
    formParams.append('CustomField', `client=${clientName};phone=${clientNormalized.digits};app=onground_callcentre`);

    console.log(`[ExotelService] Dispatching Connect API call to https://${subdomain}: From=${agentNormalized.e164} To=${clientNormalized.e164} CallerId=${sanitizedCallerId}`);

    const response = await fetch(exotelUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formParams.toString()
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.error('[ExotelService] Exotel API error:', response.status, data);
      res.statusCode = 502;
      res.end(JSON.stringify({
        success: false,
        error: 'EXOTEL_API_ERROR',
        providerStatus: response.status,
        message: data?.RestException?.Message || data?.message || 'Exotel rejected call initiation request.',
        details: data?.RestException || data
      }));
      return;
    }

    const callSid = data?.Call?.Sid || `exo_${Date.now()}`;
    const rawStatus = data?.Call?.Status || 'in-progress';

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      callSid,
      status: 'calling_employee',
      rawStatus,
      clientName,
      clientPhone: clientNormalized.e164,
      agentPhone: agentNormalized.e164,
      callerId,
      createdAt: data?.Call?.DateCreated || new Date().toISOString()
    }));
  } catch (err: any) {
    console.error('[ExotelService] Network/Server exception:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      error: 'SERVER_ERROR',
      message: err?.message || 'Internal error dispatching Exotel call request.'
    }));
  }
}

export async function handleExotelStatusRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlObj = new URL(req.url || '/', 'http://localhost');
  const callSid = urlObj.searchParams.get('callSid');

  if (!callSid) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'CALL_SID_REQUIRED', message: 'Query parameter callSid is required.' }));
    return;
  }

  // Check memory cache for instant webhook callback update
  const cached = getCachedCallback(callSid);

  const accountSid = env.EXOTEL_ACCOUNT_SID || process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = env.EXOTEL_API_KEY || process.env.EXOTEL_API_KEY;
  const apiToken = env.EXOTEL_API_TOKEN || process.env.EXOTEL_API_TOKEN;
  const subdomain = env.EXOTEL_SUBDOMAIN || process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';

  if (!accountSid || !apiKey || !apiToken) {
    // If credentials are not configured, return cached callback or safe mock status
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      callSid,
      status: cached ? cached.status : 'calling_employee',
      duration: cached?.duration || 0,
      recordingUrl: cached?.recordingUrl || null,
      isConfigured: false
    }));
    return;
  }

  try {
    const exotelUrl = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/${callSid}`;
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString('base64')}`;

    const response = await fetch(exotelUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (cached) {
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          callSid,
          status: cached.status,
          duration: cached.duration || 0,
          recordingUrl: cached.recordingUrl || null
        }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        callSid,
        status: 'calling_client',
        duration: 0
      }));
      return;
    }

    const data: any = await response.json();
    const callData = data?.Call || {};
    const rawStatus = (callData.Status || '').toLowerCase();

    // Map Exotel provider status to app lifecycle
    let status = 'calling_client';
    if (rawStatus === 'completed') {
      status = 'completed';
    } else if (rawStatus === 'busy') {
      status = 'busy';
    } else if (rawStatus === 'no-answer') {
      status = 'no_answer';
    } else if (rawStatus === 'failed') {
      status = 'failed';
    } else if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
      status = 'cancelled';
    } else if (rawStatus === 'in-progress') {
      status = 'connected';
    } else if (rawStatus === 'ringing') {
      status = 'calling_client';
    }

    const duration = Number(callData.Duration) || 0;
    const recordingUrl = (callData.RecordingUrl && typeof callData.RecordingUrl === 'string' && callData.RecordingUrl.startsWith('http'))
      ? callData.RecordingUrl
      : null;

    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      callSid,
      status,
      rawStatus,
      duration,
      startTime: callData.StartTime || null,
      endTime: callData.EndTime || null,
      recordingUrl,
      isConfigured: true
    }));
  } catch (err: any) {
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      callSid,
      status: cached ? cached.status : 'calling_client',
      duration: cached?.duration || 0,
      recordingUrl: cached?.recordingUrl || null
    }));
  }
}

export async function handleExotelCallbackRequest(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string | undefined>
) {
  res.setHeader('Content-Type', 'application/json');

  const formBody = await parseFormBody(req);
  const callSid = formBody.CallSid || formBody.call_sid;
  const status = formBody.Status || formBody.status || 'completed';
  const duration = Number(formBody.ConversationDuration || formBody.Duration || 0);
  const recordingUrl = formBody.RecordingUrl || null;
  const accountSid = formBody.AccountSid || formBody.account_sid;

  const expectedSid = env.EXOTEL_ACCOUNT_SID || process.env.EXOTEL_ACCOUNT_SID;
  if (expectedSid && accountSid && expectedSid !== accountSid) {
    console.warn('[ExotelService:Webhook] AccountSid mismatch. Discarding untrusted callback.');
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'ACCOUNT_MISMATCH' }));
    return;
  }

  if (callSid) {
    callbackCache.set(callSid, {
      callSid,
      status: status.toLowerCase() === 'completed' ? 'completed' : status.toLowerCase(),
      duration,
      recordingUrl: recordingUrl && recordingUrl.startsWith('http') ? recordingUrl : undefined,
      updatedAt: new Date().toISOString()
    });
    console.log(`[ExotelService:Webhook] Stored status for ${callSid}: status=${status}, duration=${duration}`);
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Callback received and logged' }));
}
