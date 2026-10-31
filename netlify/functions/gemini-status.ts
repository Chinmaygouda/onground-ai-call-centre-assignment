export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '');
  const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

  return new Response(
    JSON.stringify({
      configured: isConfigured,
      targetModel,
      ephemeralEndpoint: '/api/gemini/token',
      modelsEndpoint: '/api/gemini/models',
      securityMode: 'EPHEMERAL_TOKENS_ONLY',
      notice: isConfigured
        ? 'Server ready to mint short-lived Gemini Live session tokens.'
        : 'GEMINI_API_KEY is not configured in Netlify environment variables.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
};
