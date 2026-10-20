export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '');
  const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      configured: isConfigured,
      targetModel,
      ephemeralEndpoint: '/api/gemini/token',
      modelsEndpoint: '/api/gemini/models',
      securityMode: 'EPHEMERAL_TOKENS_ONLY',
      notice: isConfigured
        ? 'Server ready to mint short-lived Gemini Live session tokens.'
        : 'GEMINI_API_KEY is not configured in Netlify environment variables.',
    }),
  };
};
