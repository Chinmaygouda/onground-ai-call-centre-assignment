/**
 * Server-Side Gemini Model Discovery & Live Handshake Verification Service
 *
 * Interrogates the official Gemini API using the server-side API key to:
 * 1. Discover all models accessible to the user's Google AI Studio account
 * 2. Filter voice/Live API compatible models
 * 3. Perform a minimal non-intrusive Live API handshake test
 * 4. Return sanitized metadata with zero credential leakage
 */

import { GoogleGenAI } from '@google/genai';

export interface DiscoveredModelInfo {
  modelId: string;
  displayName: string;
  description: string;
  isOfficialLiveSupported: boolean;
  inAccountListing: boolean;
  liveHandshakeStatus: 'PASS' | 'FAIL' | 'CONFIG_REQUIRED' | 'SKIPPED' | 'UNTESTED';
  failureCategory?: 'THINKING_CONFIG_REQUIRED' | 'UNREGISTERED_CALLER' | 'QUOTA_EXHAUSTED' | 'MODEL_NOT_FOUND' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'NONE';
  failureDetail?: string;
  fallbackRank: number; // 1 = Primary, 2 = Secondary, 3 = Tertiary, 0 = Non-candidate
  lastChecked: string;
}

export interface ModelDiscoveryResponse {
  success: boolean;
  accountHasAccess: boolean;
  primaryModel: string;
  fallbackChain: string[];
  models: DiscoveredModelInfo[];
  totalDiscovered: number;
  liveCompatibleCount: number;
  cached: boolean;
  timestamp: string;
  notice?: string;
  error?: string;
}

// Officially documented voice & Live API candidates in deterministic fallback preference order
const KNOWN_LIVE_CANDIDATES: {
  id: string;
  displayName: string;
  fallbackRank: number;
  officialSupported: boolean;
  notes: string;
}[] = [
  {
    id: 'gemini-3.8-live',
    displayName: 'Gemini 3.8 Live',
    fallbackRank: 1, // Primary
    officialSupported: true,
    notes: 'Primary multimodal real-time voice model with lowest latency and full function calling support.'
  },
  {
    id: 'gemini-3.1-flash-live-preview',
    displayName: 'Gemini 3.1 Flash Live Preview',
    fallbackRank: 2, // Secondary Fallback
    officialSupported: true,
    notes: 'Recommended official low-latency live preview model in official documentation.'
  },
  {
    id: 'gemini-2.5-flash-native-audio-preview-12-2025',
    displayName: 'Gemini 2.5 Flash Native Audio Preview',
    fallbackRank: 3, // Tertiary Fallback
    officialSupported: true,
    notes: 'Native audio live preview model with verified WebSocket compatibility.'
  },
  {
    id: 'gemini-3.8-live-extended-thinking',
    displayName: 'Gemini 3.8 Live Extended Thinking',
    fallbackRank: 0,
    officialSupported: true,
    notes: 'Extended thinking model; requires explicit thinkingLevel configuration in setup.'
  },
  {
    id: 'gemini-2.5-flash-native-audio-latest',
    displayName: 'Gemini 2.5 Flash Native Audio Latest',
    fallbackRank: 4,
    officialSupported: true,
    notes: 'Latest version of native audio live preview.'
  }
];

let cachedResult: ModelDiscoveryResponse | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export async function discoverAvailableModels(
  apiKey?: string,
  configuredPrimary = 'gemini-3.8-live',
  forceRefresh = false
): Promise<ModelDiscoveryResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedResult && now - lastCacheTime < CACHE_TTL_MS) {
    return { ...cachedResult, cached: true };
  }

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    const unconfiguredModels: DiscoveredModelInfo[] = KNOWN_LIVE_CANDIDATES.map((cand) => ({
      modelId: cand.id,
      displayName: cand.displayName,
      description: cand.notes,
      isOfficialLiveSupported: cand.officialSupported,
      inAccountListing: false,
      liveHandshakeStatus: 'UNTESTED',
      failureCategory: 'NONE',
      failureDetail: 'Configure GEMINI_API_KEY in .env to test account access',
      fallbackRank: cand.fallbackRank,
      lastChecked: new Date().toISOString()
    }));

    return {
      success: false,
      accountHasAccess: false,
      primaryModel: configuredPrimary,
      fallbackChain: KNOWN_LIVE_CANDIDATES.filter((c) => c.fallbackRank > 0).map((c) => c.id),
      models: unconfiguredModels,
      totalDiscovered: 0,
      liveCompatibleCount: unconfiguredModels.length,
      cached: false,
      timestamp: new Date().toISOString(),
      notice: 'GEMINI_API_KEY is not configured in .env. Model discovery requires a valid Google AI Studio key.',
      error: 'MISSING_API_KEY'
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const accountModelsMap = new Map<string, any>();

  // Step 1: List all models accessible to the user's account
  try {
    const listResponse = await ai.models.list();
    for await (const m of listResponse) {
      const cleanId = (m.name || '').replace(/^models\//, '');
      accountModelsMap.set(cleanId, m);
    }
  } catch (err: any) {
    console.error('[ModelDiscovery] Failed to list models from Gemini API:', err?.message || err);
    return {
      success: false,
      accountHasAccess: false,
      primaryModel: configuredPrimary,
      fallbackChain: [],
      models: [],
      totalDiscovered: 0,
      liveCompatibleCount: 0,
      cached: false,
      timestamp: new Date().toISOString(),
      error: 'API_REQUEST_FAILED',
      notice: `Failed to query Gemini model catalog: ${err?.message || 'Authentication or network error'}`
    };
  }

  // Step 2: Test candidate models with a minimal Live handshake
  const discoveredModels: DiscoveredModelInfo[] = [];

  for (const candidate of KNOWN_LIVE_CANDIDATES) {
    const accountModel = accountModelsMap.get(candidate.id);
    const inAccountListing = Boolean(accountModel);

    let handshakeStatus: DiscoveredModelInfo['liveHandshakeStatus'] = 'UNTESTED';
    let failureCategory: DiscoveredModelInfo['failureCategory'] = 'NONE';
    let failureDetail: string | undefined = undefined;

    // Test live handshake if model is in the user's listing
    if (inAccountListing) {
      try {
        const testRes = await performMinimalLiveHandshake(ai, candidate.id);
        handshakeStatus = testRes.status;
        failureCategory = testRes.failureCategory;
        failureDetail = testRes.failureDetail;
      } catch (e: any) {
        handshakeStatus = 'FAIL';
        failureCategory = 'NETWORK_ERROR';
        failureDetail = e?.message || 'Failed to complete handshake';
      }
    } else {
      handshakeStatus = 'SKIPPED';
      failureCategory = 'MODEL_NOT_FOUND';
      failureDetail = 'Model ID not present in account model listing.';
    }

    discoveredModels.push({
      modelId: candidate.id,
      displayName: accountModel?.displayName || candidate.displayName,
      description: accountModel?.description || candidate.notes,
      isOfficialLiveSupported: candidate.officialSupported,
      inAccountListing,
      liveHandshakeStatus: handshakeStatus,
      failureCategory,
      failureDetail,
      fallbackRank: candidate.fallbackRank,
      lastChecked: new Date().toISOString()
    });
  }

  // Also check if any additional live models were discovered in the account
  for (const [id, m] of accountModelsMap.entries()) {
    if (
      (id.includes('live') || id.includes('native-audio')) &&
      !discoveredModels.some((dm) => dm.modelId === id)
    ) {
      discoveredModels.push({
        modelId: id,
        displayName: m.displayName || id,
        description: m.description || 'Discovered live-capable model',
        isOfficialLiveSupported: true,
        inAccountListing: true,
        liveHandshakeStatus: 'UNTESTED',
        failureCategory: 'NONE',
        fallbackRank: 0,
        lastChecked: new Date().toISOString()
      });
    }
  }

  // Compute verified fallback chain (models that passed handshake or are known verified candidates)
  const verifiedLive = discoveredModels
    .filter((m) => m.inAccountListing && m.liveHandshakeStatus === 'PASS')
    .sort((a, b) => {
      // Primary configured model first, then by fallback rank
      if (a.modelId === configuredPrimary) return -1;
      if (b.modelId === configuredPrimary) return 1;
      return a.fallbackRank - b.fallbackRank;
    });

  const fallbackChain = verifiedLive.map((m) => m.modelId);

  // If primary model passed, ensure it is first; if not in chain, put it at front if configured
  const effectivePrimary = fallbackChain[0] || configuredPrimary;

  const result: ModelDiscoveryResponse = {
    success: true,
    accountHasAccess: true,
    primaryModel: effectivePrimary,
    fallbackChain,
    models: discoveredModels,
    totalDiscovered: accountModelsMap.size,
    liveCompatibleCount: discoveredModels.filter((m) => m.inAccountListing).length,
    cached: false,
    timestamp: new Date().toISOString(),
    notice:
      fallbackChain.length > 0
        ? `Found ${fallbackChain.length} verified live model(s). Fallback chain: ${fallbackChain.join(' -> ')}`
        : 'No compatible live models verified. Check account quota and API permissions.'
  };

  cachedResult = result;
  lastCacheTime = now;
  return result;
}

// Perform a fast, non-intrusive 2.5-second live session connection test
async function performMinimalLiveHandshake(
  ai: GoogleGenAI,
  modelId: string
): Promise<{
  status: DiscoveredModelInfo['liveHandshakeStatus'];
  failureCategory: DiscoveredModelInfo['failureCategory'];
  failureDetail?: string;
}> {
  return new Promise((resolve) => {
    let resolved = false;
    let sessionRef: any = null;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          if (sessionRef?.close) sessionRef.close();
        } catch {}
        resolve({
          status: 'FAIL',
          failureCategory: 'NETWORK_ERROR',
          failureDetail: 'Handshake timed out after 2500ms'
        });
      }
    }, 2500);

    try {
      ai.live
        .connect({
          model: modelId,
          config: {
            responseModalities: ['AUDIO'] as any
          },
          callbacks: {
            onopen: () => {
              // Connected successfully
            },
            onmessage: (msg: any) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                try {
                  if (sessionRef?.close) sessionRef.close();
                } catch {}

                if (msg.setupComplete || msg.sessionResumptionUpdate) {
                  resolve({
                    status: 'PASS',
                    failureCategory: 'NONE',
                    failureDetail: 'Setup confirmed by Google Live API'
                  });
                } else {
                  resolve({
                    status: 'PASS',
                    failureCategory: 'NONE',
                    failureDetail: 'Received initial server response'
                  });
                }
              }
            },
            onerror: (err: any) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                try {
                  if (sessionRef?.close) sessionRef.close();
                } catch {}

                const msg = err?.message || String(err);
                let failureCategory: DiscoveredModelInfo['failureCategory'] = 'NETWORK_ERROR';
                if (msg.includes('429') || msg.includes('quota')) failureCategory = 'QUOTA_EXHAUSTED';
                else if (msg.includes('unregistered') || msg.includes('identity')) failureCategory = 'UNREGISTERED_CALLER';

                resolve({
                  status: 'FAIL',
                  failureCategory,
                  failureDetail: msg
                });
              }
            },
            onclose: (ev: any) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                const reason = ev?.reason || '';
                if (reason.includes('Thinking level must be specified')) {
                  resolve({
                    status: 'CONFIG_REQUIRED',
                    failureCategory: 'THINKING_CONFIG_REQUIRED',
                    failureDetail: 'Thinking level configuration required for this model.'
                  });
                } else if (ev?.code === 1008 && reason.includes('unregistered')) {
                  resolve({
                    status: 'FAIL',
                    failureCategory: 'UNREGISTERED_CALLER',
                    failureDetail: 'API key authentication error.'
                  });
                } else if (reason.toLowerCase().includes('quota') || reason.includes('429')) {
                  resolve({
                    status: 'FAIL',
                    failureCategory: 'QUOTA_EXHAUSTED',
                    failureDetail: reason || 'Model quota exhausted on this account'
                  });
                } else {
                  resolve({
                    status: 'FAIL',
                    failureCategory: 'NETWORK_ERROR',
                    failureDetail: reason || `Closed with code ${ev?.code}`
                  });
                }
              }
            }
          }
        })
        .then((session) => {
          sessionRef = session;
        })
        .catch((err: any) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            const msg = err?.message || String(err);
            const isQuota = msg.toLowerCase().includes('quota') || msg.includes('429');
            resolve({
              status: 'FAIL',
              failureCategory: isQuota ? 'QUOTA_EXHAUSTED' : 'NETWORK_ERROR',
              failureDetail: msg || 'Connection promise rejected'
            });
          }
        });
    } catch (syncErr: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          status: 'FAIL',
          failureCategory: 'NETWORK_ERROR',
          failureDetail: syncErr?.message || 'Sync error during connection'
        });
      }
    }
  });
}
