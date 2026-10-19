# AGENTS.md — OnGround.ai Call Centre Rebuild Instructions & Rules

## 1. Project Goal & Core Requirements
This repository contains the reconstructed, reference-driven **OnGround.ai Call Centre Web Application** built for the OnGround.ai Engineering Hiring Assignment.
The application serves a call-centre frontline agent (Arvind Rajan at The Sleep Company) during an active shift, managing daily work, outbound and incoming calls, lead data, calendar schedules, and AI collaboration channels.

**Evaluation Weightage**:
1. Match to Mock: 30%
2. Working Behaviour: 25%
3. Code Quality: 25%
4. README & Communication: 10%
5. Bonus Items & Polish: 10%

**Submission Deadline**: Tuesday, 20 October 2026, 10:00 AM IST to `mukunda@on-ground.ai`. Subject: `Assignment Submission: <Full Name>`.

---

## 2. Missing Reference Handling Policy
- **Reference Status**: `HTML reference mockup: NOT AVAILABLE`.
- **Authoritative Source**: The assignment PDF (`d:\company\reference\assignment.pdf`) is the authoritative written requirements source.
- **Visual Reference**: The 8 full-resolution 1354x900 screenshots extracted directly from the PDF vector stream (`d:\company\reference\extracted_assets\img_p4_1.jpeg` through `img_p5_4.jpeg`) serve as the visual baseline.
- **Handling Protocol**:
  1. Continue using the available PDF and extracted screenshots.
  2. Mark unsupported or unpictured visual details as unknown rather than fabricating pixel measurements.
  3. Make conservative, documented design decisions where necessary, maintaining harmony with the extracted tokens.
  4. Avoid redesigning known elements arbitrarily.
  5. If the original HTML mock (`OnGround_CallCentre_App_Mock.html`) becomes available later, update the visual specification and re-verify earlier assumptions against the rendered markup.

---

## 3. Visual Fidelity & Measured Design Tokens
The application must match the reference mock pixel-for-pixel at identical viewport dimensions (1354x900 default desktop laptop standard).
Exact tokens extracted and measured from reference assets:
- **Sidebar**: Width 224px, Background `#11392e`, Active Nav `#20443a` pill, Text `#ffffff` & `#38a169`
- **Top Bar**: Height 54px, Background `#184236`, Text/Icons muted light emerald & white
- **Dashboard Header Banner**: Height 182px (y=54 to 236), Dark Navy `#232f79`
- **Content Area Background**: Clean neutral `#ffffff` / `#f8fafc`
- **KPI Cards**: Indigo `#2f3976`, CSAT bars `#a8a6ab` & `#232f79`, Calls bars `#38a169` & `#22c55e`
- **Progress Card**: Forest `#0e251d`
- **My Tasks Card**: Amber border `#78350f` with red pill counter badge
- **Pulse Banner**: Purple gradient (`linear-gradient(135deg, #7c3aed, #9333ea)`)
- **Leads Modal**: Deep purple `#6b21a8` header with floating bottom pill bar (`#f3f2f7`)

---

## 4. Required Screens & Key Interactions
1. **Shared App Shell**: Fixed 224px sidebar, 54px topbar, user profile AR (Arvind Rajan), notification badges, floating action pill (`DEMO`, `In-app call`, `Phone call`, shield icon).
2. **Dashboard**: 4 KPI cards (OG Score, Avg Handle Time, CSAT Today, In Queue), Today's Progress, Earnings bar (₹5,200 / ₹6,000), Who's Waiting list, My Tasks with active triggers opening the Leads Modal, 7-day Calls Handled chart, 7-day CSAT Trend chart.
3. **Plan — Calls to Make**: Leads ranked by score, collapsible/expandable lead details, functional pagination (Page 1 of 3) updating displayed records.
4. **Plan — Incoming**: Missed calls list with expected value at stake (₹81,860 total), functional "Call back" action connected directly to the calling engine.
5. **Plan — Recent**: Chronological recent call history with call types (inbound/outbound/missed), durations, and tap-to-review drawer/modal against SOP guidelines.
6. **Calendar**: Month grid (October 2026 with today Oct 9th highlighted), functional previous/next month switching, "Today" button, event indicator dots, and scheduled agenda items.
7. **Pulse Home**: AvaniBot "Always On" AI assistant, Role Agents, Task Agents with metric progress bars, Channels, and Kudos feed.
8. **Pulse Channel (`#callcentre-team`)**: Back navigation, channel header, pinned "Needs your input" decision card with functional `[Confirmed]` and `[Reschedule]` actions, conversational chat stream (stakeholders, manager Sunita Rao, agent replies), and active message composer.
9. **Leads Modal**: Triggered from dashboard tasks/calls, carousel pagination (Lead 1 of 5), ICP Score progress bar (87%), Lead Intent Score badge (91), collapsible buying signal accordions (Financing, Quotation, Warranty), and direct calling triggers.

---

## 5. The Critical Calling Requirement
- Mock screens alone are NOT sufficient. A working calling demo is an explicit requirement.
- **Implemented Modes**:
  1. **AI-to-Human Voice Agent**: Interactive voice conversation using Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) and `window.speechSynthesis`, coupled with Web Audio API Analyser for real mic visualizer waves and audio feedback.
  2. **Human-to-Human WebRTC In-App Calling**: Real browser audio calling between two browser tabs using `RTCPeerConnection` with local `BroadcastChannel` signaling engine—zero external backend required.
  3. **Direct Telephone Network**: Click-to-dial integration via formatted `tel:` protocol.
- Do NOT claim a call is working unless audio capture, live duration timers, mic mute toggles, and call lifecycle states have been tested. Never misrepresent a static UI popup as genuine calling.

---

## 6. Technology Stack & Code Integrity
- **Framework**: React 18 / 19 with Vite and TypeScript.
- **Styling**: Modular CSS + CSS Design Tokens (`src/styles/tokens.css`) matching reference values.
- **No Source Copying**: The original mock code must NOT be copied or scraped. All code must be independently authored and cleanly structured.
- **Sample Data**: Local typed JSON/TypeScript data module (`src/data/mockData.ts`). No backend required.
- **Security**: No hardcoded API secrets or private tokens.

---

## 7. Verification & Visual QA Policy
- After each implementation phase:
  1. Capture a screenshot or inspect rendered DOM in the browser at 1354x900 viewport.
  2. Compare against corresponding reference image in `d:\company\reference\extracted_assets\`.
  3. Verify functional behavior: button clicks, state updates, modals, audio streams, and transitions.
  4. Run `npm run build` and TypeScript checks (`tsc --noEmit`).
  5. Never mark an item complete without direct verification.

---

## 8. Git & Change Management
- Initialize Git repository at `d:\company`.
- Commit atomically after each verified phase with clean, conventional commit messages:
  - `feat(shell): setup react vite project and shared app shell`
  - `feat(calling): implement webrtc and voice ai calling engine`
  - `feat(dashboard): build kpi cards, progress, tasks and 7-day charts`
  - `feat(planner): implement calls to make, incoming missed calls, and recent history`
  - `feat(calendar): implement month grid, switcher, and event schedule`
  - `feat(pulse): build pulse home, avanibot, and #callcentre-team channel`
  - `feat(leads): implement leads details modal and buying signals`
  - `test(qa): visual fidelity tuning and cross-viewport checks`
  - `docs: comprehensive submission readme and demo documentation`

---

## 9. Phase 0 Specification Documents
Detailed specifications, matrices, and investigations are stored in:
- [Screen Inventory](file:///d:/company/docs/phase-0/screen-inventory.md)
- [Requirements Matrix](file:///d:/company/docs/phase-0/requirements-matrix.md)
- [Interaction Matrix](file:///d:/company/docs/phase-0/interaction-matrix.md)
- [Calling Feasibility Investigation](file:///d:/company/docs/phase-0/calling-investigation.md)
- [Technical Research Record](file:///d:/company/docs/phase-0/technical-research.md)
- [Technology Stack Decisions](file:///d:/company/docs/phase-0/technology-decisions.md)
- [Nine-Phase Implementation Roadmap](file:///d:/company/docs/phase-0/implementation-plan.md)
- [Risk Register](file:///d:/company/docs/phase-0/risk-register.md)

---

## 10. Stopping Conditions & Clarification Triggers
The agent must stop and ask the user for confirmation when:
1. Significant architectural decisions deviate from the mock specifications.
2. Irreversible destructive file operations are required.
3. Clarification on external service credentials (e.g. Twilio or live VoIP services vs WebRTC peer calling) is needed.
