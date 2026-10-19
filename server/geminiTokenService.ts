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

    const payload: TokenResponsePayload = {
      success: true,
      token: tokenResponse.name,
      expireTime,
      newSessionExpireTime,
      model: targetModel
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
      securityMode: 'EPHEMERAL_TOKENS_ONLY',
      notice: isConfigured
        ? 'Server ready to mint short-lived Gemini Live session tokens.'
        : 'GEMINI_API_KEY is missing in local .env.'
    })
  );
}
