/**
 * Netlify Serverless Function: twilio-voice
 * Returns initial TwiML with personalized Sleep Company greeting and <Gather> speech recognition.
 */

import {
  getTwilioSession,
  createTwilioVoiceSession,
  bindTwilioCallSid,
  updateTwilioSessionStatus,
  generateInitialTwiML
} from '../../server/twilioService';

export const handler = async (event: any) => {
  const params = event.queryStringParameters || {};
  const sessionId = params.sessionId || '';

  const bodyStr = event.body || '';
  const postParams = new URLSearchParams(bodyStr);
  const callSid = postParams.get('CallSid') || '';

  const session = getTwilioSession(sessionId) || (callSid ? getTwilioSession(callSid) : undefined);

  const env = process.env;
  const webhookBaseUrl = (env.TWILIO_WEBHOOK_BASE_URL || `https://${event.headers.host || 'localhost'}`).replace(/\/+$/, '');

  if (!session) {
    const fallback = createTwilioVoiceSession({
      leadId: 'unknown',
      customerName: 'Customer',
      customerPhone: postParams.get('To') || '+917204104491',
      product: 'Ortho GRID Mattress'
    });
    if (callSid) bindTwilioCallSid(fallback.sessionId, callSid);
    updateTwilioSessionStatus(fallback.sessionId, 'customer_answered');

    const twiml = generateInitialTwiML(fallback, webhookBaseUrl);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml
    };
  }

  if (callSid && !session.callSid) {
    bindTwilioCallSid(session.sessionId, callSid);
  }

  updateTwilioSessionStatus(session.sessionId, 'customer_answered', {
    answeredAt: Date.now()
  });

  const twiml = generateInitialTwiML(session, webhookBaseUrl);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml
  };
};
