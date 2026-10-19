/**
 * Browser Speech Recognition Helper for Gemini Live Voice Assistant
 *
 * Provides instant real-time speech-to-text (STT) for microphone input:
 * - Emits partial transcription as the user speaks.
 * - Emits finalized turn when a sentence / speech burst completes.
 * - Runs seamlessly alongside 16kHz PCM audio streaming without locking or competing with getUserMedia.
 * - Graceful fallback in non-supported browsers without crashing or interrupting Gemini Live.
 */

export interface SpeechTranscriptEvent {
  text: string;
  isFinal: boolean;
  timestamp: string;
}

export class BrowserSpeechRecognition {
  private recognition: any = null;
  private isRunning = false;
  private onTranscriptCallback: (event: SpeechTranscriptEvent) => void;
  private onErrorCallback?: (err: string) => void;

  constructor(
    onTranscript: (event: SpeechTranscriptEvent) => void,
    onError?: (err: string) => void
  ) {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.maxAlternatives = 1;
          rec.lang = 'en-IN'; // Default to Indian English, fallback to browser locale

          rec.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res && res[0]) {
                const text = res[0].transcript || '';
                const isFinal = res.isFinal;
                if (text.trim().length > 0) {
                  this.onTranscriptCallback({
                    text: text.trim(),
                    isFinal,
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
              }
            }
          };

          rec.onerror = (event: any) => {
            // 'no-speech' and 'aborted' are benign lifecycle events
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.warn('[BrowserSpeechRecognition] error:', event.error);
              this.onErrorCallback?.(event.error);
            }
          };

          rec.onend = () => {
            // Auto-restart if we should still be actively listening
            if (this.isRunning) {
              try {
                rec.start();
              } catch {
                // Ignore already started / inactive state
              }
            }
          };

          this.recognition = rec;
        } catch (initErr) {
          console.warn('[BrowserSpeechRecognition] Failed to initialize SpeechRecognition:', initErr);
        }
      }
    }
  }

  public start(): void {
    if (!this.recognition || this.isRunning) return;
    this.isRunning = true;
    try {
      this.recognition.start();
      console.log('[BrowserSpeechRecognition] Live Speech-to-Text started');
    } catch {
      // Ignore if already running
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log('[BrowserSpeechRecognition] Live Speech-to-Text stopped');
      } catch {}
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }
}
