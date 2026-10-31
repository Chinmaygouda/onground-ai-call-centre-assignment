/**
 * Netlify Serverless Function: twilio-call
 * Initiates an outbound customer-first AI telephone call via Twilio Programmable Voice.
 */

import { initiateTwilioOutboundCall, validateTwilioCredentials } from '../../server/twilioService';

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
    const payload = event.body ? JSON.parse(event.body) : {};
    const env = process.env;

    const result = await initiateTwilioOutboundCall(payload, env);

    return {
      statusCode: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };
  } catch (err: any) {
    console.error('[twilio-call] Internal error:', err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'TWILIO_INTERNAL_ERROR',
        message: err?.message || 'Internal error in Twilio call initiation'
      })
    };
  }
};
