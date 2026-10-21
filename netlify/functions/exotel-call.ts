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

  const to = typeof payload.to === 'string' ? payload.to.trim() : '';
  const clientName = typeof payload.clientName === 'string' ? payload.clientName.trim() : 'Ashray K';

  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const callerId = process.env.EXOTEL_CALLER_ID;
  const agentPhone = process.env.EXOTEL_AGENT_PHONE;

  // 1. Employee Phone Check
  if (!agentPhone || !agentPhone.trim()) {
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
        message: `Invalid client phone number: "${to}". Must be a valid 10-digit Indian mobile number.`
      })
    };
  }

  if (agentDigits.length !== 10 || !/^[6-9]\d{9}$/.test(agentDigits)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'INVALID_EMPLOYEE_PHONE',
        message: `Configured employee phone number "${agentPhone}" is invalid. Must be a valid 10-digit phone number.`
      })
    };
  }

  // 3. Self-Call Prevention Guard
  if (clientDigits === agentDigits) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SELF_CALL_PROHIBITED',
        message: `Employee phone and Client phone cannot be identical (+91${clientDigits}). Telephony providers cannot bridge a telephone call to itself. Please configure a distinct EXOTEL_AGENT_PHONE.`
      })
    };
  }

  // 4. Exotel API Credentials Check
  if (!accountSid || !apiKey || !apiToken || !callerId) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'CREDENTIALS_MISSING',
        message: 'Exotel API credentials are not yet configured in Netlify environment variables. Please add EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID to your Netlify site settings.',
        requiredVariables: [
          'EXOTEL_ACCOUNT_SID',
          'EXOTEL_API_KEY',
          'EXOTEL_API_TOKEN',
          'EXOTEL_CALLER_ID',
          'EXOTEL_AGENT_PHONE'
        ]
      })
    };
  }

  // 5. Connect Two Numbers API Request (Official Exotel Connect Two Numbers)
  try {
    const exotelUrl = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect`;
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString('base64')}`;

    const sanitizedCallerId = callerId.trim().replace(/[\s-]/g, '');

    const formParams = new URLSearchParams();
    formParams.append('From', `+91${agentDigits}`);
    formParams.append('To', `+91${clientDigits}`);
    formParams.append('CallerId', sanitizedCallerId);
    formParams.append('CallType', 'trans');
    formParams.append('TimeLimit', '14400');
    formParams.append('TimeOut', '35');
    formParams.append('Record', 'true');
    formParams.append('CustomField', `client=${clientName};phone=${clientDigits};app=onground_callcentre`);

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
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'EXOTEL_API_ERROR',
          providerStatus: response.status,
          message: data?.RestException?.Message || data?.message || 'Exotel rejected call initiation request.',
          details: data?.RestException || data
        })
      };
    }

    const callSid = data?.Call?.Sid || `exo_${Date.now()}`;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid,
        status: 'calling_employee',
        rawStatus: data?.Call?.Status || 'in-progress',
        clientName,
        clientPhone: `+91${clientDigits}`,
        agentPhone: `+91${agentDigits}`,
        callerId,
        createdAt: data?.Call?.DateCreated || new Date().toISOString()
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: err?.message || 'Internal error dispatching Exotel call request.'
      })
    };
  }
};
