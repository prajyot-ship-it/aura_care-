"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  PlusCircle,
  Lock,
  AlertTriangle,
  Calendar,
  FileText,
  Activity,
  LogOut,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Mail,
  ArrowUpRight,
  Orbit,
} from "lucide-react";
import { VaultStatePayload } from "@/lib/types";
import { HackathonTimeTravelBar } from "@/components/shared/HackathonTimeTravelBar";
import { LiveEmailOutboxDrawer } from "@/components/shared/LiveEmailOutboxDrawer";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";
import { MutexStatusBadge } from "@/components/care-circle/MutexStatusBadge";
import { AdherenceHeatmap } from "@/components/care-circle/AdherenceHeatmap";
import { ScheduleModal } from "@/components/care-circle/ScheduleModal";
import { TiltBentoCard } from "@/components/three/ScrollChoreographyCanvas";
import { ThemeToggleButton } from "@/components/shared/ThemeProvider";
import { PharmacistQrPassportTrigger } from "@/components/care-circle/PharmacistQrPassportModal";

const CareCircleOrbit3D = dynamic(
  () => import("@/components/three/CareCircleOrbit3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[270px] rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-center text-xs font-mono text-slate-400">
        Initializing 3D Circadian Ring...
      </div>
    ),
  }
);

export default function CareCircleDashboardPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [vaultState, setVaultState] = useState<VaultStatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [outboxRefreshKey, setOutboxRefreshKey] = useState(0);
  const [bannerAlert, setBannerAlert] = useState<{
    type: "success" | "conflict";
    message: string;
  } | null>(null);
  const [busyDoseId, setBusyDoseId] = useState<string | null>(null);
  const [hoveredDoseId, setHoveredDoseId] = useState<string | null>(null);
  const [timeTravelStep, setTimeTravelStep] = useState(0);

  const loadDashboardState = useCallback(async () => {
    try {
      const res = await fetch("/api/vault/state", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: VaultStatePayload;
      };
      if (json.success && json.data) {
        setVaultState(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard state:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardState();
  }, [loadDashboardState]);

  async function handleAdministerDose(
    doseLogId: string,
    expectedLockVersion: number,
    simulateDuplicateConflict = false
  ) {
    setBusyDoseId(doseLogId);
    setBannerAlert(null);
    try {
      const res = await fetch("/api/doses/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doseLogId,
          action: "TAKEN",
          expectedLockVersion: simulateDuplicateConflict
            ? 0
            : expectedLockVersion,
          note: "Assisted administration logged via Care-Circle Command Center",
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { mutexMessage: string };
        error?: string;
      };
      if (res.status === 409 || !json.success) {
        setBannerAlert({
          type: "conflict",
          message:
            json.error ||
            "HTTP 409 Conflict: Dose already locked by another member.",
        });
      } else if (json.data) {
        setBannerAlert({
          type: "success",
          message: json.data.mutexMessage,
        });
      }
      await loadDashboardState();
    } finally {
      setBusyDoseId(null);
    }
  }

  async function handleQuickSwitchRole(pin: string) {
    if (!vaultState) return;
    const res = await fetch("/api/auth/passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultCode: vaultState.vault.vaultCode,
        passcode: pin,
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { redirectPath: string };
    };
    if (json.success && json.data) {
      if (json.data.redirectPath === "/dashboard") {
        loadDashboardState();
      } else {
        router.push(json.data.redirectPath);
      }
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/passcode", { method: "DELETE" });
    router.push("/");
  }

  if (loading || !vaultState) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#111827] flex items-center justify-center p-8">
        <div className="font-display text-lg font-semibold text-[#0F766E]">
          Loading Care-Circle Command Center...
        </div>
      </div>
    );
  }

  const {
    session,
    vault,
    members,
    medications,
    todayDoses,
    adherenceSummary,
    pendingProposals,
    appointments,
    wellnessCheckIns,
    emailOutboxCount,
  } = vaultState;

  const lowStockMeds = medications.filter(
    (m) => m.status === "ACTIVE" && m.stockCount <= m.refillThreshold
  );
  const nextAppt = appointments[0];

  const lockedTodayCount = todayDoses.filter(
    (d) => d.status === "TAKEN"
  ).length;
  const pendingTodayCount = todayDoses.filter(
    (d) => d.status === "PENDING"
  ).length;

  // Radial ring math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    (adherenceSummary.trailing30DayPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111827] pb-28">
      {/* Glassmorphic Sticky Top Command Bar */}
      <header className="glass-nav sticky top-0 z-30 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#111827] text-white flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#111827]">
                  AURA•CARE Command Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-white border border-[#E2DDD5] text-slate-700">
                  {vault.vaultCode}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Coordinator:{" "}
                <strong className="text-[#111827]">
                  {session.name} ({session.relationship})
                </strong>{" "}
                • Elder Sovereign:{" "}
                <strong className="text-[#111827]">
                  {vault.elderName} ({vault.elderAge}y • {vault.bloodType})
                </strong>
              </p>
            </div>
          </div>

          {/* Care-Circle Online Avatars + Role Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <PharmacistQrPassportTrigger
              elderName={vault.elderName}
              elderAge={vault.elderAge}
              bloodType={vault.bloodType}
              vaultCode={vault.vaultCode}
              allergies={vault.allergies}
              medications={medications}
            />

            <ThemeToggleButton size="compact" />

            <div className="hidden xl:flex items-center -space-x-1.5 mr-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  title={`${m.name} (${m.relationship}) — Online`}
                  className="w-8 h-8 rounded-full bg-white border-2 border-[#E2DDD5] text-[11px] font-mono font-bold text-[#111827] flex items-center justify-center shadow-2xs"
                >
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleQuickSwitchRole("111111")}
              className="px-3.5 py-2 rounded-full bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Switch to Arthur (Elder Mode PIN 111111)</span>
            </button>

            {session.name.includes("Maya") ? (
              <button
                type="button"
                onClick={() => handleQuickSwitchRole("333333")}
                className="px-3.5 py-2 rounded-full bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Switch to David, RN (PIN 333333)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleQuickSwitchRole("222222")}
                className="px-3.5 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Switch to Maya (PIN 222222)
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-[#E2DDD5] text-xs font-semibold flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-10 pt-7 space-y-6">
        {/* Top Telemetry Bento Row (4 Cards with 3D Perspective Tilt & Specular Sheen) */}
        <section
          aria-label="Clinical Telemetry Bento Row"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {/* Card 1: 30-Day Adherence Ring (Animated SVG Radial Gauge + 36px Tabular Metric) */}
          <TiltBentoCard className="bento-card p-5 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                30-Day Adherence Ring
              </span>
              <div className="font-display text-[36px] font-bold text-[#111827] tabular-nums leading-tight mt-1">
                {adherenceSummary.trailing30DayPercent}%
              </div>
              <div className="text-xs text-[#0F766E] font-medium mt-1">
                {adherenceSummary.takenCount} taken •{" "}
                {adherenceSummary.missedOrSkippedCount} missed
              </div>
            </div>

            <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  fill="none"
                  stroke="#E2DDD5"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="36"
                  cy="36"
                  r={radius}
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={
                    shouldReduceMotion
                      ? { strokeDashoffset }
                      : { strokeDashoffset: circumference }
                  }
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-[#0F766E]">
                30d
              </span>
            </div>
          </TiltBentoCard>

          {/* Card 2: Today's Mutex Lock Status */}
          <TiltBentoCard className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Today’s Mutex Lock Status
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-[#10B981]/40 text-[#0F766E] font-mono text-[11px] font-semibold">
                ACID ACTIVE
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 my-1">
              <span className="font-display text-[36px] font-bold text-[#111827] tabular-nums leading-tight">
                {lockedTodayCount}/{todayDoses.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                doses locked ({pendingTodayCount} upcoming)
              </span>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Double-dose race protection verified</span>
            </div>
          </TiltBentoCard>

          {/* Card 3: Refill & Polypharmacy Guardrail */}
          <TiltBentoCard className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Refill &amp; Polypharmacy Guardrail
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-[#D97706] text-[11px] font-semibold">
                {lowStockMeds.length} Refill Alert
              </span>
            </div>
            <div className="my-1">
              {lowStockMeds.length > 0 ? (
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-xl font-bold text-[#111827]">
                    {lowStockMeds[0].name} {lowStockMeds[0].dosage}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#D97706]">
                    {lowStockMeds[0].stockCount} left
                  </span>
                </div>
              ) : (
                <div className="font-display text-xl font-bold text-[#0F766E]">
                  All Supplies Nominal
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vault.allergies.map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-[10px] font-semibold"
                >
                  Allergy: {a}
                </span>
              ))}
            </div>
          </TiltBentoCard>

          {/* Card 4: Live Email Outbox Counter (Clickable Bento Card) */}
          <TiltBentoCard className="h-full">
            <button
              type="button"
              onClick={() => setIsOutboxOpen(true)}
              className="bento-card bento-card-interactive p-5 w-full h-full text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-500">
                  Live Email Outbox Inspector
                </span>
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 my-1">
                <span className="font-display text-[36px] font-bold text-[#111827] tabular-nums leading-tight">
                  {emailOutboxCount}
                </span>
                <span className="text-xs font-semibold text-[#2563EB]">
                  HTML dispatches logged
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Click to inspect Tier 1–3 &amp; Co-Sign emails</span>
              </div>
            </button>
          </TiltBentoCard>
        </section>

        {/* Feedback Alert Banner (Mutex Lock Confirmation or HTTP 409 Conflict Rejection) */}
        <AnimatePresence mode="wait">
          {bannerAlert && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              role="alert"
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-bento ${
                bannerAlert.type === "conflict"
                  ? "bg-red-50 border-red-500 text-red-950"
                  : "bg-emerald-50 border-[#10B981] text-[#0F766E]"
              }`}
            >
              <div className="flex items-center gap-3 text-sm font-semibold">
                {bannerAlert.type === "conflict" ? (
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#0F766E] shrink-0" />
                )}
                <span>{bannerAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBannerAlert(null)}
                className="text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 14-Day Longitudinal Adherence Heatmap */}
        <AdherenceHeatmap
          trailing30DayPercent={adherenceSummary.trailing30DayPercent}
          takenCount={adherenceSummary.takenCount}
          missedOrSkippedCount={adherenceSummary.missedOrSkippedCount}
          totalEvaluated={adherenceSummary.totalEvaluated}
          dailyHeatmap={adherenceSummary.dailyHeatmap}
        />

        {/* Main Asymmetric Bento Grid: Left 7 Cols (Interactive 3D Circadian Ring + Dose Timeline & Mutex Feed) + Right 5 Cols (Clinical Brief & Regimen) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3D Circadian Adherence & Orbital Node Network Bento Card */}
            <section className="bento-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E2DDD5]">
                <div>
                  <div className="flex items-center gap-2">
                    <Orbit className="w-4 h-4 text-[#0F766E]" />
                    <h2 className="font-display text-[18px] font-semibold text-[#111827]">
                      3D Circadian Adherence &amp; Orbital Node Network
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hover any 3D orbital dose node to highlight its atomic mutex record below • Time-Travel advances the 3D circadian hand
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-[#10B981]/30 font-mono text-[11px] font-semibold text-[#0F766E]">
                  WebGL Studio 3D
                </span>
              </div>

              <Suspense
                fallback={
                  <div className="w-full h-[270px] rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-center text-xs font-mono text-slate-400">
                    Loading 3D Circadian Ring...
                  </div>
                }
              >
                <CareCircleOrbit3D
                  doses={todayDoses.map((d) => ({
                    id: d.id,
                    label: `${d.medication.name} ${d.medication.dosage}`,
                    scheduledFor: d.scheduledFor,
                    status: d.status,
                    lockVersion: d.lockVersion,
                  }))}
                  hoveredDoseId={hoveredDoseId}
                  onHoverDoseId={setHoveredDoseId}
                  timeTravelStep={timeTravelStep}
                  reducedMotion={Boolean(shouldReduceMotion)}
                />
              </Suspense>
            </section>

            <section className="bento-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E2DDD5]">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#0F766E]" />
                    <h2 className="font-display text-[18px] font-semibold text-[#111827]">
                      Interactive Dose Timeline &amp; Atomic Mutex Feed
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optimistic concurrency control (`lockVersion`) prevents duplicate caregiver administration
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add / Propose Medication</span>
                </button>
              </div>

              <div className="space-y-3">
                {todayDoses.map((dose) => {
                  const timeStr = new Date(dose.scheduledFor).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  const isLockedTaken = dose.status === "TAKEN";
                  const isHoveredNode = hoveredDoseId === dose.id;

                  return (
                    <div
                      key={dose.id}
                      onMouseEnter={() => setHoveredDoseId(dose.id)}
                      onMouseLeave={() => setHoveredDoseId(null)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isHoveredNode
                          ? "bg-white border-[#0F766E] ring-2 ring-[#0F766E]/20 shadow-md"
                          : isLockedTaken
                            ? "bg-emerald-50/30 border-[#10B981]/50"
                            : "bg-[#FAF8F5]/70 border-[#E2DDD5] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <PillSvgTwin
                          shape={dose.medication.pillShape}
                          primaryColor={dose.medication.pillColorPrimary}
                          secondaryColor={dose.medication.pillColorSecondary}
                          imprint={dose.medication.pillImprint}
                          size="sm"
                          withPedestal={false}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#111827] text-white font-mono text-xs font-semibold">
                              {timeStr}
                            </span>
                            <span className="font-display font-bold text-[15px] text-[#111827]">
                              {dose.medication.name} {dose.medication.dosage}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({dose.medication.genericName})
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {dose.medication.instructions}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 shrink-0">
                        <MutexStatusBadge
                          status={dose.status}
                          loggedByName={dose.loggedByName}
                          loggedAt={dose.loggedAt}
                          lockVersion={dose.lockVersion}
                          note={dose.note}
                        />

                        {!isLockedTaken ? (
                          <button
                            type="button"
                            disabled={busyDoseId === dose.id}
                            onClick={() =>
                              handleAdministerDose(
                                dose.id,
                                dose.lockVersion,
                                false
                              )
                            }
                            className="px-3.5 py-1.5 rounded-full bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Confirm Assisted Dose (Acquire Lock)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyDoseId === dose.id}
                            onClick={() =>
                              handleAdministerDose(
                                dose.id,
                                dose.lockVersion,
                                true
                              )
                            }
                            className="px-3 py-1 rounded-full bg-white hover:bg-red-50 text-slate-700 hover:text-red-800 border border-[#E2DDD5] text-[11px] font-semibold transition-colors"
                            title="Simulates a second caregiver attempting to log this dose concurrently with a stale lockVersion=0"
                          >
                            Test Duplicate Logging (Verify HTTP 409 Lock)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Dignity Consent & Co-Sign Queue */}
            <section className="bento-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-[#111827]">
                    Dignity Co-Sign &amp; Schedule Proposals Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Caretaker proposals awaiting {vault.elderName}’s Sovereign Approval in /elder
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                  {pendingProposals.filter((p) => p.status === "PENDING").length}{" "}
                  Pending
                </span>
              </div>

              <div className="space-y-2.5">
                {pendingProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      prop.status === "PENDING"
                        ? "bg-blue-50/40 border-blue-200"
                        : prop.status === "APPROVED"
                          ? "bg-emerald-50/40 border-[#10B981]/40"
                          : "bg-amber-50/40 border-amber-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[#111827] text-sm mb-0.5">
                        {prop.plainEnglishSummary}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Submitted by {prop.proposedByName}
                        {prop.elderResponseNote
                          ? ` • Elder Response: "${prop.elderResponseNote}"`
                          : ""}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-mono font-semibold uppercase tracking-wider text-[10px] shrink-0 ${
                        prop.status === "PENDING"
                          ? "bg-blue-100 text-[#2563EB]"
                          : prop.status === "APPROVED"
                            ? "bg-emerald-100 text-[#0F766E]"
                            : "bg-amber-100 text-[#D97706]"
                      }`}
                    >
                      {prop.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right 5 Columns: Upcoming Appointments + Clinical Brief + Regimen + Symptoms */}
          <div className="lg:col-span-5 space-y-6">
            {nextAppt && (
              <section className="bento-card p-6 border-l-4 border-l-[#2563EB]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
                    <Calendar className="w-3.5 h-3.5" /> Upcoming Specialist Visit
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Escort: <strong className="text-[#111827]">{nextAppt.escortMemberName}</strong>
                  </span>
                </div>

                <h2 className="font-display text-xl font-bold text-[#111827]">
                  {nextAppt.doctorName}
                </h2>
                <p className="text-xs font-semibold text-[#2563EB] mt-0.5">
                  {nextAppt.specialty} • {nextAppt.clinicLocation}
                </p>
                <p className="text-xs font-mono text-slate-600 mt-1 mb-4">
                  {new Date(nextAppt.appointmentDate).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] mb-4">
                  <div className="text-xs font-semibold text-[#111827] mb-1.5">
                    Questions Flagged by {vault.elderName} ({nextAppt.elderQuestions.length}):
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                    {nextAppt.elderQuestions.map((q, idx) => (
                      <li key={idx}>“{q}”</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(`/appointments/brief/${nextAppt.id}`)
                  }
                  className="w-full py-3 px-4 rounded-full bg-[#111827] hover:bg-slate-800 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#10B981]" />
                  <span>Generate 1-Page Physician Clinical Brief</span>
                </button>
              </section>
            )}

            {/* Active & Pending Medications Registry */}
            <section className="bento-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-[18px] font-semibold text-[#111827]">
                  CareVault Medication Registry ({medications.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  + Add Medication
                </button>
              </div>

              <div className="space-y-2.5">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#111827] text-sm">
                        {med.name} {med.dosage}{" "}
                        <span className="font-normal text-slate-500 text-xs">
                          ({med.drugClass})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {med.scheduledTimes.join(", ")} •{" "}
                        {med.foodRule.replace("_", " ")} • {med.pillImprint}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                        med.status === "ACTIVE"
                          ? "bg-emerald-50 text-[#0F766E] border border-[#10B981]/30"
                          : med.status === "PENDING_ELDER_APPROVAL"
                            ? "bg-blue-50 text-[#2563EB] border border-blue-200"
                            : "bg-amber-50 text-[#D97706] border border-amber-200"
                      }`}
                    >
                      {med.status === "PENDING_ELDER_APPROVAL"
                        ? "PENDING CO-SIGN"
                        : med.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Symptom & Vitals Correlation Log */}
            <section className="bento-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <h2 className="font-display text-[18px] font-semibold text-[#111827]">
                    Symptom &amp; Vitals Correlation Log
                  </h2>
                </div>
                {!vault.shareSymptomNotes && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#D97706] text-[10px] font-semibold">
                    Privacy Redacted (RULE-DIGNITY-02)
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {wellnessCheckIns.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold ${
                          w.mood === "DIZZY" || w.mood === "NAUSEOUS"
                            ? "bg-amber-100 text-[#B45309]"
                            : "bg-emerald-50 text-[#0F766E]"
                        }`}
                      >
                        Mood: {w.mood}
                      </span>
                      {w.bloodPressureSystolic && (
                        <span className="font-mono font-semibold text-slate-700">
                          BP: {w.bloodPressureSystolic}/
                          {w.bloodPressureDiastolic} mmHg
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1">{w.note}</p>
                    {w.mood === "DIZZY" && (
                      <div className="mt-1.5 text-[11px] font-medium text-[#D97706] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Temporal Correlation: Logged ~60m after 08:00 Lisinopril 10 mg
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Hackathon Time-Travel Floating Dock (Bottom-Right) */}
      <HackathonTimeTravelBar
        emailOutboxCount={emailOutboxCount}
        onOpenOutbox={() => setIsOutboxOpen(true)}
        onAfterTick={() => {
          setTimeTravelStep((s) => s + 1);
          setOutboxRefreshKey((k) => k + 1);
          loadDashboardState();
        }}
      />

      {/* Two-Column Add Medication Modal with Live Polypharmacy Visualizer */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        requireElderApproval={vault.requireElderApproval}
        elderName={vault.elderName}
        onClose={() => setIsScheduleModalOpen(false)}
        onSaved={(msg) => {
          setBannerAlert({ type: "success", message: msg });
          setOutboxRefreshKey((k) => k + 1);
          loadDashboardState();
        }}
      />

      {/* Slide-Over Live Email Outbox Drawer */}
      <LiveEmailOutboxDrawer
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
        refreshTrigger={outboxRefreshKey}
      />
    </div>
  );
}
