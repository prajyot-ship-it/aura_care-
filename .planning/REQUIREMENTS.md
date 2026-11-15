# AURA-CARE Requirements & Phenomenon Studio UI/UX Overhaul

## Core Functional & Clinical Safety Invariants
- **RULE-CLIN-01:** Atomic Double-Dose Mutex Lock via Prisma `$transaction` and `lockVersion` (`HTTP 409 Conflict` on duplicate confirmation).
- **RULE-CLIN-02:** Live Polypharmacy & Circadian Spacing Engine (`src/lib/polypharmacyEngine.ts`) flagging NSAID+Anticoagulant bleeding risks, 4h Levothyroxine+Calcium chelation windows, and duplicate drug classes.
- **RULE-DIGNITY-01..03:** Elder Co-Sign staging (`PENDING_ELDER_APPROVAL`), symptom privacy redaction (`shareSymptomNotes`), and Tier 3 escalation opt-out (`autoEscalateMissed`).
- **RULE-SEC-01..03:** Bcrypt-hashed 6-digit passcodes, HTTP-only JWT cookies, and server-side `ELDER_SOVEREIGN` RBAC checks.

## Phenomenon Studio UI/UX Overhaul Requirements
1. **Design Tokens:** Warm alabaster canvas (`#F8F7F4` / `#FAF8F5`), pure white elevated bento cards (`#FFFFFF`) with `1px` hairline borders (`#E5E7EB` / `#E2DDD5`) and ambient shadows (`0 8px 30px rgba(17, 24, 39, 0.04)`), obsidian ink (`#111827`), botanical sage (`#0F766E` / `#10B981`), warm terracotta (`#D97706`), soft cobalt (`#2563EB`).
2. **Passcode Vault Entry (`/`):** 55%/45% split-screen editorial hero with interactive Pill-Box Twin & Mutex Lock preview, `72px × 72px` circular spring keypad, 6-dot pulsing PIN indicator, and floating bottom Role Switcher Pill Dock.
3. **Elder Sovereign Mode (`/elder`):** Glassmorphic header with animated SVG soundwave equalizer during Web Speech readout, calm-cobalt Dignity Consent spotlight card, 3D-shaded SVG Pill Twins inside circular pedestals, full-width `64px+` morphing emerald confirmation button, horizontal 1-tap symptom/question strip, and slide-over Privacy & Autonomy drawer.
4. **Care-Circle Command Center (`/dashboard`):** Top 4-card Telemetry Bento Row (Animated SVG 30-Day Adherence Ring, Today's Mutex Lock Status, Refill & Polypharmacy Guardrail, Live Email Outbox Counter), avatar-badged Dose Timeline, 2-column Add Medication Modal with live **Clinical Safety & Circadian Spacing Visualizer**, and bottom-right floating Hackathon Time-Travel pill dock.
5. **Physician Clinical Brief (`/appointments/brief/[id]`):** Swiss-grid 1-page printable clinical brief with 30-day adherence sparkline/heatmap, circadian miss pattern callout, vitals log, active regimen table, and elder agenda questions.
