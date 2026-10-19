import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

interface TokenResponsePayload {
  success: boolean;
  token?: string;
  expireTime?: string;
  newSessionExpireTime?: string;
  model?: string;
  error?: string;
  message?: string;
}

// In-memory sliding window rate limiter: max 20 requests per minute per IP
const requestHistory = new Map<string, number[]>();

export async function handleGeminiTokenRequest(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string,
  targetModel = 'gemini-3.8-live'
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Rate Limiting
  const ip = req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (requestHistory.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= 20) {
    res.statusCode = 429;
    const payload: TokenResponsePayload = {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many token requests. Please wait a minute before requesting another session.'
    };
    res.end(JSON.stringify(payload));
    return;
  }
  timestamps.push(now);
  requestHistory.set(ip, timestamps);

  // Validate presence of server-side permanent key
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    res.statusCode = 503;
    const payload: TokenResponsePayload = {
      success: false,
      error: 'MISSING_GEMINI_API_KEY',
      message:
        'GEMINI_API_KEY is not configured on the server. Please copy .env.example to .env and set your Google AI Studio API key. (Client-side secrets are strictly blocked).'
    };
    res.end(JSON.stringify(payload));
    return;
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
        httpOptions: { apiVersion: 'v1alpha' }
      }
    });

    const url = new URL(req.url || '', 'http://localhost');
    const requestedModel = url.searchParams.get('model') || targetModel;

    const payload: TokenResponsePayload = {
      success: true,
      token: tokenResponse.name,
      expireTime,
      newSessionExpireTime,
      model: requestedModel
    };

    res.statusCode = 200;
    res.end(JSON.stringify(payload));
  } catch (err: any) {
    console.error('[GeminiTokenService] Ephemeral token creation error:', err?.message || err);
    res.statusCode = 400;
    const payload: TokenResponsePayload = {
      success: false,
      error: 'TOKEN_CREATION_FAILED',
      message:
        err?.message ||
        'Failed to generate ephemeral token from Google AI Studio. Check that your GEMINI_API_KEY is valid.'
    };
    res.end(JSON.stringify(payload));
  }
}

export function handleGeminiStatusRequest(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string,
  targetModel = 'gemini-3.8-live'
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const isConfigured = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '');

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      configured: isConfigured,
      targetModel,
      ephemeralEndpoint: '/api/gemini/token',
      modelsEndpoint: '/api/gemini/models',
      securityMode: 'EPHEMERAL_TOKENS_ONLY',
      notice: isConfigured
        ? 'Server ready to mint short-lived Gemini Live session tokens.'
        : 'GEMINI_API_KEY is missing in local .env.'
    })
  );
}

export async function handleGeminiModelsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey?: string,
  targetModel = 'gemini-3.8-live'
) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const { discoverAvailableModels } = await import('./modelDiscoveryService');
  const url = new URL(req.url || '', 'http://localhost');
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  try {
    const discovery = await discoverAvailableModels(apiKey, targetModel, forceRefresh);
    res.statusCode = discovery.success ? 200 : 503;
    res.end(JSON.stringify(discovery));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        success: false,
        accountHasAccess: false,
        error: 'DISCOVERY_EXCEPTION',
        notice: err?.message || 'Unexpected error during model discovery.'
      })
    );
  }
}
