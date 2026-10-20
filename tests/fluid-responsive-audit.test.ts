import fs from 'fs';
import path from 'path';

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
console.log(' FLUID RESPONSIVE DESIGN & OVERFLOW AUDIT SUITE       ');
console.log('======================================================');

// 1. Check tokens.css fluid scale
console.log('\n[1/6] Design Tokens & Fluid Scale Verification');
const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

assert(tokensContent.includes('--font-size-hero: clamp('), 'tokens.css defines fluid clamp for hero headings');
assert(tokensContent.includes('--font-size-kpi: clamp('), 'tokens.css defines fluid clamp for KPI numbers');
assert(tokensContent.includes('--font-size-section: clamp('), 'tokens.css defines fluid clamp for section headings');
assert(tokensContent.includes('--font-size-body: clamp('), 'tokens.css defines fluid clamp for body text');
assert(tokensContent.includes('--space-xs: clamp('), 'tokens.css defines fluid clamp spacing scale');
assert(tokensContent.includes('--sidebar-width-mobile: min('), 'tokens.css defines flexible sidebar mobile width with viewport clamp');
assert(tokensContent.includes('--safe-area-top: env(safe-area-inset-top'), 'tokens.css includes safe-area-inset-top token');
assert(tokensContent.includes('--safe-area-bottom: env(safe-area-inset-bottom'), 'tokens.css includes safe-area-inset-bottom token');

// 2. Global Resets & Anti-Overflow Protection
console.log('\n[2/6] Global Resets & Overflow Protection');
const indexCssPath = path.resolve(process.cwd(), 'src/styles/index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

const normalizedIndexCss = indexCssContent.replace(/\r\n/g, '\n');
assert(normalizedIndexCss.includes('box-sizing: border-box'), 'Universal box-sizing: border-box applied');
assert(!normalizedIndexCss.includes('html, body {\n  overflow-x: hidden;'), 'Avoids blindly setting overflow-x: hidden on html, body');
assert(normalizedIndexCss.includes('overflow-wrap: break-word'), 'Enforces overflow-wrap: break-word on text elements');
assert(normalizedIndexCss.includes('img, svg, video, canvas {\n  max-width: 100%;'), 'Enforces max-width: 100% on fluid media elements');

// 3. Topbar & Popovers Responsive Containment
console.log('\n[3/6] Topbar & Popovers Responsive Containment');
const topbarCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shell/Topbar.module.css'), 'utf-8');
assert(topbarCss.includes('@media (max-width: 380px)'), 'Topbar collapses search text to icon button on narrow devices (<=380px)');
assert(topbarCss.includes('@media (max-width: 640px)'), 'Topbar hides search keyboard shortcut on mobile');
assert(topbarCss.includes('hamburgerBtn'), 'Topbar provides hamburger button for mobile navigation drawer');

const notifCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shell/popovers/NotificationsPopover.module.css'), 'utf-8');
assert(notifCss.includes('@media (max-width: 640px)'), 'NotificationsPopover defines responsive mobile media query');
assert(notifCss.includes('max-width: calc(100vw - 16px)'), 'NotificationsPopover constrains max-width to viewport on small screens');

const leaderCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shell/popovers/LeaderboardPopover.module.css'), 'utf-8');
assert(leaderCss.includes('@media (max-width: 640px)'), 'LeaderboardPopover defines responsive mobile media query');
assert(leaderCss.includes('max-width: calc(100vw - 16px)'), 'LeaderboardPopover constrains max-width to viewport on small screens');

const profileCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shell/popovers/ProfileMenuPopover.module.css'), 'utf-8');
assert(profileCss.includes('@media (max-width: 640px)'), 'ProfileMenuPopover defines responsive mobile media query');
assert(profileCss.includes('max-width: calc(100vw - 16px)'), 'ProfileMenuPopover constrains max-width to viewport on small screens');

const quickSearchCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shell/popovers/QuickSearchModal.module.css'), 'utf-8');
assert(quickSearchCss.includes('@media (max-width: 640px)'), 'QuickSearchModal defines responsive mobile media query');
assert(quickSearchCss.includes('max-height: calc(100dvh - 32px)'), 'QuickSearchModal utilizes dynamic viewport height for mobile keyboards');

// 4. Core Application Views (Dashboard, Planner, Calendar, Pulse)
console.log('\n[4/6] Core Application Views (Dashboard, Planner, Calendar, Pulse)');
const dashCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/DashboardView.module.css'), 'utf-8');
assert(dashCss.includes('@media (max-width: 480px)'), 'DashboardView stacks KPI cards into 1 column on <=480px viewports');
assert(dashCss.includes('@media (max-width: 380px)'), 'DashboardView supports ultracompact 380px viewports');
assert(dashCss.includes('min-width: 0'), 'KPI cards use min-width: 0 to prevent grid item blowout');

const plannerCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/planner/PlannerView.module.css'), 'utf-8');
assert(plannerCss.includes('@media (max-width: 480px)'), 'PlannerView supports mobile phone viewports <=480px');
assert(plannerCss.includes('itemNameRow'), 'PlannerView styles .itemNameRow with flex-wrap for customer names, phones and call buttons');
assert(plannerCss.includes('overflow-wrap: break-word'), 'PlannerView wraps long item names and details');

const calCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/calendar/CalendarView.module.css'), 'utf-8');
assert(calCss.includes('@media (max-width: 480px)'), 'CalendarView supports <=480px mobile viewports');
assert(calCss.includes('@media (max-width: 520px)'), 'CalendarView supports compact month grid on <=520px viewports');

const pulseCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/pulse/PulseView.module.css'), 'utf-8');
assert(pulseCss.includes('@media (max-width: 480px)'), 'PulseView supports <=480px mobile viewports');
assert(pulseCss.includes('chatComposer'), 'PulseView formats chat composer safely across viewports');

// 5. Creation & Action Modals (CreateLeadModal, CreateEventModal, DailyBriefModal)
console.log('\n[5/6] Creation & Action Modals Responsive Containment');
const createLeadCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/CreateLeadModal.module.css'), 'utf-8');
assert(createLeadCss.includes('@media (max-width: 560px)'), 'CreateLeadModal transforms into bottom sheet on <=560px viewports');
assert(createLeadCss.includes('grid-template-columns: 1fr'), 'CreateLeadModal reflows 2-column input grids into 1 column on mobile');

const createEventCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/CreateEventModal.module.css'), 'utf-8');
assert(createEventCss.includes('@media (max-width: 560px)'), 'CreateEventModal transforms into bottom sheet on <=560px viewports');
assert(createEventCss.includes('grid-template-columns: 1fr'), 'CreateEventModal reflows 2-column input grids into 1 column on mobile');

const dailyBriefCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/pulse/DailyBriefModal.module.css'), 'utf-8');
assert(dailyBriefCss.includes('@media (max-width: 560px)'), 'DailyBriefModal transforms into bottom sheet on <=560px viewports');

// 6. Calling & Voice Assistant Responsive Containment
console.log('\n[6/6] Calling & Voice Assistant Responsive Containment');
const callbackCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/callback/CustomerCallbackModal.module.css'), 'utf-8');
assert(callbackCss.includes('@media (max-width: 500px)'), 'CustomerCallbackModal supports full viewport takeover on <=500px');
assert(callbackCss.includes('@media (max-width: 900px)'), 'CustomerCallbackModal provides tab switcher on <=900px tablets');

const voiceAssistantCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/geminiLive/CustomerVoiceAssistantModal.module.css'), 'utf-8');
assert(voiceAssistantCss.includes('@media (max-width: 640px)'), 'CustomerVoiceAssistantModal transforms into full-screen view on mobile');
assert(voiceAssistantCss.includes('100dvh'), 'CustomerVoiceAssistantModal uses dynamic viewport height 100dvh');

console.log('\n======================================================');
if (failedTests === 0) {
  console.log(` ALL ${passedTests} FLUID RESPONSIVE DESIGN AUDIT TESTS PASSED!`);
} else {
  console.error(` ${failedTests} TESTS FAILED out of ${passedTests + failedTests}!`);
  process.exit(1);
}
console.log('======================================================\n');
