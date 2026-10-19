/**
 * Audio Processor for Gemini Live API
 * - Input: Captures microphone audio, resamples to 16kHz mono 16-bit PCM, base64 encodes.
 * - Output: Receives 24kHz mono 16-bit PCM base64 chunks, queues and plays gaplessly.
 * - Interruption: Immediately cancels scheduled buffers upon user interruption.
 */

export class LiveAudioProcessor {
  // Input (Microphone)
  private inputAudioCtx: AudioContext | null = null;
  private inputMediaStream: MediaStream | null = null;
  private inputSourceNode: MediaStreamAudioSourceNode | null = null;
  private inputProcessorNode: ScriptProcessorNode | null = null;
  public inputAnalyser: AnalyserNode | null = null;
  private onAudioChunkCallback?: (base64Pcm: string) => void;

  // Output (Speaker / Model Playback)
  private outputAudioCtx: AudioContext | null = null;
  public outputAnalyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isMuted = false;

  // Start microphone capture and 16kHz PCM streaming
  public async startRecording(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    this.onAudioChunkCallback = onAudioChunk;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    this.inputMediaStream = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    // Use 16000Hz AudioContext if supported, else resample from browser context rate
    this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
    const actualSampleRate = this.inputAudioCtx.sampleRate;

    this.inputAnalyser = this.inputAudioCtx.createAnalyser();
    this.inputAnalyser.fftSize = 64;

    this.inputSourceNode = this.inputAudioCtx.createMediaStreamSource(stream);
    this.inputSourceNode.connect(this.inputAnalyser);

    // Buffer size 2048 samples (approx 128ms chunks at 16kHz)
    const bufferSize = 2048;
    this.inputProcessorNode = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

    this.inputProcessorNode.onaudioprocess = (e) => {
      if (this.isMuted) return;

      const inputChannelData = e.inputBuffer.getChannelData(0);
      let pcm16Data: Int16Array;

      if (actualSampleRate === 16000) {
        pcm16Data = this.floatTo16BitPCM(inputChannelData);
      } else {
        // Resample from actualSampleRate down to 16000
        const resampled = this.downsampleBuffer(inputChannelData, actualSampleRate, 16000);
        pcm16Data = this.floatTo16BitPCM(resampled);
      }

      const base64Chunk = this.arrayBufferToBase64(pcm16Data.buffer);
      if (this.onAudioChunkCallback) {
        this.onAudioChunkCallback(base64Chunk);
      }
    };

    this.inputSourceNode.connect(this.inputProcessorNode);
    // Connect processor to destination to keep audio process event firing in Chrome
    this.inputProcessorNode.connect(this.inputAudioCtx.destination);
  }

  // Initialize playback AudioContext for 24kHz Gemini speech output
  public initPlayback(): void {
    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });
    this.outputAnalyser = this.outputAudioCtx.createAnalyser();
    this.outputAnalyser.fftSize = 64;
    this.outputAnalyser.connect(this.outputAudioCtx.destination);
    this.nextPlayTime = this.outputAudioCtx.currentTime;
  }

  // Enqueue and play a base64 24kHz 16-bit PCM chunk from Gemini
  public playAudioChunk(base64Pcm: string): void {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
      this.initPlayback();
    }
    if (!this.outputAudioCtx) return;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume().catch(() => {});
    }

    const binaryString = atob(base64Pcm);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert 16-bit signed PCM little-endian to Float32 [-1.0, 1.0]
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create 24kHz audio buffer
    const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAnalyser!);

    // Schedule gapless playback
    const startTime = Math.max(this.outputAudioCtx.currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
    };
  }

  // Instantly cancel playback on user interruption
  public stopPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  // Toggle mic mute
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.inputMediaStream) {
      this.inputMediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  // Clean up all resources
  public dispose(): void {
    this.stopPlayback();

    if (this.inputProcessorNode) {
      this.inputProcessorNode.disconnect();
      this.inputProcessorNode = null;
    }
    if (this.inputSourceNode) {
      this.inputSourceNode.disconnect();
      this.inputSourceNode = null;
    }
    if (this.inputMediaStream) {
      this.inputMediaStream.getTracks().forEach((track) => track.stop());
      this.inputMediaStream = null;
    }
    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      this.inputAudioCtx.close().catch(() => {});
      this.inputAudioCtx = null;
    }
    if (this.outputAudioCtx && this.outputAudioCtx.state !== 'closed') {
      this.outputAudioCtx.close().catch(() => {});
      this.outputAudioCtx = null;
    }
    this.inputAnalyser = null;
    this.outputAnalyser = null;
  }

  // Helper: Float32Array to Int16Array PCM
  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  // Helper: Downsample buffer
  private downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
    if (outSampleRate >= sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  // Helper: ArrayBuffer to Base64
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer as ArrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
