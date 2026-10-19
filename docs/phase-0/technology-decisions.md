# Technology Stack Decisions & Architectural Rationale

**Authoritative Deadline**: Tuesday, 20 October 2026, 10:00 AM IST  
**Target Environment**: Latest Google Chrome on a laptop (1354x900 default viewport)

---

## 1. Executive Stack Selection Summary

| Layer | Selected Technology | Alternative Considered | Decision Rationale & Trade-offs |
|---|---|---|---|
| **UI Framework** | **React 18 / 19 + TypeScript** | Angular / Plain Vanilla JS | Assignment PDF states *"React or Angular is preferred"*. React provides rapid component composability, clean stateful modals/drawers, and rich ecosystem support. TypeScript provides strict compile-time safety for complex lead schemas, call lifecycle states, and chat payloads. |
| **Build Tool** | **Vite** | Webpack / Next.js | Instant cold-start server (`<300ms`), lightning-fast Hot Module Replacement (HMR), zero-config TypeScript bundling, and tiny static production output. No server runtime required. |
| **Styling** | **Vanilla CSS + CSS Variables + CSS Modules** | Tailwind CSS / Styled Components | Pixel-exact matching to the extracted reference colors (`#11392e`, `#184236`, `#232f79`) without battling Tailwind utility overrides. Zero CSS runtime overhead. High maintainability. |
| **Calling Engine** | **Web Audio API + WebRTC + Web Speech API** | Twilio / Agora / Daily.co | Self-contained in modern Chrome, requires zero external accounts, zero API keys, zero backend servers, and completely free from deployment failure risks during evaluation. |
| **Data Layer** | **Typed In-Memory TypeScript Data Store** | SQLite / IndexedDB / Express API | PDF explicitly mandates: *"Data: a local JSON file or small mock module. No backend."* Pure typed TypeScript data structures ensure instant rendering, realistic mock state mutations (marking callbacks resolved, sending chat messages, updating lead scores), and zero latency. |
| **Icons** | **Lucide React** | FontAwesome / Material UI | Ultra-lightweight tree-shakable SVG icons perfectly matching the phone, calendar, bell, search, chevron, and message icons in the reference screens. |

---

## 2. In-Depth Justifications

### A. Why React with Vite over Plain HTML or Next.js
1. **Plain HTML/CSS/JS**: While permitted by the PDF (*"Plain HTML, CSS and JavaScript is fine if you say why"*), managing 8 interconnected views, dynamic tab routing, modal carousels, expandable accordions, interactive chat streams, and WebRTC peer calling with raw DOM manipulation leads to fragile spaghetti code and slower development before the 10:00 AM deadline.
2. **Next.js**: Unnecessarily introduces Node.js server dependencies, SSR hydration mismatches, and deployment complexities when the assignment strictly specifies an in-browser SPA with local sample data.
3. **React + Vite**: Strikes the optimal balance: instantaneous feedback loop, clean component separation (`shell/`, `dashboard/`, `planner/`, `calendar/`, `pulse/`, `leads/`, `calling/`), and production build verification (`npm run build`).

### B. Styling Strategy: CSS Design Tokens over Tailwind CSS
To achieve the 30% "Match to the Mock" score, visual fidelity must be surgical:
- Global design tokens defined in `src/styles/tokens.css`:
  - `--sidebar-w: 224px;`
  - `--topbar-h: 54px;`
  - `--color-sidebar-bg: #11392e;`
  - `--color-sidebar-active: #20443a;`
  - `--color-topbar-bg: #184236;`
  - `--color-header-navy: #232f79;`
  - `--color-kpi-card: #2f3976;`
  - `--color-progress-card: #0e251d;`
  - `--color-tasks-card-border: #78350f;`
  - `--color-pulse-gradient: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);`
  - `--color-leads-header: #6b21a8;`
- Using CSS variables ensures that if any minor shade adjustment is needed after comparative QA, changing a single token updates the entire application consistently.

---

## 3. Directory Layout & Code Organization
```
d:\company\
├── AGENTS.md                          # Persistent coding instructions
├── README.md                          # Comprehensive project documentation
├── package.json                       # Dependencies & scripts
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # Strict TypeScript settings
├── public/                            # Static assets
├── docs/phase-0/                      # Phase 0 audit & specification docs
└── src/
    ├── main.tsx                       # React application entry point
    ├── App.tsx                        # Main shell & routing coordinator
    ├── assets/                        # SVG icons & branding
    ├── components/
    │   ├── shell/                     # Sidebar, Topbar, FloatingActionPill
    │   ├── dashboard/                 # KPI cards, Progress, Tasks, Charts
    │   ├── planner/                   # CallsToMake, Incoming, Recent, SOPReview
    │   ├── calendar/                  # MonthGrid, Switcher, AgendaList
    │   ├── pulse/                     # PulseHome, AvaniBot, PulseChannel, ChatStream
    │   ├── leads/                     # LeadsModal, BuyingSignals, ScoreBars
    │   └── calling/                   # CallingModal, AudioVisualizer, Dialer
    ├── context/
    │   ├── CallingContext.tsx         # Calling state machine, WebRTC, Voice AI
    │   └── AppStateContext.tsx        # Leads, Tasks, Chat messages, Calendar state
    ├── data/
    │   └── mockData.ts                # Coherent The Sleep Company call-centre data
    ├── hooks/
    │   ├── useWebRTC.ts               # BroadcastChannel peer connection hook
    │   ├── useVoiceAI.ts              # SpeechRecognition & SpeechSynthesis hook
    │   └── useAudioVisualizer.ts      # Web Audio API AnalyserNode hook
    ├── types/
    │   └── index.ts                   # TypeScript interfaces & enums
    └── styles/
        ├── tokens.css                 # Color tokens, spacing, typography
        ├── index.css                  # Global resets & typography
        └── components/                # Modular component stylesheets
```
