export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const callSid = event.queryStringParameters?.callSid;
  if (!callSid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'CALL_SID_REQUIRED', message: 'Query parameter callSid is required.' })
    };
  }

  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';

  if (!accountSid || !apiKey || !apiToken) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid,
        status: 'calling_employee',
        duration: 0,
        recordingUrl: null,
        isConfigured: false
      })
    };
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
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          callSid,
          status: 'calling_client',
          duration: 0,
          recordingUrl: null
        })
      };
    }

    const data: any = await response.json();
    const callData = data?.Call || {};
    const rawStatus = (callData.Status || '').toLowerCase();

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid,
        status,
        rawStatus,
        duration,
        startTime: callData.StartTime || null,
        endTime: callData.EndTime || null,
        recordingUrl,
        isConfigured: true
      })
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        callSid,
        status: 'calling_client',
        duration: 0,
        recordingUrl: null
      })
    };
  }
};
