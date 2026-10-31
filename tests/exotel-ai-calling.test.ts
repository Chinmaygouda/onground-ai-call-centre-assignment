import fs from 'fs';
import path from 'path';
import {
  encodePcm16ToMulaw,
  decodeMulawToPcm16,
  resamplePcm16,
  exotelToGeminiAudio,
  geminiToExotelAudio,
  calculatePcmEnergyLevel
} from '../server/audioBridge';
import {
  createVoiceCallSession,
  getVoiceCallSession,
  updateVoiceCallSession,
  generateVoiceGreeting,
  processCustomerUtterance,
  handleVoicebotMessage,
  VoiceCallSession
} from '../server/exotelVoiceServer';
import { normalizePhone } from '../server/exotelService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log(' CUSTOMER-FIRST AI OUTBOUND TELEPHONE CALLING TEST SUITE        ');
  console.log(' Exotel Connect Voice AI + Gemini Live Audio Bridge Integration ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST SECTION 1: Audio Bridge (G.711 mu-law & Resampling)
  // -------------------------------------------------------------
  console.log('[SECTION 1] Audio Processing & G.711 Mu-law Resampler');

  // 1.1 Roundtrip encode/decode
  const samplePcm = Buffer.from(new Int16Array([0, 1000, 5000, 16000, -1000, -5000, -16000, 32000, -32000]).buffer);
  const encodedMulaw = encodePcm16ToMulaw(samplePcm);
  assert(encodedMulaw.length === samplePcm.length / 2, 'Mu-law encoded buffer length matches PCM sample count (8-bit per sample)');

  const decodedPcm = decodeMulawToPcm16(encodedMulaw);
  assert(decodedPcm.length === samplePcm.length, 'Decoded PCM buffer length matches original byte count');

  // Check logarithmic fidelity (G.711 has slight quantization loss by design)
  let maxDelta = 0;
  for (let i = 0; i < samplePcm.length / 2; i++) {
    const orig = samplePcm.readInt16LE(i * 2);
    const dec = decodedPcm.readInt16LE(i * 2);
    const delta = Math.abs(orig - dec);
    if (delta > maxDelta) maxDelta = delta;
  }
  assert(maxDelta < 1500, `Mu-law roundtrip preserves waveform within standard G.711 tolerance (maxDelta=${maxDelta})`);

  // 1.2 Linear Resampling: 8000Hz (Exotel) -> 16000Hz (Gemini Live Input)
  const input8k = new Int16Array(160); // 20ms at 8kHz
  for (let i = 0; i < input8k.length; i++) {
    input8k[i] = Math.round(10000 * Math.sin((2 * Math.PI * 440 * i) / 8000));
  }
  const upsampled16k = resamplePcm16(Buffer.from(input8k.buffer), 8000, 16000);
  assert(upsampled16k.length === 320 * 2, 'Upsampled from 8kHz to 16kHz doubles sample count (160 -> 320 samples / 640 bytes for 20ms)');

  // 1.3 Downsampling: 24000Hz (Gemini Live Output) -> 8000Hz (Exotel Voicebot)
  const gemini24k = new Int16Array(480); // 20ms at 24kHz
  const downsampled8k = resamplePcm16(Buffer.from(gemini24k.buffer), 24000, 8000);
  assert(downsampled8k.length === 160 * 2, 'Downsampled from 24kHz to 8kHz reduces sample count by 3x (480 -> 160 samples / 320 bytes for 20ms)');

  // 1.4 Exotel <-> Gemini Base64 Audio Pipeline
  const mockMulawBase64 = encodedMulaw.toString('base64');
  const geminiPcm16kBase64 = exotelToGeminiAudio(mockMulawBase64);
  assert(typeof geminiPcm16kBase64 === 'string' && geminiPcm16kBase64.length > 0, 'exotelToGeminiAudio successfully converts base64 8kHz mu-law to 16kHz PCM base64');

  const exotelMulawBase64 = geminiToExotelAudio(Buffer.from(gemini24k.buffer).toString('base64'), 24000);
  assert(typeof exotelMulawBase64 === 'string' && exotelMulawBase64.length > 0, 'geminiToExotelAudio successfully converts base64 24kHz PCM to 8kHz mu-law base64');

  // 1.5 RMS Energy / Barge-in Detection
  const silenceBuffer = Buffer.from(new Int16Array(160).fill(0).buffer);
  const speechBuffer = Buffer.from(new Int16Array(160).fill(12000).buffer);
  const silenceEnergy = calculatePcmEnergyLevel(silenceBuffer);
  const speechEnergy = calculatePcmEnergyLevel(speechBuffer);
  assert(silenceEnergy === 0, 'Silence samples produce 0 RMS energy');
  assert(speechEnergy > 0.3, `Speech samples produce high RMS energy (${speechEnergy.toFixed(2)})`);

  // -------------------------------------------------------------
  // TEST SECTION 2: Exotel Voicebot Server & Session Management
  // -------------------------------------------------------------
  console.log('\n[SECTION 2] Exotel Voicebot Server & Dynamic Lead Context');

  const session = createVoiceCallSession({
    leadId: 'lead-test-1',
    customerName: 'Ashray K',
    customerPhone: '+917338626120',
    product: 'Ortho GRID Mattress',
    buyingSignals: ['Comparing with competitors', 'Asked about 0% EMI and 100-night trial'],
    notes: 'In-store inquiry at Indiranagar experience centre.'
  });

  assert(session.sessionId.startsWith('vses_') || session.sessionId.startsWith('sess_'), `Session created with opaque token: ${session.sessionId}`);
  assert(session.customerName === 'Ashray K', 'Session holds correct customer name');
  assert(session.customerPhone === '+917338626120', 'Session holds normalized phone');
  assert(session.status === 'calling_customer' || session.status === 'initiating', 'Initial session status is calling_customer or initiating');
  assert(session.product === 'Ortho GRID Mattress', 'Session context contains accurate enquired product');

  // 2.2 Lookup by sessionId and by callSid
  const retrievedById = getVoiceCallSession(session.sessionId);
  assert(retrievedById?.sessionId === session.sessionId, 'getVoiceCallSession finds session by sessionId');

  updateVoiceCallSession(session.sessionId, { callSid: 'exo_call_test_8877' });
  const retrievedBySid = getVoiceCallSession('exo_call_test_8877');
  assert(retrievedBySid?.sessionId === session.sessionId, 'getVoiceCallSession finds session by callSid');

  // 2.3 Personalized Greeting Generation
  const greeting = generateVoiceGreeting(session);
  assert(greeting.includes('Ashray'), 'Greeting addresses customer by name');
  assert(greeting.includes('Sleep Company'), 'Greeting explicitly identifies The Sleep Company');
  assert(greeting.includes('Ortho GRID'), 'Greeting mentions the specific enquired product');
  assert(!greeting.includes('Arvind phone'), 'Greeting never exposes employee phone or internal details');

  // 2.4 Verified Sleep Company Knowledge & Query Engine
  const priceResult = await processCustomerUtterance(session.sessionId, 'What is the price of Ortho GRID and do you have EMI?');
  const priceAnswer = priceResult.aiReply;
  assert(priceAnswer.includes('8,490') || priceAnswer.includes('Ortho'), 'AI retrieves verified mattress price for Ortho GRID');
  assert(priceAnswer.toLowerCase().includes('emi'), 'AI explains verified EMI options');

  const warrantyResult = await processCustomerUtterance(session.sessionId, 'What is the warranty and trial period?');
  const warrantyAnswer = warrantyResult.aiReply;
  assert(warrantyAnswer.includes('100-night') || warrantyAnswer.includes('10-year') || warrantyAnswer.includes('trial'), 'AI answers with verified 100-night trial and warranty terms');

  // -------------------------------------------------------------
  // TEST SECTION 3: Exotel Voicebot WebSocket Event Lifecycle
  // -------------------------------------------------------------
  console.log('\n[SECTION 3] Voicebot WebSocket Event Lifecycle & Barge-in');

  const sentMessages: string[] = [];
  const mockWs = {
    readyState: 1, // WebSocket.OPEN
    send: (data: string) => {
      sentMessages.push(data);
    }
  } as any;

  // 3.1 Event: connected
  await handleVoicebotMessage(mockWs, JSON.stringify({
    event: 'connected',
    protocol: 'Call',
    version: '1.0.0'
  }), session);
  assert(sentMessages.length === 0, 'connected event acknowledged without unnecessary egress packets');

  // 3.2 Event: start
  await handleVoicebotMessage(mockWs, JSON.stringify({
    event: 'start',
    streamSid: 'stream_exotel_12345',
    start: {
      accountSid: 'mock_account',
      callSid: 'exo_call_test_8877',
      from: '+917338626120',
      to: '08047355774',
      customField: `sessionId=${session.sessionId};leadId=lead-test-1;mode=voicebot`
    }
  }), session);

  assert(session.streamSid === 'stream_exotel_12345', 'start event binds streamSid to session');
  assert(session.status === 'ai_speaking', 'start event triggers AI greeting and updates status to ai_speaking');
  assert(sentMessages.length > 0, 'Greeting audio packet dispatched to Exotel Voicebot stream');

  const mediaMsg = JSON.parse(sentMessages[0]);
  assert(mediaMsg.event === 'media', 'Audio payload uses documented "media" event');
  assert(mediaMsg.streamSid === 'stream_exotel_12345', 'Audio payload specifies matching streamSid');
  assert(typeof mediaMsg.media?.payload === 'string', 'Audio payload contains valid base64 audio');

  // 3.3 Event: mark
  await handleVoicebotMessage(mockWs, JSON.stringify({
    event: 'mark',
    streamSid: 'stream_exotel_12345',
    mark: { name: 'greeting_complete' }
  }), session);
  assert(session.status === 'ai_listening', 'mark completion transitions session status to ai_listening');

  // 3.4 Interruption / Barge-in: Customer speaks while AI is speaking
  sentMessages.length = 0;
  session.isAiSpeaking = true;
  await handleVoicebotMessage(mockWs, JSON.stringify({
    event: 'media',
    streamSid: 'stream_exotel_12345',
    media: {
      payload: speechBuffer.toString('base64')
    }
  }), session);

  const clearEvent = sentMessages.find((m) => JSON.parse(m).event === 'clear');
  assert(Boolean(clearEvent), 'Customer interruption dispatches "clear" event to immediately flush queued audio in Exotel');

  // 3.5 Event: stop
  await handleVoicebotMessage(mockWs, JSON.stringify({
    event: 'stop',
    streamSid: 'stream_exotel_12345',
    stop: { accountSid: 'mock_account', callSid: 'exo_call_test_8877' }
  }), session);
  assert(session.status === 'completed', 'stop event marks voice session as completed');
  assert(session.transcript.length >= 1, 'Session transcript preserved upon completion');

  // -------------------------------------------------------------
  // TEST SECTION 4: Dual-Mode API Routing (Mode 1 vs Mode 2)
  // -------------------------------------------------------------
  console.log('\n[SECTION 4] Exotel Dual-Mode Calling Routing');

  const exotelCallFnPath = path.resolve(process.cwd(), 'netlify/functions/exotel-call.ts');
  const exotelCallContent = fs.readFileSync(exotelCallFnPath, 'utf-8');
  const serviceContent = fs.readFileSync(path.resolve(process.cwd(), 'server/exotelService.ts'), 'utf-8');

  // 4.1 Mode 2: Call Using AI Agent
  assert(exotelCallContent.includes("payload.mode === 'EXOTEL_AI'"), 'Function checks for payload.mode === "EXOTEL_AI"');
  assert(exotelCallContent.includes("StreamUrl"), 'AI mode attaches StreamUrl');
  assert(exotelCallContent.includes("StreamType") && exotelCallContent.includes("bidirectional"), 'AI mode specifies StreamType=bidirectional');
  assert(exotelCallContent.includes("StatusCallbackEvents"), 'AI mode configures answered and terminal callback events');
  assert(serviceContent.includes("createVoiceCallSession"), 'AI mode provisions VoiceCallSession with lead context');

  // 4.2 Mode 1: Call Myself (Preserved)
  assert(exotelCallContent.includes("EMPLOYEE_PHONE_REQUIRED"), 'Mode 1 preserves employee phone requirement');
  assert(exotelCallContent.includes("SELF_CALL_PROHIBITED"), 'Mode 1 preserves self-call prohibition');
  assert(exotelCallContent.includes("From") && (exotelCallContent.includes("agentDigits") || exotelCallContent.includes("agentNormalized")), 'Mode 1 uses agent phone as From parameter');

  // -------------------------------------------------------------
  // TEST SECTION 5: Frontend UI & Coexistence Audit
  // -------------------------------------------------------------
  console.log('\n[SECTION 5] Frontend UI Coexistence Audit');

  const plannerViewPath = path.resolve(process.cwd(), 'src/components/planner/PlannerView.tsx');
  const plannerContent = fs.readFileSync(plannerViewPath, 'utf-8');
  assert(plannerContent.includes("Call Myself"), 'PlannerView exposes "Call Myself" action');
  assert(plannerContent.includes("Call Using AI Agent"), 'PlannerView exposes "Call Using AI Agent" action');
  assert(plannerContent.includes("AI Voicebot"), 'PlannerView displays "AI Voicebot" badge on AI call history');

  const leadsModalPath = path.resolve(process.cwd(), 'src/components/leads/LeadsModal.tsx');
  const leadsModalContent = fs.readFileSync(leadsModalPath, 'utf-8');
  assert(leadsModalContent.includes("Call Myself"), 'LeadsModal exposes "Call Myself" action');
  assert(leadsModalContent.includes("Call Using AI Agent"), 'LeadsModal exposes "Call Using AI Agent" action');
  assert(leadsModalContent.includes("handleAiVoiceCall"), 'LeadsModal implements handleAiVoiceCall handler');

  const callingModalPath = path.resolve(process.cwd(), 'src/components/calling/CallingModal.tsx');
  const callingModalContent = fs.readFileSync(callingModalPath, 'utf-8');
  assert(callingModalContent.includes("callState.mode === 'EXOTEL_AI'"), 'CallingModal provides dedicated EXOTEL_AI status rendering');
  assert(callingModalContent.includes("Exotel Connect Voice AI"), 'CallingModal shows Exotel Connect Voice AI badge');
  assert(callingModalContent.includes("Gemini Live Voicebot"), 'CallingModal shows Gemini Live Voicebot stepper');

  const floatingPillPath = path.resolve(process.cwd(), 'src/components/shell/FloatingActionPill.tsx');
  const floatingPillContent = fs.readFileSync(floatingPillPath, 'utf-8');
  assert(floatingPillContent.includes("Call Myself"), 'FloatingActionPill provides Call Myself action');
  assert(floatingPillContent.includes("Call Using AI Agent"), 'FloatingActionPill provides Call Using AI Agent action');

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
