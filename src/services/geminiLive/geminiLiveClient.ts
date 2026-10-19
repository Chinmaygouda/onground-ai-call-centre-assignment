import { GEMINI_LIVE_FUNCTION_DECLARATIONS, dispatchLiveToolCall } from './liveTools';
import { GEMINI_LIVE_SYSTEM_INSTRUCTION } from './liveSystemPrompt';
import { LiveAudioProcessor } from './audioProcessor';

export type LiveConnectionState =
  | 'IDLE'
  | 'REQUESTING_MIC'
  | 'FETCHING_TOKEN'
  | 'CONNECTING'
  | 'LISTENING'
  | 'SPEAKING'
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

export interface GeminiLiveClientOptions {
  onStateChange: (state: LiveConnectionState) => void;
  onError: (error: { code: string; message: string }) => void;
  onUserTranscript: (text: string) => void;
  onAiTranscript: (text: string) => void;
  onToolExecuted: (event: ToolExecutionEvent) => void;
  onInterrupted: () => void;
  onAudioLevel?: (level: number, isAi: boolean) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioProcessor: LiveAudioProcessor = new LiveAudioProcessor();
  private options: GeminiLiveClientOptions;
  private state: LiveConnectionState = 'IDLE';
  private animationFrameId: number | null = null;

  constructor(options: GeminiLiveClientOptions) {
    this.options = options;
  }

  public getState(): LiveConnectionState {
    return this.state;
  }

  public getAudioProcessor(): LiveAudioProcessor {
    return this.audioProcessor;
  }

  private setState(newState: LiveConnectionState) {
    this.state = newState;
    this.options.onStateChange(newState);
  }

  // Fetch short-lived ephemeral token from secure server endpoint
  private async fetchEphemeralToken(): Promise<{ token: string; model: string }> {
    this.setState('FETCHING_TOKEN');
    const res = await fetch('/api/gemini/token', { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.success || !data.token) {
      const errCode = data.error || 'TOKEN_FETCH_FAILED';
      const errMsg =
        data.message || 'Failed to acquire short-lived Gemini Live session token from server.';
      throw new Error(`[${errCode}] ${errMsg}`);
    }

    return {
      token: data.token,
      model: data.model || 'gemini-3.8-live'
    };
  }

  // Connect and start genuine Gemini Live session
  public async connect(): Promise<void> {
    try {
      this.disconnect();

      // 1. Request microphone permission and initialize 16kHz audio capture
      this.setState('REQUESTING_MIC');
      await this.audioProcessor.startRecording((base64Chunk) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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

      // 2. Obtain ephemeral token from server endpoint
      const { token, model } = await this.fetchEphemeralToken();

      // 3. Connect to official Gemini Live WebSocket endpoint
      this.setState('CONNECTING');
      console.log(`[GeminiLive:Client] Connecting to Gemini Live WebSocket (Model: ${model})...`);

      // Official WebSocket endpoint with access_token parameter
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${encodeURIComponent(
        token
      )}`;

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        console.log('[GeminiLive:Client] WebSocket connection established. Sending setup message...');
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
        this.setState('LISTENING');
        this.startAudioVisualizerLoop();
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
        this.setState('ERROR');
        this.options.onError({
          code: 'WEBSOCKET_ERROR',
          message: 'Real-time WebSocket communication error with Gemini Live API.'
        });
      };

      ws.onclose = (e) => {
        console.log(`[GeminiLive:Client] WebSocket closed (Code: ${e.code}, Reason: ${e.reason || 'Normal'})`);
        this.stopAudioVisualizerLoop();
        if (this.state !== 'IDLE') {
          this.setState('DISCONNECTED');
        }
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

  // Handle incoming server message from Gemini Live API
  private async handleServerMessage(msg: any): Promise<void> {
    // 1. Tool Call from Model
    if (msg.toolCall && msg.toolCall.functionCalls) {
      console.log('[GeminiLive:Client] Received Tool Call:', msg.toolCall);
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
        this.setState('LISTENING');
      }
    }
  }

  // Audio waveform visualizer pump
  private startAudioVisualizerLoop() {
    const dataArray = new Uint8Array(32);

    const checkAudio = () => {
      if (this.state === 'SPEAKING' && this.audioProcessor.outputAnalyser) {
        this.audioProcessor.outputAnalyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        if (this.options.onAudioLevel) this.options.onAudioLevel(avg / 255, true);
      } else if (this.audioProcessor.inputAnalyser) {
        this.audioProcessor.inputAnalyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        if (this.options.onAudioLevel) this.options.onAudioLevel(avg / 255, false);
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

  // Disconnect session and release all audio/network resources
  public disconnect(): void {
    this.stopAudioVisualizerLoop();
    this.audioProcessor.dispose();

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
