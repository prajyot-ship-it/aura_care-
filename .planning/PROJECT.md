# AURA-CARE — Sovereign Elderly Care & Medication Co-Pilot

## Vision
AURA-CARE eliminates elderly medication coordination errors and caregiver surveillance fatigue through **Sovereign Co-Piloting**, combining a Passcode-Driven Dual-Mode UI (Dignity Mode vs. Care-Circle Command Center) with an **Editorial Swiss-Modernist Healthcare Aesthetic** inspired by Phenomenon Studio.

## Tech Stack
- **Framework:** Next.js 14 (App Router), React 18, TypeScript (Strict Mode)
- **Styling & Motion:** Tailwind CSS, Framer Motion (`prefers-reduced-motion` aware), `Plus Jakarta Sans` + `Inter` + `JetBrains Mono`
- **Persistence:** Prisma ORM + SQLite (`file:./dev.db`) with Optimistic Concurrency Control (`lockVersion`)
- **Email & Voice:** Dual-Channel `EmailDispatchLog` + Nodemailer SMTP Bridge, Browser Web Speech API (`window.speechSynthesis`)
