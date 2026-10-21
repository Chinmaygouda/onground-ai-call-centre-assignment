export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  let bodyParams: Record<string, string> = {};
  if (event.body) {
    try {
      if (event.headers['content-type']?.includes('application/json')) {
        bodyParams = JSON.parse(event.body);
      } else {
        const params = new URLSearchParams(event.body);
        params.forEach((v, k) => {
          bodyParams[k] = v;
        });
      }
    } catch {
      bodyParams = {};
    }
  }

  const callSid = bodyParams.CallSid || bodyParams.call_sid;
  const accountSid = bodyParams.AccountSid || bodyParams.account_sid;
  const status = bodyParams.Status || bodyParams.status;
  const expectedSid = process.env.EXOTEL_ACCOUNT_SID;

  if (expectedSid && accountSid && expectedSid !== accountSid) {
    console.warn('[ExotelCallback] AccountSid mismatch. Discarding callback.');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'ACCOUNT_MISMATCH' })
    };
  }

  console.log(`[ExotelCallback:Netlify] Received callback for ${callSid}: status=${status}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Exotel status callback received and logged' })
  };
};
