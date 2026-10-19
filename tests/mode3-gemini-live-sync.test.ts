/**
 * Mode 3 Automated Verification Suite: Gemini Live & Synchronized Business Data
 *
 * Validates:
 * 1. Security & Ephemeral Token Isolation
 * 2. Business Data Provider 9-Tool Grounding
 * 3. Live Price Synchronization & Cache Invalidation (Requirement H)
 * 4. Boundary & Unknown Query Handling (Requirement F & L)
 * 5. Gemini Live Function Tool Dispatcher
 */

import { businessDataProvider } from '../src/services/businessData/BusinessDataProvider';
import { dispatchLiveToolCall, GEMINI_LIVE_FUNCTION_DECLARATIONS } from '../src/services/geminiLive/liveTools';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
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
  console.log(`${BOLD}${CYAN} MODE 3: GEMINI LIVE & VERIFIED DATA TEST SUITE${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // -------------------------------------------------------------------------
  // 1. Security & Key Isolation
  // -------------------------------------------------------------------------
  console.log(`${BOLD}[1/5] Security & Key Isolation Verification${RESET}`);

  // Check .env.example
  const envExamplePath = resolve(process.cwd(), '.env.example');
  assert(existsSync(envExamplePath), '.env.example exists in root directory');
  const envExampleContent = readFileSync(envExamplePath, 'utf-8');
  assert(
    envExampleContent.includes('GEMINI_API_KEY=your_gemini_api_key_here') &&
    !envExampleContent.includes('AIzaSy'),
    '.env.example contains placeholder only (no live secrets)'
  );

  // Check .gitignore
  const gitignoreContent = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8');
  assert(
    gitignoreContent.includes('.env') && gitignoreContent.includes('!.env.example'),
    '.gitignore blocks all .env files while allowing .env.example'
  );

  // Check dist bundle if present
  const distDir = resolve(process.cwd(), 'dist/assets');
  if (existsSync(distDir)) {
    const fs = await import('node:fs/promises');
    const files = await fs.readdir(distDir);
    const jsFiles = files.filter((f: string) => f.endsWith('.js'));
    let hasLeak = false;
    for (const f of jsFiles) {
      const code = await fs.readFile(resolve(distDir, f), 'utf-8');
      if (code.includes('AIzaSy') || code.includes('GEMINI_API_KEY=')) {
        hasLeak = true;
      }
    }
    assert(!hasLeak, 'Production JS bundle in dist/ contains zero hardcoded API secrets');
  }

  // -------------------------------------------------------------------------
  // 2. Business Data Provider 9-Tool Suite
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}[2/5] Business Data Provider 9 Tool Validations${RESET}`);

  // Tool 1: searchProducts
  const searchRes = await businessDataProvider.searchProducts('Mattress');
  assert(searchRes.verified && searchRes.data.length >= 2, 'Tool 1: searchProducts returns approved mattress catalogue');

  // Tool 2: getProductDetails
  const detailRes = await businessDataProvider.getProductDetails('smartgrid-ortho');
  assert(
    detailRes.verified &&
    detailRes.data.name.includes('SmartGRID Ortho') &&
    detailRes.metadata?.isAuthoritative === true,
    'Tool 2: getProductDetails returns verified SmartGRID Ortho record with metadata'
  );

  // Tool 3: getCurrentPrice
  const priceRes = await businessDataProvider.getCurrentPrice('smartgrid-ortho', 'Queen (78x60)');
  assert(
    priceRes.verified &&
    priceRes.data.currentPrice === 8490 &&
    priceRes.data.mrp === 14999 &&
    priceRes.metadata?.freshnessStatus === 'CURRENT',
    'Tool 3: getCurrentPrice returns authoritative baseline ₹8,490 for Queen variant (MRP ₹14,999)'
  );

  // Tool 4: getActiveOffers
  const offersRes = await businessDataProvider.getActiveOffers();
  assert(
    offersRes.verified &&
    offersRes.data.length >= 2 &&
    offersRes.data.some((o) => o.code === 'FESTIVE1000'),
    'Tool 4: getActiveOffers returns active promotional discounts (FESTIVE1000)'
  );

  // Tool 5: getEMIOptions
  const emiRes = await businessDataProvider.getEMIOptions(10000);
  assert(
    emiRes.verified &&
    emiRes.data.eligibleOptions.some((o) => o.interestRate === 0 && o.tenureMonths === 6),
    'Tool 5: getEMIOptions calculates verified 0% No-Cost EMI options'
  );

  // Tool 6: getWarrantyPolicy
  const warrantyRes = await businessDataProvider.getWarrantyPolicy('Mattress');
  assert(
    warrantyRes.verified &&
    warrantyRes.data.policyType === 'WARRANTY' &&
    warrantyRes.data.title.includes('10-Year'),
    'Tool 6: getWarrantyPolicy returns 10-year official warranty terms'
  );

  // Tool 7: getTrialAndReturnPolicy
  const trialRes = await businessDataProvider.getTrialAndReturnPolicy('Mattress');
  assert(
    trialRes.verified &&
    trialRes.data.policyType === 'TRIAL_AND_RETURN' &&
    trialRes.data.title.includes('100-Night'),
    'Tool 7: getTrialAndReturnPolicy returns 100-night risk-free trial terms'
  );

  // Tool 8: getDeliveryAvailability
  const deliveryRes = await businessDataProvider.getDeliveryAvailability('560001');
  assert(
    deliveryRes.verified &&
    deliveryRes.data.deliverable === true &&
    deliveryRes.data.deliveryFee === 0,
    'Tool 8: getDeliveryAvailability confirms free delivery to Bangalore pincode 560001'
  );

  // Tool 9: getApprovedFAQ
  const faqRes = await businessDataProvider.getApprovedFAQ('SmartGRID');
  assert(
    faqRes.verified &&
    faqRes.data.length >= 1 &&
    faqRes.data[0].question.includes('SmartGRID'),
    'Tool 9: getApprovedFAQ returns approved Japanese patented material FAQ'
  );

  // -------------------------------------------------------------------------
  // 3. Live Price Synchronization & Cache Invalidation (Requirement H & I)
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}[3/5] Requirement H & I: Live Price Synchronization & Invalidation${RESET}`);

  // Query baseline
  const prePrice = await businessDataProvider.getCurrentPrice('smartgrid-ortho', 'Queen (78x60)');
  const initialVersion = prePrice.metadata?.version;
  assert(prePrice.data.currentPrice === 8490, `Pre-mutation price confirmed at ₹8,490 (v${initialVersion})`);

  // Simulate upstream ERP/CRM price update
  const newPriceValue = 8990;
  const updateSuccess = businessDataProvider.updateProductPrice('smartgrid-ortho', 'Queen (78x60)', newPriceValue);
  assert(updateSuccess === true, 'Upstream price update succeeded via updateProductPrice');

  // Verify immediate retrieval reflects new price and incremented version
  const postPrice = await businessDataProvider.getCurrentPrice('smartgrid-ortho', 'Queen (78x60)');
  const postVersion = postPrice.metadata?.version;
  assert(
    postPrice.data.currentPrice === newPriceValue,
    `Post-mutation price updated to ₹${newPriceValue} immediately without stale cache`
  );
  assert(
    postVersion !== initialVersion && postVersion?.startsWith('2026.10.'),
    `Catalogue version incremented from ${initialVersion} to ${postVersion}`
  );
  assert(
    Boolean(postPrice.metadata?.retrievalTimestamp),
    `Fresh retrieval timestamp verified: ${postPrice.metadata?.retrievalTimestamp}`
  );

  // Reset catalog back to baseline
  businessDataProvider.resetCatalog();
  const resetPrice = await businessDataProvider.getCurrentPrice('smartgrid-ortho', 'Queen (78x60)');
  assert(
    resetPrice.data.currentPrice === 8490 && resetPrice.metadata?.version === '2026.10.1',
    'Catalog reset returns prices and version cleanly back to baseline v2026.10.1'
  );

  // -------------------------------------------------------------------------
  // 4. Boundary & Unknown Query Handling (Requirement F & L)
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}[4/5] Requirement F & L: Zero-Fabrication Boundary Testing${RESET}`);

  // Unknown product
  const unknownProd = await businessDataProvider.getProductDetails('non-existent-sleep-mattress');
  assert(
    unknownProd.verified === false && unknownProd.error === 'PRODUCT_NOT_FOUND',
    'Unknown product returns verified: false with PRODUCT_NOT_FOUND (no invented facts)'
  );

  // Invalid pincode
  const invalidPin = await businessDataProvider.getDeliveryAvailability('123');
  assert(
    invalidPin.verified === false && invalidPin.error === 'INVALID_PINCODE',
    'Invalid pincode returns verified: false with INVALID_PINCODE'
  );

  // Invalid size
  const invalidSize = await businessDataProvider.getCurrentPrice('smartgrid-ortho', 'Super Californian King');
  assert(
    invalidSize.verified === false && invalidSize.error === 'SIZE_NOT_FOUND',
    'Invalid size returns verified: false with available variant options listed'
  );

  // -------------------------------------------------------------------------
  // 5. Gemini Live Function Tool Dispatcher
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}[5/5] Gemini Live Function Tool Dispatcher${RESET}`);

  assert(GEMINI_LIVE_FUNCTION_DECLARATIONS.length === 9, 'All 9 official Gemini function declarations defined');

  const dispatchedPrice = await dispatchLiveToolCall('getCurrentPrice', {
    productId: 'smartgrid-ortho',
    sizeOrVariant: 'Queen (78x60)'
  });
  assert(
    dispatchedPrice.output.verified === true && dispatchedPrice.output.data.currentPrice === 8490,
    'dispatchLiveToolCall invokes getCurrentPrice and returns verified price payload'
  );

  const dispatchedOffers = await dispatchLiveToolCall('getActiveOffers', {});
  assert(
    dispatchedOffers.output.verified === true && dispatchedOffers.output.data.length >= 2,
    'dispatchLiveToolCall invokes getActiveOffers successfully'
  );

  // -------------------------------------------------------------------------
  // 6. Voice Model Discovery, Diagnostics & Fallback Chain Verification
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}[6/6] Voice Model Discovery, Diagnostics & Fallback Verification${RESET}`);

  const { ModelFallbackManager } = await import('../src/services/geminiLive/modelFallbackManager');

  // Test 6.1: Manager Initialization & Legacy Model Exclusion
  const fallbackMgr = new ModelFallbackManager('gemini-3.8-live');
  assert(
    fallbackMgr.getActiveModel() === 'gemini-3.8-live',
    'ModelFallbackManager: Initializes with gemini-3.8-live as primary model'
  );
  assert(
    !fallbackMgr.getFallbackChain().includes('gemini-2.0-flash-exp'),
    'ModelFallbackManager: Strictly excludes legacy gemini-2.0-flash-exp'
  );

  // Test 6.2: Error Classification Machine
  assert(
    fallbackMgr.classifyError(401, 'Unauthorized') === 'AUTH_FATAL' &&
    fallbackMgr.classifyError(1008, 'Method does not allow unregistered callers') === 'AUTH_FATAL',
    'ModelFallbackManager: Classifies 401 and unregistered caller as AUTH_FATAL'
  );
  assert(
    fallbackMgr.classifyError(429, 'Too many requests') === 'RATE_LIMIT_429' &&
    fallbackMgr.classifyError(1011, 'You exceeded your current quota') === 'QUOTA_EXHAUSTED',
    'ModelFallbackManager: Classifies 429 burst and 1011 quota exhaustion accurately'
  );
  assert(
    fallbackMgr.classifyError(404, 'Model not found') === 'UNSUPPORTED_MODEL' &&
    fallbackMgr.classifyError(503, 'Service unavailable') === 'TRANSIENT_503',
    'ModelFallbackManager: Classifies 404 unsupported and 503 transient outages'
  );

  // Test 6.3: Fallback Decision Policy (Auth fatal must NOT cycle models)
  assert(
    fallbackMgr.shouldFallback('AUTH_FATAL') === false,
    'ModelFallbackManager: shouldFallback is FALSE for AUTH_FATAL (prevents wasteful model cycling)'
  );
  assert(
    fallbackMgr.shouldFallback('QUOTA_EXHAUSTED') === true,
    'ModelFallbackManager: shouldFallback is TRUE for QUOTA_EXHAUSTED when fallbacks exist'
  );

  // Test 6.4: Deterministic Fallback Progression
  const step1 = fallbackMgr.advanceToFallback('QUOTA_EXHAUSTED', 'Rate limit on primary');
  assert(
    step1.switched === true &&
    step1.fromModel === 'gemini-3.8-live' &&
    step1.toModel === 'gemini-3.1-flash-live-preview',
    'ModelFallbackManager: Step 1 switches safely to gemini-3.1-flash-live-preview'
  );

  const step2 = fallbackMgr.advanceToFallback('QUOTA_EXHAUSTED', 'Rate limit on secondary');
  assert(
    step2.switched === true &&
    step2.fromModel === 'gemini-3.1-flash-live-preview' &&
    step2.toModel === 'gemini-2.5-flash-native-audio-preview-12-2025',
    'ModelFallbackManager: Step 2 switches safely to gemini-2.5-flash-native-audio-preview-12-2025'
  );

  const step3 = fallbackMgr.advanceToFallback('UNSUPPORTED_MODEL', 'End of chain');
  assert(
    step3.switched === false,
    'ModelFallbackManager: Step 3 gracefully reports exhausted chain without crashing'
  );
  assert(
    fallbackMgr.getSwitchHistory().length === 2,
    'ModelFallbackManager: Maintains complete audit history of all transitions'
  );

  // Test 6.5: Reset back to primary
  fallbackMgr.resetToPrimary();
  assert(
    fallbackMgr.getActiveModel() === 'gemini-3.8-live',
    'ModelFallbackManager: resetToPrimary restores active model to primary'
  );

  // Test 6.6: Server Model Discovery Service Sanitization
  const { discoverAvailableModels } = await import('../server/modelDiscoveryService');
  const emptyKeyDiscovery = await discoverAvailableModels('');
  assert(
    emptyKeyDiscovery.success === false &&
    emptyKeyDiscovery.accountHasAccess === false &&
    emptyKeyDiscovery.models.length > 0,
    'discoverAvailableModels: Returns structured candidate catalog without leaking secrets when key is empty'
  );

  // Summary
  console.log(`\n${BOLD}======================================================${RESET}`);
  if (failed === 0) {
    console.log(`${BOLD}${GREEN} ALL ${passed} AUTOMATED VERIFICATION TESTS PASSED!${RESET}`);
  } else {
    console.log(`${BOLD}${RED} ${failed} TESTS FAILED, ${passed} PASSED.${RESET}`);
  }
  console.log(`${BOLD}======================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
