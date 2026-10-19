import { GEMINI_LIVE_FUNCTION_DECLARATIONS, dispatchLiveToolCall } from './liveTools';
import { GEMINI_LIVE_SYSTEM_INSTRUCTION } from './liveSystemPrompt';
import { LiveAudioProcessor } from './audioProcessor';
import {
  ModelFallbackManager,
  ModelSwitchEvent,
  ModelFailureCategory
} from './modelFallbackManager';

export type LiveConnectionState =
  | 'IDLE'
  | 'REQUESTING_MIC'
  | 'FETCHING_TOKEN'
  | 'CONNECTING'
  | 'LISTENING'
  | 'SPEAKING'
  | 'RECONNECTING_FALLBACK'
  | 'ERROR'
  | 'DISCONNECTED';

export interface ToolExecutionEvent {
  id: string;
  toolName: string;
  args: Record<string, any>;
  summary: string;
  timestamp: string;
  verified: boolean;
  version?: string;
}

export interface AudioTelemetry {
  inputLevel: number;        // 0 to 1 RMS energy from microphone
  outputLevel: number;       // 0 to 1 RMS energy from AI speaker output
  isVoiceDetected: boolean;  // inputLevel >= 0.035 && !isMuted
  isSendingAudio: boolean;   // PCM chunks being sent over WebSocket within last 350ms && inputLevel >= 0.035 && !isMuted
  chunksSent: number;        // Total PCM chunks transmitted
  bytesSent: number;         // Total bytes transmitted
}

export interface GeminiLiveClientOptions {
  primaryModel?: string;
  fallbackChain?: string[];
  onStateChange: (state: LiveConnectionState) => void;
  onError: (error: { code: string; message: string; category?: ModelFailureCategory }) => void;
  onUserTranscript: (text: string) => void;
  onAiTranscript: (text: string) => void;
  onToolExecuted: (event: ToolExecutionEvent) => void;
  onInterrupted: () => void;
  onAudioLevel?: (level: number, isAi: boolean) => void;
  onAudioTelemetry?: (telemetry: AudioTelemetry) => void;
  onAiThinkingChange?: (isThinking: boolean) => void;
  onModelFallback?: (event: ModelSwitchEvent) => void;
  onActiveModelChanged?: (model: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioProcessor: LiveAudioProcessor = new LiveAudioProcessor();
  private options: GeminiLiveClientOptions;
  private state: LiveConnectionState = 'IDLE';
  private animationFrameId: number | null = null;
  private fallbackManager: ModelFallbackManager;
  private isIntentionalDisconnect = false;
  private isSetupConfirmed = false;
  private setupTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private chunksSentCount = 0;
  private bytesSentCount = 0;
  private lastAudioSentTime = 0;
  private isAiThinking = false;

  constructor(options: GeminiLiveClientOptions) {
    this.options = options;
    this.fallbackManager = new ModelFallbackManager(
      options.primaryModel || 'gemini-3.8-live',
      options.fallbackChain
    );
  }

  public getState(): LiveConnectionState {
    return this.state;
  }

  public getActiveModel(): string {
    return this.fallbackManager.getActiveModel();
  }

  public getFallbackManager(): ModelFallbackManager {
    return this.fallbackManager;
  }

  public getAudioProcessor(): LiveAudioProcessor {
    return this.audioProcessor;
  }

  public isSessionSetupConfirmed(): boolean {
    return this.isSetupConfirmed;
  }

  public getIsAiThinking(): boolean {
    return this.isAiThinking;
  }

  private setState(newState: LiveConnectionState) {
    this.state = newState;
    this.options.onStateChange(newState);
  }

  // Fetch short-lived ephemeral token tailored to the active/fallback model
  private async fetchEphemeralToken(targetModel?: string): Promise<{ token: string; model: string }> {
    this.setState('FETCHING_TOKEN');
    const modelToRequest = targetModel || this.fallbackManager.getActiveModel();
    const url = `/api/gemini/token?model=${encodeURIComponent(modelToRequest)}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.success || !data.token) {
      const errCode = data.error || 'TOKEN_FETCH_FAILED';
      const errMsg =
        data.message || 'Failed to acquire short-lived Gemini Live session token from server.';
      throw new Error(`[${errCode}] ${errMsg}`);
    }

    return {
      token: data.token,
      model: data.model || modelToRequest
    };
  }

  // Connect and start genuine Gemini Live session
  public async connect(): Promise<void> {
    try {
      this.isIntentionalDisconnect = false;
      this.disconnect();

      this.chunksSentCount = 0;
      this.bytesSentCount = 0;
      this.lastAudioSentTime = 0;
      this.isAiThinking = false;

      // 1. Request microphone permission and initialize 16kHz audio capture
      this.setState('REQUESTING_MIC');
      await this.audioProcessor.startRecording((base64Chunk) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.audioProcessor.getIsMuted()) {
          this.chunksSentCount++;
          this.bytesSentCount += Math.floor((base64Chunk.length * 3) / 4);
          this.lastAudioSentTime = Date.now();
          const payload = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Chunk
                }
              ]
            }
          };
          this.ws.send(JSON.stringify(payload));
        }
      });

      // 2. Obtain ephemeral token for the active model from server endpoint
      const activeModel = this.fallbackManager.getActiveModel();
      const { token, model } = await this.fetchEphemeralToken(activeModel);

      // 3. Connect to official Gemini Live WebSocket endpoint
      this.setState('CONNECTING');
      console.log(`[GeminiLive:Client] Connecting to Gemini Live WebSocket (Model: ${model})...`);

      // Use BidiGenerateContentConstrained for ephemeral tokens starting with auth_tokens/
      const isConstrained = token.startsWith('auth_tokens/');
      const method = isConstrained ? 'BidiGenerateContentConstrained' : 'BidiGenerateContent';
      const paramName = isConstrained ? 'access_token' : 'key';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.${method}?${paramName}=${encodeURIComponent(
        token
      )}`;

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        console.log(`[GeminiLive:Client] WebSocket open for model: ${model}. Sending setup message and awaiting setupComplete...`);
        const normalizedModel = model.startsWith('models/') ? model : `models/${model}`;

        const setupMessage = {
          setup: {
            model: normalizedModel,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede' // Warm, professional female voice
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: GEMINI_LIVE_SYSTEM_INSTRUCTION }]
            },
            tools: [
              {
                functionDeclarations: GEMINI_LIVE_FUNCTION_DECLARATIONS
              }
            ]
          }
        };

        ws.send(JSON.stringify(setupMessage));

        // Start bounded setup timer (8s)
        this.setupTimeoutTimer = setTimeout(() => {
          if (!this.isSetupConfirmed && this.ws === ws) {
            console.warn(`[GeminiLive:Client] Setup handshake timed out for model: ${model}. Triggering fallback.`);
            ws.close(1002, 'Setup handshake timed out after 8000ms');
          }
        }, 8000);
      };

      ws.onmessage = async (event) => {
        try {
          let textData = '';
          if (typeof event.data === 'string') {
            textData = event.data;
          } else if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            textData = new TextDecoder().decode(event.data);
          }

          if (!textData) return;
          const msg = JSON.parse(textData);
          await this.handleServerMessage(msg);
        } catch (parseErr) {
          console.warn('[GeminiLive:Client] Error parsing server message', parseErr);
        }
      };

      ws.onerror = (e) => {
        console.error('[GeminiLive:Client] WebSocket error:', e);
      };

      ws.onclose = (e) => {
        if (this.setupTimeoutTimer) {
          clearTimeout(this.setupTimeoutTimer);
          this.setupTimeoutTimer = null;
        }

        console.log(`[GeminiLive:Client] WebSocket closed (Code: ${e.code}, Reason: ${e.reason || 'Normal'}, SetupConfirmed: ${this.isSetupConfirmed})`);
        this.stopAudioVisualizerLoop();

        if (this.isIntentionalDisconnect) {
          this.setState('DISCONNECTED');
          return;
        }

        const reason = e.reason || '';
        const category = this.fallbackManager.classifyError(e.code, reason);

        // Check if error warrants fallback to next compatible model
        if (this.fallbackManager.shouldFallback(category)) {
          const switchRes = this.fallbackManager.advanceToFallback(category, reason);
          if (switchRes.switched) {
            console.log(`[GeminiLive:Client] ${switchRes.notice}`);
            this.setState('RECONNECTING_FALLBACK');
            this.options.onModelFallback?.({
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              fromModel: switchRes.fromModel,
              toModel: switchRes.toModel,
              failureCategory: category,
              reason: reason || `Error ${e.code}`,
              retryDelayMs: switchRes.delayMs,
              success: true
            });
            this.options.onActiveModelChanged?.(switchRes.toModel);

            // Clean up playback buffer queue immediately
            this.audioProcessor.stopPlayback();

            setTimeout(() => {
              this.connect();
            }, switchRes.delayMs);
            return;
          }
        }

        // Fatal auth error or exhausted fallbacks
        this.setState('ERROR');
        let userMessage = 'Real-time WebSocket communication closed by Gemini Live server.';
        if (category === 'AUTH_FATAL') {
          userMessage = 'API key authentication failure. Please check your GEMINI_API_KEY in .env.';
        } else if (category === 'QUOTA_EXHAUSTED') {
          userMessage = `Quota exhausted across available voice models (Last attempted: ${activeModel}). Please check your Google AI Studio quota.`;
        } else if (reason) {
          userMessage = reason;
        }

        this.options.onError({
          code: `WS_${e.code}`,
          message: userMessage,
          category
        });
      };
    } catch (err: any) {
      console.error('[GeminiLive:Client] Connection initialization error:', err);
      this.setState('ERROR');
      this.options.onError({
        code: err.name || 'CONNECT_FAILED',
        message: err.message || 'Failed to start Gemini Live voice session.'
      });
      this.disconnect();
    }
  }

  // Simulation method for automated and manual rate-limit / fallback testing
  public simulateFallbackTest(category: ModelFailureCategory, reason: string): boolean {
    if (!this.fallbackManager.shouldFallback(category)) {
      return false;
    }
    const switchRes = this.fallbackManager.advanceToFallback(category, reason);
    if (switchRes.switched) {
      this.setState('RECONNECTING_FALLBACK');
      this.options.onModelFallback?.({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        fromModel: switchRes.fromModel,
        toModel: switchRes.toModel,
        failureCategory: category,
        reason: `[SIMULATED] ${reason}`,
        retryDelayMs: switchRes.delayMs,
        success: true
      });
      this.options.onActiveModelChanged?.(switchRes.toModel);
      this.audioProcessor.stopPlayback();
      setTimeout(() => {
        this.connect();
      }, switchRes.delayMs);
      return true;
    }
    return false;
  }

  // Handle incoming server message from Gemini Live API
  private async handleServerMessage(msg: any): Promise<void> {
    // 0. Setup Complete confirmation from Google Live API
    if (msg.setupComplete) {
      console.log(`[GeminiLive:Client] Setup confirmed by Google Live API for model: ${this.fallbackManager.getActiveModel()}`);
      if (this.setupTimeoutTimer) {
        clearTimeout(this.setupTimeoutTimer);
        this.setupTimeoutTimer = null;
      }
      this.isSetupConfirmed = true;
      this.setState('LISTENING');
      this.options.onActiveModelChanged?.(this.fallbackManager.getActiveModel());
      this.startAudioVisualizerLoop();
      return;
    }

    // 1. Tool Call from Model
    if (msg.toolCall && msg.toolCall.functionCalls) {
      console.log('[GeminiLive:Client] Received Tool Call:', msg.toolCall);
      this.isAiThinking = true;
      this.options.onAiThinkingChange?.(true);
      const functionResponses = [];

      for (const fc of msg.toolCall.functionCalls) {
        const { output, logSummary } = await dispatchLiveToolCall(fc.name, fc.args || {});

        const event: ToolExecutionEvent = {
          id: fc.id || Math.random().toString(36).substring(2, 8),
          toolName: fc.name,
          args: fc.args || {},
          summary: logSummary,
          timestamp: new Date().toLocaleTimeString(),
          verified: output.verified ?? true,
          version: output.metadata?.version
        };
        this.options.onToolExecuted(event);

        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { output }
        });
      }

      // Send synchronous tool response back to Gemini
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const toolResponsePayload = {
          toolResponse: {
            functionResponses
          }
        };
        console.log('[GeminiLive:Client] Sending toolResponse to Gemini:', toolResponsePayload);
        this.ws.send(JSON.stringify(toolResponsePayload));
      }
      return;
    }

    // 2. Server Content (Audio, Text, Transcripts, Interruption)
    if (msg.serverContent) {
      const { modelTurn, interrupted, turnComplete, inputTranscription, outputTranscription } =
        msg.serverContent;

      if (interrupted) {
        console.log('[GeminiLive:Client] User interrupted AI speech. Stopping playback.');
        this.audioProcessor.stopPlayback();
        this.isAiThinking = false;
        this.options.onAiThinkingChange?.(false);
        this.setState('LISTENING');
        this.options.onInterrupted();
      }

      if (inputTranscription && inputTranscription.text) {
        this.options.onUserTranscript(inputTranscription.text);
      }

      if (outputTranscription && outputTranscription.text) {
        this.options.onAiTranscript(outputTranscription.text);
      }

      if (modelTurn && modelTurn.parts) {
        this.isAiThinking = false;
        this.options.onAiThinkingChange?.(false);
        this.setState('SPEAKING');

        for (const part of modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            // Raw 24kHz PCM audio chunk
            this.audioProcessor.playAudioChunk(part.inlineData.data);
          }
          if (part.text) {
            this.options.onAiTranscript(part.text);
          }
        }
      }

      if (turnComplete) {
        this.isAiThinking = false;
        this.options.onAiThinkingChange?.(false);
        this.setState('LISTENING');
      }
    }
  }

  // Audio waveform visualizer pump with real-time telemetry metrics
  private startAudioVisualizerLoop() {
    const inputDataArray = new Uint8Array(32);
    const outputDataArray = new Uint8Array(32);

    const checkAudio = () => {
      let inputLevel = 0;
      let outputLevel = 0;

      if (this.audioProcessor.inputAnalyser && !this.audioProcessor.getIsMuted()) {
        this.audioProcessor.inputAnalyser.getByteFrequencyData(inputDataArray);
        const sum = inputDataArray.reduce((acc, v) => acc + v, 0);
        inputLevel = sum / (inputDataArray.length * 255);
      }

      if (this.audioProcessor.outputAnalyser && this.state === 'SPEAKING') {
        this.audioProcessor.outputAnalyser.getByteFrequencyData(outputDataArray);
        const sum = outputDataArray.reduce((acc, v) => acc + v, 0);
        outputLevel = sum / (outputDataArray.length * 255);
      }

      const isMuted = this.audioProcessor.getIsMuted();
      const isVoiceDetected = !isMuted && inputLevel >= 0.035;
      const isSendingAudio =
        !isMuted &&
        Date.now() - this.lastAudioSentTime < 350 &&
        inputLevel >= 0.035;

      if (this.options.onAudioLevel) {
        if (this.state === 'SPEAKING') {
          this.options.onAudioLevel(outputLevel, true);
        } else {
          this.options.onAudioLevel(inputLevel, false);
        }
      }

      if (this.options.onAudioTelemetry) {
        this.options.onAudioTelemetry({
          inputLevel,
          outputLevel,
          isVoiceDetected,
          isSendingAudio,
          chunksSent: this.chunksSentCount,
          bytesSent: this.bytesSentCount
        });
      }

      this.animationFrameId = requestAnimationFrame(checkAudio);
    };

    this.animationFrameId = requestAnimationFrame(checkAudio);
  }

  private stopAudioVisualizerLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Mute microphone
  public setMute(muted: boolean): void {
    this.audioProcessor.setMute(muted);
  }

  // Get current audio telemetry summary
  public getTelemetry(): AudioTelemetry {
    return {
      inputLevel: 0,
      outputLevel: 0,
      isVoiceDetected: false,
      isSendingAudio: false,
      chunksSent: this.chunksSentCount,
      bytesSent: this.bytesSentCount
    };
  }

  // Disconnect session and release all audio/network resources
  public disconnect(): void {
    this.isIntentionalDisconnect = true;
    if (this.setupTimeoutTimer) {
      clearTimeout(this.setupTimeoutTimer);
      this.setupTimeoutTimer = null;
    }
    this.isSetupConfirmed = false;
    this.stopAudioVisualizerLoop();
    this.audioProcessor.dispose();

    this.chunksSentCount = 0;
    this.bytesSentCount = 0;
    this.lastAudioSentTime = 0;
    this.isAiThinking = false;

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'User ended Gemini Live conversation');
        }
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.setState('IDLE');
  }
}
