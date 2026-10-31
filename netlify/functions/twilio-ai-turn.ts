/**
 * Netlify Serverless Function: twilio-ai-turn
 * Receives recognized SpeechResult from Twilio <Gather>, queries Gemini with Sleep Company tools,
 * and streams back spoken responses using Twilio <Say> while triggering the next <Gather>.
 */

import twilio from 'twilio';
import {
  getTwilioSession,
  updateTwilioSessionStatus,
  processCustomerSpeechWithGemini,
  generateAiTurnTwiML
} from '../../server/twilioService';

const VoiceResponse = twilio.twiml.VoiceResponse;

export const handler = async (event: any) => {
  const queryParams = event.queryStringParameters || {};
  const sessionId = queryParams.sessionId || '';

  const bodyStr = event.body || '';
  const postParams = new URLSearchParams(bodyStr);
  const callSid = postParams.get('CallSid') || '';
  const speechResult = (postParams.get('SpeechResult') || '').trim();

  const env = process.env;
  const webhookBaseUrl = (env.TWILIO_WEBHOOK_BASE_URL || `https://${event.headers.host || 'localhost'}`).replace(/\/+$/, '');

  const session = getTwilioSession(sessionId) || (callSid ? getTwilioSession(callSid) : undefined);

  if (!session) {
    const response = new VoiceResponse();
    response.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Thank you for calling The Sleep Company. Have a wonderful day!');
    response.hangup();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: response.toString()
    };
  }

  // Handle empty speech
  if (!speechResult) {
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
    response.say({ voice: 'Polly.Aditi', language: 'en-IN' }, "We didn't receive any response. Feel free to call us back. Goodbye!");
    response.hangup();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: response.toString()
    };
  }

  updateTwilioSessionStatus(session.sessionId, 'processing', { lastCustomerSpeech: speechResult });
  session.currentTurn += 1;

  try {
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twiml
    };
  } catch (err: any) {
    console.error('[twilio-ai-turn] Error executing AI turn:', err);
    const response = new VoiceResponse();
    response.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Our Sleep Company showroom team is available to assist you. Arvind Rajan will contact you shortly. Goodbye!'
    );
    response.hangup();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: response.toString()
    };
  }
};
