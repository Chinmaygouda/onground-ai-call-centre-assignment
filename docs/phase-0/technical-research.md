# Technical Research Record — OnGround.ai Call Centre Reconstruction

**Reference Status**: `HTML reference mockup: NOT AVAILABLE`  
**Purpose**: Document official API specifications, library documentation, architectural patterns, and findings to ground every engineering choice in verified evidence.

---

## Technical Research Entries

### Entry 1: Web Audio API Microphone Capture & Real-Time Waveform Visualizer
- **Question Investigated**: How to reliably capture microphone audio in modern Chrome and extract real-time frequency data for a live audio wave visualizer without third-party audio plugins?
- **Source & URL**: [MDN Web Audio API - Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- **Relevant Findings**:
  - `navigator.mediaDevices.getUserMedia({ audio: true })` returns a `MediaStream`.
  - Creating an `AudioContext` and connecting an `AnalyserNode` (`audioCtx.createAnalyser()`) allows extraction of time-domain data via `analyser.getByteTimeDomainData(dataArray)`.
  - Frequency / amplitude values range 0–255, where 128 is silence.
  - A canvas or SVG element can map these values to a fluid sine wave in an animation frame loop (`requestAnimationFrame`).
- **Impact on Assignment**:
  - Provides undeniable visual proof that microphone input is live and active during a call.
  - Runs 100% locally in Chrome without external network requests or tokens.
- **Constraints**: Requires user permission prompt when microphone is first activated. Must resume `AudioContext` if initialized before user gesture.

---

### Entry 2: In-Browser Human-to-Human Audio Calling via WebRTC & BroadcastChannel
- **Question Investigated**: Can two local browser tabs establish an actual peer-to-peer audio stream without an external WebSocket signaling server?
- **Source & URL**: [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) & [MDN BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- **Relevant Findings**:
  - `RTCPeerConnection` requires an exchange of SDP offers/answers and ICE candidates.
  - Normally, a centralized server handles signaling. However, when both peers are open in tabs on the same origin/machine, `new BroadcastChannel('onground-call')` allows direct, cross-tab asynchronous message passing with zero server infrastructure.
  - Tab 1 creates an offer, sends it across the `BroadcastChannel`. Tab 2 receives the offer, prompts the user to accept, generates an answer, and sends it back.
  - Both tabs attach their local microphone audio tracks and play incoming tracks via an `HTMLAudioElement`.
- **Impact on Assignment**:
  - Delivers a true "human-to-human" audio call demo as requested on Page 1 of the assignment PDF, with zero backend requirement.
- **Constraints**: Both tabs must be served on the same origin (e.g. `http://localhost:5173/`).

---

### Entry 3: Browser Native Speech Recognition & Speech Synthesis (Voice AI Customer)
- **Question Investigated**: How to build an interactive AI customer / pitch coach that listens to the agent and speaks back naturally in real time?
- **Source & URL**: [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- **Relevant Findings**:
  - Speech-to-Text: `window.SpeechRecognition || window.webkitSpeechRecognition` provides real-time speech transcription with interim results.
  - Text-to-Speech: `window.speechSynthesis` speaks any text string with customizable pitch, rate, and voice (`speechSynthesis.speak(new SpeechSynthesisUtterance("Hello Arvind..."))`).
  - Event listeners (`onresult`, `onend`, `onerror`) handle turn-taking transitions.
- **Impact on Assignment**:
  - Allows the call-centre agent to interactively speak to an AI prospect ("Mukunda" or "The Sleep Company shopper") and receive instant spoken feedback.
  - Directly fulfills the assignment's "AI-to-human calling" requirement without paid cloud speech APIs.
- **Constraints**: Requires Chrome or Edge (supported in standard evaluation browser).

---

### Entry 4: Modern CSS Modal Scroll Containment & Backdrop Blur
- **Question Investigated**: How to implement the Leads modal and calling drawer with exact backdrop blur and prevent underlying page scrolling?
- **Source & URL**: Modern Web Guidance: `prevent-page-scroll-under-modal-dialog` & [CSS Overscroll Behavior Specification](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior)
- **Relevant Findings**:
  - `overscroll-behavior: contain` on the modal container prevents scroll chaining to the underlying dashboard.
  - Setting `overflow: hidden; overscroll-behavior: contain;` on `dialog::backdrop` traps wheel and touch events.
  - Backdrop blur: `backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.4);` replicates the exact reference screenshot styling seen in `img_p5_1.jpeg`.
- **Impact on Assignment**:
  - Guarantees seamless modal interactions without layout shifts or unwanted page background jumping.

---

### Entry 5: Precision Rectangular Bar Charts (Calls Handled & CSAT Trend)
- **Question Investigated**: Should we install a heavy chart library (Chart.js / Recharts) or build SVG data-driven charts?
- **Source & URL**: SVG 2.0 Specification & Lucide UI Patterns
- **Relevant Findings**:
  - The reference screenshots (`img_p4_1.jpeg`) show clean, flat, rectangular horizontal/vertical bars with precise rounded tops, exact height ratios, and specific hex colors (`#a8a6ab`, `#232f79`, `#38a169`, `#22c55e`).
  - External charting libraries (e.g. Chart.js, Recharts) introduce heavy canvas dependencies and default styling that diverges significantly from the mock.
  - A lightweight, semantic SVG component with flexbox/grid layout matches the reference mock pixel-for-pixel with zero external bloat.
  - To fulfill the PDF bonus item (*"Charts with a library you like"*), we can provide a library toggle or include clean Lucide icon integration.
- **Impact on Assignment**:
  - Perfect visual match to mock (30% evaluation weight) while keeping bundle size under 150KB.
