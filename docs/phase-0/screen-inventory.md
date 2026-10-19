# Screen Inventory — OnGround.ai Call Centre Reconstruction

**Reference Status**: `HTML reference mockup: NOT AVAILABLE`  
**Authoritative Evidence Sources**: 
- `d:\company\reference\assignment.pdf` (6-page specification and brief)
- `d:\company\reference\extracted_assets\` (8 high-resolution 1354x900 screenshots extracted directly from PDF vector stream: `img_p4_1` to `img_p5_4`)

---

## Screenshot Manifest

| Reference File | Screen Name | Dimensions | Source Page | Visual Quality & Coverage | Key Limitations |
|---|---|---|---|---|---|
| `page_3.png` | Your Mission Workflow | 1654x2339 | Page 3 | High-res text & icons | Workflow diagram only; does not show the app interface |
| `img_p4_1.jpeg` | Dashboard | 1354x900 | Page 4 (Screen 1) | 100% vector-extracted raster | Micro-transitions, tooltip text, hover states not visible |
| `img_p4_3.jpeg` | Plan — Calls to Make | 1354x900 | Page 4 (Screen 2) | 100% vector-extracted raster | Collapsed row view only; expanded row details not pictured |
| `img_p4_4.jpeg` | Plan — Incoming (Missed) | 1354x900 | Page 4 (Screen 3) | 100% vector-extracted raster | Static row states; callback in-progress state not pictured |
| `img_p4_2.jpeg` | Plan — Recent | 1354x900 | Page 4 (Screen 4) | 100% vector-extracted raster | List view only; SOP review drawer/modal not pictured |
| `img_p5_3.jpeg` | Calendar | 1354x900 | Page 5 (Screen 5) | 100% vector-extracted raster | October 2026 view; agenda item detail popup not pictured |
| `img_p5_2.jpeg` | Pulse Home | 1354x900 | Page 5 (Screen 6) | 100% vector-extracted raster | Home view; agent click detail drawers not pictured |
| `img_p5_4.jpeg` | Pulse Channel (`#callcentre-team`) | 1354x900 | Page 5 (Screen 7) | 100% vector-extracted raster | Static chat state; decision button outcome UI not pictured |
| `img_p5_1.jpeg` | Leads Modal (Overlay) | 1354x900 | Page 5 (Screen 8) | 100% vector-extracted raster | Lead 1 shown; Leads 2-5, collapsed accordion contents not pictured |

---

## Screen Inventory & Requirements Breakdown

### 1. Shared Application Shell
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Consistent layout across all views with sidebar and top bar.
  - Review environment target: Latest Chrome on a laptop.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - **Sidebar**: Fixed 224px width, `#11392e` dark forest background. Top logo "On-Ground.ai". Navigation links:
    - `Dashboard` (grid icon)
    - `Plan` (phone icon) with nested submenu:
      - `Calls to make` (phone-outgoing icon)
      - `Incoming` (phone-incoming icon)
      - `Recent` (history icon)
      - `Practise a call` (phone-call icon)
    - `Calendar` (calendar icon)
    - `Pulse` (chat-bubble icon)
    - Active nav item has `#20443a` pill background and mint-green text/icon `#38a169`.
  - **Top Bar**: Fixed 54px height, `#184236` dark forest background.
    - Left brand: Emerald square icon with "OG", text "On-Ground.ai".
    - Right user controls: Notification bell with red badge (`4`), score pill (`76`), star pill (`★ #3`), user avatar circle (`AR` for Arvind Rajan, green border).
    - Status pill: "• On Queue" (dark blue pill `#141a4a` with bright cyan dot).
    - Date filter: "📅 This Week" or date label "Fri, 9".
  - **Floating Action Pill** (bottom center):
    - Light grey pill bar (`#f3f2f7`): `[DEMO]` (gold pill), `[📞 In-app call]`, `[📞 Phone call]`, `[🛡️]` shield icon.
- **Interactions**:
  - Sidebar item click switches active route/view.
  - Submenu expands/collapses under `Plan`.
  - Floating pill actions trigger call modals or demo mode.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Exact responsive breakpoints below 1354px.
  - Exact dropdown menu contents for user avatar (AR).
  - Exact tooltip text on top bar badges.

---

### 2. Dashboard
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - KPI cards, progress indicators, who is waiting, earnings, tasks, and seven-day charts.
  - Dashboard task interactions must connect to the relevant lead details modal.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - **Header Banner**: Dark navy `#232f79` (y=54 to 236).
    - Greeting: "Good afternoon 👋", "Arvind Rajan", "The Sleep Company · Call Centre".
    - 4 KPI Cards (`#2f3976` rounded cards):
      1. `76` / `OG SCORE™` / `▲ 13` (green)
      2. `4m 12s` / `AVG HANDLE TIME` / `▼ 8%` (green)
      3. `94%` / `CSAT TODAY` / `▲ 2pt` (green)
      4. `2` / `IN QUEUE` / `• live` (blue pill)
  - **My Progress Card**: Deep forest `#0e251d` background:
    - "• MY PROGRESS · TODAY"
    - `3` / `▲ +1` / `Leads Created`
    - `2` / `▲ +2` / `Leads Called`
  - **Earnings Card**:
    - "💰 My earnings this month": `₹5,200` (`₹1,700 from coached moves`).
    - Progress bar: green fill showing progress towards `₹800 to ₹6,000`.
  - **Who's Waiting**:
    - Title: "WHO'S WAITING", right link "Open planner →".
    - Row 1: Headset icon, "Priya Iyer", "Likely billing dispute — flagged before", time "4m 20s" (red pill).
    - Row 2: Headset icon, "Suresh Nair", "Plan upgrade enquiry", time "1m 50s" (orange pill).
  - **My Tasks Card**:
    - Amber/brown border card (`#78350f`), title: "📋 My Tasks" with red counter `3`.
    - Item 1: Phone icon, "2 callbacks next 4:30pm".
    - Item 2: User icon, "2 hot leads untouched 24h".
    - Item 3: Document icon, "1 outcome to log".
  - **7-Day Charts**:
    - "CALLS HANDLED · LAST 7 DAYS": Mon (18), Tue (22), Wed (15), Thu (26), Fri (20), Sat (12), Today (14) - mint green rectangular bars.
    - "CSAT TREND · LAST 7 DAYS": Mon (88%), Tue (90%), Wed (85%), Thu (92%), Fri (89%), Sat (91%), Today (94%) - blue rectangular bars (`#f2f1f6` to `#232f79`).
- **Interactions**:
  - Clicking task rows ("2 callbacks", "2 hot leads") opens the Leads Modal.
  - Clicking "Open planner →" navigates to Plan tab.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Hover tooltip details on chart bars.
  - Exact action when clicking "1 outcome to log" (opens call logging modal).

---

### 3. Plan — Calls to Make ("Planned outgoing calls")
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Leads ranked by score, expandable rows, and paging.
  - Paging must actually update the displayed records.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Header: Navy banner, "Today's calling plan", subtitle "Planner", right date "Fri, 9".
  - Section title: "Planned outgoing calls — Ranked by lead attractiveness score — tap a lead for the full picture".
  - Rows:
    - Row 1: Avatar circle `RS`, "Ritu S.", "Interested: Smart Luxe Mattress · ₹13,390", Score: `96` / `SCORE`.
    - Row 2: Avatar circle `MK`, "Mukunda", "Interested: Ortho GRID · ₹8,490", Score: `90` / `SCORE`.
  - Pagination: Center-aligned `< Page 1 of 3 >`.
- **Interactions**:
  - Clicking row expands accordion with lead details, phone number, note history, and direct call trigger.
  - Clicking `<` or `>` pagination buttons updates displayed page and changes records.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Visual layout of the expanded state in the original mock (reconstructed cleanly based on Leads Modal data).
  - Records on Pages 2 and 3 (authored with coherent Sleep Company lead data).

---

### 4. Plan — Incoming ("Missed calls")
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Missed calls list with value at stake.
  - Functional "Call back" action on every row connected to the calling engine.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Header metrics:
    - `5` / `MISSED TODAY`
    - `₹81,860` / `EXPECTED VALUE AT STAKE`
  - Rows:
    - Row 1: Red missed icon, "Faizan A.", "Missed Today 10:05 AM · Visited store / in CRM", `₹24,990 expected value`, `[📞 Call back]` (green button).
    - Row 2: Red missed icon, "Kavitha R.", "Missed Yesterday 4:40 PM · Warm lead", `₹24,990 expected value`, `[📞 Call back]`.
    - Row 3: Red missed icon, "Divya P.", "Missed Yesterday 2:15 PM · Cold lead", `₹18,490 expected value`, `[📞 Call back]`.
    - Row 4: Red missed icon, "Ritu S.", "Missed Today 11:20 AM · Visited store / in CRM", `₹13,390 expected value`, `[📞 Call back]`.
    - Row 5: Red missed icon, "Unknown", "Missed Yesterday · No prior record", `New contact`, `[📞 Call back]`.
- **Interactions**:
  - Clicking `[Call back]` directly triggers the calling engine with customer context.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Transition state after callback is completed (removes from missed or marks resolved).

---

### 5. Plan — Recent
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Recent calls with call type, time, length.
  - Tap a call to review it against SOP.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Section title: "Recent calls — Tap a call to review it against SOP".
  - Rows:
    - Row 1: Green inbound icon, "Mukunda R.", "10:42 AM · 4m 12s".
    - Row 2: Blue outbound icon, "Kavitha R.", "Yesterday · 2m 05s".
    - Row 3: Red missed icon, "Unknown", "Yesterday · —".
    - Row 4: Red missed icon, "Ritu S.", "Today 11:20 AM · —".
    - Row 5: Red missed icon, "Faizan A.", "Today 10:05 AM · —".
    - Row 6: Red missed icon, "Kavitha R.", "Yesterday 4:40 PM · —".
    - Row 7: Red missed icon, "Divya P.", "Yesterday 2:15 PM · —".
    - Row 8: Blue outbound icon, "Faizan A.", "Mon · 6m 40s".
- **Interactions**:
  - Clicking any call row opens the SOP Review drawer/modal showing audio playback/transcript, checklist, and QA score.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Exact layout of SOP review popup (implemented as a clean sliding drawer).

---

### 6. Calendar
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Month grid, event dots/indicators, Today button, and month switcher.
  - Month navigation must actually update the displayed month.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Header: Calendar icon, "Calendar", subtitle "Mirrored from your mailbox — invites created here land there too".
  - Notice banner: "Store visits, coaching sessions, and meeting invites all show up here — and in your mailbox."
  - Calendar Card: White card with rounded corners, centered month view:
    - Month header: `<` `October 2026` `[Today]` `>`
    - Days of week: `S  M  T  W  T  F  S`
    - October 1st starts on Thursday!
    - Day `9` is selected with blue border box (indicates Today).
    - Red dots under days `23`, `26`, `28`.
  - Bottom area: "UPCOMING" events section.
- **Interactions**:
  - Clicking `<` and `>` updates month state (September 2026, November 2026).
  - Clicking `[Today]` resets to October 2026, Day 9.
  - Clicking any date displays agenda items for that date.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Full year calendar data (mocked dynamically for 2026).

---

### 7. Pulse Home
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - AvaniBot, role agents, task agents, channels, and Kudos.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Header: Purple icon, "Pulse / The Sleep Company · Koramangala".
  - Search input: "Ask AvaniBot or search Pulse...".
  - AvaniBot Banner (Purple gradient `#7c3aed` to `#9333ea`):
    - Star icon, "AvaniBot ALWAYS ON" badge.
    - "Ask me about anything happening in Pulse — daily briefs, action items, quick answers".
    - Buttons: `[✨ Daily Brief]` `[💬 Ask a question]`, rating badge `⭐ 2`.
  - Custom Agents Section: "Set up by your manager — already live, tap to open".
  - ROLE AGENTS (run a team):
    - `# callcentre-agent` | Call Centre Agent.
  - TASK AGENTS (move one metric):
    - `# cross-sell-agent` | Your Attach rate · 5 members | `24%` bar
    - `# sop-agent` | Your SOP adherence · 5 members | `81%` bar
    - `# lead-conversion-agent` | Lead Conversion Agent
    - `# capture-agent` | Your Capture coverage · 5 members | `78%` bar
  - GENERAL:
    - WhatsApp icon, `customer-discussions` | Relayed via WhatsApp Business.
  - Kudos Banner (Gold bar `#d97706`):
    - Trophy icon, "Kudos 3 NEW", quote: `"Great work with Mukunda — closed that objection beautifully!" · Sunita Rao`, `12 ALL-TIME`.
- **Interactions**:
  - Clicking `# callcentre-agent` or channel navigates to Pulse Channel view.
  - Clicking `[Daily Brief]` opens brief modal.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Search query filtering behavior across agents.

---

### 8. Pulse Channel (`#callcentre-team`)
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Back button, channel header, pinned "Needs your input" card with two buttons and reply box.
  - Chat bubbles: other participants left, agent right, with timestamps.
  - Sending reply must visibly update the conversation.
  - Two decision buttons must perform meaningful actions.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Channel Header: Back arrow (`←`), `#callcentre-team`.
  - Pinned Card (Warm beige/gold border):
    - Pin icon, "Needs your input 1 pinned".
    - "Confirm the 4:30pm callback / Priya Iyer · likely billing dispute".
    - Buttons: `[Confirmed]` `[Reschedule]`.
    - Input: "Or type your answer" + `[Send]` button.
  - Date separator: "Today · Call Centre Team".
  - Messages Stream:
    - Left (Sunita Rao, avatar `SR`, 2:05pm):
      - `👥 STAKEHOLDERS: @You (Arvind R.), whole call centre shift`
      - `📋 ISSUE DEFINITION: Greeting-in-first-10s QA score is at 71% this week, below our 85% target.`
      - `➡️ SUGGESTED RESOLUTION: Let's push that up 💪 — open every call with the greeting script. I'll check back Friday.`
    - Right (Agent Arvind Rajan, green bubble, 2:10pm):
      - `On it! Will make sure I open every call with the greeting script 🙌`
    - Left (Sunita Rao, 2:14pm):
      - `Great attitude Arvind 🌟`
  - Bottom Chat Composer:
    - Input placeholder "Message #callcentre-team...", emoji picker, Send button.
- **Interactions**:
  - Clicking `[Confirmed]` marks the decision card confirmed and posts an automated status message.
  - Clicking `[Reschedule]` opens reschedule prompt.
  - Typing and submitting in composer appends message on right.
  - Clicking `←` returns to Pulse Home.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Dynamic manager AI response timing (we can provide auto-replies for realism).

---

### 9. Leads Modal
- **Confirmed Requirements [CONFIRMED FROM PDF]**:
  - Opened from dashboard task list.
  - Lead card with ICP score, lead-intent score, collapsible buying signals, next/previous paging.
- **Visible Elements [OBSERVED IN SCREENSHOT]**:
  - Modal overlay with backdrop blur over the dashboard.
  - Header: Purple `#6b21a8`, `👥 Leads`, subtitle `Lead 1 of 5 · SLA to close`, close button `✕`.
  - Carousel bar: Dot indicators `● ○ ○ ○ ○`, navigation button `>`.
  - Status tag: `● OPEN`, SLA `2h left` (green pill).
  - Lead info: Avatar `MK`, "Mukunda", "Interested: Ortho GRID · ₹8,490".
  - Tag pill: `📋 Quote to be given to customer`.
  - Scores:
    - `🎯 ICP` progress bar: `87%` (green bar).
    - `🎯 Lead Intent Score`: `91` (green badge).
  - Accordions:
    - `ICP FIT BREAKDOWN >`
    - `HOW WE GOT HERE >`
    - `WHERE WE PICKED UP SIGNALS ∨` (expanded):
      - `₹ Financing Related`: "Asked specifically about EMI options on the Ortho GRID — budget is a live concern, not a blocker"
      - `📄 Quotation Demanded`: "Compared pricing with a competitor before reaching out — price-anchored, expects a competitive number"
      - `🛡️ Warranty Related`: "Hasn't raised this yet — worth proactively mentioning the 100-night trial to reduce perceived risk"
  - Alert footer: `CUMULATIVE MISSED: 2 · expired without close, visible to manager`.
  - Floating pill bar attached at bottom: `[DEMO] [📞 In-app call] [📞 Phone call] [🛡️]`.
- **Interactions**:
  - Clicking `>` or `<` switches between Leads 1 through 5, updating all scores and signals.
  - Clicking accordions toggles expand/collapse.
  - Clicking `[📞 In-app call]` dials the current lead.
  - Clicking `✕` closes modal and restores dashboard.
- **Unknowns Due to Missing HTML [UNKNOWN — HTML REFERENCE MISSING]**:
  - Detailed texts for leads 2 through 5 (fully authored with realistic Sleep Company CRM leads).
