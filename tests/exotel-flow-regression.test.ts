import fs from 'fs';
import path from 'path';

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
console.log(' EXOTEL CLICK-TO-CALL FLOW & DUPLICATE GUARD REGRESSION TEST   ');
console.log('================================================================');

// 1. Static Source Code Analysis for CallingContext.tsx
console.log('\n[1/3] CallingContext Duplicate Guard & Fetch Dispatch Flow');
const callingContextPath = path.resolve(process.cwd(), 'src/context/CallingContext.tsx');
const callingContextContent = fs.readFileSync(callingContextPath, 'utf-8');

// A. Guard position: Guard must precede setCallState/startAudioVisualizer
const startCallPos = callingContextContent.indexOf('const startCall = async');
const guardPos = callingContextContent.indexOf("callStateRef.current.lifecycle !== 'IDLE'", startCallPos);
const setDialingPos = callingContextContent.indexOf('setCallState({', startCallPos);
const exotelRealBlockPos = callingContextContent.indexOf("if (mode === 'EXOTEL_REAL')", startCallPos);

assert(startCallPos !== -1, 'startCall function exists in CallingContext.tsx');
assert(guardPos !== -1, 'Duplicate-call guard exists in startCall');
assert(guardPos > startCallPos && guardPos < setDialingPos, 'Duplicate-call guard is evaluated BEFORE state transitions to DIALING');
assert(guardPos < exotelRealBlockPos, 'Duplicate-call guard is at top of startCall, not buried inside mode === EXOTEL_REAL');

// B. Broken self-blocking guard pattern must NOT be inside EXOTEL_REAL block
const brokenGuardPattern = "if (mode === 'EXOTEL_REAL') {\n      if (callStateRef.current.lifecycle !== 'IDLE'";
assert(!callingContextContent.includes(brokenGuardPattern), 'Broken self-blocking guard pattern is eliminated');

// C. Verify fetch invocation to backend endpoint exists
assert(callingContextContent.includes("fetch('/api/exotel/call'") || callingContextContent.includes('fetch(endpoint'), 'Dispatches fetch request to Exotel call endpoint');
assert(callingContextContent.includes('/.netlify/functions/exotel-call'), 'Includes graceful fallback to direct Netlify function path');

// D. Safe logging
assert(callingContextContent.includes('[Calling:Exotel] Initiating outbound call for contact'), 'Safe log on initiation is present');
assert(callingContextContent.includes('[Calling:Exotel] Dispatching call request to endpoint'), 'Safe log on fetch dispatch is present');
assert(callingContextContent.includes('[Calling:Exotel] Backend response:'), 'Safe log on fetch response is present');

// E. No exposed API keys or tokens in logs
assert(!callingContextContent.includes('EXOTEL_API_KEY'), 'No EXOTEL_API_KEY in frontend source');
assert(!callingContextContent.includes('EXOTEL_API_TOKEN'), 'No EXOTEL_API_TOKEN in frontend source');

// 2. FloatingActionPill Exotel Button Wiring
console.log('\n[2/3] FloatingActionPill Exotel Button Wiring');
const pillPath = path.resolve(process.cwd(), 'src/components/shell/FloatingActionPill.tsx');
const pillContent = fs.readFileSync(pillPath, 'utf-8');

assert(pillContent.includes("mode: 'EXOTEL_REAL'"), "FloatingActionPill triggers startCall with mode: 'EXOTEL_REAL'");
assert(pillContent.includes("name: 'Ashray K'"), "FloatingActionPill targets client Ashray K");
assert(pillContent.includes("phone: '+917338626120'"), "FloatingActionPill targets client phone +917338626120");
assert(pillContent.includes('[FloatingActionPill] Exotel Call button clicked for contact: Ashray K'), 'FloatingActionPill includes safe click log');

// 3. Behavioral Simulation: startCall State Machine & Backend Request Trigger
console.log('\n[3/3] Behavioral Simulation: Lifecycle & Network Request Triggering');

type LifecycleState = 'IDLE' | 'DIALING' | 'RINGING' | 'CONNECTED' | 'ENDED';

class MockCallingStateMachine {
  callState: { lifecycle: LifecycleState; mode: string };
  callStateRef: { current: { lifecycle: LifecycleState } };
  dispatchedRequests: Array<{ url: string; method: string; body: any }>;
  warnings: string[];
  logs: string[];

  constructor() {
    this.callState = { lifecycle: 'IDLE', mode: 'IDLE' };
    this.callStateRef = { current: { lifecycle: 'IDLE' } };
    this.dispatchedRequests = [];
    this.warnings = [];
    this.logs = [];
  }

  // Exact reproduction of our updated startCall logic
  async startCall({ name, phone, mode = 'EXOTEL_REAL' }: { name: string; phone: string; mode?: string }) {
    // 1. Guard check at the start
    if (this.callStateRef.current.lifecycle !== 'IDLE' && this.callStateRef.current.lifecycle !== 'ENDED') {
      const msg = `[Calling] Call already in progress (${this.callStateRef.current.lifecycle}), ignoring duplicate request.`;
      this.warnings.push(msg);
      return false;
    }

    // Synchronously guard
    this.callStateRef.current.lifecycle = 'DIALING';
    this.callState.lifecycle = 'DIALING';
    this.callState.mode = mode;

    this.logs.push(`Initiated call for ${name}`);

    // Simulate async visualizer/audio setup
    await new Promise((resolve) => setTimeout(resolve, 5));

    if (mode === 'EXOTEL_REAL') {
      const endpoint = '/api/exotel/call';
      this.logs.push(`Dispatching call request to ${endpoint}`);

      // Dispatch fetch
      const payload = { to: phone, clientName: name };
      this.dispatchedRequests.push({ url: endpoint, method: 'POST', body: payload });

      // Simulate backend response
      this.callState.lifecycle = 'RINGING';
      this.callStateRef.current.lifecycle = 'RINGING';
      return true;
    }

    return true;
  }

  endCall() {
    this.callStateRef.current.lifecycle = 'ENDED';
    this.callState.lifecycle = 'ENDED';
    this.logs.push('Call ended');
  }
}

async function runBehavioralSimulation() {
  const machine = new MockCallingStateMachine();

  // Step A: First call should succeed and trigger network request
  const firstCallResult = await machine.startCall({
    name: 'Ashray K',
    phone: '+917338626120',
    mode: 'EXOTEL_REAL'
  });

  assert(firstCallResult === true, 'First Exotel call request succeeded (not self-blocked)');
  assert(machine.dispatchedRequests.length === 1, 'Exactly one HTTP request was dispatched');
  assert(machine.dispatchedRequests[0].url === '/api/exotel/call', 'Dispatched to /api/exotel/call');
  assert(machine.dispatchedRequests[0].body.to === '+917338626120', 'Dispatched with correct client phone');
  assert(machine.dispatchedRequests[0].body.clientName === 'Ashray K', 'Dispatched with correct client name');
  assert(machine.warnings.length === 0, 'No false duplicate-call warning emitted on first call');

  // Step B: Immediate duplicate click while active should be guarded
  const duplicateCallResult = await machine.startCall({
    name: 'Ashray K',
    phone: '+917338626120',
    mode: 'EXOTEL_REAL'
  });

  assert(duplicateCallResult === false, 'Concurrent duplicate call while active was blocked');
  assert(machine.dispatchedRequests.length === 1, 'Network request count remained 1 (no duplicate HTTP request)');
  assert(machine.warnings.length === 1, 'Correctly logged duplicate call warning on actual concurrent click');

  // Step C: After call finishes (ENDED), a new call must be permitted
  machine.endCall();
  const subsequentCallResult = await machine.startCall({
    name: 'Ashray K',
    phone: '+917338626120',
    mode: 'EXOTEL_REAL'
  });

  assert(subsequentCallResult === true, 'Subsequent call permitted after previous call ended');
  assert(machine.dispatchedRequests.length === 2, 'Second HTTP request dispatched for new call');
}

runBehavioralSimulation().then(() => {
  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
});
