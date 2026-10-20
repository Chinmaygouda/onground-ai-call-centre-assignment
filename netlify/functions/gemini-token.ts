import { GoogleGenAI } from '@google/genai';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'MISSING_GEMINI_API_KEY',
        message: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in Netlify Site Settings.',
      }),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1beta' },
      },
    });

    const requestedModel = event.queryStringParameters?.model || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        token: tokenResponse.name,
        expireTime,
        newSessionExpireTime,
        model: requestedModel,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'TOKEN_CREATION_FAILED',
        message: err?.message || 'Failed to generate ephemeral token from Google AI Studio.',
      }),
    };
  }
};
