# Twilio-Powered Intelligent AI Customer Calling — Setup & Operations Guide

## Overview

This guide explains how to configure, run, and test the **Twilio Programmable Voice** and **Gemini Text AI** integration in **OnGround.ai** for **The Sleep Company**.

The architecture delivers an intelligent, customer-first telephone conversational experience:
1. When an agent clicks **"Call Using AI Agent"** on a customer lead, Twilio directly places an outbound PSTN call to the customer's phone number.
2. The agent's phone is **never dialed** (bypassed entirely).
3. When the customer answers, Twilio requests our initial TwiML webhook (`/api/twilio/voice`), which speaks a personalized greeting via Twilio `<Say>` (`Polly.Aditi` Indian English voice).
4. Twilio `<Gather>` transcribes the customer's spoken question via speech-to-text (`en-IN`).
5. The transcribed `SpeechResult` is POSTed to `/api/twilio/ai-turn`.
6. Our backend invokes the server-side **Gemini Text Reasoning Engine** (`gemini-3.5-flash-lite`), enriched with the customer's lead context, past turns, and verified Sleep Company business tools (catalogue pricing, 0% EMI calculation, 100-night trial, 10-year warranty).
7. The validated response is synthesized via Twilio `<Say>` and another `<Gather>` automatically listens for follow-up questions.
8. When the conversation concludes, the full multi-turn transcript and duration are logged into **Recent Calls**.

---

## 1. Environment & Credential Configuration

Configure your environment variables in `.env` (or via your deployment platform):

```env
# Twilio Account Credentials (Read from server environment only)
TWILIO_ACCOUNT_SID=AC9ae8972321972d329c7f9f19543dfa7a
TWILIO_AUTH_TOKEN=YOUR_LOCAL_AUTH_TOKEN

# Twilio Virtual/Trial Phone Number (From Number)
TWILIO_FROM_NUMBER=+17372508034

# Verified Recipient / Test Customer Mobile Number (To Number)
TWILIO_TEST_TO_NUMBER=+917204104491
TWILIO_ALLOWED_TO_NUMBERS=+917204104491

# Safety & Trial Enforcement Flags
TWILIO_TRIAL_MODE=true
TWILIO_ENABLE_LIVE_CALLS=false
TWILIO_ALLOWLIST_REQUIRED=true
TWILIO_VALIDATE_WEBHOOK_SIGNATURE=true

# Call Limits
TWILIO_MAX_CALL_DURATION_SECONDS=600
TWILIO_MAX_CONVERSATION_TURNS=6

# Public Webhook Tunnel URL (ngrok HTTPS domain for local dev)
TWILIO_WEBHOOK_BASE_URL=https://YOUR-NGROK-DOMAIN.ngrok-free.app

# Webhook Endpoint Paths
TWILIO_VOICE_WEBHOOK_PATH=/api/twilio/voice
TWILIO_AI_TURN_WEBHOOK_PATH=/api/twilio/ai-turn
TWILIO_STATUS_WEBHOOK_PATH=/api/twilio/status

# Gemini Text Reasoning Engine Configuration
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_TEXT_MODEL=gemini-3.5-flash-lite

# AI Conversational Parameters
AI_DEFAULT_LANGUAGE=en-IN
AI_MAX_RESPONSE_TOKENS=180
AI_TEMPERATURE=0.4
```

> [!IMPORTANT]
> **Safety Mode Active by Default (`TWILIO_ENABLE_LIVE_CALLS=false`)**:
> In Safety Simulation Mode, outbound calls progress through the complete UI state machine (`queued` ➔ `ringing` ➔ `customer_answered` ➔ `ai_speaking` ➔ `listening`), testing the full audio waveform and transcript pipeline **without placing real telephone calls** or spending Twilio trial minutes.
> Set `TWILIO_ENABLE_LIVE_CALLS=true` **only** when ready to ring the physical mobile device.

---

## 2. Phone Number & Verified Recipient Setup

### From Number
- **Twilio Phone Number**: `+1 737 250 8034`
- This is the caller ID presented on the customer's phone.

### To Number (Customer/Test Recipient)
- **Customer Recipient**: `+91 72041 04491`
- In Twilio Trial accounts, outbound calls can **only** be placed to phone numbers that have been verified in the Twilio Console.

### Verifying a Recipient in Twilio Console
1. Log in to [Twilio Console](https://console.twilio.com).
2. Navigate to **Phone Numbers** ➔ **Manage** ➔ **Verified Caller IDs**.
3. Click **Add a new Caller ID** (`+`).
4. Enter the customer's mobile number: `+91 72041 04491`.
5. Select verification via SMS or phone call and enter the verification code.
6. Once verified, add the number to `TWILIO_ALLOWED_TO_NUMBERS` in `.env`.

### Voice Geographic Permissions (India +91)
By default, US Twilio trial accounts have international outbound dialing restricted.
To enable calls to India (+91):
1. In Twilio Console, go to **Voice** ➔ **Settings** ➔ **Geo Permissions**.
2. Search for **India (+91)**.
3. Check the checkbox to enable Voice calling to India.
4. Click **Save Geo Permissions**.

---

## 3. Local Development with ngrok

Twilio servers require a public HTTPS URL to reach your local webhook endpoints.

### Step 1: Start the Local Application
Run the Vite development server (port 5173):
```bash
npm run dev
```

### Step 2: Start the ngrok Tunnel
In a second terminal, open an HTTPS tunnel to port 5173:
```bash
ngrok http 5173
```
ngrok will output a public HTTPS URL, for example:
```
Forwarding   https://abc1-23-45-67-89.ngrok-free.app -> http://localhost:5173
```

### Step 3: Update `TWILIO_WEBHOOK_BASE_URL` in `.env`
Paste your ngrok HTTPS URL:
```env
TWILIO_WEBHOOK_BASE_URL=https://abc1-23-45-67-89.ngrok-free.app
```

> [!NOTE]
> Every time you restart a free ngrok tunnel, the URL changes. Remember to update `TWILIO_WEBHOOK_BASE_URL` with the new URL.

---

## 4. Endpoints & Webhook Flow

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/twilio/call` | `POST` | Dispatches outbound customer-first call via Twilio Calls API |
| `/api/twilio/call-status` | `GET` | Polled by frontend to sync live call status and transcript |
| `/api/twilio/voice` | `POST` | Twilio webhook returning initial personalized greeting TwiML + `<Gather>` |
| `/api/twilio/ai-turn` | `POST` | Twilio webhook receiving `SpeechResult`, executing Gemini, returning `<Say>` + `<Gather>` |
| `/api/twilio/status` | `POST` | Twilio status callback (`queued`, `ringing`, `in-progress`, `completed`, `failed`) |

### Conversational Architecture Diagram

```
[ FRONTEND UI ]
      │ 1. Click "Call Using AI Agent"
      ▼
[ POST /api/twilio/call ]
      │ 2. Initiates Outbound Call (To: +917204104491, From: +17372508034)
      ▼
[ TWILIO CLOUD ]
      │ 3. Dials Customer Phone directly
      ▼
[ CUSTOMER PHONE ] ── (Customer answers)
      │
      ▼
[ POST /api/twilio/voice ]
      │ 4. Generates personalized greeting TwiML:
      │    <Gather input="speech" language="en-IN">
      │      <Say voice="Polly.Aditi">Hello Ashray! We are calling from The Sleep Company...</Say>
      │    </Gather>
      ▼
[ CUSTOMER PHONE ] ── (Customer hears greeting and asks a question)
      │ 5. Speech recognized by Twilio (en-IN)
      ▼
[ POST /api/twilio/ai-turn ] (SpeechResult: "What is the price of the Ortho GRID mattress?")
      │ 6. Backend invokes Gemini Text Reasoning with Sleep Company tools:
      │    - getCurrentPrice('ortho-grid') -> ₹8,490
      │    - getEMIOptions('ortho-grid') -> ₹1,415/mo
      │    - getWarrantyPolicy('Mattress') -> 100-night trial, 10-year warranty
      ▼
[ TWILIO CLOUD ]
      │ 7. Returns response TwiML:
      │    <Gather input="speech" language="en-IN">
      │      <Say voice="Polly.Aditi">The Ortho GRID starts at ₹8,490 with 0% EMI from ₹1,415/month...</Say>
      │    </Gather>
      ▼
[ CUSTOMER PHONE ] ── (Speaks follow-up or says goodbye)
      │ 8. Repeats until turn limit or customer disconnects
      ▼
[ POST /api/twilio/status ]
      │ 9. Status 'completed' -> Full transcript and duration saved to Recent Calls
```

---

## 5. Trial Account Limitations & Upgrading

### Twilio Trial Features Supported
- **Programmable Voice Calls API**: Fully supported.
- **`<Gather input="speech">`**: Speech recognition is supported in trial mode.
- **`<Say voice="Polly.Aditi" language="en-IN">`**: Indian English Amazon Polly neural voice is fully supported.
- **Call-Status Callbacks**: Fully supported.
- **75 Free Voice Minutes**: Sufficient for development testing.

### Trial Account Constraints
1. **Verified Recipients Only**: You cannot dial arbitrary customer numbers. Calls to unverified numbers return Twilio Error `21216`.
2. **Trial Message Interception**: When the customer answers, Twilio plays a mandatory trial message (*"You have a trial account. Press any key to continue"* or an introductory audio snippet) before handing control to our TwiML webhook.
3. **Outbound TwiML Restriction on Some Trial Tiers**: Certain trial sub-accounts require outbound calls to point to pre-approved TwiML Bins or specify webhooks under registered projects.
4. **Geo-Permissions**: Outbound international calling from US numbers to India (+91) requires explicit approval under Twilio Console > Geo Permissions.

### When to Upgrade to a Paid Account
- To place calls to unverified customer mobile numbers across India.
- To remove the automated Twilio trial audio greeting.
- To acquire a local Indian virtual number (+91 ExoPhone or Twilio Indian DID) as the caller ID instead of a US (+1) number.

---

## 6. Testing & Quality Verification

Run the comprehensive Twilio test suite:
```bash
npm run test:twilio
```
Run the full project test suite:
```bash
npm test
```
Run TypeScript verification:
```bash
npm run typecheck
```
Run production build:
```bash
npm run build
```

---

## 7. Troubleshooting

| Error / Symptom | Root Cause | Solution |
|---|---|---|
| `RECIPIENT_NOT_ALLOWED` | Number not in allowlist | Add phone to `TWILIO_ALLOWED_TO_NUMBERS` in `.env` |
| Twilio Error `21216` | Number not verified in Twilio Console | Verify customer number in Twilio Console > Verified Caller IDs |
| Twilio Error `21215` | International geo-permissions disabled | Enable India (+91) under Twilio Console > Voice > Settings > Geo permissions |
| Twilio Error `21403` / Webhook 404 | ngrok URL inactive or incorrect | Start `ngrok http 5173` and update `TWILIO_WEBHOOK_BASE_URL` in `.env` |
| `DUPLICATE_CALL_IN_PROGRESS` | Previous call still active | Wait for previous call to complete, or click "End Call" in modal |
| Fallback catalog responses used | Gemini API key invalid or rate-limited | Verify `GEMINI_API_KEY` in `.env`; fallback answers from approved catalogue |
