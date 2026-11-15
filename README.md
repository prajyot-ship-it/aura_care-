# AURA•CARE — Sovereign Elderly Care & Medication Co-Pilot

**Healthcare coordination that keeps dignity in the driver’s seat.**

- **GitHub Repository:** [https://github.com/prajyot-ship-it/aura_care-](https://github.com/prajyot-ship-it/aura_care-)
- **Live GitHub Pages Deployment:** [https://prajyot-ship-it.github.io/aura_care-/](https://prajyot-ship-it.github.io/aura_care-/)

---

## Core Architectural Pillars & Signature Features

1. **Dual-Mode Ergonomic Rendering Engine (Passcode-Driven UI Adaptation):**
   - **Elder Sovereign PIN (`111111`) → Dignity Mode (`/elder`):** WCAG AAA high-contrast tactile interface (`24px+` typography, `64px+` minimum touch targets), Web Speech API voice readouts (*"Read My Schedule Aloud"*), **Day (Pure White) & Night (Glossy Midnight Blue)** theme switcher, and interactive 3D WebGL Pill-Box Twins.
   - **Caretaker / Nurse PIN (`222222` / `333333`) → Care-Circle Command Center (`/dashboard`):** High-density clinical coordination dashboard featuring a 3D Circadian Orbital Node Network, 14-day longitudinal adherence heatmaps, real-time Double-Dose Mutex Locks, polypharmacy interaction guardrails, and a 1-Page Physician Clinical Brief generator.

2. **Living Flow Design & Real-Time 3D WebGL Studio (`src/components/three/` & `src/components/shared/LivingFlowEngine.tsx`):**
   - **Translucent Materials & Luminous Effect:** Multi-layered frosted glassmorphism (`backdrop-filter: blur(22px) saturate(180%)`) with cursor-tracked radial specular highlights (`--flow-x`, `--flow-y`) and ambient drifting aurora blooms.
   - **Physics-Based Flexible Feedback Touch System:** Every interactive button, pill badge, keypad key, and bento card stretches elastically on press/drag and rebounds via underdamped harmonic spring physics.
   - **100% Procedural 3D WebGL Models:** `HeroCareOrbScene`, `InteractivePill3D` (`ROUND`, `OVAL`, `CAPSULE`, `DIAMOND`), and `CareCircleOrbit3D` built in React Three Fiber with zero external `.glb` dependencies.

3. **"Shake-to-Calm" / Tremor-Adaptive Touch Stabilizer (`src/components/elder/TremorStabilizer.tsx`):**
   - Tracks rapid micro-oscillations in pointer/touch movement (`>= 7` direction reversals within `650ms`) to automatically detect essential hand tremors, or can be toggled via the **"Steady-Hand Stabilizer"** pill.
   - Expands touch targets (`data-tremor-stabilizer="on"`), adds high-visibility focus halos, and applies a `340ms` capture-phase debounce filter to block accidental double-taps.

4. **Zero-PIN "First-Responder Paramedic Lock-Screen Card" (ICE Mode) (`src/components/shared/EmergencyMedicalIdModal.tsx`):**
   - Pulsing crimson **"Emergency Medical ID (No PIN Needed)"** pill on `/` and `/elder` that exposes critical paramedic triage telemetry without unlocking the private CareVault: **Active Factor Xa Anticoagulant (`Eliquis / Apixaban 5 mg BID`)** hemorrhage alert, severe allergies (`Penicillin`, `Sulfa Drugs`), Blood Type (`O+ Positive`), baseline BP (`124/76 mmHg`), and today's real-time bloodstream medication status (`✓ IN SYSTEM`).

5. **Live Camera "Pill-in-Hand" AR Color & Shape Verifier (`src/components/three/InteractivePill3D.tsx`):**
   - Inside the **"Inspect 3D"** Visual Pill-Box Twin modal on `/elder`, clicking **"Hold Pill to Camera to Verify"** launches a `navigator.mediaDevices.getUserMedia` AR scanner HUD (with an automatic optical simulator fallback) that verifies pill shape, imprint, and surface chroma (`98.6% Confidence`) with spoken voice confirmation.

6. **"Voice-First Hands-Free Co-Pilot" (`src/components/elder/VoiceCopilotOrb.tsx`):**
   - Glowing **"Talk to Aura (Voice AI)"** microphone orb powered by `SpeechRecognition` / `webkitSpeechRecognition` and `speechSynthesis`, supporting natural spoken or 1-tap intents:
     - *"Aura, what do I take next?"*
     - *"I just took my morning pills."* (acquires the Atomic Mutex Lock)
     - *"Tell Maya I feel a little dizzy today."* (logs `DIZZY` wellness check-in & flags Dr. Vance's Cardiology Visit Brief)

7. **"Pharmacist QR Passport" & Interactive 24-Hour Circadian Absorption Timeline (`src/components/care-circle/PharmacistQrPassportModal.tsx`):**
   - Encodes Arthur's active medication regimen, allergies, and polypharmacy rules into a scannable `QRCodeSVG` (`qrcode.react`) alongside an interactive **24-Hour Circadian Pharmacokinetic Absorption Curve** showing why **Levothyroxine (`06:30 AM Empty Stomach`)** must stay separated from Calcium/breakfast by 4 hours (`-42% Cmax` chelation conflict simulator).

8. **Agency-First "Dignity Consent & Co-Sign Protocol" & Atomic "Double-Dose Mutex Lock" (`HTTP 409`):**
   - Caretaker medication proposals enter `PENDING_ELDER_APPROVAL` and require the elder’s explicit sign-off.
   - Optimistic concurrency control (`lockVersion`) blocks duplicate caregiver dose administration (`HTTP 409 Conflict`), paired with a 3-Tier HTML Email Escalation Engine (`T-15m`, `T+30m`, `T+90m`).

---

## Quick Start (Local Full-Stack Server with Prisma + SQLite)

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open `http://localhost:3000` and log into CareVault **`AURA-7842`** using:
- **`111111`** — Arthur Pendelton (*Elder Sovereign Mode*)
- **`222222`** — Maya Pendelton (*Daughter / Primary Caretaker*)
- **`333333`** — David Ortiz, RN (*Home Care Nurse*)
