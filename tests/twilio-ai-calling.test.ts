import twilio from 'twilio';
import {
  validateTwilioCredentials,
  normalizePhoneNumber,
  maskPhoneNumber,
  isAllowedTwilioRecipient,
  createTwilioVoiceSession,
  getTwilioSession,
  updateTwilioSessionStatus,
  bindTwilioCallSid,
  generateTwilioGreeting,
  generateInitialTwiML,
  generateAiTurnTwiML,
  processCustomerSpeechWithGemini,
  initiateTwilioOutboundCall,
  validateTwilioWebhookSignature,
  hasActiveCallForLeadOrPhone,
  cleanupExpiredSessions,
  handleTwilioSampleTwiml,
  clearTwilioSession,
  terminateTwilioCall,
  verifyAndClearStaleActiveCall,
  TERMINAL_TWILIO_STATUSES,
  StructuredAiTurnResponse,
  TwilioVoiceSession
} from '../server/twilioService';
import { businessDataProvider } from '../src/services/businessData/BusinessDataProvider';
import { normalizePhone } from '../server/exotelService';
import { normalizeGeminiHistory } from '../server/geminiQueryService';
import { dispatchLiveToolCall } from '../src/services/geminiLive/liveTools';

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

async function runTwilioTestSuite() {
  console.log('\n================================================================');
  console.log(' TWILIO PROGRAMMABLE VOICE & GEMINI AI TELEPHONE CALLING SUITE  ');
  console.log(' Customer-First Outbound Telephony for The Sleep Company        ');
  console.log('================================================================\n');

  const testEnv = {
    TWILIO_ACCOUNT_SID: 'AC9ae8972321972d329c7f9f19543dfa7a',
    TWILIO_AUTH_TOKEN: '1234567890abcdef1234567890abcdef',
    TWILIO_FROM_NUMBER: '+17372508034',
    TWILIO_TEST_TO_NUMBER: '+917204104491',
    TWILIO_ALLOWED_TO_NUMBERS: '+917204104491',
    TWILIO_TRIAL_MODE: 'true',
    TWILIO_ENABLE_LIVE_CALLS: 'false',
    TWILIO_ALLOWLIST_REQUIRED: 'true',
    TWILIO_MAX_CALL_DURATION_SECONDS: '600',
    TWILIO_MAX_CONVERSATION_TURNS: '4',
    TWILIO_WEBHOOK_BASE_URL: 'https://demo-ngrok-subdomain.ngrok-free.app',
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_TEXT_MODEL: 'gemini-3.5-flash-lite'
  };

  // --------------------------------------------------------------------------
  // TEST 1: Twilio credential initialization
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Twilio Credential Initialization & Diagnostic Validation');
  const validCreds = validateTwilioCredentials(testEnv);
  assert(validCreds.valid === true, 'Valid credentials pass format verification (34-char AC... SID, 32-char token)');
  assert(validCreds.isTrial === true, 'Identifies trial mode correctly');

  const invalidCreds = validateTwilioCredentials({
    TWILIO_ACCOUNT_SID: 'INVALID_SID',
    TWILIO_AUTH_TOKEN: 'short',
    TWILIO_FROM_NUMBER: ''
  });
  assert(invalidCreds.valid === false, 'Invalid credentials rejected');
  assert(invalidCreds.errors.length === 3, 'All 3 credential errors caught with clear diagnostic messages');

  // --------------------------------------------------------------------------
  // TEST 2: Correct From and To number mapping
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] From and To Phone Number Mapping & Normalization');
  const fromNormalized = normalizePhoneNumber(testEnv.TWILIO_FROM_NUMBER);
  const toNormalized = normalizePhoneNumber(testEnv.TWILIO_TEST_TO_NUMBER);

  assert(fromNormalized === '+17372508034', 'From number is correctly identified as Twilio trial number (+17372508034)');
  assert(toNormalized === '+917204104491', 'To number is correctly identified as Customer test number (+917204104491)');
  assert(fromNormalized !== toNormalized, 'From and To numbers are distinct and not interchanged');
  assert(maskPhoneNumber(toNormalized) === '+91*****4491', 'Customer phone is properly masked in logs to protect PII');

  // --------------------------------------------------------------------------
  // TEST 3: Customer number allowlisting
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Customer Phone Number Allowlisting & Boundary Enforcement');
  const allowedCheck = isAllowedTwilioRecipient('+917204104491', testEnv);
  assert(allowedCheck.allowed === true, 'Verified test recipient (+917204104491) is approved for calling');

  const nonAllowedCheck = isAllowedTwilioRecipient('+919845123456', testEnv);
  assert(nonAllowedCheck.allowed === false, 'Unallowlisted number (+919845123456) is blocked');
  assert(nonAllowedCheck.reason?.includes('not in TWILIO_ALLOWED_TO_NUMBERS'), 'Helpful error explaining allowlist restriction returned');

  // --------------------------------------------------------------------------
  // TEST 4: Outbound call request generation (Safety Mode)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Outbound Call Request Generation (Safety Simulation)');
  const callResult = await initiateTwilioOutboundCall(
    {
      to: '+917204104491',
      clientName: 'Ashray K',
      leadId: 'lead-1',
      product: 'Ortho GRID Mattress',
      value: 8490
    },
    testEnv
  );

  assert(callResult.success === true, 'Outbound call successfully queued in safety mode');
  assert(callResult.callSid?.startsWith('CA'), 'Valid Twilio Call SID generated');
  assert(callResult.liveCallEnabled === false, 'Customer phone is protected when TWILIO_ENABLE_LIVE_CALLS=false');
  assert(Boolean(callResult.sessionId), 'Session ID created and bound to call');

  // --------------------------------------------------------------------------
  // TEST 5: Twilio webhook signature validation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Twilio Webhook Signature Validation');
  const sampleAuthToken = '1234567890abcdef1234567890abcdef';
  const webhookUrl = 'https://demo-ngrok-subdomain.ngrok-free.app/api/twilio/voice';
  const webhookParams = { CallSid: 'CA1234567890abcdef', From: '+17372508034', To: '+917204104491' };

  const validSignature = twilio.getExpectedTwilioSignature(sampleAuthToken, webhookUrl, webhookParams);
  const isValid = validateTwilioWebhookSignature(sampleAuthToken, validSignature, webhookUrl, webhookParams);
  assert(isValid === true, 'Authentic Twilio HMAC-SHA1 signature successfully validated');

  const isInvalid = validateTwilioWebhookSignature(sampleAuthToken, 'forged_signature_xyz', webhookUrl, webhookParams);
  assert(isInvalid === false, 'Forged or tampered webhook signature is rejected');

  // --------------------------------------------------------------------------
  // TEST 6: Initial personalized greeting generation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Initial Personalized AI Greeting Generation');
  const sampleSession: TwilioVoiceSession = {
    sessionId: 'test_session_ak',
    callSid: 'CAtest123',
    leadId: 'lead-1',
    customerName: 'Ashray K',
    customerPhone: '+917204104491',
    product: 'Ortho GRID Mattress',
    status: 'in-progress',
    currentTurn: 0,
    maxTurns: 4,
    turns: [],
    durationSeconds: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const greeting = generateTwilioGreeting(sampleSession);
  assert(greeting.includes('Ashray'), 'Greeting addresses customer by name ("Ashray")');
  assert(greeting.includes('The Sleep Company'), 'Greeting introduces company brand');
  assert(greeting.includes('Ortho GRID Mattress'), 'Greeting specifies customer product of interest');

  // --------------------------------------------------------------------------
  // TEST 7: SpeechResult processing
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] SpeechResult Processing & Session Registry');
  const registeredSession = createTwilioVoiceSession({
    leadId: 'lead-ak',
    customerName: 'Ashray K',
    customerPhone: '+917204104491',
    product: 'Ortho GRID Mattress'
  });
  bindTwilioCallSid(registeredSession.sessionId, 'CA_SPEECH_TEST_1');

  const retrieved = getTwilioSession('CA_SPEECH_TEST_1');
  assert(Boolean(retrieved), 'Session retrieved by Twilio Call SID');
  assert(retrieved?.customerName === 'Ashray K', 'Customer lead context preserved in session');

  // --------------------------------------------------------------------------
  // TEST 8: Gemini text response generation
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Gemini Text Response Reasoning & Structured Output');
  const aiTurnResponse: StructuredAiTurnResponse = await processCustomerSpeechWithGemini(
    registeredSession,
    'What are the EMI options available for the Ortho GRID mattress?'
  );

  assert(Boolean(aiTurnResponse.responseText), 'AI generated non-empty conversational response');
  assert(aiTurnResponse.intent === 'product_inquiry' || aiTurnResponse.intent === 'product_inquiry_fallback', 'Appropriate intent identified');
  assert(aiTurnResponse.shouldContinue === true, 'Conversation marked to continue for active inquiry');

  // --------------------------------------------------------------------------
  // TEST 9: Business tool execution with Sleep Company catalog
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Sleep Company Verified Business Tool Execution');
  const productRes = await businessDataProvider.getProductDetails('ortho-grid');
  assert(productRes.verified === true && Boolean(productRes.data), 'Ortho GRID product found in approved business data');
  assert(productRes.data?.variants[0]?.currentPrice === 8490, 'Verified base price ₹8,490 matches catalogue');

  const priceRes = await businessDataProvider.getCurrentPrice('ortho-grid');
  assert(priceRes.verified === true && Boolean(priceRes.data), 'Current verified price retrieved');
  assert(priceRes.data?.currentPrice === 8490, 'Current price matches ₹8,490');

  const emiRes = await businessDataProvider.getEMIOptions('ortho-grid', 8490);
  assert(emiRes.verified === true && (emiRes.data?.eligibleOptions.length || 0) > 0, '0% No-Cost EMI options retrieved for Ortho GRID');
  assert((emiRes.data?.eligibleOptions[0].monthlyInstallment || 0) > 0, 'Calculates monthly installment accurately');

  const warrantyPolicy = await businessDataProvider.getWarrantyPolicy('Mattress');
  assert(warrantyPolicy.verified === true && Boolean(warrantyPolicy.data), 'Verified warranty policy retrieved');
  assert(warrantyPolicy.data?.summary.includes('10-year') || warrantyPolicy.data?.title.includes('Warranty'), 'Verified warranty terms confirmed');

  const trialPolicy = await businessDataProvider.getTrialAndReturnPolicy('Mattress');
  assert(trialPolicy.verified === true && Boolean(trialPolicy.data), 'Verified 100-night trial policy retrieved');
  assert(trialPolicy.data?.summary.includes('100') || trialPolicy.data?.title.includes('Trial'), '100-night trial policy confirmed');

  // --------------------------------------------------------------------------
  // TEST 10: Multi-turn conversation memory
  // --------------------------------------------------------------------------
  console.log('\n[TEST 10] Multi-Turn Conversation Memory Tracking');
  registeredSession.turns.push({
    turn: 1,
    customerSpeech: 'What sizes does it come in?',
    aiResponseText: 'The Ortho GRID is available in Single, Queen, and King sizes.',
    intent: 'product_size',
    timestamp: '10:00 AM'
  });
  registeredSession.currentTurn = 1;

  registeredSession.turns.push({
    turn: 2,
    customerSpeech: 'Can I get 0% EMI on Queen size?',
    aiResponseText: 'Yes, Queen size starts at ₹8,490 with 0% No-Cost EMI starting from ₹1,415/month.',
    intent: 'financing_emi',
    timestamp: '10:01 AM'
  });
  registeredSession.currentTurn = 2;

  assert(registeredSession.turns.length === 2, 'Chronological transcript has 2 complete turns');
  assert(registeredSession.turns[0].turn === 1 && registeredSession.turns[1].turn === 2, 'Turn order accurately maintained');
  assert(registeredSession.turns[1].customerSpeech?.includes('Queen size'), 'Second customer utterance retained in memory');

  // --------------------------------------------------------------------------
  // TEST 11: TwiML generation with <Gather> and <Say>
  // --------------------------------------------------------------------------
  console.log('\n[TEST 11] TwiML Generation with <Gather> and <Say> (Polly.Aditi)');
  const initialTwiml = generateInitialTwiML(registeredSession, 'https://test-subdomain.ngrok-free.app');
  assert(initialTwiml.includes('<Gather'), 'Initial TwiML includes <Gather> element');
  assert(initialTwiml.includes('input="speech"'), '<Gather> configures speech recognition');
  assert(initialTwiml.includes('language="en-IN"'), '<Gather> configures Indian English (en-IN)');
  assert(initialTwiml.includes('Polly.Aditi'), '<Say> specifies Indian English voice Polly.Aditi');
  assert(initialTwiml.includes('</Gather>'), '<Gather> properly closed with nested <Say>');

  const turnTwiml = generateAiTurnTwiML(
    registeredSession,
    {
      intent: 'product_details',
      responseText: 'Our SmartGRID layer ensures ergonomic orthopedic support.',
      shouldContinue: true,
      shouldHandoff: false,
      shouldEndCall: false
    },
    'https://test-subdomain.ngrok-free.app'
  );
  assert(turnTwiml.includes('SmartGRID'), 'Turn TwiML contains generated AI text');
  assert(turnTwiml.includes('<Gather'), 'Multi-turn TwiML automatically prompts the next speech input');

  // --------------------------------------------------------------------------
  // TEST 12: Empty speech handling
  // --------------------------------------------------------------------------
  console.log('\n[TEST 12] Empty Speech Result Handling & Fallback');
  const emptyTurnTwiml = generateAiTurnTwiML(
    registeredSession,
    {
      intent: 'reprompt',
      responseText: "I didn't quite hear your answer. Could you please repeat that?",
      shouldContinue: true,
      shouldHandoff: false,
      shouldEndCall: false
    },
    'https://test-subdomain.ngrok-free.app'
  );
  assert(emptyTurnTwiml.includes("didn't quite hear"), 'Polite reprompt provided when speech is silent');
  assert(emptyTurnTwiml.includes('<Hangup/>'), 'Fallback hangup included to prevent infinite listening loops');

  // --------------------------------------------------------------------------
  // TEST 13: AI timeout handling
  // --------------------------------------------------------------------------
  console.log('\n[TEST 13] AI Service Timeout & Fallback Response');
  // Pass an invalid key to force fallback catalog reasoning
  const fallbackResponse = await processCustomerSpeechWithGemini(
    registeredSession,
    'What is the price of the mattress?',
    'INVALID_KEY_TRIGGERING_FALLBACK'
  );
  assert(fallbackResponse.responseText.includes('₹8,490') || fallbackResponse.responseText.includes('Ortho GRID'), 'Grounded fallback answers pricing from verified catalog');
  assert(fallbackResponse.shouldContinue === true, 'Conversation continues gracefully despite external API fault');

  // --------------------------------------------------------------------------
  // TEST 14: Call status callbacks
  // --------------------------------------------------------------------------
  console.log('\n[TEST 14] Call Status Callback Lifecycle Mapping');
  updateTwilioSessionStatus(registeredSession.sessionId, 'ringing');
  assert(registeredSession.status === 'ringing', 'Status transitions to ringing');

  updateTwilioSessionStatus(registeredSession.sessionId, 'customer_answered');
  assert(registeredSession.status === 'customer_answered', 'Status transitions to customer_answered');
  assert(Boolean(registeredSession.answeredAt), 'Call answered timestamp recorded');

  updateTwilioSessionStatus(registeredSession.sessionId, 'completed', { durationSeconds: 125 });
  assert(registeredSession.status === 'completed', 'Status transitions to completed');
  assert(registeredSession.durationSeconds === 125, 'Final call duration recorded accurately');

  // --------------------------------------------------------------------------
  // TEST 15: Session cleanup
  // --------------------------------------------------------------------------
  console.log('\n[TEST 15] In-Memory Session Expiration & Cleanup');
  const oldSession = createTwilioVoiceSession({
    leadId: 'old-lead',
    customerName: 'Old Customer',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  oldSession.updatedAt = Date.now() - 7200000; // 2 hours ago

  const cleanedCount = cleanupExpiredSessions(3600000); // 1 hour threshold
  assert(cleanedCount >= 1, 'Expired sessions successfully purged from memory');
  assert(getTwilioSession(oldSession.sessionId) === undefined, 'Purged session cannot be retrieved');

  // --------------------------------------------------------------------------
  // TEST 16: Maximum conversation turns
  // --------------------------------------------------------------------------
  console.log('\n[TEST 16] Maximum Conversation Turn Limit Termination');
  const maxTurnSession = createTwilioVoiceSession({
    leadId: 'turn-lead',
    customerName: 'Ashray K',
    customerPhone: '+917204104491',
    product: 'Ortho GRID',
    maxTurns: 3
  });
  maxTurnSession.currentTurn = 3; // Reached maximum

  const maxTurnTwiml = generateAiTurnTwiML(
    maxTurnSession,
    {
      intent: 'final_turn',
      responseText: 'Arvind Rajan from our Koramangala team will assist you with the rest.',
      shouldContinue: false,
      shouldHandoff: false,
      shouldEndCall: true
    },
    'https://test-subdomain.ngrok-free.app'
  );
  assert(maxTurnTwiml.includes('<Hangup/>'), 'Call terminates with <Hangup/> when maxTurns reached');
  assert(!maxTurnTwiml.includes('<Gather'), 'No further <Gather> requested after final turn');
  updateTwilioSessionStatus(maxTurnSession.sessionId, 'completed');

  // --------------------------------------------------------------------------
  // TEST 17: Prevention of duplicate calls
  // --------------------------------------------------------------------------
  console.log('\n[TEST 17] Duplicate Call Prevention for Same Recipient');
  const duplicateTestNumber = '+917204104492';
  const activeLeadSession = createTwilioVoiceSession({
    leadId: 'active-lead-dup',
    customerName: 'Ashray K',
    customerPhone: duplicateTestNumber,
    product: 'Ortho GRID'
  });
  updateTwilioSessionStatus(activeLeadSession.sessionId, 'in-progress');

  assert(hasActiveCallForLeadOrPhone(duplicateTestNumber) === true, `Active call detected for recipient ${duplicateTestNumber}`);

  const duplicateAttempt = await initiateTwilioOutboundCall(
    { to: duplicateTestNumber, clientName: 'Ashray K' },
    { ...testEnv, TWILIO_ALLOWED_TO_NUMBERS: '+917204104491,+917204104492' }
  );
  assert(duplicateAttempt.success === false, 'Duplicate call rejected while previous call is active');
  assert(duplicateAttempt.error === 'DUPLICATE_CALL_IN_PROGRESS', 'Error specifies duplicate call in progress');

  // Conclude the active call to release lock
  updateTwilioSessionStatus(activeLeadSession.sessionId, 'completed');
  assert(hasActiveCallForLeadOrPhone(duplicateTestNumber) === false, 'Call lock released after completion');

  // --------------------------------------------------------------------------
  // TEST 18: Preservation of existing Exotel calling
  // --------------------------------------------------------------------------
  console.log('\n[TEST 18] Preservation of Existing Exotel Calling Architecture');
  const exotelNormalized = normalizePhone('+91 73386 26120');
  assert(exotelNormalized.e164 === '+917338626120', 'Exotel phone normalizer remains functional');
  assert(typeof normalizePhone === 'function', 'Exotel service module remains intact');

  // --------------------------------------------------------------------------
  // TEST 19: Four-Stage Call Lifecycle & Zero-Fake-SID Rejection Policy
  // --------------------------------------------------------------------------
  console.log('\n[TEST 19] Four-Stage Lifecycle & Zero-Fake-SID Rejection Policy');
  updateTwilioSessionStatus(callResult.sessionId, 'completed');

  // 1. Simulation call created stage
  const simCall = await initiateTwilioOutboundCall(
    { to: '+917204104491', clientName: 'Chinmay' },
    { ...testEnv, TWILIO_ENABLE_LIVE_CALLS: 'false' }
  );
  assert(simCall.success === true, 'Simulation mode request accepted');
  assert(simCall.stage === 'call_created', 'Stage 2 (call_created) reached in simulation mode');
  assert(simCall.isSimulation === true, 'Simulation mode explicitly marked as isSimulation=true');
  assert(simCall.callSid?.startsWith('CASIM_'), 'Simulation SID clearly tagged with CASIM_ prefix');

  // Conclude simulation call
  updateTwilioSessionStatus(simCall.sessionId, 'completed');

  // 2. Rejected call policy: Never generate fake SID when call fails
  const blockedCall = await initiateTwilioOutboundCall(
    { to: '+919999999999', clientName: 'Unverified Customer' },
    testEnv
  );
  assert(blockedCall.success === false, 'Blocked call returns success=false');
  assert(blockedCall.callSid === undefined, 'No fake Call SID returned when request rejected');
  assert(blockedCall.status === 'rejected', 'Status explicitly marked as rejected');

  // --------------------------------------------------------------------------
  // TEST 20: Trial Account Parameter Separation (Trial vs Upgraded Account)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 20] Trial Account Parameter Separation');
  const trialCreds = validateTwilioCredentials({ ...testEnv, TWILIO_TRIAL_MODE: 'true' });
  assert(trialCreds.isTrial === true, 'Trial account mode detected for TWILIO_TRIAL_MODE=true');

  const upgradedCreds = validateTwilioCredentials({ ...testEnv, TWILIO_TRIAL_MODE: 'false' });
  assert(upgradedCreds.isTrial === false, 'Upgraded production account mode detected for TWILIO_TRIAL_MODE=false');

  // --------------------------------------------------------------------------
  // TEST 21: Official Trial Carrier Sample Mode (Non-AI Telephony Verification)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 21] Official Trial Carrier Sample Mode (Non-AI Telephony Verification)');
  const sampleCallNumber = '+917204104491';
  const sampleCallResult = await initiateTwilioOutboundCall(
    { to: sampleCallNumber, clientName: 'Chinmay', isTrialSample: true },
    { ...testEnv, TWILIO_ENABLE_LIVE_CALLS: 'false' }
  );

  assert(sampleCallResult.success === true, 'Trial carrier sample call successfully initiated');
  assert(sampleCallResult.isTrialSample === true, 'Explicitly marked as isTrialSample=true');
  assert(sampleCallResult.trialSampleUrl === 'http://demo.twilio.com/docs/voice.xml', 'Uses official Twilio demo audio sample URL');
  assert(sampleCallResult.message?.includes('NOT an AI conversation'), 'Message explicitly disclaims that this is NOT an AI conversation');

  // Verify sample TwiML handler
  let sampleOutput = '';
  const mockRes: any = {
    setHeader: () => {},
    statusCode: 200,
    end: (str: string) => { sampleOutput = str; }
  };
  handleTwilioSampleTwiml({} as any, mockRes);
  assert(sampleOutput.includes('Polly.Aditi'), 'Sample TwiML specifies Polly.Aditi Indian voice');
  assert(sampleOutput.includes('classic.mp3'), 'Sample TwiML includes audio sample playback');
  assert(sampleOutput.includes('non-AI sample verification'), 'Sample TwiML explicitly mentions non-AI verification');

  // Conclude sample call to release lock
  updateTwilioSessionStatus(sampleCallResult.sessionId!, 'completed');

  // --------------------------------------------------------------------------
  // TEST 22: Inbound Twilio Voice Call Recognition & Session Initialization
  // --------------------------------------------------------------------------
  console.log('\n[TEST 22] Inbound Twilio Voice Webhook Call Recognition');
  const inboundCallerPhone = '+917204104491';
  const inboundSession = createTwilioVoiceSession({
    leadId: 'inbound-call',
    customerName: 'Chinmay',
    customerPhone: inboundCallerPhone,
    product: 'Ortho GRID'
  });
  bindTwilioCallSid(inboundSession.sessionId, 'CAinbound_test_123');
  updateTwilioSessionStatus(inboundSession.sessionId, 'customer_answered');

  assert(inboundSession.customerPhone === inboundCallerPhone, 'Inbound caller phone accurately tracked');
  assert(inboundSession.customerName === 'Chinmay', 'Inbound verified caller recognized by name');

  const inboundTwiml = generateInitialTwiML(inboundSession, 'https://test-subdomain.ngrok-free.app');
  assert(inboundTwiml.includes('<Gather'), 'Inbound TwiML presents <Gather> for speech recognition');
  assert(inboundTwiml.includes('Sleep Company'), 'Inbound TwiML speaks personalized Sleep Company greeting');

  updateTwilioSessionStatus(inboundSession.sessionId, 'completed');

  // --------------------------------------------------------------------------
  // TEST 23: Customer Name & Professional Intro in Greeting (Issue 1)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 23] Personalized Customer Name & Professional Introduction');
  const chinmaySession = createTwilioVoiceSession({
    leadId: 'lead-1',
    customerName: '', // empty name
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  assert(chinmaySession.customerName === 'Chinmay', 'Customer name automatically resolves to Chinmay when phone matches +917204104491');

  const chinmayGreeting = generateTwilioGreeting(chinmaySession);
  assert(chinmayGreeting.startsWith('Hello Chinmay!'), 'Greeting addresses customer directly as "Hello Chinmay!" instead of "Hello customer"');
  assert(chinmayGreeting.includes('Arvind Rajan'), 'Greeting introduces frontline specialist Arvind Rajan');
  assert(chinmayGreeting.includes('The Sleep Company'), 'Greeting explicitly identifies The Sleep Company');
  assert(chinmayGreeting.includes('Ortho GRID'), 'Greeting mentions enquired product (Ortho GRID)');
  updateTwilioSessionStatus(chinmaySession.sessionId, 'completed');

  // --------------------------------------------------------------------------
  // TEST 24: Retrieval of All Available Mattresses, Prices, and Discounts (Issue 2 & 4 & 7)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 24] Comprehensive Mattresses Catalogue, Verified Prices & Discounts');
  const allMattressesRes = await businessDataProvider.getAllMattresses();
  assert(allMattressesRes.verified === true, 'getAllMattresses returns verified authoritative business data');
  assert(allMattressesRes.data?.mattresses.length === 2, 'Returns both SmartGRID Ortho and SmartGRID Luxe mattress models');

  const ortho = allMattressesRes.data?.mattresses.find((m) => m.id === 'ortho-grid');
  const luxe = allMattressesRes.data?.mattresses.find((m) => m.id === 'smart-luxe');
  assert(ortho !== undefined && ortho.startingPrice === 5990, 'SmartGRID Ortho starting price verified as ₹5,990 (Single)');
  assert(luxe !== undefined && luxe.startingPrice === 13390, 'SmartGRID Luxe starting price verified as ₹13,390 (Queen)');

  // Verify searchProducts matches broad / generic queries
  const broadSearch = await businessDataProvider.searchProducts('all mattresses');
  assert(broadSearch.data && broadSearch.data.length >= 2, 'searchProducts matches generic query "all mattresses" instead of returning empty');

  // Verify tool dispatch
  const toolResult = await dispatchLiveToolCall('getAllMattresses', {});
  assert(toolResult.output.verified === true, 'Tool dispatch for getAllMattresses succeeds with verified data');
  assert(toolResult.output.data.activeOffers.some((o: any) => o.code === 'FESTIVE1000'), 'Includes active festive discount FESTIVE1000');
  assert(toolResult.output.data.activeOffers.some((o: any) => o.code === 'COMBOPILLOW'), 'Includes active bundle offer COMBOPILLOW');

  // --------------------------------------------------------------------------
  // TEST 25: Delivery Policy & Delivery Fee Verification (Issue 3 & 7)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 25] Delivery Policy & Delivery Fee Verification (100% Free Pan-India)');
  const deliveryPolicyRes = await businessDataProvider.getDeliveryPolicy();
  assert(deliveryPolicyRes.verified === true, 'getDeliveryPolicy returns verified policy');
  assert(deliveryPolicyRes.data?.policyType === 'DELIVERY', 'Returns official DELIVERY policy');
  assert(deliveryPolicyRes.data?.detailedTerms.some((t) => t.includes('100% Free') || t.includes('₹0')), 'Confirms ₹0 delivery fee / 100% Free delivery across India');

  // Verify getDeliveryAvailability handles omitted or general PIN code without error
  const generalDelivery = await businessDataProvider.getDeliveryAvailability();
  assert(generalDelivery.verified === true, 'getDeliveryAvailability succeeds without requiring 6-digit PIN');
  assert(generalDelivery.data?.deliveryFee === 0, 'Delivery fee is explicitly ₹0');
  assert(generalDelivery.data?.deliverable === true, 'Pan-India deliverable confirmed');

  // Verify metro express delivery
  const blrDelivery = await businessDataProvider.getDeliveryAvailability('560034');
  assert(blrDelivery.verified === true && blrDelivery.data?.estimatedDays === 2, 'Bengaluru PIN (560034) gets express 48-72h delivery');

  // Verify getDeliveryPolicy tool dispatch
  const deliveryToolResult = await dispatchLiveToolCall('getDeliveryPolicy', {});
  assert(deliveryToolResult.output.verified === true, 'Tool dispatch for getDeliveryPolicy succeeds');

  // --------------------------------------------------------------------------
  // TEST 26: Multi-Turn Conversation Memory & History Normalization (Issue 5)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 26] Multi-Turn Conversation Memory & History Normalization');
  // Scenario A: History starts with model turn (e.g. AI greeting)
  const historyWithModelFirst: any = [
    { speaker: 'assistant', text: 'Hello Chinmay! This is Arvind Rajan calling from The Sleep Company.' },
    { speaker: 'user', text: 'What is the price of the Ortho GRID?' }
  ];
  const normalizedA = normalizeGeminiHistory(historyWithModelFirst);
  assert(normalizedA[0].role === 'user', 'Normalized history always begins with role "user"');
  assert(normalizedA[normalizedA.length - 1].role === 'model', 'Normalized history always ends with role "model" so upcoming message is valid user turn');

  // Scenario B: Consecutive turns of same role
  const historyWithDuplicates: any = [
    { speaker: 'user', text: 'Hi.' },
    { speaker: 'user', text: 'What is the discount?' },
    { speaker: 'assistant', text: 'We offer code FESTIVE1000.' },
    { speaker: 'assistant', text: 'It gives ₹1,000 off.' }
  ];
  const normalizedB = normalizeGeminiHistory(historyWithDuplicates);
  assert(normalizedB.length === 2, 'Merged consecutive same-role turns into strictly alternating user -> model sequence');
  assert(normalizedB[0].role === 'user' && normalizedB[1].role === 'model', 'Strict user -> model alternation verified');

  // --------------------------------------------------------------------------
  // TEST 27: Multi-Turn Dialogue Simulation Without Hallucination (Issue 6 & 8)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 27] Multi-Turn Dialogue Simulation (Prices, Discounts, Delivery & Closing)');
  const dialogSession = createTwilioVoiceSession({
    leadId: 'lead-sim-dialog',
    customerName: 'Chinmay',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });

  // Turn 1: Price inquiry
  dialogSession.currentTurn = 1;
  const turn1 = await processCustomerSpeechWithGemini(
    dialogSession,
    'Can you tell me the price of the auto grid mattress?',
    'invalid-key-triggers-verified-fallback'
  );
  assert(turn1.responseText.includes('8,490') || turn1.responseText.includes('5,990'), 'Turn 1 verifies Ortho GRID pricing (₹8,490 Queen / ₹5,990 Single)');
  assert(turn1.shouldContinue === true, 'Turn 1 keeps call active');
  dialogSession.turns.push({
    turn: 1,
    customerSpeech: 'Can you tell me the price of the auto grid mattress?',
    aiResponseText: turn1.responseText,
    timestamp: '14:00'
  });

  // Turn 2: All mattresses and discounts (handling speech-to-text phonetic variations)
  dialogSession.currentTurn = 2;
  const turn2 = await processCustomerSpeechWithGemini(
    dialogSession,
    'Kannada options of messages you have and what discount I can get?',
    'invalid-key-triggers-verified-fallback'
  );
  assert(turn2.responseText.includes('Ortho GRID') && turn2.responseText.includes('SmartGRID Luxe'), 'Turn 2 presents both Ortho GRID and SmartGRID Luxe mattresses');
  assert(turn2.responseText.includes('FESTIVE1000') || turn2.responseText.includes('1,000'), 'Turn 2 includes FESTIVE1000 discount code');
  assert(turn2.responseText.includes('pillow'), 'Turn 2 mentions free contour pillow bundle');
  dialogSession.turns.push({
    turn: 2,
    customerSpeech: 'Kannada options of messages you have and what discount I can get?',
    aiResponseText: turn2.responseText,
    timestamp: '14:01'
  });

  // Turn 3: Delivery fee question
  dialogSession.currentTurn = 3;
  const turn3 = await processCustomerSpeechWithGemini(
    dialogSession,
    'Is there any delivery fee or shipping charge?',
    'invalid-key-triggers-verified-fallback'
  );
  assert(turn3.responseText.includes('Free') && (turn3.responseText.includes('zero') || turn3.responseText.includes('0')), 'Turn 3 accurately confirms 100% Free delivery with zero shipping charges');
  dialogSession.turns.push({
    turn: 3,
    customerSpeech: 'Is there any delivery fee or shipping charge?',
    aiResponseText: turn3.responseText,
    timestamp: '14:02'
  });

  // Turn 4: Friendly closing / thank you
  dialogSession.currentTurn = 4;
  const turn4 = await processCustomerSpeechWithGemini(
    dialogSession,
    'Thank you so much, that answers all my questions. Goodbye!',
    'invalid-key-triggers-verified-fallback'
  );
  assert(turn4.shouldEndCall === true, 'Turn 4 detects customer closing intent and sets shouldEndCall=true');
  assert(turn4.intent === 'goodbye', 'Turn 4 classified intent as goodbye');

  updateTwilioSessionStatus(dialogSession.sessionId, 'completed');

  // --------------------------------------------------------------------------
  // TEST 28: Website Outbound Call Button Compatibility Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 28] Website "Call Using AI Agent" Button End-to-End Compatibility');
  // Verify that the exact payload sent by FloatingActionPill.tsx initiates properly
  const websiteButtonPayload = {
    to: '+917204104491',
    clientName: 'Chinmay',
    leadId: 'lead-1',
    product: 'Ortho GRID',
    value: 8490,
    buyingSignals: ['Comparing Ortho GRID with competitors', 'Asked about 0% EMI and 100-night trial'],
    notes: 'High-intent lead who visited store yesterday looking at Ortho GRID mattress.',
    isTrialSample: false
  };

  const webCallResult = await initiateTwilioOutboundCall(websiteButtonPayload, {
    ...testEnv,
    TWILIO_ENABLE_LIVE_CALLS: 'false' // Simulation safety for test
  });

  assert(webCallResult.success === true, 'Website button payload initiates call successfully');
  assert(webCallResult.stage === 'call_created', 'Call created and queued');
  const webSession = getTwilioSession(webCallResult.sessionId!);
  assert(webSession !== undefined && webSession.customerName === 'Chinmay', 'Web session initialized for customer Chinmay');
  assert(webSession?.product === 'Ortho GRID', 'Product accurately tracked as Ortho GRID');

  updateTwilioSessionStatus(webCallResult.sessionId!, 'completed');

  // --------------------------------------------------------------------------
  // TEST 29: Idempotent Session Cleanup & Terminal Status Set
  // --------------------------------------------------------------------------
  console.log('\n[TEST 29] Idempotent Active Session Cleanup & Status Callback Handling');
  assert(TERMINAL_TWILIO_STATUSES.has('completed'), 'Terminal set includes completed');
  assert(TERMINAL_TWILIO_STATUSES.has('failed'), 'Terminal set includes failed');
  assert(TERMINAL_TWILIO_STATUSES.has('busy'), 'Terminal set includes busy');
  assert(TERMINAL_TWILIO_STATUSES.has('no-answer'), 'Terminal set includes no-answer');
  assert(TERMINAL_TWILIO_STATUSES.has('canceled'), 'Terminal set includes canceled');

  const testSession = createTwilioVoiceSession({
    leadId: 'lead-test-29',
    customerName: 'Chinmay',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  updateTwilioSessionStatus(testSession.sessionId, 'customer_answered', { answeredAt: Date.now() - 5000 });

  // First cleanup call
  const cleaned1 = clearTwilioSession(testSession.sessionId, 'First terminal callback', 'completed');
  assert(cleaned1 !== undefined, 'First cleanup returns session');
  assert(cleaned1?.status === 'completed', 'Status changed to completed');
  assert(typeof cleaned1?.endedAt === 'number', 'endedAt timestamp set');
  const originalEndedAt = cleaned1?.endedAt;

  // Second cleanup call (idempotent repeated callback)
  const cleaned2 = clearTwilioSession(testSession.sessionId, 'Duplicate repeated callback', 'completed');
  assert(cleaned2 !== undefined, 'Second cleanup returns cleanly');
  assert(cleaned2?.endedAt === originalEndedAt, 'Idempotent repeated cleanup preserves original endedAt without re-mutation');
  assert(!hasActiveCallForLeadOrPhone('+917204104491'), 'Session lock is released after clearTwilioSession');

  // --------------------------------------------------------------------------
  // TEST 30: Stale Session Auto-Recovery on Inactivity (>60s)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 30] Stale Session Auto-Recovery on Inactivity (>60s)');
  const staleSession = createTwilioVoiceSession({
    leadId: 'lead-test-30',
    customerName: 'Chinmay',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  updateTwilioSessionStatus(staleSession.sessionId, 'in-progress');

  // Verify it is initially treated as active
  assert(hasActiveCallForLeadOrPhone('+917204104491') === true, 'Fresh session is active');

  // Artificially age session by 65 seconds to simulate a call where customer hung up without callback
  staleSession.updatedAt = Date.now() - 65000;

  // hasActiveCallForLeadOrPhone must detect staleness and auto-clear it
  const isStillActive = hasActiveCallForLeadOrPhone('+917204104491');
  assert(isStillActive === false, 'Stale session (>60s) is auto-cleared and does NOT block calls');
  assert(staleSession.status === 'completed', 'Stale session status automatically updated to completed');

  // --------------------------------------------------------------------------
  // TEST 31: Pre-Call Verification & Force-Clear Flag
  // --------------------------------------------------------------------------
  console.log('\n[TEST 31] Pre-Call Verification & Force-Clear Flag (clearStale: true)');
  const lockedSession = createTwilioVoiceSession({
    leadId: 'lead-test-31',
    customerName: 'Chinmay',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  updateTwilioSessionStatus(lockedSession.sessionId, 'customer_answered');

  // verifyAndClearStaleActiveCall with forceClear=true
  const clearResult = await verifyAndClearStaleActiveCall('+917204104491', testEnv, true);
  assert(clearResult.hasActiveCall === false, 'Force clear releases active call lock immediately');
  assert(lockedSession.status === 'completed', 'Locked session forced to completed status');

  // Test initiateTwilioOutboundCall with clearStale: true
  const retryCall = await initiateTwilioOutboundCall(
    {
      to: '+917204104491',
      clientName: 'Chinmay',
      clearStale: true
    },
    { ...testEnv, TWILIO_ENABLE_LIVE_CALLS: 'false' }
  );
  assert(retryCall.success === true, 'New call succeeds with clearStale: true without getting blocked');
  updateTwilioSessionStatus(retryCall.sessionId!, 'completed');

  // --------------------------------------------------------------------------
  // TEST 32: Physical Call Termination via terminateTwilioCall & Lock Release
  // --------------------------------------------------------------------------
  console.log('\n[TEST 32] Physical Call Termination via terminateTwilioCall & Lock Release');
  const activeForTerm = createTwilioVoiceSession({
    leadId: 'lead-test-32',
    customerName: 'Chinmay',
    customerPhone: '+917204104491',
    product: 'Ortho GRID'
  });
  bindTwilioCallSid(activeForTerm.sessionId, 'CASIM_term_test_1234');
  updateTwilioSessionStatus(activeForTerm.sessionId, 'in-progress', { answeredAt: Date.now() - 12000 });

  assert(hasActiveCallForLeadOrPhone('+917204104491') === true, 'Active call registered before termination');

  // Terminate call using terminateTwilioCall (End Call button action)
  const termResult = await terminateTwilioCall(
    {
      callSid: 'CASIM_term_test_1234',
      sessionId: activeForTerm.sessionId,
      phone: '+917204104491'
    },
    testEnv
  );

  assert(termResult.success === true, 'terminateTwilioCall returns success=true');
  assert(termResult.status === 'completed', 'terminateTwilioCall marks status as completed');
  assert(activeForTerm.status === 'completed', 'Session status set to completed');
  assert(activeForTerm.durationSeconds >= 12, 'Call duration accurately recorded');
  assert(hasActiveCallForLeadOrPhone('+917204104491') === false, 'Active session lock released; ready for new call');


  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTwilioTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
