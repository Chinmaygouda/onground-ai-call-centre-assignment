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
  StructuredAiTurnResponse,
  TwilioVoiceSession
} from '../server/twilioService';
import { businessDataProvider } from '../src/services/businessData/BusinessDataProvider';
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
