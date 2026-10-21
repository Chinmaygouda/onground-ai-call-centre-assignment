/**
 * Click-to-Call (Native Device Dialer) Test Suite
 *
 * Validates:
 * 1. Safe phone normalization into RFC 3966 compliant tel: URIs
 * 2. Country code preservation (+91, +1, +44, etc.) without double-prepending
 * 3. Extension preservation (ext, x, ;)
 * 4. Graceful handling and explanatory reasons for missing or invalid numbers
 * 5. Screen integration: ClickToCallButton presence in Dashboard, Calls to Make, Incoming, Recent, SOP drawer, and Leads Modal
 * 6. Separation of calling modes: tel: URIs do not trigger fake in-app call modals or audio capture
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  normalizePhoneNumber,
  getTelUri,
  formatPhoneNumber,
  getCallTooltip
} from '../src/utils/phoneUtils';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓ PASS${RESET} ${testName}`);
  } else {
    failed++;
    console.error(`  ${RED}✗ FAIL${RESET} ${testName}`);
    if (detail) console.error(`    ${RED}Detail: ${detail}${RESET}`);
  }
}

async function runSuite() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN} CLICK-TO-CALL (NATIVE DEVICE DIALER) TEST SUITE     ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // Section 1: Phone Normalization & RFC 3966 tel: URI Generation
  console.log(`${BOLD}[1/5] Phone Normalization & tel: URI Generation${RESET}`);

  // 1.1 Indian number with +91 and spaces
  const res1 = normalizePhoneNumber('+91 72041 04491');
  assert(res1.isValid === true, 'Validates Indian number with spaces and +91');
  assert(res1.telUri === 'tel:+917204104491', 'Generates correct tel:+917204104491 URI');
  assert(res1.normalized === '+917204104491', 'Normalizes digits preserving +91 prefix');

  // 1.2 Indian 10-digit mobile number without +91 (starts with 6-9)
  const res2 = normalizePhoneNumber('9876543210');
  assert(res2.isValid === true, 'Validates 10-digit Indian mobile number');
  assert(res2.telUri === 'tel:+919876543210', 'Applies standard +91 to 10-digit Indian mobile');

  // 1.3 Number already containing country code should NOT have +91 prepended
  const resUS = normalizePhoneNumber('+1 (415) 555-2671');
  assert(resUS.isValid === true, 'Validates US international number');
  assert(resUS.telUri === 'tel:+14155552671', 'Preserves +1 country code without prepending +91');

  const resUK = normalizePhoneNumber('+44 20 7946 0912');
  assert(resUK.isValid === true, 'Validates UK international number');
  assert(resUK.telUri === 'tel:+442079460912', 'Preserves +44 country code without prepending +91');

  // 1.4 International number starting with 00
  const res00 = normalizePhoneNumber('00442079460912');
  assert(res00.isValid === true, 'Handles 00 international dialing prefix');
  assert(res00.telUri === 'tel:+442079460912', 'Converts 00 to standard + prefix in tel: URI');

  // 1.5 Indian number with 91 prefix without plus (12 digits)
  const res12 = normalizePhoneNumber('917204104491');
  assert(res12.isValid === true, 'Validates 12-digit Indian number starting with 91');
  assert(res12.telUri === 'tel:+917204104491', 'Normalizes 12-digit 91 number to +91');

  // Section 2: Extension Handling & Ambiguity Safety
  console.log(`\n${BOLD}[2/5] Extension Handling & Ambiguity Safety${RESET}`);

  // 2.1 Extension formats
  const resExt1 = normalizePhoneNumber('+91 72041 04491 ext 104');
  assert(resExt1.isValid === true, 'Validates phone with "ext 104"');
  assert(resExt1.telUri === 'tel:+917204104491;ext=104', 'Encodes RFC 3966 extension (;ext=104)');

  const resExt2 = normalizePhoneNumber('+91 98450 11223 x502');
  assert(resExt2.isValid === true, 'Validates phone with "x502"');
  assert(resExt2.telUri === 'tel:+919845011223;ext=502', 'Encodes extension from "x" notation');

  // 2.2 Short local number (non-mobile, e.g. 7-digit local number without country code)
  const resLocal = normalizePhoneNumber('2345678');
  assert(resLocal.isValid === true, 'Accepts 7-digit local landline number');
  assert(resLocal.telUri === 'tel:2345678', 'Does NOT guess country code for local number');

  // Section 3: Missing, Empty, and Invalid Handling
  console.log(`\n${BOLD}[3/5] Missing, Empty, and Invalid Handling${RESET}`);

  // 3.1 Undefined or null
  const resNull = normalizePhoneNumber(null);
  assert(resNull.isValid === false, 'Flags null as invalid');
  assert(resNull.telUri === null, 'Returns null telUri for null input');
  assert(resNull.reason?.includes('missing'), 'Provides explanatory reason for missing number');

  // 3.2 Empty or whitespace
  const resEmpty = normalizePhoneNumber('   ');
  assert(resEmpty.isValid === false, 'Flags whitespace string as invalid');
  assert(resEmpty.telUri === null, 'Returns null telUri for empty string');

  // 3.3 Placeholder strings (Unknown, —, N/A)
  const resUnknown = normalizePhoneNumber('Unknown');
  assert(resUnknown.isValid === false, 'Flags "Unknown" contact as invalid');
  const resDash = normalizePhoneNumber('—');
  assert(resDash.isValid === false, 'Flags "—" placeholder as invalid');

  // 3.4 Too few digits
  const resShort = normalizePhoneNumber('12345');
  assert(resShort.isValid === false, 'Flags short number (<7 digits) as invalid');
  assert(resShort.reason?.includes('few digits'), 'Provides reason: too few digits');

  // 3.5 Too many digits (>15 per ITU-T E.164)
  const resLong = normalizePhoneNumber('+91 123456789012345678');
  assert(resLong.isValid === false, 'Flags number with >15 digits as invalid');

  // 3.6 Tooltip generation
  const tooltipValid = getCallTooltip('Chinmaygouda', '+91 72041 04491');
  assert(
    tooltipValid.includes('Chinmaygouda') && tooltipValid.includes('device dialer'),
    'Generates accessible tooltip with customer name and dialer hint'
  );

  const tooltipInvalid = getCallTooltip('Unknown Customer', '');
  assert(
    tooltipInvalid.includes('missing') || tooltipInvalid.includes('not available'),
    'Generates helpful tooltip explaining why call is disabled'
  );

  // Section 4: Formatting Utility
  console.log(`\n${BOLD}[4/5] Formatting Utility${RESET}`);

  const fmtIndia = formatPhoneNumber('+917204104491');
  assert(fmtIndia === '+91 72041 04491', 'Formats Indian number as +91 XXXXX XXXXX');

  const fmtUS = formatPhoneNumber('+14155552671');
  assert(fmtUS === '+1 (415) 555-2671', 'Formats US number as +1 (XXX) XXX-XXXX');

  const fmtExt = formatPhoneNumber('+917204104491', '102');
  assert(fmtExt.includes('ext. 102'), 'Appends extension to display format');

  // Section 5: Integration Across Application Screens
  console.log(`\n${BOLD}[5/5] Application Screen Integration Verification${RESET}`);

  // 5.1 DashboardView integration
  const dashboardSrc = readFileSync(
    resolve(process.cwd(), 'src/components/dashboard/DashboardView.tsx'),
    'utf-8'
  );
  assert(
    dashboardSrc.includes('ClickToCallButton') &&
      dashboardSrc.includes('Priya Iyer') &&
      dashboardSrc.includes('+91 98765 43210') &&
      dashboardSrc.includes('Suresh Nair') &&
      dashboardSrc.includes('+91 98450 11223'),
    'DashboardView: Who\'s Waiting includes customer phone numbers and ClickToCallButton'
  );

  // 5.2 PlannerView integration
  const plannerSrc = readFileSync(
    resolve(process.cwd(), 'src/components/planner/PlannerView.tsx'),
    'utf-8'
  );
  assert(
    plannerSrc.includes('ClickToCallButton') &&
      plannerSrc.includes('lead.phone') &&
      plannerSrc.includes('call.phone'),
    'PlannerView: Integrates ClickToCallButton across Calls to Make, Incoming, and Recent calls'
  );
  assert(
    plannerSrc.includes('selectedCallReview.phone') &&
      plannerSrc.includes('drawerActions'),
    'PlannerView: SOP Call Review drawer includes customer phone and ClickToCallButton action'
  );

  // 5.3 LeadsModal integration
  const leadsModalSrc = readFileSync(
    resolve(process.cwd(), 'src/components/leads/LeadsModal.tsx'),
    'utf-8'
  );
  assert(
    leadsModalSrc.includes('ClickToCallButton') &&
      leadsModalSrc.includes('currentLead.phone') &&
      leadsModalSrc.includes('contactPhoneRow'),
    'LeadsModal: Contact card displays customer phone with ClickToCallButton'
  );
  assert(
    leadsModalSrc.includes('nativeDialerActionBtn') &&
      leadsModalSrc.includes('variant="pill"'),
    'LeadsModal: Action footer includes native dialer pill action'
  );

  // 5.4 FloatingActionPill integration
  const floatingPillSrc = readFileSync(
    resolve(process.cwd(), 'src/components/shell/FloatingActionPill.tsx'),
    'utf-8'
  );
  assert(
    floatingPillSrc.includes('href="tel:+917204104491"') &&
      floatingPillSrc.includes('Phone call'),
    'FloatingActionPill: "Phone call" triggers native tel:+917204104491 anchor without fake in-app modal'
  );

  // 5.5 CallingContext separation
  const callingContextSrc = readFileSync(
    resolve(process.cwd(), 'src/context/CallingContext.tsx'),
    'utf-8'
  );
  assert(
    callingContextSrc.includes("if (mode === 'PHONE')") &&
      callingContextSrc.indexOf("if (mode === 'PHONE')") < callingContextSrc.indexOf('setCallState({'),
    'CallingContext: mode === "PHONE" delegates immediately to tel: URI without entering in-app DIALING state'
  );

  console.log(`\n${BOLD}======================================================${RESET}`);
  if (failed === 0) {
    console.log(`${BOLD}${GREEN} ALL ${passed} CLICK-TO-CALL TESTS PASSED SUCCESSFULLY! ${RESET}`);
  } else {
    console.log(`${BOLD}${RED} ${failed} OF ${passed + failed} TESTS FAILED. ${RESET}`);
    process.exit(1);
  }
  console.log(`${BOLD}======================================================${RESET}\n`);
}

runSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
