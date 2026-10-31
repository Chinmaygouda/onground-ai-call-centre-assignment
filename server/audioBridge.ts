/**
 * Audio Bridge for Exotel Voicebot <-> Gemini Live
 *
 * Implements high-performance, pure TypeScript audio format conversions:
 * 1. ITU-T G.711 Mu-law (PCMU) 8-bit decoding to 16-bit signed Linear PCM
 * 2. 16-bit signed Linear PCM encoding to ITU-T G.711 Mu-law
 * 3. High-quality linear interpolation resampling between telephony (8kHz),
 *    Gemini Live Input (16kHz), and Gemini Live Output (24kHz).
 * 4. Safe base64 payload encoders and decoders.
 */

// G.711 mu-law decoding table (fast 256-entry lookup table)
const MULAW_DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let uVal = ~i & 0xff;
  const t = ((uVal & 0x0f) << 3) + 0x84;
  const sign = uVal & 0x80;
  const exponent = (uVal & 0x70) >> 4;
  let sample = ((t << exponent) - 0x84) << 2;
  MULAW_DECODE_TABLE[i] = sign === 0 ? sample : -sample;
}

/**
 * Decodes an 8-bit mu-law buffer into 16-bit signed linear PCM buffer.
 */
export function decodeMulawToPcm16(mulawBuffer: Buffer | Uint8Array): Buffer {
  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulawBuffer[i]];
    pcmBuffer.writeInt16LE(sample, i * 2);
  }
  return pcmBuffer;
}

/**
 * Encodes a 16-bit signed linear PCM sample into an 8-bit mu-law byte.
 */
export function encodeSampleToMulaw(pcmSample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  let sign = 0;

  if (pcmSample < 0) {
    pcmSample = -pcmSample;
    sign = 0x80;
  }
  if (pcmSample > CLIP) pcmSample = CLIP;

  pcmSample = (pcmSample + BIAS) >> 2;
  let exponent = 7;
  for (let mask = 0x4000; (pcmSample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }

  const mantissa = (pcmSample >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulawByte;
}

/**
 * Encodes a 16-bit signed linear PCM buffer into an 8-bit mu-law buffer.
 */
export function encodePcm16ToMulaw(pcm16Buffer: Buffer | Uint8Array): Buffer {
  const numSamples = Math.floor(pcm16Buffer.length / 2);
  const mulawBuffer = Buffer.alloc(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const sample = pcm16Buffer instanceof Buffer
      ? pcm16Buffer.readInt16LE(i * 2)
      : (pcm16Buffer[i * 2] | (pcm16Buffer[i * 2 + 1] << 8)) << 16 >> 16;
    mulawBuffer[i] = encodeSampleToMulaw(sample);
  }

  return mulawBuffer;
}

/**
 * Resamples 16-bit signed linear PCM audio between any two sample rates using linear interpolation.
 * Default from 8000 Hz to 16000 Hz (2x upsampling for Gemini Live Input)
 * or 24000 Hz to 8000 Hz (3x downsampling for Exotel Output).
 */
export function resamplePcm16(
  inputPcmBuffer: Buffer,
  fromSampleRate: number,
  toSampleRate: number
): Buffer {
  if (fromSampleRate === toSampleRate || inputPcmBuffer.length === 0) {
    return inputPcmBuffer;
  }

  const inputSampleCount = Math.floor(inputPcmBuffer.length / 2);
  const ratio = toSampleRate / fromSampleRate;
  const outputSampleCount = Math.floor(inputSampleCount * ratio);
  const outputBuffer = Buffer.alloc(outputSampleCount * 2);

  for (let i = 0; i < outputSampleCount; i++) {
    const sourcePos = i / ratio;
    const index1 = Math.floor(sourcePos);
    const index2 = Math.min(index1 + 1, inputSampleCount - 1);
    const fraction = sourcePos - index1;

    const sample1 = inputPcmBuffer.readInt16LE(index1 * 2);
    const sample2 = inputPcmBuffer.readInt16LE(index2 * 2);

    const interpolated = Math.round(sample1 + fraction * (sample2 - sample1));
    const clamped = Math.max(-32768, Math.min(32767, interpolated));

    outputBuffer.writeInt16LE(clamped, i * 2);
  }

  return outputBuffer;
}

/**
 * Pipeline 1: Converts incoming Exotel audio (8kHz G.711 mu-law base64)
 * into Gemini Live Input format (16kHz 16-bit Linear PCM base64).
 */
export function exotelToGeminiAudio(base64Payload: string): string {
  const mulaw = Buffer.from(base64Payload, 'base64');
  const pcm8k = decodeMulawToPcm16(mulaw);
  const pcm16k = resamplePcm16(pcm8k, 8000, 16000);
  return pcm16k.toString('base64');
}

/**
 * Pipeline 2: Converts incoming Gemini Live audio (24kHz 16-bit Linear PCM base64)
 * into Exotel Output format (8kHz G.711 mu-law base64).
 */
export function geminiToExotelAudio(base64Payload: string, geminiSampleRate = 24000): string {
  const pcmGemini = Buffer.from(base64Payload, 'base64');
  const pcm8k = resamplePcm16(pcmGemini, geminiSampleRate, 8000);
  const mulaw = encodePcm16ToMulaw(pcm8k);
  return mulaw.toString('base64');
}

/**
 * Utility to calculate Root Mean Square (RMS) energy level (0.0 to 1.0) of 16-bit PCM buffer.
 */
export function calculatePcmEnergyLevel(pcmBuffer: Buffer): number {
  const samples = Math.floor(pcmBuffer.length / 2);
  if (samples === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < samples; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2) / 32768.0;
    sumSquares += sample * sample;
  }

  return Math.min(1.0, Math.sqrt(sumSquares / samples));
}
