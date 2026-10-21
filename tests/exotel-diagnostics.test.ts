import {
  handler,
  maskPhoneNumbers,
  redactSensitiveCredentials,
  sanitizeExotelData,
  parseExotelResponseBody,
  getExotelTroubleshootingHint
} from '../netlify/functions/exotel-call';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n================================================================');
console.log(' EXOTEL UPSTREAM 400 / 401 / 402 / 403 DIAGNOSTICS & SECURITY   ');
console.log('================================================================');

// 1. Phone Masking & Credential Redaction Unit Tests
console.log('\n[1/6] Phone Masking & Credential Redaction');

const maskedMobile = maskPhoneNumbers('Call client at +917338626120 immediately');
assert(maskedMobile === 'Call client at +91*****6120 immediately', `Mobile is masked: "${maskedMobile}"`);

const maskedLandline = maskPhoneNumbers('Using CallerId 08047285774');
assert(maskedLandline === 'Using CallerId 0*****5774', `Landline is masked: "${maskedLandline}"`);

const redactedBasic = redactSensitiveCredentials('Authorization: Basic MmMxOG...==');
assert(redactedBasic === 'Authorization: [REDACTED]', `Authorization header is redacted (got: "${redactedBasic}")`);
assert(!redactedBasic.includes('MmMxOG'), 'Raw base64 token is stripped');

const standaloneBasic = redactSensitiveCredentials('Header token: Basic MmMxOG...==');
assert(standaloneBasic.includes('Basic [REDACTED]'), 'Standalone Basic auth token is redacted');

const complexObj = {
  apiKey: 'secret_key_123',
  apiToken: 'secret_token_456',
  message: 'Failed to dial +917338626120 with callerId 08047285774',
  nested: {
    phone: '+919535584969',
    auth: 'secret_auth'
  }
};
const sanitizedObj = sanitizeExotelData(complexObj);
assert(sanitizedObj.apiKey === '[REDACTED]', 'apiKey property redacted in object');
assert(sanitizedObj.apiToken === '[REDACTED]', 'apiToken property redacted in object');
assert(sanitizedObj.nested.auth === '[REDACTED]', 'nested auth property redacted');
assert(sanitizedObj.message.includes('+91*****6120'), 'Phone in message masked');
assert(sanitizedObj.message.includes('0*****5774'), 'Landline in message masked');
assert(sanitizedObj.nested.phone === '+91*****4969', 'Nested phone masked');

// 2. XML & JSON Response Parsing Tests
console.log('\n[2/6] XML & JSON Response Parsing');

const jsonErr = JSON.stringify({
  RestException: {
    Status: 401,
    Message: 'Authentication failed: Invalid credentials',
    Code: 20001
  }
});
const parsedJson = parseExotelResponseBody(jsonErr);
assert(parsedJson.status === 401, 'Parsed JSON status is 401');
assert(parsedJson.code === 20001, 'Parsed JSON code is 20001');
assert(parsedJson.message === 'Authentication failed: Invalid credentials', 'Parsed JSON message matches');

const xmlErr = `<?xml version="1.0" encoding="UTF-8"?>
<TwilioResponse>
  <RestException>
    <Status>400</Status>
    <Message>CallerId 08047285774 is not registered</Message>
    <Code>20002</Code>
    <MoreInfo>https://support.exotel.com</MoreInfo>
  </RestException>
</TwilioResponse>`;
const parsedXml = parseExotelResponseBody(xmlErr);
assert(parsedXml.status === 400, 'Parsed XML status is 400');
assert(parsedXml.code === 20002, 'Parsed XML code is 20002');
assert(parsedXml.message === 'CallerId 08047285774 is not registered', 'Parsed XML message matches');

// Set up clean environment variables for mock handler testing
process.env.EXOTEL_ACCOUNT_SID = 'mock_sid';
process.env.EXOTEL_API_KEY = 'mock_key';
process.env.EXOTEL_API_TOKEN = 'mock_token';
process.env.EXOTEL_SUBDOMAIN = 'api.exotel.com';
process.env.EXOTEL_CALLER_ID = '08047285774';
process.env.EXOTEL_AGENT_PHONE = '+917204104491';

const validEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    to: '+917338626120',
    clientName: 'Ashray K'
  })
};

// 3. Upstream 400 Bad Request Test
console.log('\n[3/6] Upstream HTTP 400 Bad Request Diagnostics');
global.fetch = async () => {
  return {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    text: async () => JSON.stringify({
      RestException: {
        Status: 400,
        Message: 'CallerId 08047285774 is not a valid ExoPhone',
        Code: 20002
      }
    })
  } as any;
};

const res400 = await handler(validEvent);
assert(res400.statusCode === 502, 'Handler returns HTTP 502 for upstream 400 error');
const body400 = JSON.parse(res400.body);
assert(body400.success === false, 'Body success is false');
assert(body400.error === 'EXOTEL_API_ERROR', 'Error identifier is EXOTEL_API_ERROR');
assert(body400.providerStatus === 400, 'providerStatus matches upstream 400');
assert(body400.providerCode === 20002, 'providerCode matches upstream 20002');
assert(body400.message.includes('0*****5774'), `Phone number in error message is masked (got: "${body400.message}")`);
assert(!body400.message.includes('08047285774'), 'Unmasked landline is not in message');
assert(body400.troubleshooting.includes('Exotel Bad Request (400)'), 'Actionable 400 troubleshooting note included');
assert(body400.troubleshooting.includes('EXOTEL_CALLER_ID'), 'Points to EXOTEL_CALLER_ID in 400 hint');

// 4. Upstream 401 Authentication Failed Test
console.log('\n[4/6] Upstream HTTP 401 Authentication Failure Diagnostics');
global.fetch = async () => {
  return {
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () => JSON.stringify({
      RestException: {
        Status: 401,
        Message: 'Authentication failed: Invalid credentials or inactive account',
        Code: 20001
      }
    })
  } as any;
};

const res401 = await handler(validEvent);
assert(res401.statusCode === 502, 'Handler returns HTTP 502 for upstream 401 error');
const body401 = JSON.parse(res401.body);
assert(body401.providerStatus === 401, 'providerStatus matches upstream 401');
assert(body401.providerCode === 20001, 'providerCode matches upstream 20001');
assert(body401.troubleshooting.includes('api.in.exotel.com'), 'Troubleshooting suggests checking Mumbai cluster (api.in.exotel.com)');
assert(!res401.body.includes('mock_key') && !res401.body.includes('mock_token'), 'No secrets leaked in 401 response body');

// 5. Upstream 402 Payment Required Test
console.log('\n[5/6] Upstream HTTP 402 Payment Required Diagnostics');
global.fetch = async () => {
  return {
    ok: false,
    status: 402,
    statusText: 'Payment Required',
    text: async () => JSON.stringify({
      RestException: {
        Status: 402,
        Message: 'Insufficient account balance to place call',
        Code: 20003
      }
    })
  } as any;
};

const res402 = await handler(validEvent);
assert(res402.statusCode === 502, 'Handler returns HTTP 502 for upstream 402 error');
const body402 = JSON.parse(res402.body);
assert(body402.providerStatus === 402, 'providerStatus matches upstream 402');
assert(body402.providerCode === 20003, 'providerCode matches upstream 20003');
assert(body402.message.includes('Insufficient account balance'), 'Error message captures balance issue');
assert(body402.troubleshooting.includes('recharge'), 'Troubleshooting explains balance recharge');

// 6. Upstream 403 Forbidden / Trial Whitelist Test
console.log('\n[6/6] Upstream HTTP 403 Forbidden / Whitelist Diagnostics');
global.fetch = async () => {
  return {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    text: async () => JSON.stringify({
      RestException: {
        Status: 403,
        Message: 'Destination phone number +917338626120 is not whitelisted in trial account',
        Code: 20004
      }
    })
  } as any;
};

const res403 = await handler(validEvent);
assert(res403.statusCode === 502, 'Handler returns HTTP 502 for upstream 403 error');
const body403 = JSON.parse(res403.body);
assert(body403.providerStatus === 403, 'providerStatus matches upstream 403');
assert(body403.providerCode === 20004, 'providerCode matches upstream 20004');
assert(body403.message.includes('+91*****6120'), 'Phone number in 403 message is masked');
assert(!body403.message.includes('+917338626120'), 'Full phone number is not exposed in 403 message');
assert(body403.troubleshooting.includes('whitelisted'), 'Troubleshooting mentions trial whitelist requirement');

console.log('\n================================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
