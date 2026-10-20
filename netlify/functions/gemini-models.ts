import { discoverAvailableModels } from '../../server/modelDiscoveryService';

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
  const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  const forceRefresh = event.queryStringParameters?.refresh === 'true';

  try {
    const discovery = await discoverAvailableModels(apiKey, targetModel, forceRefresh);
    return {
      statusCode: discovery.success ? 200 : 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(discovery),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        accountHasAccess: false,
        error: 'DISCOVERY_EXCEPTION',
        notice: err?.message || 'Unexpected error during model discovery.',
      }),
    };
  }
};
