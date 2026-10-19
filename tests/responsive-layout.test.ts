/**
 * RESPONSIVE UI & ADAPTIVE LAYOUT VERIFICATION TEST SUITE
 * OnGround AI Call Centre Web Application
 */

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
console.log(' RESPONSIVE UI & ADAPTIVE LAYOUT VERIFICATION SUITE');
console.log('======================================================\n');

// 1. Viewport Meta Configuration
console.log('[1/7] HTML Viewport & Mobile Meta Configuration');
const indexPath = path.resolve(process.cwd(), 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');
assert(indexHtml.includes('viewport-fit=cover'), 'index.html includes viewport-fit=cover for notch/safe-area support');
assert(indexHtml.includes('width=device-width'), 'index.html includes width=device-width');
assert(indexHtml.includes('initial-scale=1.0'), 'index.html includes initial-scale=1.0');

// 2. Responsive Design System & CSS Tokens
console.log('\n[2/7] Responsive Design Tokens & Safe Areas (tokens.css)');
const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
const tokensCss = fs.readFileSync(tokensPath, 'utf-8');
assert(tokensCss.includes('--safe-area-top: env(safe-area-inset-top'), 'tokens.css defines --safe-area-top');
assert(tokensCss.includes('--safe-area-bottom: env(safe-area-inset-bottom'), 'tokens.css defines --safe-area-bottom');
assert(tokensCss.includes('--touch-target-min: 44px'), 'tokens.css defines WCAG 2.2 AA compliant --touch-target-min: 44px');
assert(tokensCss.includes('--touch-target-compact: 36px'), 'tokens.css defines --touch-target-compact: 36px');
assert(tokensCss.includes('clamp('), 'tokens.css implements fluid clamp() scales for spacing and typography');
assert(tokensCss.includes('--font-size-hero: clamp('), 'tokens.css defines fluid --font-size-hero');
assert(tokensCss.includes('--font-size-kpi: clamp('), 'tokens.css defines fluid --font-size-kpi');
assert(tokensCss.includes('--content-max-width: 1440px'), 'tokens.css defines --content-max-width constraint');

// 3. Universal Resets & Accessibility (index.css)
console.log('\n[3/7] Universal Resets & Accessibility Features (index.css)');
const indexCssPath = path.resolve(process.cwd(), 'src/styles/index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf-8');
assert(indexCss.includes('height: 100dvh'), 'index.css applies dynamic viewport height 100dvh to html, body, #root');
assert(indexCss.includes('text-size-adjust: 100%'), 'index.css configures text-size-adjust to prevent unwanted text inflation on mobile');
assert(indexCss.includes(':focus-visible'), 'index.css configures high-visibility focus states for keyboard accessibility');
assert(indexCss.includes('prefers-reduced-motion: reduce'), 'index.css respects user accessibility prefers-reduced-motion setting');

// 4. Shell Navigation: Adaptive Sidebar & Topbar
console.log('\n[4/7] Adaptive Application Shell (Sidebar & Topbar)');
const sidebarCssPath = path.resolve(process.cwd(), 'src/components/shell/Sidebar.module.css');
const sidebarCss = fs.readFileSync(sidebarCssPath, 'utf-8');
assert(sidebarCss.includes('@media (max-width: 768px)'), 'Sidebar.module.css defines mobile off-canvas drawer breakpoint at 768px');
assert(sidebarCss.includes('mobileBackdrop'), 'Sidebar.module.css defines drawer backdrop blur overlay');
assert(sidebarCss.includes('closeDrawerBtn'), 'Sidebar.module.css defines mobile drawer close button with 44px touch target');
assert(sidebarCss.includes('mobileDrawerFooter'), 'Sidebar.module.css displays agent rank & score stats in mobile drawer footer');

const topbarCssPath = path.resolve(process.cwd(), 'src/components/shell/Topbar.module.css');
const topbarCss = fs.readFileSync(topbarCssPath, 'utf-8');
assert(topbarCss.includes('hamburgerBtn'), 'Topbar.module.css defines mobile hamburger button with 44px touch target');
assert(topbarCss.includes('safe-area-inset-top'), 'Topbar.module.css accounts for iPhone safe-area-inset-top');
assert(topbarCss.includes('@media (max-width: 768px)'), 'Topbar.module.css hides secondary badges on tablet/mobile viewports');

// 5. Floating Action Pill Responsive Centering & Touch Targets
console.log('\n[5/7] Floating Action Pill (FloatingActionPill.module.css)');
const pillCssPath = path.resolve(process.cwd(), 'src/components/shell/FloatingActionPill.module.css');
const pillCss = fs.readFileSync(pillCssPath, 'utf-8');
assert(pillCss.includes('safe-area-inset-bottom'), 'FloatingActionPill accounts for iPhone home indicator with safe-area-inset-bottom');
assert(pillCss.includes('max-width: calc(100vw - 24px)'), 'FloatingActionPill limits max-width to avoid viewport overflow');
assert(pillCss.includes('@media (max-width: 768px)'), 'FloatingActionPill centers at 50% on mobile when sidebar is off-canvas');
assert(pillCss.includes('@media (max-width: 480px)'), 'FloatingActionPill enables smooth horizontal scrolling on compact mobile viewports');

// 6. Core Application Screens (Dashboard, Planner, Calendar, Pulse)
console.log('\n[6/7] Screen Layouts Adaptability');
const dashCssPath = path.resolve(process.cwd(), 'src/components/dashboard/DashboardView.module.css');
const dashCss = fs.readFileSync(dashCssPath, 'utf-8');
assert(dashCss.includes('@media (max-width: 1024px)'), 'DashboardView.module.css includes 1024px breakpoint for 2-column KPI grid');
assert(dashCss.includes('@media (max-width: 640px)'), 'DashboardView.module.css includes 640px mobile layout adaptations');
assert(dashCss.includes('@media (max-width: 380px)'), 'DashboardView.module.css includes 380px compact mobile breakpoint for 1-column KPI grid');

const plannerCssPath = path.resolve(process.cwd(), 'src/components/planner/PlannerView.module.css');
const plannerCss = fs.readFileSync(plannerCssPath, 'utf-8');
assert(plannerCss.includes('overflow-x: auto'), 'PlannerView.module.css implements horizontally scrollable subtabs on mobile');
assert(plannerCss.includes('slideUp'), 'PlannerView.module.css converts SOP Call Review drawer into responsive bottom sheet on mobile');
assert(plannerCss.includes('drawerOverlay'), 'PlannerView.module.css aligns bottom sheet to flex-end on mobile viewports');

const calCssPath = path.resolve(process.cwd(), 'src/components/calendar/CalendarView.module.css');
const calCss = fs.readFileSync(calCssPath, 'utf-8');
assert(calCss.includes('@media (max-width: 520px)'), 'CalendarView.module.css includes 520px compact month grid breakpoint');

const pulseCssPath = path.resolve(process.cwd(), 'src/components/pulse/PulseView.module.css');
const pulseCss = fs.readFileSync(pulseCssPath, 'utf-8');
assert(pulseCss.includes('safe-area-inset-bottom'), 'PulseView.module.css chat composer uses safe-area-inset-bottom');
assert(pulseCss.includes('@media (max-width: 640px)'), 'PulseView.module.css expands chat message bubbles and wraps action buttons on mobile');

// 7. Modals & Dialogs (LeadsModal, CustomerVoiceAssistantModal, CallingModal)
console.log('\n[7/7] Modals & Dialogs Adaptability');
const leadsCssPath = path.resolve(process.cwd(), 'src/components/leads/LeadsModal.module.css');
const leadsCss = fs.readFileSync(leadsCssPath, 'utf-8');
assert(leadsCss.includes('max-height: 90dvh') || leadsCss.includes('max-height: 88dvh'), 'LeadsModal.module.css uses dvh to adapt to mobile browser address bars');
assert(leadsCss.includes('@media (max-width: 640px)'), 'LeadsModal.module.css converts to responsive bottom sheet on mobile');

const assistantCssPath = path.resolve(process.cwd(), 'src/components/geminiLive/CustomerVoiceAssistantModal.module.css');
const assistantCss = fs.readFileSync(assistantCssPath, 'utf-8');
assert(assistantCss.includes('100dvh'), 'CustomerVoiceAssistantModal uses 100dvh on mobile to prevent control clipping');
assert(assistantCss.includes('safe-area-inset-top'), 'CustomerVoiceAssistantModal header respects safe-area-inset-top');

const callingCssPath = path.resolve(process.cwd(), 'src/components/calling/CallingModal.module.css');
const callingCss = fs.readFileSync(callingCssPath, 'utf-8');
assert(callingCss.includes('max-height: 90dvh'), 'CallingModal uses 90dvh with responsive box sizing');
assert(callingCss.includes('@media (max-width: 640px)'), 'CallingModal peerCallBanner adapts to full width on mobile devices');

console.log('\n======================================================');
if (failedTests === 0) {
  console.log(` ALL ${passedTests} RESPONSIVE LAYOUT VERIFICATION TESTS PASSED!`);
} else {
  console.error(` ${failedTests} TESTS FAILED out of ${passedTests + failedTests}!`);
  process.exit(1);
}
console.log('======================================================\n');
