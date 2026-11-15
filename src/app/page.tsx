"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Delete,
  Sparkles,
  UserCheck,
  HeartHandshake,
  Stethoscope,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  Volume2,
  Box,
} from "lucide-react";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";
import { TiltBentoCard } from "@/components/three/ScrollChoreographyCanvas";
import { ThemeToggleButton } from "@/components/shared/ThemeProvider";
import { EmergencyMedicalIdTrigger } from "@/components/shared/EmergencyMedicalIdModal";
import { SteadyHandToggleButton } from "@/components/elder/TremorStabilizer";

const HeroCareOrbScene = dynamic(
  () => import("@/components/three/HeroCareOrbScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] rounded-3xl bg-gradient-to-b from-[#FAF8F5] to-[#EFECE6] border border-[#E2DDD5] flex items-center justify-center text-xs font-mono text-slate-500">
        Initializing 3D Sovereign Care Orb...
      </div>
    ),
  }
);

const InteractivePill3D = dynamic(
  () => import("@/components/three/InteractivePill3D"),
  { ssr: false }
);

const DEMO_ROLES = [
  {
    name: "Arthur Pendelton",
    shortLabel: "Arthur Pendelton • Elder",
    subtitle: "78 — Elder Sovereign Mode",
    pin: "111111",
    badge: "Dignity UI (/elder)",
    accentBg: "bg-[#0F766E] text-white",
    pillDot: "bg-[#10B981]",
    icon: UserCheck,
  },
  {
    name: "Maya Pendelton",
    shortLabel: "Maya Pendelton • Daughter",
    subtitle: "Daughter — Primary Caretaker",
    pin: "222222",
    badge: "Command Center (/dashboard)",
    accentBg: "bg-[#2563EB] text-white",
    pillDot: "bg-[#60A5FA]",
    icon: HeartHandshake,
  },
  {
    name: "David Ortiz, RN",
    shortLabel: "David Ortiz, RN • Nurse",
    subtitle: "Home Care Nurse — Caretaker",
    pin: "333333",
    badge: "Command Center (/dashboard)",
    accentBg: "bg-[#111827] text-white",
    pillDot: "bg-[#F59E0B]",
    icon: Stethoscope,
  },
];

const PREVIEW_PILLS = [
  {
    name: "Eliquis",
    generic: "Apixaban",
    dosage: "5 mg",
    time: "08:00 AM",
    purpose: "Stroke prevention & steady circulation",
    shape: "OVAL",
    primary: "#F472B6",
    secondary: "#FBCFE8",
    imprint: "894",
    lockedBy: "David Ortiz, RN",
    lockedAt: "08:02 AM",
  },
  {
    name: "Levothyroxine",
    generic: "Levothyroxine Sodium",
    dosage: "75 mcg",
    time: "06:30 AM",
    purpose: "Morning thyroid balance • Empty stomach",
    shape: "CAPSULE",
    primary: "#38BDF8",
    secondary: "#E0F2FE",
    imprint: "LV75",
    lockedBy: "Arthur Pendelton (Self)",
    lockedAt: "06:34 AM",
  },
  {
    name: "Lisinopril",
    generic: "Lisinopril",
    dosage: "10 mg",
    time: "08:00 AM",
    purpose: "Steady blood pressure • Take with breakfast",
    shape: "ROUND",
    primary: "#F8FAFC",
    secondary: "#CBD5E1",
    imprint: "L10",
    lockedBy: "Maya Pendelton (Daughter)",
    lockedAt: "08:05 AM",
  },
];

export default function VaultLoginPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [vaultCode, setVaultCode] = useState("AURA-7842");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewLocked, setPreviewLocked] = useState(true);

  const activePreview = PREVIEW_PILLS[previewIdx];

  const submitPasscode = useCallback(
    async (codeToUse: string, pinToUse: string) => {
      if (pinToUse.length !== 6) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/auth/passcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultCode: codeToUse,
            passcode: pinToUse,
          }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { redirectPath: string };
          error?: string;
        };
        if (json.success && json.data) {
          router.push(json.data.redirectPath);
        } else {
          setErrorMsg(json.error || "Invalid CareVault passcode.");
          setPasscode("");
        }
      } catch {
        setErrorMsg("Network error connecting to CareVault.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (passcode.length === 6 && !loading) {
      submitPasscode(vaultCode, passcode);
    }
  }, [passcode, vaultCode, loading, submitPasscode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT"
      ) {
        return;
      }
      if (/^\d$/.test(e.key)) {
        setPasscode((prev) => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === "Backspace") {
        setPasscode((prev) => prev.slice(0, -1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function appendDigit(digit: string) {
    if (loading) return;
    setErrorMsg(null);
    setPasscode((prev) => (prev.length < 6 ? prev + digit : prev));
  }

  function removeLastDigit() {
    if (loading) return;
    setPasscode((prev) => prev.slice(0, -1));
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111827] flex flex-col justify-between relative overflow-x-hidden">
      {/* Subtle Top Glassmorphic Editorial Bar */}
      <header className="glass-nav sticky top-0 z-30 px-6 lg:px-12 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-display text-xl font-extrabold tracking-tight text-[#111827]">
                AURA•CARE
              </span>
              <span className="hidden sm:inline-block h-4 w-px bg-[#E2DDD5]" />
              <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
                Sovereign Elderly Co-Pilot • 3D Studio Engine
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EmergencyMedicalIdTrigger size="compact" />
            <SteadyHandToggleButton size="compact" />
            <ThemeToggleButton size="compact" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E2DDD5] text-xs font-medium text-slate-700">
              <Box className="w-3.5 h-3.5 text-[#0F766E]" />
              Interactive WebGL PBR Studio
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E2DDD5] text-xs font-mono text-slate-600">
              VAULT: {vaultCode}
            </span>
          </div>
        </div>
      </header>

      {/* Split-Screen Editorial Hero (55% Left / 45% Right) */}
      <main className="max-w-7xl w-full mx-auto px-6 lg:px-12 py-6 lg:py-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-center">
          {/* Left Column (55% -> 7 of 12 cols): Editorial Thesis + Live 3D Care Orb & Pill-Box Preview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SOVEREIGN CO-PILOTING ARCHITECTURE</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[50px] font-semibold tracking-tight text-[#111827] leading-[1.08]">
                Healthcare coordination that keeps dignity in the driver’s seat.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                One household CareVault that adapts its entire ergonomics and permission model to the person holding the device—rendering a high-contrast, voice-guided{" "}
                <strong className="text-[#111827] font-semibold">
                  Dignity Mode
                </strong>{" "}
                for older adults and a real-time{" "}
                <strong className="text-[#111827] font-semibold">
                  Clinical Command Center
                </strong>{" "}
                for family and nurses.
              </p>
            </div>

            {/* Interactive 3D Hero Care Orb + Pill-Box Twin & Mutex Bento Card */}
            <TiltBentoCard className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#E2DDD5]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#0F766E] font-semibold">
                    LIVE 3D WEBGL CARE ORB &amp; PILL TWIN
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#FAF8F5] border border-[#E2DDD5] text-slate-600">
                    PIN Pulse: {passcode.length}/6
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {PREVIEW_PILLS.map((pill, idx) => (
                    <button
                      key={pill.name}
                      type="button"
                      onClick={() => setPreviewIdx(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        previewIdx === idx
                          ? "bg-[#111827] text-white"
                          : "bg-[#F8F7F4] text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {pill.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* 3D Hero Care Orb Canvas (Reacts to mouse parallax & PIN keypresses) */}
                <div className="md:col-span-6 h-[240px] rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-[#EFECE6] border border-[#E2DDD5] relative overflow-hidden">
                  <Suspense fallback={null}>
                    <HeroCareOrbScene
                      pinLength={passcode.length}
                      isUnlocking={loading}
                      activePillIndex={previewIdx}
                      reducedMotion={Boolean(shouldReduceMotion)}
                    />
                  </Suspense>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-600 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-white/85 border border-[#E2DDD5]">
                      Move cursor to tilt 3D rings
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/85 border border-[#E2DDD5]">
                      Keypresses pulse core
                    </span>
                  </div>
                </div>

                {/* Right Half of Preview Card: Auto-Rotating 3D Pill-Box Twin & Mutex Lock Toggle */}
                <div className="md:col-span-6 space-y-3">
                  <div className="flex items-center gap-3.5">
                    <Suspense
                      fallback={
                        <PillSvgTwin
                          shape={activePreview.shape}
                          primaryColor={activePreview.primary}
                          secondaryColor={activePreview.secondary}
                          imprint={activePreview.imprint}
                          size="md"
                        />
                      }
                    >
                      <InteractivePill3D
                        shape={activePreview.shape}
                        primaryColor={activePreview.primary}
                        secondaryColor={activePreview.secondary}
                        imprint={activePreview.imprint}
                        medName={activePreview.name}
                        dosage={activePreview.dosage}
                        instructions={activePreview.purpose}
                        isConfirmed={previewLocked}
                        size="md"
                        reducedMotion={false}
                        allowModalInspect={false}
                      />
                    </Suspense>
                    <div>
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] text-[#111827]">
                        {activePreview.time}
                      </span>
                      <h2 className="font-display text-xl font-bold text-[#111827] mt-1">
                        {activePreview.name} {activePreview.dosage}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {activePreview.purpose}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewLocked((prev) => !prev)}
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                      previewLocked
                        ? "bg-emerald-50/90 border-[#10B981] text-[#0F766E]"
                        : "bg-amber-50/90 border-[#D97706] text-[#B45309]"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    {previewLocked ? (
                      <span className="font-mono">
                        LOCKED v1 • {activePreview.lockedBy} @{" "}
                        {activePreview.lockedAt}
                      </span>
                    ) : (
                      <span className="font-mono">
                        UNLOCKED v0 • Tap to Simulate Atomic Lock
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </TiltBentoCard>

            {/* Subtle Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Volume2,
                  title: "WCAG AAA Elder Ergonomics",
                  desc: "24px+ type, 64px tactile targets & Web Speech readout",
                },
                {
                  icon: Lock,
                  title: "Atomic Dose Locking",
                  desc: "Optimistic concurrency prevents caregiver double-dosing",
                },
                {
                  icon: Eye,
                  title: "Zero-Surveillance Consent",
                  desc: "Elder Co-Sign required before routine changes take effect",
                },
              ].map((badge) => {
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={badge.title}
                    className="p-3.5 rounded-2xl bg-white/85 border border-[#E2DDD5] flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-[#F8F7F4] border border-[#E2DDD5] text-[#0F766E] shrink-0">
                      <BadgeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#111827]">
                        {badge.title}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        {badge.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (45% -> 5 of 12 cols): Floating Elevated Vault Keypad Card */}
          <div className="lg:col-span-5">
            <div className="bento-card p-7 sm:p-9 relative">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 block">
                    PASSCODE VAULT ENTRY
                  </span>
                  <h2 className="font-display text-2xl font-bold text-[#111827] mt-0.5">
                    Enter Personal PIN
                  </h2>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0F766E]" />
                  <input
                    id="vault-code-input"
                    aria-label="Household CareVault ID"
                    type="text"
                    value={vaultCode}
                    onChange={(e) => setVaultCode(e.target.value.toUpperCase())}
                    className="w-24 bg-transparent font-mono text-xs font-bold text-[#111827] text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* 6-Dot Animated PIN Indicator */}
              <div
                className="py-5 px-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] mb-6 flex flex-col items-center"
                aria-label="6-Digit Passcode Progress"
              >
                <div className="flex items-center justify-center gap-3.5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const filled = idx < passcode.length;
                    const isLatest = idx === passcode.length - 1;
                    return (
                      <motion.div
                        key={idx}
                        animate={
                          shouldReduceMotion
                            ? {}
                            : filled
                              ? { scale: isLatest ? [1, 1.24, 1] : 1 }
                              : { scale: 1 }
                        }
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-4 h-4 rounded-full transition-colors ${
                          filled
                            ? "bg-[#0F766E] shadow-[0_0_0_4px_rgba(16,185,129,0.18)]"
                            : "bg-slate-300"
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] font-mono text-slate-500 mt-3">
                  {loading
                    ? "Authenticating & expanding 3D Care Vault..."
                    : passcode.length > 0
                      ? `${passcode.length} of 6 digits entered (3D orb pulsing)`
                      : "Enter 6-digit personal PIN (111111, 222222, or 333333)"}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-300 text-red-900 font-semibold text-center text-xs"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Tactile Numeric Keypad (72px x 72px circular keys with Living Flow spring feedback) */}
              <div className="grid grid-cols-3 gap-3.5 place-items-center">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <motion.button
                    key={digit}
                    type="button"
                    whileHover={shouldReduceMotion ? {} : { scaleX: 1.06, scaleY: 1.04 }}
                    whileTap={shouldReduceMotion ? {} : { scaleX: 1.08, scaleY: 0.88 }}
                    transition={{ type: "spring", stiffness: 460, damping: 15 }}
                    disabled={loading}
                    onClick={() => appendDigit(digit)}
                    className="w-[72px] h-[72px] rounded-full bg-[#FAF8F5] hover:bg-white hover:border-[#0F766E] border border-[#E2DDD5] text-2xl font-display font-bold text-[#111827] shadow-2xs flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    {digit}
                  </motion.button>
                ))}

                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scaleX: 1.06, scaleY: 1.04 }}
                  whileTap={shouldReduceMotion ? {} : { scaleX: 1.08, scaleY: 0.88 }}
                  transition={{ type: "spring", stiffness: 460, damping: 15 }}
                  disabled={loading}
                  onClick={() => setPasscode("")}
                  className="w-[72px] h-[72px] rounded-full bg-slate-100/80 hover:bg-slate-200/70 border border-[#E2DDD5] text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-center"
                >
                  Clear
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scaleX: 1.06, scaleY: 1.04 }}
                  whileTap={shouldReduceMotion ? {} : { scaleX: 1.08, scaleY: 0.88 }}
                  transition={{ type: "spring", stiffness: 460, damping: 15 }}
                  disabled={loading}
                  onClick={() => appendDigit("0")}
                  className="w-[72px] h-[72px] rounded-full bg-[#FAF8F5] hover:bg-white hover:border-[#0F766E] border border-[#E2DDD5] text-2xl font-display font-bold text-[#111827] shadow-2xs flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  0
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scaleX: 1.06, scaleY: 1.04 }}
                  whileTap={shouldReduceMotion ? {} : { scaleX: 1.08, scaleY: 0.88 }}
                  transition={{ type: "spring", stiffness: 460, damping: 15 }}
                  disabled={loading}
                  onClick={removeLastDigit}
                  aria-label="Backspace"
                  className="w-[72px] h-[72px] rounded-full bg-slate-100/80 hover:bg-slate-200/70 border border-[#E2DDD5] text-slate-700 flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2DDD5] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                  HTTP-Only Signed JWT Cookie
                </span>
                <span className="font-mono">RBAC + WebGL Ready</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Quick-Switch Pill Dock */}
      <footer className="px-4 sm:px-8 pb-6 pt-2">
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2DDD5] rounded-3xl sm:rounded-full p-2.5 shadow-dock flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 px-3 py-1">
            <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              1-Click Judge Role Dock:
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
            {DEMO_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <motion.button
                  key={role.pin}
                  type="button"
                  whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                  disabled={loading}
                  onClick={() => {
                    setPasscode(role.pin);
                    submitPasscode(vaultCode, role.pin);
                  }}
                  title={`${role.name} (${role.subtitle}) — PIN ${role.pin} — ${role.badge}`}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs ${role.accentBg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${role.pillDot}`} />
                  <Icon className="w-3.5 h-3.5 opacity-90" />
                  <span>{role.shortLabel}</span>
                  <span className="font-mono text-[11px] opacity-80">
                    ({role.pin})
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-75" />
                </motion.button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
