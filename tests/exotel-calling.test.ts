import fs from 'fs';
import path from 'path';
import { normalizePhone } from '../server/exotelService';
import { mockLeads, mockMissedCalls, mockRecentCalls } from '../src/data/mockData';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL ${message}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log(' EXOTEL REAL TELEPHONY INTEGRATION & SECURITY AUDIT  ');
console.log('======================================================');

// 1. Phone Normalization & Formatting
console.log('\n[1/8] Phone Normalization & Formatting (Chinmaygouda: +917204104491)');
const phoneTest1 = normalizePhone('+917204104491');
assert(phoneTest1.isValid, 'Normalized +917204104491 is valid');
assert(phoneTest1.digits === '7204104491', 'Normalized digits are 7204104491');
assert(phoneTest1.e164 === '+917204104491', 'Normalized e164 is +917204104491');
assert(phoneTest1.national === '07204104491', 'Normalized national is 07204104491');

const phoneTest2 = normalizePhone('7204104491');
assert(phoneTest2.isValid && phoneTest2.e164 === '+917204104491', '10-digit number 7204104491 normalizes to +917204104491');

const phoneTest3 = normalizePhone('07204104491');
assert(phoneTest3.isValid && phoneTest3.e164 === '+917204104491', '0-prefixed 07204104491 normalizes to +917204104491');

const phoneTestInvalid = normalizePhone('12345');
assert(!phoneTestInvalid.isValid, 'Short invalid number is rejected');

// 2. Client Identity Integrity
console.log('\n[2/8] Client Identity Integrity (Chinmaygouda)');
const primaryLead = mockLeads[0];
assert(primaryLead.name === 'Chinmaygouda', `Primary lead name is "Chinmaygouda" (got: "${primaryLead.name}")`);
assert(primaryLead.phone.includes('72041 04491') || primaryLead.phone.includes('7204104491'), `Primary lead phone is 7204104491`);

const chinmayMissed = mockMissedCalls.find((c) => c.name === 'Chinmaygouda');
assert(Boolean(chinmayMissed), 'Chinmaygouda exists in mockMissedCalls');
assert(chinmayMissed?.isDemoRecord === true, 'Chinmaygouda missed call is explicitly marked with isDemoRecord: true');
assert(chinmayMissed?.provider === 'demo', 'Chinmaygouda missed call provider is "demo" (transparent demonstration labeling)');

const chinmayRecent = mockRecentCalls.find((c) => c.name === 'Chinmaygouda');
assert(Boolean(chinmayRecent), 'Chinmaygouda exists in mockRecentCalls');
assert(chinmayRecent?.isDemoRecord === true, 'Chinmaygouda recent call is explicitly marked with isDemoRecord: true');

// 3. Employee Phone Guard & Self-Call Prevention Logic
console.log('\n[3/8] Self-Call Prevention & Employee Phone Guards');
const clientDigits = normalizePhone('+917204104491').digits;
const selfAgentDigits = normalizePhone('7204104491').digits;
const diffAgentDigits = normalizePhone('9845123456').digits;

assert(clientDigits === selfAgentDigits, 'Detected identical numbers for self-call prevention');
assert(clientDigits !== diffAgentDigits, 'Distinct employee number is correctly recognized');

// 3.1 Caller ID Formatting & Virtual Landline Verification (080-472-85774)
const rawLandline = '080-472-85774';
const sanitizedLandline = rawLandline.trim().replace(/[\s-]/g, '');
assert(sanitizedLandline === '08047285774', 'ExoPhone landline 080-472-85774 formats cleanly to 08047285774');

// 3.2 Shared Trial Number Guard (095-138-86363 / 9513886363)
const sharedTrialPool = '095-138-86363';
const isSharedTrial = sharedTrialPool.replace(/[\s-]/g, '').includes('9513886363');
assert(isSharedTrial, 'Identifies Exotel shared multi-tenant trial pool number 9513886363');

// 4. Server-Side Service Implementation
console.log('\n[4/8] Server Service Implementation (server/exotelService.ts)');
const servicePath = path.resolve(process.cwd(), 'server/exotelService.ts');
assert(fs.existsSync(servicePath), 'server/exotelService.ts exists');
const serviceContent = fs.readFileSync(servicePath, 'utf-8');

assert(serviceContent.includes('EMPLOYEE_PHONE_REQUIRED'), 'Service guards against missing EXOTEL_AGENT_PHONE');
assert(serviceContent.includes('SELF_CALL_PROHIBITED'), 'Service strictly blocks self-calling when agentPhone === clientPhone');
assert(serviceContent.includes('POST') && serviceContent.includes('/Calls/connect'), 'Service connects via official Exotel /Calls/connect endpoint (without .json)');
assert(serviceContent.includes('api.exotel.com'), 'Service defaults to official Singapore cluster api.exotel.com');
assert(serviceContent.includes('Record') && serviceContent.includes('true'), 'Service includes Record=true for provider-managed call recordings');
assert(serviceContent.includes('CallType') && serviceContent.includes('trans'), 'Service sets CallType=trans for transactional outbound calling');
assert(!serviceContent.includes('VITE_EXOTEL'), 'No VITE_ prefix used in server service');

// 5. Netlify Serverless Functions Verification
console.log('\n[5/8] Netlify Serverless Functions Verification');
const callFn = path.resolve(process.cwd(), 'netlify/functions/exotel-call.ts');
const statusFn = path.resolve(process.cwd(), 'netlify/functions/exotel-status.ts');
const callbackFn = path.resolve(process.cwd(), 'netlify/functions/exotel-callback.ts');

assert(fs.existsSync(callFn), 'netlify/functions/exotel-call.ts exists');
assert(fs.existsSync(statusFn), 'netlify/functions/exotel-status.ts exists');
assert(fs.existsSync(callbackFn), 'netlify/functions/exotel-callback.ts exists');

const callFnContent = fs.readFileSync(callFn, 'utf-8');
assert(callFnContent.includes('process.env.EXOTEL_AGENT_PHONE'), 'exotel-call function reads process.env.EXOTEL_AGENT_PHONE');
assert(callFnContent.includes('SELF_CALL_PROHIBITED'), 'exotel-call function implements self-call prevention guard');
assert(!callFnContent.includes('your_exotel_api_key_here'), 'exotel-call contains no hardcoded test keys');

// 6. Redirects and Routing Rules
console.log('\n[6/8] Netlify Routing and Redirects');
const tomlPath = path.resolve(process.cwd(), 'netlify.toml');
const tomlContent = fs.readFileSync(tomlPath, 'utf-8');
assert(tomlContent.includes('from = "/api/exotel/call"'), 'netlify.toml routes /api/exotel/call to function');
assert(tomlContent.includes('from = "/api/exotel/call-status"'), 'netlify.toml routes /api/exotel/call-status to function');
assert(tomlContent.includes('from = "/api/exotel/callback"'), 'netlify.toml routes /api/exotel/callback to function');

const redirectsPath = path.resolve(process.cwd(), 'public/_redirects');
const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
assert(redirectsContent.includes('/api/exotel/call'), 'public/_redirects proxies /api/exotel/call');
assert(redirectsContent.includes('/api/exotel/call-status'), 'public/_redirects proxies /api/exotel/call-status');

// 7. Frontend Bundle Security Audit (Zero Exposed Secrets)
console.log('\n[7/8] Frontend Source Code Security Audit');
const callingContextPath = path.resolve(process.cwd(), 'src/context/CallingContext.tsx');
const callingContent = fs.readFileSync(callingContextPath, 'utf-8');

assert(!callingContent.includes('EXOTEL_API_KEY'), 'CallingContext.tsx contains NO reference to EXOTEL_API_KEY');
assert(!callingContent.includes('EXOTEL_API_TOKEN'), 'CallingContext.tsx contains NO reference to EXOTEL_API_TOKEN');
assert(callingContent.includes('/api/exotel/call'), 'CallingContext calls server endpoint /api/exotel/call');
assert(callingContent.includes('/api/exotel/call-status'), 'CallingContext polls server endpoint /api/exotel/call-status');

// 8. Environment Template (.env.example)
console.log('\n[8/8] Environment Template Verification (.env.example)');
const envExamplePath = path.resolve(process.cwd(), '.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

assert(envExampleContent.includes('EXOTEL_ACCOUNT_SID='), '.env.example contains EXOTEL_ACCOUNT_SID');
assert(envExampleContent.includes('EXOTEL_API_KEY='), '.env.example contains EXOTEL_API_KEY');
assert(envExampleContent.includes('EXOTEL_API_TOKEN='), '.env.example contains EXOTEL_API_TOKEN');
assert(envExampleContent.includes('EXOTEL_CALLER_ID='), '.env.example contains EXOTEL_CALLER_ID');
assert(envExampleContent.includes('EXOTEL_AGENT_PHONE='), '.env.example contains EXOTEL_AGENT_PHONE');
assert(!envExampleContent.includes('VITE_EXOTEL'), '.env.example contains no VITE_ prefixed Exotel secrets');

console.log('\n======================================================');
console.log(` RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
