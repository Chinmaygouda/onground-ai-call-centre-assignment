/**
 * Netlify Serverless Function: twilio-status
 * 1. Handles frontend polling (GET) for live call progression, transcript, and duration.
 * 2. Handles Twilio status callback webhooks (POST) for carrier-level call events.
 */

import { getTwilioSession, updateTwilioSessionStatus, TwilioVoiceSession } from '../../server/twilioService';

export const handler = async (event: any) => {
  const method = event.httpMethod;

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  // Handle frontend polling: GET
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const sessionId = params.sessionId || '';
    const callSid = params.callSid || '';

    const session = (sessionId ? getTwilioSession(sessionId) : undefined) || (callSid ? getTwilioSession(callSid) : undefined);

    if (!session) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          status: 'idle',
          message: 'No active Twilio session found'
        })
      };
    }

    let duration = session.durationSeconds;
    if ((session.status === 'in-progress' || session.status === 'customer_answered' || session.status === 'ai_speaking' || session.status === 'listening' || session.status === 'processing') && session.answeredAt) {
      duration = Math.round((Date.now() - session.answeredAt) / 1000);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
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
    };
  }

  // Handle Twilio Webhook Callback: POST
  if (method === 'POST') {
    try {
      const body = event.body || '';
      const params = new URLSearchParams(body);
      const callSid = params.get('CallSid') || '';
      const callStatus = (params.get('CallStatus') || '').toLowerCase();
      const callDuration = parseInt(params.get('CallDuration') || '0', 10);
      const recordingUrl = params.get('RecordingUrl') || '';

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

        updateTwilioSessionStatus(session.sessionId, mappedStatus, {
          durationSeconds: callDuration || session.durationSeconds,
          recordingUrl: recordingUrl || session.recordingUrl
        });
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response></Response>'
      };
    } catch (err: any) {
      console.error('[twilio-status] Webhook error:', err?.message || err);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: '<Response></Response>'
      };
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' })
  };
};
