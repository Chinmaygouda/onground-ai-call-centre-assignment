import { GoogleGenAI } from '@google/genai';

const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'MISSING_GEMINI_API_KEY',
        message: 'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in Netlify Site Settings.',
      }),
      { status: 503, headers: jsonHeaders }
    );
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

    const requestedModel =
      new URL(req.url).searchParams.get('model') || process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenResponse.name,
        expireTime,
        newSessionExpireTime,
        model: requestedModel,
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'TOKEN_CREATION_FAILED',
        message: err?.message || 'Failed to generate ephemeral token from Google AI Studio.',
      }),
      { status: 400, headers: jsonHeaders }
    );
  }
};
