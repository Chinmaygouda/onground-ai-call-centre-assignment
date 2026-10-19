/**
 * Gemini Live Model Fallback Manager
 *
 * Implements deterministic, verified fallback across voice models:
 * 1. Primary: gemini-3.8-live (Multimodal real-time voice model)
 * 2. Secondary: gemini-3.1-flash-live-preview (Recommended official live preview model)
 * 3. Tertiary: gemini-2.5-flash-native-audio-preview-12-2025 (Native audio live preview)
 *
 * Handles:
 * - 429 Rate Limits / Quota Bursts with bounded backoff
 * - Model unavailable / deprecated errors with immediate progression
 * - Strict halt on permanent authentication failures (401/403/unregistered)
 * - Safe session context preservation and audit logging
 */

export type ModelFailureCategory =
  | 'AUTH_FATAL'
  | 'RATE_LIMIT_429'
  | 'QUOTA_EXHAUSTED'
  | 'TRANSIENT_503'
  | 'UNSUPPORTED_MODEL'
  | 'THINKING_CONFIG_REQUIRED'
  | 'GENERIC_ERROR';

export interface ModelSwitchEvent {
  id: string;
  timestamp: string;
  fromModel: string;
  toModel: string;
  failureCategory: ModelFailureCategory;
  reason: string;
  retryDelayMs: number;
  success: boolean;
}

export const DEFAULT_FALLBACK_CHAIN = [
  'gemini-3.8-live',
  'gemini-3.1-flash-live-preview',
  'gemini-2.5-flash-native-audio-preview-12-2025'
];

export class ModelFallbackManager {
  private primaryModel: string;
  private fallbackChain: string[];
  private activeIndex: number = 0;
  private switchHistory: ModelSwitchEvent[] = [];
  private retryCountCurrentModel: number = 0;
  private readonly MAX_RETRIES_PER_MODEL = 1;

  public canRetryCurrentModel(): boolean {
    return this.retryCountCurrentModel < this.MAX_RETRIES_PER_MODEL;
  }

  public recordCurrentModelRetry(): void {
    this.retryCountCurrentModel++;
  }

  constructor(primaryModel = 'gemini-3.8-live', customChain?: string[]) {
    this.primaryModel = primaryModel;
    // Build chain ensuring primary is first, followed by verified alternatives without duplicates
    const baseList = customChain && customChain.length > 0 ? customChain : DEFAULT_FALLBACK_CHAIN;
    const uniqueList = Array.from(new Set([primaryModel, ...baseList]));
    // Remove any legacy references to gemini-2.0-flash-exp
    this.fallbackChain = uniqueList.filter((m) => m !== 'gemini-2.0-flash-exp');
    this.activeIndex = 0;
  }

  public getActiveModel(): string {
    return this.fallbackChain[this.activeIndex] || this.primaryModel;
  }

  public getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }

  public isUsingFallback(): boolean {
    return this.activeIndex > 0;
  }

  public updateChainFromDiscovery(discoveredChain: string[]): void {
    if (!discoveredChain || discoveredChain.length === 0) return;
    const currentActive = this.getActiveModel();
    // Maintain current primary, then append discovered verified models
    const unique = Array.from(new Set([this.primaryModel, ...discoveredChain])).filter(
      (m) => m !== 'gemini-2.0-flash-exp'
    );
    this.fallbackChain = unique;
    // Keep activeIndex synchronized with currentActive
    const idx = this.fallbackChain.indexOf(currentActive);
    this.activeIndex = idx >= 0 ? idx : 0;
  }

  // Classify WebSocket close event or HTTP error code
  public classifyError(code?: number, reason = ''): ModelFailureCategory {
    const r = (reason || '').toLowerCase();

    // 1. Permanent Authentication Failures (STOP immediately)
    if (
      code === 401 ||
      code === 403 ||
      r.includes('unregistered') ||
      r.includes('api key not valid') ||
      r.includes('caller without established identity') ||
      r.includes('permission denied')
    ) {
      return 'AUTH_FATAL';
    }

    // 2. Thinking Configuration Required (e.g. gemini-3.8-live-extended-thinking)
    if (r.includes('thinking level must be specified') || r.includes('thinkingconfig')) {
      return 'THINKING_CONFIG_REQUIRED';
    }

    // 3. Quota Exhaustion
    if (
      code === 1011 ||
      r.includes('exceeded your current quota') ||
      r.includes('resource has been exhausted') ||
      r.includes('quota')
    ) {
      return 'QUOTA_EXHAUSTED';
    }

    // 4. Rate Limiting (Transient burst)
    if (code === 429 || r.includes('rate limit') || r.includes('too many requests')) {
      return 'RATE_LIMIT_429';
    }

    // 5. Unsupported / Deprecated Model
    if (
      code === 404 ||
      code === 1007 ||
      r.includes('model not found') ||
      r.includes('is not supported') ||
      r.includes('unsupported model')
    ) {
      return 'UNSUPPORTED_MODEL';
    }

    // 6. Transient Server / Network Outage
    if (code === 503 || code === 502 || code === 504 || r.includes('temporarily unavailable')) {
      return 'TRANSIENT_503';
    }

    return 'GENERIC_ERROR';
  }

  // Determine whether an error warrants trying a fallback model
  public shouldFallback(category: ModelFailureCategory): boolean {
    if (category === 'AUTH_FATAL') {
      return false; // Permanent error; cycling models is useless and wasteful
    }
    // Rate limit, quota exhaustion on current model, unsupported model, or thinking config error
    return this.hasNextFallback();
  }

  public hasNextFallback(): boolean {
    return this.activeIndex < this.fallbackChain.length - 1;
  }

  // Advance to the next verified compatible model in the chain
  public advanceToFallback(
    category: ModelFailureCategory,
    reason: string
  ): {
    switched: boolean;
    fromModel: string;
    toModel: string;
    delayMs: number;
    notice: string;
  } {
    const fromModel = this.getActiveModel();

    if (!this.hasNextFallback()) {
      return {
        switched: false,
        fromModel,
        toModel: fromModel,
        delayMs: 0,
        notice: `Exhausted all ${this.fallbackChain.length} compatible voice models. Last model tested: ${fromModel}.`
      };
    }

    this.activeIndex++;
    const toModel = this.getActiveModel();
    const delayMs = category === 'QUOTA_EXHAUSTED' || category === 'RATE_LIMIT_429' ? 1500 : 500;

    const event: ModelSwitchEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      fromModel,
      toModel,
      failureCategory: category,
      reason,
      retryDelayMs: delayMs,
      success: true
    };
    this.switchHistory.push(event);
    this.retryCountCurrentModel = 0;

    return {
      switched: true,
      fromModel,
      toModel,
      delayMs,
      notice: `Switching from ${fromModel} to fallback ${toModel} due to ${category} (${reason}).`
    };
  }

  public resetToPrimary(): void {
    this.activeIndex = 0;
    this.retryCountCurrentModel = 0;
  }

  public getSwitchHistory(): ModelSwitchEvent[] {
    return [...this.switchHistory];
  }
}
