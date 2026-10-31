/**
 * Netlify Serverless Function: exotel-call
 * Dispatches authentic outbound telephone calls via the Exotel Connect Two Numbers API.
 * Provides safe logging and sanitized diagnostics on upstream failures.
 */

export interface ExotelDiagnostics {
  success: boolean;
  error?: string;
  providerStatus?: number;
  providerCode?: number | string;
  message?: string;
  details?: any;
  troubleshooting?: string;
  callSid?: string;
  status?: string;
  rawStatus?: string;
  clientName?: string;
  clientPhone?: string;
  agentPhone?: string;
  callerId?: string;
  createdAt?: string;
  configured?: boolean;
  requiredVariables?: string[];
}

/**
 * Safely masks Indian and international phone numbers in strings
 * e.g. +919000000001 -> +91*****6120
 *      04400000000 -> 0*****0000
 */
export function maskPhoneNumbers(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    // 1. STD landline with leading 0 (e.g. 04400000000)
    .replace(/0\d{9,10}/g, (match) => {
      const last4 = match.slice(-4);
      return `0*****${last4}`;
    })
    // 2. E.164 / Indian mobile (+91XXXXXXXXXX or plain 10-digit mobile starting with 6-9)
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}/g, (match) => {
      const clean = match.replace(/[^\d]/g, '');
      const last4 = clean.slice(-4);
      return `+91*****${last4}`;
    });
}

/**
 * Redacts HTTP Basic Auth headers, Bearer tokens, and sensitive credential keys
 */
export function redactSensitiveCredentials(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/Authorization\s*:\s*[^\r\n,;]+/gi, 'Authorization: [REDACTED]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?token|api[_-]?key|password|secret)["']?\s*[:=]\s*["']?[^"'\s,;}]+/gi, '$1: [REDACTED]');
}

/**
 * Recursively sanitizes diagnostic data (objects, arrays, strings)
 * to ensure no secrets or full phone numbers are ever leaked to logs or clients.
 */
export function sanitizeExotelData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return maskPhoneNumbers(redactSensitiveCredentials(data));
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeExotelData);
  }

  if (typeof data === 'object') {
    const copy: Record<string, any> = {};
    const sensitiveKeyPatterns = /token|key|secret|password|auth|authorization/i;

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeyPatterns.test(key)) {
        copy[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        copy[key] = maskPhoneNumbers(redactSensitiveCredentials(value));
      } else if (typeof value === 'object' && value !== null) {
        copy[key] = sanitizeExotelData(value);
      } else {
        copy[key] = value;
      }
    }
    return copy;
  }

  return data;
}

/**
 * Extracts structured diagnostics from JSON or XML Exotel responses
 */
export function parseExotelResponseBody(responseText: string): {
  message?: string;
  code?: number | string;
  status?: number | string;
  sid?: string;
  rawStatus?: string;
  RestException?: Record<string, any>;
  Call?: Record<string, any>;
  raw?: any;
} {
  if (!responseText || typeof responseText !== 'string') {
    return {};
  }

  const trimmed = responseText.trim();

  // 1. Try parsing JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rest = parsed?.RestException;
      const call = parsed?.Call;
      const message = rest?.Message || parsed?.message || parsed?.error_message || parsed?.error;
      const code = rest?.Code || parsed?.code || parsed?.error_code;
      const status = rest?.Status || parsed?.status;
      const sid = call?.Sid || parsed?.callSid || parsed?.sid;
      const rawStatus = call?.Status || parsed?.call_status || parsed?.rawStatus;

      return {
        message: message ? String(message) : undefined,
        code,
        status,
        sid,
        rawStatus,
        RestException: rest,
        Call: call,
        raw: parsed
      };
    } catch {
      // Fallback to XML regex below
    }
  }

  // 2. Parse XML tags if response is XML
  const extractTag = (tag: string): string | null => {
    const match = trimmed.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : null;
  };

  const xmlMessage = extractTag('Message');
  const xmlStatus = extractTag('Status');
  const xmlCode = extractTag('Code');
  const xmlSid = extractTag('Sid');
  const xmlCallStatus = extractTag('Status');
  const xmlMoreInfo = extractTag('MoreInfo');

  if (xmlMessage || xmlStatus || xmlCode) {
    return {
      message: xmlMessage || undefined,
      code: xmlCode ? Number(xmlCode) || xmlCode : undefined,
      status: xmlStatus ? Number(xmlStatus) || xmlStatus : undefined,
      RestException: {
        Message: xmlMessage || undefined,
        Status: xmlStatus ? Number(xmlStatus) || xmlStatus : undefined,
        Code: xmlCode ? Number(xmlCode) || xmlCode : undefined,
        MoreInfo: xmlMoreInfo || undefined
      },
      raw: trimmed
    };
  }

  if (xmlSid) {
    return {
      sid: xmlSid,
      rawStatus: xmlCallStatus || undefined,
      Call: {
        Sid: xmlSid,
        Status: xmlCallStatus || undefined
      },
      raw: trimmed
    };
  }

  return {
    message: trimmed.substring(0, 300),
    raw: trimmed
  };
}

/**
 * Returns actionable troubleshooting hints for Exotel upstream error codes
 */
export function getExotelTroubleshootingHint(status: number, message?: string, subdomain?: string): string {
  const sub = subdomain || 'api.exotel.com';
  switch (status) {
    case 400:
      return `Exotel Bad Request (400). The request parameters (CallerId, From, or To) were rejected by Exotel. Verify that EXOTEL_CALLER_ID is an assigned ExoPhone on your account, and that agent and client phone numbers are valid 10-digit Indian mobile numbers.`;
    case 401:
      return `Exotel Authentication Failed (401). Verify that EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, and EXOTEL_API_TOKEN in your Netlify site environment variables match your Exotel API Dashboard. Note: If your Exotel account is registered on the Mumbai cluster, set EXOTEL_SUBDOMAIN to 'api.in.exotel.com' instead of '${sub}'.`;
    case 402:
      return `Exotel Payment Required (402). Your Exotel account does not have sufficient calling credits or active wallet balance to place outbound PSTN calls. Please recharge your Exotel account.`;
    case 403:
      return `Exotel Forbidden (403). Your account lacks permission for outbound calls, the destination number is restricted, or your Exotel trial account requires the recipient number to be whitelisted in the Exotel Dashboard.`;
    case 404:
      return `Exotel Resource Not Found (404). The Account SID was not found on host '${sub}'. If your account is in Mumbai cluster, verify EXOTEL_SUBDOMAIN is set to 'api.in.exotel.com'.`;
    case 429:
      return `Exotel Rate Limited (429). Too many concurrent call requests. Please wait before retrying.`;
    default:
      return `Exotel returned HTTP ${status}. Check Exotel API Dashboard logs for detailed provider diagnostics.`;
  }
}

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported' })
    };
  }

  let payload: any = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    payload = {};
  }

  const isAiMode = payload.mode === 'EXOTEL_AI';
  const to = typeof payload.to === 'string' ? payload.to.trim() : '';
  const clientName = typeof payload.clientName === 'string' ? payload.clientName.trim() : 'Ashray K';
  const leadId = typeof payload.leadId === 'string' ? payload.leadId.trim() : 'lead-1';
  const product = typeof payload.product === 'string' ? payload.product.trim() : 'Ortho GRID';

  const accountSid = (process.env.EXOTEL_ACCOUNT_SID || '').trim();
  const apiKey = (process.env.EXOTEL_API_KEY || '').trim();
  const apiToken = (process.env.EXOTEL_API_TOKEN || '').trim();
  const subdomain = (process.env.EXOTEL_SUBDOMAIN || (isAiMode ? 'api.in.exotel.com' : 'api.exotel.com')).trim();
  const callerId = (process.env.EXOTEL_CALLER_ID || '').trim();
  const agentPhone = (process.env.EXOTEL_AGENT_PHONE || '').trim();

  // 1. Employee Phone Check (Required only for EXOTEL_REAL mode)
  if (!isAiMode && !agentPhone) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'EMPLOYEE_PHONE_REQUIRED',
        message: 'Employee phone number (EXOTEL_AGENT_PHONE) is not configured in server environment variables. An employee phone number is strictly required to receive Leg A of the call.'
      })
    };
  }

  // 2. Client Phone Check
  if (!to) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'CLIENT_PHONE_REQUIRED',
        message: 'Client phone number is required to place an outbound call.'
      })
    };
  }

  const cleanDigits = (p: string) => {
    let d = p.replace(/[^\d]/g, '');
    if (d.startsWith('91') && d.length === 12) d = d.substring(2);
    if (d.startsWith('0') && d.length === 11) d = d.substring(1);
    return d;
  };

  const clientDigits = cleanDigits(to);
  const agentDigits = cleanDigits(agentPhone);

  if (clientDigits.length !== 10 || !/^[6-9]\d{9}$/.test(clientDigits)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'INVALID_CLIENT_PHONE',
        message: `Invalid client phone number: "${maskPhoneNumbers(to)}". Must be a valid 10-digit Indian mobile number.`
      })
    };
  }

  if (!isAiMode && (agentDigits.length !== 10 || !/^[6-9]\d{9}$/.test(agentDigits))) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'INVALID_EMPLOYEE_PHONE',
        message: `Configured employee phone number "${maskPhoneNumbers(agentPhone)}" is invalid. Must be a valid 10-digit phone number.`
      })
    };
  }

  // 3. Self-Call Prevention Guard (Required only for EXOTEL_REAL mode)
  if (!isAiMode && clientDigits === agentDigits) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SELF_CALL_PROHIBITED',
        message: `Employee phone and Client phone cannot be identical (+91*****${clientDigits.slice(-4)}). Telephony providers cannot bridge a telephone call to itself. Please configure a distinct EXOTEL_AGENT_PHONE.`
      })
    };
  }

  // 4. Exotel API Credentials Check
  const requiredVariables = isAiMode
    ? ['EXOTEL_ACCOUNT_SID', 'EXOTEL_API_KEY', 'EXOTEL_API_TOKEN', 'EXOTEL_CALLER_ID']
    : ['EXOTEL_ACCOUNT_SID', 'EXOTEL_API_KEY', 'EXOTEL_API_TOKEN', 'EXOTEL_CALLER_ID', 'EXOTEL_AGENT_PHONE'];

  if (!accountSid || !apiKey || !apiToken || !callerId || (!isAiMode && !agentPhone)) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'CREDENTIALS_MISSING',
        message: 'Exotel API credentials are not yet configured in Netlify environment variables. Please add EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID to your Netlify site settings.',
        requiredVariables
      })
    };
  }

  // 5. Connect API Request
  try {
    const exotelUrl = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect.json`;
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString('base64')}`;

    let sanitizedCallerId = callerId.trim().replace(/[\s-]/g, '');
    if (sanitizedCallerId.startsWith('+91') && sanitizedCallerId.length === 13) {
      sanitizedCallerId = `0${sanitizedCallerId.substring(3)}`;
    }

    const formParams = new URLSearchParams();

    if (isAiMode) {
      // MODE 2: Exotel Connect Voice AI API (Voicebot / AgentStream)
      // Dials customer directly from CallerId. Employee phone is NOT dialed.
      const sessionId = 'vses_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const streamHost = (process.env.EXOTEL_STREAM_HOST || 'api.on-ground.ai').trim();
      const streamUrl = process.env.EXOTEL_STREAM_URL
        ? `${process.env.EXOTEL_STREAM_URL}?sessionId=${sessionId}`
        : `wss://${streamHost}/exotel-voicebot?sessionId=${sessionId}`;
      const statusCallbackUrl = process.env.EXOTEL_STATUS_CALLBACK_URL || `https://${streamHost}/api/exotel/callback`;

      formParams.append('From', `+91${clientDigits}`);
      formParams.append('CallerId', sanitizedCallerId);
      formParams.append('StreamUrl', streamUrl);
      formParams.append('StreamType', 'bidirectional');
      formParams.append('CallType', 'trans');
      formParams.append('TimeLimit', '1800');
      formParams.append('TimeOut', '35');
      formParams.append('Record', 'true');
      formParams.append('StatusCallback', statusCallbackUrl);
      formParams.append('StatusCallbackEvents[0]', 'answered');
      formParams.append('StatusCallbackEvents[1]', 'terminal');
      formParams.append('CustomField', `sessionId=${sessionId};leadId=${leadId};mode=voicebot;product=${product};app=onground_callcentre`);

      console.log(`[Exotel:AI] Dispatching Connect Voice AI request to https://${subdomain}: To(From)=+91*****${clientDigits.slice(-4)}, CallerId=${maskPhoneNumbers(sanitizedCallerId)}, StreamUrl=${streamUrl}`);
    } else {
      // MODE 1: Standard Connect Two Numbers (Employee <-> Customer)
      formParams.append('From', `+91${agentDigits}`);
      formParams.append('To', `+91${clientDigits}`);
      formParams.append('CallerId', sanitizedCallerId);
      formParams.append('CallType', 'trans');
      formParams.append('TimeLimit', '14400');
      formParams.append('TimeOut', '35');
      formParams.append('Record', 'true');
      formParams.append('CustomField', `client=${clientName};phone=${clientDigits};app=onground_callcentre`);

      console.log(`[Exotel:Call] Dispatching Connect Two Numbers request to https://${subdomain}: From=+91*****${agentDigits.slice(-4)}, To=+91*****${clientDigits.slice(-4)}, CallerId=${maskPhoneNumbers(sanitizedCallerId)}`);
    }

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
    const parsed = parseExotelResponseBody(responseText);
    const sanitizedDetails = sanitizeExotelData(parsed.RestException || parsed.raw || parsed);

    if (!response.ok) {
      console.error(`[Exotel:Call] Upstream call initiation failed. HTTP Status: ${response.status} ${response.statusText || ''}`);
      console.error('[Exotel:Call] Sanitized upstream response body:', JSON.stringify(sanitizedDetails));

      const safeMessage = parsed.message ? sanitizeExotelData(parsed.message) : `Exotel call initiation rejected with HTTP ${response.status}`;
      const troubleshooting = getExotelTroubleshootingHint(response.status, safeMessage, subdomain);

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'EXOTEL_API_ERROR',
          providerStatus: response.status,
          providerCode: parsed.code || undefined,
          message: safeMessage,
          details: sanitizedDetails,
          troubleshooting
        })
      };
    }

    const callSid = parsed.sid || parsed?.Call?.Sid || `exo_${Date.now()}`;
    console.log(`[Exotel:Call] Call initiated successfully via Exotel PSTN. Call SID: ${callSid}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid,
        mode: isAiMode ? 'EXOTEL_AI' : 'EXOTEL_REAL',
        status: isAiMode ? 'calling_customer' : 'calling_employee',
        rawStatus: parsed.rawStatus || parsed?.Call?.Status || 'in-progress',
        clientName,
        clientPhone: `+91${clientDigits}`,
        agentPhone: isAiMode ? undefined : `+91${agentDigits}`,
        callerId: sanitizedCallerId,
        createdAt: parsed?.Call?.DateCreated || new Date().toISOString()
      })
    };
  } catch (err: any) {
    console.error('[Exotel:Call] Internal server error communicating with Exotel:', sanitizeExotelData(err?.message || 'Unknown'));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: sanitizeExotelData(err?.message) || 'Internal error dispatching Exotel call request.'
      })
    };
  }
};
