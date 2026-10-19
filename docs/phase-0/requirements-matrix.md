# Requirements Matrix — OnGround.ai Call Centre Reconstruction

**Reference Status**: `HTML reference mockup: NOT AVAILABLE`  
**Authoritative Evidence Sources**:
- `assignment.pdf` (Pages 1 to 6)
- Extracted reference screenshots (`img_p4_1` through `img_p5_4`)

---

## Complete Requirements Matrix

| ID | Requirement Description | Source | Classification | Component Affected | Phase | Planned Verification Method | Status | Remaining Uncertainty |
|---|---|---|---|---|---|---|---|---|
| **REQ-SH-01** | Reconstruct shared application shell with fixed sidebar and topbar | PDF p.3, 4, 5 | Explicit Company Requirement | Shell | Phase 1 | Visual inspection at 1354x900 viewport | `CONFIRMED FROM PDF` | None for desktop; exact mobile drawer behavior inferred |
| **REQ-SH-02** | Sidebar width 224px, `#11392e` background, active `#20443a` | `img_p4_1` pixel sample | Screenshot Observation | Sidebar | Phase 1 | DOM computed styles test & screenshot comparison | `OBSERVED IN SCREENSHOT` | None |
| **REQ-SH-03** | Topbar height 54px, `#184236` background, notification badge, user profile AR | `img_p4_1` pixel sample | Screenshot Observation | Topbar | Phase 1 | Computed styles & icon render checks | `OBSERVED IN SCREENSHOT` | None |
| **REQ-SH-04** | Bottom floating action pill: DEMO, In-app call, Phone call, Shield | `img_p4_1`, PDF p.5 | Screenshot Observation | FloatingPill | Phase 1 | Click event tests on all 4 buttons | `OBSERVED IN SCREENSHOT` | Exact DEMO toggle script missing from HTML |
| **REQ-CAL-01** | Working calling demo in application (explicit requirement) | PDF p.1, p.3 | Explicit Company Requirement | CallingEngine | Phase 2 | Real mic audio stream capture, timer, speech test | `CONFIRMED FROM PDF` | Call protocol not fully defined in PDF |
| **REQ-CAL-02** | Interactive Voice AI customer simulation with speech recognition & synthesis | PDF p.1, p.2, p.3 | Engineering Recommendation | VoiceAgent | Phase 2 | Browser SpeechRecognition & SpeechSynthesis testing | `PLANNED` | Needs browser mic permission |
| **REQ-CAL-03** | WebRTC multi-tab human-to-human audio call | PDF p.1 ("human-to-human") | Engineering Recommendation | WebRTCCall | Phase 2 | 2-tab audio session over BroadcastChannel | `PLANNED` | Tab background audio throttling in Chrome |
| **REQ-CAL-04** | Direct telephone network click-to-call link | PDF p.1, p.4, p.5 | Engineering Recommendation | PhoneDialer | Phase 2 | Verify `tel:+91...` href and dialer modal | `PLANNED` | Requires external phone/softphone client |
| **REQ-DB-01** | 4 KPI cards (OG Score 76, AHT 4m 12s, CSAT 94%, In Queue 2) | PDF p.4, `img_p4_1` | Screenshot Observation | Dashboard | Phase 3 | DOM assertion for exact labels & delta indicators | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DB-02** | Today's Progress card (3 created, 2 called) | PDF p.4, `img_p4_1` | Screenshot Observation | Dashboard | Phase 3 | Verify progress values & colors (`#0e251d`) | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DB-03** | Earnings bar (₹5,200 / ₹6,000) | PDF p.4, `img_p4_1` | Screenshot Observation | Dashboard | Phase 3 | Progress element width calculation | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DB-04** | Who's Waiting list with wait duration pills | PDF p.4, `img_p4_1` | Screenshot Observation | Dashboard | Phase 3 | Component render & "Open planner" link test | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DB-05** | My Tasks card with counter badge '3' | PDF p.4, `img_p4_1` | Screenshot Observation | Dashboard | Phase 3 | Click tasks, assert Leads Modal opens | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DB-06** | 7-day Calls Handled and CSAT Trend charts | PDF p.4, `img_p4_1` | Screenshot Observation | DashboardCharts | Phase 3 | Render SVG bars matching exact values & colors | `OBSERVED IN SCREENSHOT` | Hover tooltip format missing from HTML |
| **REQ-PL-01** | Plan — Calls to Make leads ranked by score | PDF p.4, `img_p4_3` | Explicit Company Requirement | CallsToMake | Phase 4 | Assert score order (96, 90) and values | `CONFIRMED FROM PDF` | None |
| **REQ-PL-02** | Calls to Make functional pagination (Page 1 of 3) | PDF p.4, `img_p4_3` | Explicit Company Requirement | CallsToMake | Phase 4 | Click `>` button, assert Page 2 records render | `CONFIRMED FROM PDF` | Page 2-3 data not in screenshots; authored |
| **REQ-PL-03** | Calls to Make expandable rows | PDF p.4, `img_p4_3` | Explicit Company Requirement | CallsToMake | Phase 4 | Click row, verify expanded details & action buttons | `CONFIRMED FROM PDF` | Expanded styling inferred from Leads modal |
| **REQ-PL-04** | Plan — Incoming missed calls with ₹81,860 value at stake | PDF p.4, `img_p4_4` | Explicit Company Requirement | IncomingCalls | Phase 4 | Verify 5 rows, values, and total stake computation | `CONFIRMED FROM PDF` | None |
| **REQ-PL-05** | Incoming "Call back" action triggers calling engine | PDF p.4, `img_p4_4` | Explicit Company Requirement | IncomingCalls | Phase 4 | Click "Call back", verify CallingModal opens for contact | `CONFIRMED FROM PDF` | Post-callback status update UX inferred |
| **REQ-PL-06** | Plan — Recent chronological calls with status icons | PDF p.4, `img_p4_2` | Explicit Company Requirement | RecentCalls | Phase 4 | Verify 8 calls, types (inbound, outbound, missed) | `CONFIRMED FROM PDF` | None |
| **REQ-PL-07** | Recent call tap-to-review against SOP | PDF p.4, `img_p4_2` | Explicit Company Requirement | CallReview | Phase 4 | Click Mukunda R. row, assert SOP drawer opens | `CONFIRMED FROM PDF` | SOP modal design missing from HTML; reconstructed |
| **REQ-CL-01** | Calendar month grid (October 2026) starting Thursday Oct 1 | PDF p.5, `img_p5_3` | Explicit Company Requirement | Calendar | Phase 5 | Assert 31 days, first day Thursday, Oct 9 highlighted | `CONFIRMED FROM PDF` | None |
| **REQ-CL-02** | Calendar month switcher (`<` and `>`) & Today button | PDF p.5, `img_p5_3` | Explicit Company Requirement | Calendar | Phase 5 | Click `>`, assert Nov 2026; click Today, assert Oct 2026 | `CONFIRMED FROM PDF` | None |
| **REQ-CL-03** | Calendar event indicators (dots) and agenda list | PDF p.5, `img_p5_3` | Explicit Company Requirement | Calendar | Phase 5 | Assert red dots on 23, 26, 28; click date shows agenda | `CONFIRMED FROM PDF` | Full event agenda details inferred |
| **REQ-PU-01** | Pulse Home: AvaniBot AI banner, Custom Agents, Kudos | PDF p.5, `img_p5_2` | Explicit Company Requirement | PulseHome | Phase 5 | Assert all agent names, metrics (24%, 81%, 78%), Kudos | `CONFIRMED FROM PDF` | None |
| **REQ-PU-02** | Pulse Channel (`#callcentre-team`) navigation | PDF p.5, `img_p5_4` | Explicit Company Requirement | PulseChannel | Phase 5 | Click `#callcentre-agent`, assert chat view opens | `CONFIRMED FROM PDF` | None |
| **REQ-PU-03** | Pinned "Needs your input" decision card with 2 buttons | PDF p.5, `img_p5_4` | Explicit Company Requirement | DecisionCard | Phase 5 | Click `[Confirmed]`, assert status & chat update | `CONFIRMED FROM PDF` | None |
| **REQ-PU-04** | Chat stream: participants left, agent right, with timestamps | PDF p.5, `img_p5_4` | Explicit Company Requirement | ChatStream | Phase 5 | Assert Sunita Rao left, Arvind Rajan right, timestamps | `CONFIRMED FROM PDF` | None |
| **REQ-PU-05** | Chat composer: sending reply visibly updates conversation | PDF p.5, `img_p5_4` | Explicit Company Requirement | ChatComposer | Phase 5 | Type message, submit, assert new bubble appended right | `CONFIRMED FROM PDF` | None |
| **REQ-LM-01** | Leads Modal opens from Dashboard task list | PDF p.5, `img_p5_1` | Explicit Company Requirement | LeadsModal | Phase 6 | Click Dashboard task, assert Leads Modal opens | `CONFIRMED FROM PDF` | None |
| **REQ-LM-02** | Leads carousel pagination (Lead 1 of 5) | PDF p.5, `img_p5_1` | Explicit Company Requirement | LeadsModal | Phase 6 | Click `>` button, assert Lead 2 data updates | `CONFIRMED FROM PDF` | None |
| **REQ-LM-03** | Lead scores: ICP progress bar (87%), Intent Score badge (91) | PDF p.5, `img_p5_1` | Screenshot Observation | LeadsModal | Phase 6 | Verify progress bar fill and score badge | `OBSERVED IN SCREENSHOT` | None |
| **REQ-LM-04** | Collapsible buying signal accordions (Financing, Quotation, Warranty) | PDF p.5, `img_p5_1` | Explicit Company Requirement | LeadsModal | Phase 6 | Click header, verify accordion expand/collapse | `CONFIRMED FROM PDF` | None |
| **REQ-LM-05** | Leads Modal direct calling trigger | PDF p.5, `img_p5_1` | Screenshot Observation | LeadsModal | Phase 6 | Click `[📞 In-app call]`, verify calling engine dials lead | `OBSERVED IN SCREENSHOT` | None |
| **REQ-DOC-01** | Professional README with stack rationale, setup, AI disclosures | PDF p.3, p.6 | Explicit Company Requirement | Documentation | Phase 8 | Inspect README.md sections against PDF checklist | `CONFIRMED FROM PDF` | None |
| **REQ-DOC-02** | Git repository with incremental commit history | PDF p.3, p.6 | Explicit Company Requirement | Repository | Phase 8 | `git log --oneline` check | `CONFIRMED FROM PDF` | None |
| **REQ-DOC-03** | Video recording of up to 2 minutes demonstrating product & calling | PDF p.6 | Bonus / Evaluation Requirement | Delivery | Phase 8 | Verify recording duration <= 120s & demo flow | `CONFIRMED FROM PDF` | None |
