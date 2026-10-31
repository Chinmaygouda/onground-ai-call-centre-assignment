import { discoverAvailableModels } from '../../server/modelDiscoveryService';

const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

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
  const targetModel = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  const forceRefresh = new URL(req.url).searchParams.get('refresh') === 'true';

  try {
    const discovery = await discoverAvailableModels(apiKey, targetModel, forceRefresh);
    return new Response(JSON.stringify(discovery), {
      status: discovery.success ? 200 : 503,
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        accountHasAccess: false,
        error: 'DISCOVERY_EXCEPTION',
        notice: err?.message || 'Unexpected error during model discovery.',
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
