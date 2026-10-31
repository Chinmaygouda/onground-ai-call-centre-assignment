/**
 * Netlify Serverless Function: twilio-end-call
 * Terminates an active Twilio call via Twilio REST API and releases the active session lock.
 */

import { terminateTwilioCall } from '../../server/twilioService';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'POST required' })
    };
  }

  try {
    let payload: any = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch {
        const params = new URLSearchParams(event.body);
        payload = {
          callSid: params.get('callSid'),
          sessionId: params.get('sessionId'),
          phone: params.get('phone')
        };
      }
    }
    const env = process.env;

    const result = await terminateTwilioCall(payload, env);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };
  } catch (err: any) {
    console.error('[twilio-end-call] Internal error:', err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'END_CALL_FAILED',
        message: err?.message || 'Internal error terminating Twilio call'
      })
    };
  }
};
