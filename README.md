# AURA•CARE — Sovereign Elderly Care & Medication Co-Pilot

**Healthcare coordination that keeps dignity in the driver’s seat.**

- **GitHub Repository:** [https://github.com/prajyot-ship-it/aura_care-](https://github.com/prajyot-ship-it/aura_care-)
- **Live GitHub Pages Deployment:** [https://prajyot-ship-it.github.io/aura_care-/](https://prajyot-ship-it.github.io/aura_care-/)

---

## Five Signature Architectural Pillars

1. **Dual-Mode Ergonomic Rendering Engine (Passcode-Driven UI Adaptation):**
   - **Elder Sovereign PIN (`111111`) → Dignity Mode (`/elder`):** WCAG AAA high-contrast tactile interface (`24px+` typography, `64px+` minimum touch targets), Web Speech API voice readouts (*"Read My Schedule Aloud"*), Day (Pure White) & Night (Glossy Midnight Blue) theme switcher, and interactive 3D WebGL Pill-Box Twins.
   - **Caretaker / Nurse PIN (`222222` / `333333`) → Care-Circle Command Center (`/dashboard`):** High-density clinical coordination dashboard featuring a 3D Circadian Orbital Node Network, 14-day longitudinal adherence heatmaps, real-time Double-Dose Mutex Locks, polypharmacy interaction guardrails, and a 1-Page Physician Clinical Brief generator.

2. **Living Flow Design & Real-Time 3D WebGL Studio (`src/components/three/` & `src/components/shared/LivingFlowEngine.tsx`):**
   - **Translucent Materials & Luminous Effect:** Multi-layered frosted glassmorphism (`backdrop-filter: blur(22px) saturate(180%)`) with cursor-tracked radial specular highlights (`--flow-x`, `--flow-y`) and ambient drifting aurora blooms.
   - **Physics-Based Flexible Feedback Touch System:** Every interactive button, pill badge, keypad key, and bento card stretches elastically on press/drag and rebounds via underdamped harmonic spring physics.
   - **100% Procedural 3D WebGL Models:** `HeroCareOrbScene`, `InteractivePill3D` (`ROUND`, `OVAL`, `CAPSULE`, `DIAMOND`), and `CareCircleOrbit3D` built in React Three Fiber with zero external `.glb` dependencies.

3. **Agency-First "Dignity Consent & Co-Sign Protocol":**
   - Caretaker medication proposals enter `PENDING_ELDER_APPROVAL` and require the elder’s explicit sign-off (*"Approve & Add to My Routine"* or *"Hold — Ask Doctor First"*).
   - Granular Elder Privacy & Autonomy toggles (`requireElderApproval`, `shareSymptomNotes`, `autoEscalateMissed`).

4. **Atomic "Double-Dose Mutex Lock" (`HTTP 409`) & 3-Tier Email Escalation Engine:**
   - Optimistic concurrency control (`lockVersion`) blocks duplicate caregiver dose administration (`HTTP 409 Conflict`).
   - Proactive 3-Tier HTML Email Escalation Engine (`T-15m` Upcoming Cue, `T+30m` Soft Missed-Dose Nudge with 1-click deep links, `T+90m` All-Hands Care-Circle Escalation) inspectable in the slide-over Live Email Outbox Drawer.

5. **Clinical Polypharmacy Guardrail & 1-Page Physician Brief (`/appointments/brief/[id]`):**
   - Real-time Drug-Drug, Drug-Allergy, and Food-Timing conflict detection (`CRITICAL` / `MODERATE`).
   - Printable 1-page non-diagnostic Physician Clinical Brief synthesizing 30-day adherence, circadian miss patterns, BP/symptom correlations, and elder-flagged questions.

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
