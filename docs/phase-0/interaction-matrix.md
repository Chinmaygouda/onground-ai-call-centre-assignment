# Interaction Matrix — OnGround.ai Call Centre Reconstruction

**Reference Status**: `HTML reference mockup: NOT AVAILABLE`  
**Purpose**: Define the precise trigger, expected UI state transition, data mutations, and fallback behaviors for all interactive elements across the application.

---

## Interactive Behaviors & State Transitions

| Component | UI Element / Trigger | User Action | Expected Behavioral Transition | Data & State Mutation | Fallback / Uncertainty Note |
|---|---|---|---|---|---|
| **App Shell** | Sidebar Nav Link | Click any top-level tab (`Dashboard`, `Plan`, `Calendar`, `Pulse`) | Highlights selected navigation item with `#20443a` pill; swaps main content region smoothly without page reload | Updates `activeRoute` state | None; standard SPA routing |
| **App Shell** | Plan Submenu | Click `Plan` | Toggles expanded submenu showing `Calls to make`, `Incoming`, `Recent`, `Practise a call` | Updates `isPlanSubmenuOpen` | Preserves last active sub-route |
| **App Shell** | Floating `[DEMO]` Button | Click | Opens demo selector or cycles active demo scenario (Incoming call, Fresh lead, Review mode) | Updates `demoScenario` state | Original HTML script missing; provide interactive demo mode |
| **App Shell** | Floating `[In-app call]` | Click | Opens Call Dialer Modal in DIALING state | Initiates `CallingContext.startCall()` | Prompts microphone access |
| **App Shell** | Floating `[Phone call]` | Click | Opens phone network dialer with formatted `tel:+917982015371` | Opens OS default handler / telephone dialer | Graceful fallback if device lacks telephony |
| **Dashboard** | My Tasks: "2 callbacks" | Click | Opens Leads Modal focused on Lead 1 (Mukunda) | Sets `isLeadsModalOpen = true`, `activeLeadIndex = 0` | Explicitly confirmed in assignment PDF |
| **Dashboard** | My Tasks: "2 hot leads" | Click | Opens Leads Modal focused on Lead 2 (Ritu S.) | Sets `isLeadsModalOpen = true`, `activeLeadIndex = 1` | Matches CRM lead priority flow |
| **Dashboard** | My Tasks: "1 outcome" | Click | Opens Call Outcome Logging Drawer | Sets `isOutcomeDrawerOpen = true` | SOP logging workflow |
| **Dashboard** | "Open planner →" | Click | Navigates to `Plan -> Calls to make` view | Sets `activeRoute = 'plan/calls'` | Direct cross-navigation |
| **Dashboard** | Chart Bars | Hover | Highlights bar slightly (`brightness(1.1)`), displays tooltip with exact call count / CSAT percentage | Local hover state | Exact tooltip format inferred |
| **Calls to Make** | Lead Row Card | Click row | Expands accordion revealing lead history, contact notes, budget concerns, and `[Call Lead]` button | Toggles `expandedLeadId` | Preserves score and contact details |
| **Calls to Make** | Pagination: `>` Button | Click next | Changes display from "Page 1 of 3" to "Page 2 of 3" and replaces rendered lead rows with page 2 data | Sets `currentPage = 2` | Explicit requirement: paging must change records |
| **Calls to Make** | Pagination: `<` Button | Click previous | Decrements page counter and renders previous page records | Sets `currentPage = 1` | Disabled when `currentPage === 1` |
| **Incoming** | `[Call back]` Button | Click on any row (e.g. Faizan A.) | Immediately launches Calling Modal in outgoing ringing state populated with Faizan A.'s details and ₹24,990 value | Sets `activeCall = contactData`, `callState = 'DIALING'` | Connected directly to calling engine |
| **Recent** | Call History Row | Click (e.g. Mukunda R.) | Opens SOP Call Review Drawer displaying audio playback bar, call transcript, QA score checklist, and greeting audit | Sets `selectedCallReview = callData` | Explicit requirement: tap call to review against SOP |
| **Calendar** | `>` Month Switcher | Click next month | Updates calendar grid to November 2026; updates header to "November 2026" | Sets `currentCalendarDate = addMonths(d, 1)` | Grid recalculates first day of week |
| **Calendar** | `<` Month Switcher | Click previous month | Updates calendar grid to September 2026; updates header to "September 2026" | Sets `currentCalendarDate = subMonths(d, 1)` | Grid recalculates first day of week |
| **Calendar** | `[Today]` Button | Click | Resets view to October 2026, highlights Oct 9th | Resets `currentCalendarDate = new Date(2026, 9, 9)` | Confirmation from reference screenshot |
| **Calendar** | Calendar Date Cell | Click date | Selects date cell, renders agenda list at bottom (store visits, coaching sessions, callbacks) | Sets `selectedDate = clickedDate` | Dots indicate days with agenda items |
| **Pulse Home** | Agent Card | Click `#callcentre-agent` | Navigates to `#callcentre-team` channel conversation view | Sets `activePulseChannel = 'callcentre-team'` | Header back arrow returns to Pulse Home |
| **Pulse Channel** | `←` Back Arrow | Click | Navigates back to Pulse Home | Sets `activePulseChannel = null` | Smooth view transition |
| **Pulse Channel** | Pinned: `[Confirmed]` | Click | Card updates status to green "✓ Confirmed by Arvind Rajan"; appends automated chat note: "Arvind confirmed 4:30pm callback with Priya Iyer" | Mutates pinned card status and appends message | Explicit requirement: meaningful action |
| **Pulse Channel** | Pinned: `[Reschedule]` | Click | Opens reschedule time picker modal (e.g. 5:00pm, Tomorrow); updates card status | Mutates pinned card status | Meaningful UI interaction |
| **Pulse Channel** | Chat Composer | Type text + press Enter or click Send | Appends new message bubble on right (green background, "You", current timestamp); clears input box | Appends message to channel stream | Explicit requirement: participants left, agent right |
| **Leads Modal** | Next `>` Arrow | Click | Advances carousel from "Lead 1 of 5" to "Lead 2 of 5"; updates dot indicator to `○ ● ○ ○ ○`; updates lead card, scores, and signals | Sets `leadIndex = (i + 1) % 5` | Smooth slide transition |
| **Leads Modal** | Signal Accordion | Click (e.g. `WHERE WE PICKED UP SIGNALS`) | Toggles accordion expansion, revealing Financing, Quotation, and Warranty breakdown cards | Toggles accordion boolean state | Smooth height transition |
| **Leads Modal** | Close `✕` / Backdrop | Click `✕` or click backdrop | Dismisses modal with smooth fade/scale; removes blur backdrop; restores dashboard focus | Sets `isLeadsModalOpen = false` | Standard modal dialog light-dismiss |
| **Calling Engine** | Mute Mic Button | Click during call | Toggles microphone audio track (`track.enabled = !track.enabled`); updates UI icon to mic-off | Toggles `isMuted` state | Tested via Web Audio / MediaStream API |
| **Calling Engine** | End Call Button | Click red button | Terminates audio stream, stops timers, records duration, switches modal to "Call Ended" summary state | Sets `callState = 'ENDED'` | Adds new entry to Recent calls list |
