# Complete Nine-Phase Implementation Roadmap

**Assignment**: OnGround.ai Engineering Hiring Assignment  
**Deadline**: Tuesday, 20 October 2026, 10:00 AM IST  
**Evaluation Weightage**: Match to Mock (30%), Working Behaviour (25%), Code Quality (25%), README & Communication (10%), Bonus Items & Polish (10%)

---

## Roadmap Overview

```
Phase 0: Investigation & Specification (Completed)
   │
Phase 1: Project Setup & Shared Shell
   │
Phase 2: Working Calling Engine POC (WebRTC + Voice AI + Phone Dialer)
   │
Phase 3: Dashboard (KPIs, Progress, Tasks, 7-Day Charts)
   │
Phase 4: Planner (Calls to Make, Incoming Missed Calls, Recent History)
   │
Phase 5: Calendar & Pulse Collaboration Channels
   │
Phase 6: Leads Modal & Buying Signals Accordions
   │
Phase 7: Visual Fidelity Tuning & Cross-Viewport QA
   │
Phase 8: README, Submission Documentation & Demo Recording Prep
```

---

### Phase 0 — Investigation and Planning
- **Status**: **COMPLETE**
- **Purpose**: Fully audit the assignment PDF, extract reference screenshots, identify constraints, establish design tokens, formulate calling architecture, and prepare all planning specifications.
- **Tasks**:
  1. Audit assignment PDF and OCR output.
  2. Extract 8 high-resolution 1354x900 screenshots into `reference/extracted_assets/`.
  3. Sample exact color codes and layout dimensions.
  4. Author `AGENTS.md` and `docs/phase-0/` specification documents.
- **Expected Outputs**: `AGENTS.md`, `docs/phase-0/screen-inventory.md`, `requirements-matrix.md`, `interaction-matrix.md`, `calling-investigation.md`, `technical-research.md`, `technology-decisions.md`, `implementation-plan.md`, `risk-register.md`.
- **Definition of Done**: All Phase 0 requirements satisfied; user approved plan.

---

### Phase 1 — Project Setup and Shared Shell
- **Status**: **PENDING APPROVAL**
- **Purpose**: Initialize clean React + Vite + TypeScript project, configure design tokens, build the fixed sidebar, topbar, and floating action pill.
- **Tasks**:
  1. Initialize Vite React TypeScript project in `d:\company` with clean file layout.
  2. Setup `src/styles/tokens.css` with exact hex colors, dimensions, and typography.
  3. Build `Sidebar` (224px width, `#11392e`, nav items, icons, active state pill).
  4. Build `Topbar` (54px height, `#184236`, OG brand, notification bell badge `4`, score `76`, star `#3`, avatar `AR`, queue pill).
  5. Build `FloatingActionPill` (`[DEMO]`, `[In-app call]`, `[Phone call]`, `[Shield]`).
  6. Implement tab routing coordinator in `App.tsx` preserving active view state.
- **Dependencies**: Phase 0 tokens and layout measurements.
- **Acceptance Criteria**:
  - Application renders at 1354x900 without layout shifts.
  - Clicking sidebar nav links switches main view container.
  - Shell matches `img_p4_1.jpeg` layout dimensions.
- **Verification**: Browser DOM inspection, visual comparison with reference screenshots, `npm run build` succeeds.
- **Estimated Duration**: ~30 minutes.

---

### Phase 2 — Working Calling Proof of Concept
- **Status**: **PLANNED**
- **Purpose**: Build and verify the critical calling engine with real audio capture, dual-engine operation (Voice AI + WebRTC multi-tab), and UI controls.
- **Tasks**:
  1. Implement `CallingContext` with state machine: `IDLE` -> `DIALING` / `RINGING` -> `CONNECTED` -> `ENDED`.
  2. Build `CallingModal`: contact avatar, name, value at stake, duration clock, mute button, keypad toggle, end button.
  3. Implement Mode A: Voice AI Customer (Web Speech API recognition + Web Audio analyser waveform + SpeechSynthesis responses).
  4. Implement Mode B: WebRTC Peer Calling between two browser tabs over `BroadcastChannel`.
  5. Implement Mode C: Standard `tel:` protocol URI for phone dialing.
- **Dependencies**: Phase 1 Shell & `CallingContext`.
- **Acceptance Criteria**:
  - Live microphone audio capture verified; waveform reacts dynamically to voice.
  - Voice AI agent responds verbally to user speech.
  - Two browser tabs can establish an active audio call and toggle mute.
  - No static/fake UI popups presented as genuine calling.
- **Verification**: Browser microphone testing, multi-tab call connection test, console logging verification.
- **Estimated Duration**: ~45 minutes.

---

### Phase 3 — Dashboard Implementation
- **Status**: **PLANNED**
- **Purpose**: Implement the main shift dashboard with KPIs, daily progress, earnings progress, waiting queue, actionable tasks, and 7-day charts.
- **Tasks**:
  1. Create `DashboardHeader` with greeting "Good afternoon 👋 Arvind Rajan", Sleep Company subtitle, and "This Week" date pill.
  2. Implement 4 KPI cards: `76 OG Score` (+13), `4m 12s AHT` (-8%), `94% CSAT Today` (+2pt), `2 In Queue` (live pill).
  3. Implement `TodayProgressCard`: `3 Leads Created`, `2 Leads Called` (`#0e251d`).
  4. Implement `EarningsCard`: `₹5,200` with visual progress bar to `₹6,000`.
  5. Implement `WhosWaitingList`: Priya Iyer (4m 20s), Suresh Nair (1m 50s), and "Open planner →" link.
  6. Implement `MyTasksCard` (`#78350f` amber border, red badge `3`): connecting items to Leads Modal.
  7. Implement 7-day rectangular bar charts for Calls Handled and CSAT Trend matching exact colors.
- **Dependencies**: Phase 1 Shell, typed sample data.
- **Acceptance Criteria**:
  - Layout matches `img_p4_1.jpeg` pixel-for-pixel.
  - Clicking "2 callbacks" opens Leads modal for Lead 1.
  - Clicking "Open planner →" opens Planner tab.
- **Verification**: Visual screenshot comparison at 1354x900, interactive click tests.
- **Estimated Duration**: ~40 minutes.

---

### Phase 4 — Plan Screens (Calls to Make, Incoming, Recent)
- **Status**: **PLANNED**
- **Purpose**: Implement the 3 Planner sub-views: outgoing prioritized calls, missed incoming calls with callbacks, and recent call SOP reviews.
- **Tasks**:
  1. Build `CallsToMake`: Ranked leads (Ritu S. 96, Mukunda 90), expandable rows with buying details, and functional pagination `< Page 1 of 3 >`.
  2. Build `IncomingCalls`: Metrics `5 MISSED TODAY`, `₹81,860 EXPECTED VALUE AT STAKE`, 5 contact rows with green `[Call back]` buttons directly triggering calling engine.
  3. Build `RecentCalls`: Chronological call records with status icons (inbound green, outbound blue, missed red) and duration.
  4. Build `SOPReviewDrawer`: Opens when a recent call is clicked, displaying audio playback, transcript, greeting audit, and checklist.
- **Dependencies**: Phase 2 Calling Engine, Phase 1 Shell.
- **Acceptance Criteria**:
  - Pagination changes displayed rows on Calls to Make.
  - Clicking `[Call back]` immediately launches calling engine with contact context.
  - Recent call click opens SOP review.
- **Verification**: Interactive paging and callback tests, visual screenshot comparison against `img_p4_2`, `img_p4_3`, `img_p4_4`.
- **Estimated Duration**: ~45 minutes.

---

### Phase 5 — Calendar and Pulse Collaboration
- **Status**: **PLANNED**
- **Purpose**: Implement the monthly calendar with event schedule, Pulse home with AvaniBot AI, and `#callcentre-team` channel chat.
- **Tasks**:
  1. Build `Calendar`: Header banner, Month grid (October 2026 starting Thursday Oct 1st, Oct 9th highlighted), `<` and `>` month switcher, `[Today]` button, event indicator dots (23, 26, 28), and upcoming agenda list.
  2. Build `PulseHome`: Header, AvaniBot "Always On" AI banner (`[✨ Daily Brief]`, `[💬 Ask a question]`), Role Agents (`# callcentre-agent`), Task Agents with metric bars (`# cross-sell-agent` 24%, `# sop-agent` 81%, `# capture-agent` 78%), Kudos banner.
  3. Build `PulseChannel`: Header with back arrow, pinned "Needs your input" card with `[Confirmed]` and `[Reschedule]` actions, chat stream (participants left, agent right, timestamps), chat composer.
- **Dependencies**: Phase 1 Shell, typed sample data.
- **Acceptance Criteria**:
  - Month switcher actually changes month and date grid.
  - Channel back arrow returns to Pulse Home.
  - Clicking `[Confirmed]` updates card state and posts confirmation note.
  - Chat composer sends new messages that render on right.
- **Verification**: Interactive chat and calendar tests, visual comparison against `img_p5_2`, `img_p5_3`, `img_p5_4`.
- **Estimated Duration**: ~45 minutes.

---

### Phase 6 — Leads Modal & Buying Signals
- **Status**: **PLANNED**
- **Purpose**: Implement the deep-dive lead modal triggered from dashboard tasks and planner rows, featuring ICP scores and collapsible buying signals.
- **Tasks**:
  1. Build `LeadsModal`: Backdrop blur overlay, purple header (`#6b21a8`), carousel controls `● ○ ○ ○ ○` with `< >` navigation (5 leads).
  2. Lead profile card: Avatar, name, product interest, price, SLA pill ("2h left"), quote tag.
  3. Score indicators: ICP progress bar (87%), Lead Intent Score badge (91).
  4. Collapsible signal accordions: `ICP FIT BREAKDOWN`, `HOW WE GOT HERE`, `WHERE WE PICKED UP SIGNALS` (Financing, Quotation, Warranty).
  5. Action bar: `[DEMO]`, `[📞 In-app call]`, `[📞 Phone call]`, `[🛡️]`.
- **Dependencies**: Phase 2 Calling Engine, Phase 3 Dashboard tasks.
- **Acceptance Criteria**:
  - Modal opens from Dashboard tasks and closes cleanly.
  - Paging carousel advances between all 5 leads, updating scores and signals.
  - Accordions expand/collapse smoothly.
  - Direct call button initiates outgoing call.
- **Verification**: Visual comparison against `img_p5_1.jpeg`, modal interaction tests.
- **Estimated Duration**: ~35 minutes.

---

### Phase 7 — Visual Fidelity & Quality Assurance
- **Status**: **PLANNED**
- **Purpose**: Conduct rigorous pixel-level cross-checking of all views at 1354x900 viewport against reference screenshots, test all error boundaries, and validate production build.
- **Tasks**:
  1. Perform side-by-side screenshot comparisons for all 8 views at 1354x900.
  2. Tune padding, margins, font weights, border radiuses, and shadow elevations.
  3. Test empty states, long text truncation, and responsive scaling down to mobile viewports (bonus item).
  4. Execute strict TypeScript checks (`tsc --noEmit`) and production build (`npm run build`).
- **Dependencies**: Phases 1 through 6.
- **Acceptance Criteria**:
  - Zero build warnings or errors.
  - Visual delta between reconstructed app and reference images is minimal.
- **Verification**: Automated build command, browser screenshot captures.
- **Estimated Duration**: ~35 minutes.

---

### Phase 8 — Final Submission & Delivery Preparation
- **Status**: **PLANNED**
- **Purpose**: Finalize professional `README.md`, verify Git commit history, draft submission email, and prepare 2-minute video recording checklist.
- **Tasks**:
  1. Write comprehensive `README.md` containing:
     - Architecture and stack rationale.
     - Step-by-step setup and local running instructions.
     - Thorough explanation of how calling was implemented (WebRTC + Voice AI + Tel).
     - Completed requirements checklist (100% core + bonus items).
     - AI tool disclosures (as required by assignment guidelines).
  2. Review Git commit log for conventional, incremental commits.
  3. Prepare video recording script covering the required walkthrough flow.
  4. Verify submission details: `mukunda@on-ground.ai`, Subject: `Assignment Submission: <full name>`, deadline Tuesday 20 October 2026, 10:00 AM IST.
- **Dependencies**: Phase 7 QA sign-off.
- **Acceptance Criteria**:
  - README is polished, clear, and reproducible.
  - Repository is clean and ready for submission.
- **Estimated Duration**: ~25 minutes.
