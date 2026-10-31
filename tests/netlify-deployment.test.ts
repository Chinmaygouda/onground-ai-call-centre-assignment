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
console.log(' NETLIFY DEPLOYMENT CONFIGURATION & PRODUCTION AUDIT  ');
console.log('======================================================');

// 1. netlify.toml Build & Routing Rules
console.log('\n[1/4] netlify.toml Verification');
const tomlPath = path.resolve(process.cwd(), 'netlify.toml');
assert(fs.existsSync(tomlPath), 'netlify.toml exists in root');
const tomlContent = fs.readFileSync(tomlPath, 'utf-8');

assert(tomlContent.includes('command = "pnpm run build"'), 'netlify.toml configures build command: pnpm run build');
assert(tomlContent.includes('publish = "dist"'), 'netlify.toml configures publish directory: dist');
assert(tomlContent.includes('functions = "netlify/functions"'), 'netlify.toml configures functions directory: netlify/functions');
assert(tomlContent.includes('SECRETS_SCAN_OMIT_KEYS'), 'netlify.toml configures SECRETS_SCAN_OMIT_KEYS for clean Netlify builds');
assert(tomlContent.includes('from = "/api/gemini/token"'), 'netlify.toml routes /api/gemini/token to function');
assert(tomlContent.includes('from = "/api/gemini/status"'), 'netlify.toml routes /api/gemini/status to function');
assert(tomlContent.includes('from = "/api/gemini/models"'), 'netlify.toml routes /api/gemini/models to function');
assert(tomlContent.includes('from = "/api/gemini/query"'), 'netlify.toml routes /api/gemini/query to function');
assert(tomlContent.includes('from = "/api/twilio/call"'), 'netlify.toml routes /api/twilio/call to function');
assert(tomlContent.includes('from = "/api/twilio/end-call"'), 'netlify.toml routes /api/twilio/end-call to function');
assert(tomlContent.includes('from = "/*"') && tomlContent.includes('to = "/index.html"'), 'netlify.toml routes SPA fallback to /index.html');

// 2. public/_redirects Fallback
console.log('\n[2/4] public/_redirects Verification');
const redirectsPath = path.resolve(process.cwd(), 'public/_redirects');
assert(fs.existsSync(redirectsPath), 'public/_redirects exists in public directory');
const redirectsContent = fs.readFileSync(redirectsPath, 'utf-8');
assert(redirectsContent.includes('/api/gemini/token'), 'public/_redirects proxies /api/gemini/token');
assert(redirectsContent.includes('/api/gemini/query'), 'public/_redirects proxies /api/gemini/query');
assert(redirectsContent.includes('/api/twilio/end-call'), 'public/_redirects proxies /api/twilio/end-call');
assert(redirectsContent.includes('/*                      /index.html                            200'), 'public/_redirects routes SPA fallback to /index.html');

// 3. Serverless Functions in netlify/functions
console.log('\n[3/4] Netlify Serverless Functions Verification');
const tokenFunc = path.resolve(process.cwd(), 'netlify/functions/gemini-token.ts');
const statusFunc = path.resolve(process.cwd(), 'netlify/functions/gemini-status.ts');
const modelsFunc = path.resolve(process.cwd(), 'netlify/functions/gemini-models.ts');
const queryFunc = path.resolve(process.cwd(), 'netlify/functions/gemini-query.ts');

assert(fs.existsSync(tokenFunc), 'netlify/functions/gemini-token.ts exists');
assert(fs.existsSync(statusFunc), 'netlify/functions/gemini-status.ts exists');
assert(fs.existsSync(modelsFunc), 'netlify/functions/gemini-models.ts exists');
assert(fs.existsSync(queryFunc), 'netlify/functions/gemini-query.ts exists');

const tokenCode = fs.readFileSync(tokenFunc, 'utf-8');
assert(tokenCode.includes('process.env.GEMINI_API_KEY'), 'gemini-token securely reads process.env.GEMINI_API_KEY');
assert(!tokenCode.includes('AIzaSy'), 'gemini-token contains no hardcoded private keys');

const queryCode = fs.readFileSync(queryFunc, 'utf-8');
assert(queryCode.includes('executeGeminiQuery'), 'gemini-query dispatches to verified executeGeminiQuery engine');
assert(!queryCode.includes('AIzaSy'), 'gemini-query contains no hardcoded private keys');

// 4. Git Security & Secrets Protection
console.log('\n[4/4] Git Security & Secrets Protection');
const gitignorePath = path.resolve(process.cwd(), '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
assert(gitignoreContent.includes('.env'), '.gitignore excludes .env files');
assert(!fs.existsSync(path.resolve(process.cwd(), 'src/.env')), 'No .env files in src/');

console.log('\n======================================================');
if (failedTests === 0) {
  console.log(` ALL ${passedTests} NETLIFY DEPLOYMENT VERIFICATION TESTS PASSED!`);
} else {
  console.error(` ${failedTests} TESTS FAILED out of ${passedTests + failedTests}!`);
  process.exit(1);
}
console.log('======================================================\n');
