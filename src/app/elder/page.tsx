"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  SlidersHorizontal,
  LogOut,
  FileText,
  Sparkles,
  CheckCircle2,
  X,
  Calendar,
} from "lucide-react";
import { VaultStatePayload } from "@/lib/types";
import { VoiceReaderButton } from "@/components/elder/VoiceReaderButton";
import { ConsentApprovalBanner } from "@/components/elder/ConsentApprovalBanner";
import { TactilePillCard } from "@/components/elder/TactilePillCard";
import { MoodCheckIn } from "@/components/elder/MoodCheckIn";
import { ScrollChoreographySection } from "@/components/three/ScrollChoreographyCanvas";
import { ThemeToggleButton } from "@/components/shared/ThemeProvider";
import { VoiceCopilotOrb } from "@/components/elder/VoiceCopilotOrb";
import { SteadyHandToggleButton } from "@/components/elder/TremorStabilizer";
import { EmergencyMedicalIdTrigger } from "@/components/shared/EmergencyMedicalIdModal";

function ElderSovereignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const [vaultState, setVaultState] = useState<VaultStatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrivacyDrawer, setShowPrivacyDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const loadState = useCallback(async () => {
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
      console.error("Failed to fetch elder vault state:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const action = searchParams.get("action");
    const doseId = searchParams.get("doseId");
    if (!action || !doseId) return;

    async function runEmailDeepLink() {
      const apiAction =
        action === "confirm"
          ? "TAKEN"
          : action === "snooze"
            ? "SNOOZED"
            : null;
      if (!apiAction) return;

      const res = await fetch("/api/doses/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doseLogId: doseId,
          action: apiAction,
          note: "Confirmed via 1-Click Email Nudge Link",
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { mutexMessage: string };
        error?: string;
      };
      if (json.success && json.data) {
        setToastMessage(json.data.mutexMessage);
      } else if (json.error) {
        setToastMessage(json.error);
      }
      loadState();
      router.replace("/elder");
    }

    runEmailDeepLink();
  }, [searchParams, loadState, router]);

  async function handleTogglePrivacy(
    field: "shareSymptomNotes" | "requireElderApproval" | "autoEscalateMissed",
    nextVal: boolean
  ) {
    if (!vaultState) return;
    setUpdatingPrivacy(true);
    try {
      const res = await fetch("/api/vault/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextVal }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (json.success) {
        setToastMessage("Saved your Sovereign Privacy & Autonomy preference.");
        await loadState();
      } else {
        setToastMessage(json.error || "Failed to update privacy setting.");
      }
    } finally {
      setUpdatingPrivacy(false);
    }
  }

  async function handleSwitchRole(pin: string) {
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
      router.push(json.data.redirectPath);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/passcode", { method: "DELETE" });
    router.push("/");
  }

  if (loading || !vaultState) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#111827] flex items-center justify-center p-8">
        <div className="font-display text-[28px] font-semibold text-[#0F766E]">
          Loading Your Personal Medication Routine...
        </div>
      </div>
    );
  }

  const { vault, todayDoses, pendingProposals, appointments } = vaultState;
  const firstName = vault.elderName.split(" ")[0];

  const morningDoses = todayDoses.filter(
    (d) => new Date(d.scheduledFor).getHours() < 12
  );
  const afternoonDoses = todayDoses.filter((d) => {
    const h = new Date(d.scheduledFor).getHours();
    return h >= 12 && h < 17;
  });
  const eveningDoses = todayDoses.filter(
    (d) => new Date(d.scheduledFor).getHours() >= 17
  );

  const pendingToday = todayDoses.filter((d) => d.status === "PENDING");
  const takenToday = todayDoses.filter((d) => d.status === "TAKEN");

  const voiceScript = `Good day, ${firstName}. You have taken ${takenToday.length} of your ${todayDoses.length} scheduled medications today. ${
    pendingToday.length > 0
      ? `Your remaining medications are: ${pendingToday
          .map((d) => {
            const t = new Date(d.scheduledFor).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return `${d.medication.name}, ${d.medication.dosage}, a ${d.medication.pillShape.toLowerCase()} tablet marked ${d.medication.pillImprint}, scheduled for ${t}. ${d.medication.instructions}`;
          })
          .join(" Next: ")}`
      : "All of your scheduled medications for today are complete. Great job!"
  }`;

  const nextAppt = appointments[0];
  const todayFormatted = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111827] transition-colors pb-24">
      {/* Glassmorphic Sticky Top Dignity Bar */}
      <header className="glass-nav sticky top-0 z-30 px-6 lg:px-10 py-5">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Elder Sovereign Dignity Mode • CareVault {vault.vaultCode}</span>
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white border border-[#E2DDD5] text-sm font-medium text-slate-600">
                {todayFormatted}
              </span>
            </div>

            <h1 className="font-display text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#111827] leading-tight">
              Good Morning, {firstName}
            </h1>
            <p className="text-[22px] text-slate-600 mt-1">
              You have{" "}
              <strong className="text-[#0F766E] font-semibold">
                {takenToday.length} confirmed
              </strong>{" "}
              and{" "}
              <strong className="text-[#D97706] font-semibold">
                {pendingToday.length} upcoming
              </strong>{" "}
              doses today.
            </p>
          </div>

          {/* Primary Ergonomic Action Controls (RULE-UX-02: >= 64px height, >= 120px width, >= 16px gap) */}
          <div className="flex flex-wrap items-center gap-4">
            <VoiceCopilotOrb
              elderFirstName={firstName}
              todayDoses={todayDoses}
              onActionCompleted={(msg) => {
                setToastMessage(msg);
                loadState();
              }}
            />

            <VoiceReaderButton
              scriptText={voiceScript}
              label="Read My Schedule Aloud"
            />

            <SteadyHandToggleButton size="elder" />

            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              onClick={() => setShowPrivacyDrawer(true)}
              className="min-h-[64px] min-w-[230px] px-7 py-3.5 rounded-full bg-white hover:bg-slate-50 text-[#111827] font-display font-semibold text-[20px] flex items-center justify-center gap-3 border border-[#E2DDD5] shadow-2xs transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#0F766E]" />
              <span>My Privacy &amp; Autonomy</span>
            </motion.button>

            <ThemeToggleButton size="elder" />

            <EmergencyMedicalIdTrigger
              size="elder"
              liveDoses={todayDoses.map((d) => ({
                name: d.medication.name,
                dosage: d.medication.dosage,
                status: d.status,
                time: new Date(d.scheduledFor).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }))}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 pt-8">
        {/* Status Toast */}
        <AnimatePresence mode="wait">
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              role="status"
              className="mb-8 p-6 rounded-3xl bg-white border-2 border-[#10B981] text-[#111827] font-display font-semibold text-[22px] flex flex-wrap items-center justify-between gap-4 shadow-bento"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#0F766E] shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="min-h-[64px] min-w-[120px] px-6 py-2 rounded-full bg-[#FAF8F5] hover:bg-slate-200/70 text-[#111827] text-[18px] font-semibold border border-[#E2DDD5]"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dignity Consent Spotlight Banner */}
        <ConsentApprovalBanner
          proposals={pendingProposals}
          primaryPhysician={vault.primaryPhysician}
          onDecisionComplete={(msg) => {
            setToastMessage(msg);
            loadState();
          }}
        />

        {/* Tactile Medication Bento Grid Grouped by Time-of-Day */}
        <div className="space-y-12">
          {/* Morning Routine */}
          <ScrollChoreographySection>
            <section aria-label="Morning Medications">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#E2DDD5]">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <h2 className="font-display text-[32px] font-semibold text-[#111827]">
                    Morning • 8:00 AM Window
                  </h2>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-white border border-[#E2DDD5] font-mono text-[18px] font-semibold text-slate-700">
                  {morningDoses.filter((d) => d.status === "TAKEN").length} of{" "}
                  {morningDoses.length} Taken
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {morningDoses.map((dose) => (
                  <TactilePillCard
                    key={dose.id}
                    dose={dose}
                    onDoseUpdated={(msg) => {
                      setToastMessage(msg);
                      loadState();
                    }}
                  />
                ))}
              </div>
            </section>
          </ScrollChoreographySection>

          {/* Afternoon Routine (Appears when Vitamin D3 or midday medication is approved!) */}
          {afternoonDoses.length > 0 && (
            <ScrollChoreographySection>
              <section aria-label="Afternoon Medications">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#E2DDD5]">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#D97706]" />
                    <h2 className="font-display text-[32px] font-semibold text-[#111827]">
                      ☀️ Afternoon Routine • 12:30 PM Window
                    </h2>
                  </div>
                  <span className="px-4 py-1.5 rounded-full bg-white border border-[#E2DDD5] font-mono text-[18px] font-semibold text-slate-700">
                    {afternoonDoses.filter((d) => d.status === "TAKEN").length} of{" "}
                    {afternoonDoses.length} Taken
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {afternoonDoses.map((dose) => (
                    <TactilePillCard
                      key={dose.id}
                      dose={dose}
                      onDoseUpdated={(msg) => {
                        setToastMessage(msg);
                        loadState();
                      }}
                    />
                  ))}
                </div>
              </section>
            </ScrollChoreographySection>
          )}

          {/* Evening Routine */}
          <ScrollChoreographySection>
            <section aria-label="Evening Medications">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#E2DDD5]">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#2563EB]" />
                  <h2 className="font-display text-[32px] font-semibold text-[#111827]">
                    Evening • 8:00 PM Window
                  </h2>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-white border border-[#E2DDD5] font-mono text-[18px] font-semibold text-slate-700">
                  {eveningDoses.filter((d) => d.status === "TAKEN").length} of{" "}
                  {eveningDoses.length} Taken
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {eveningDoses.map((dose) => (
                  <TactilePillCard
                    key={dose.id}
                    dose={dose}
                    onDoseUpdated={(msg) => {
                      setToastMessage(msg);
                      loadState();
                    }}
                  />
                ))}
              </div>
            </section>
          </ScrollChoreographySection>
        </div>

        {/* One-Tap Symptom & Doctor Question Strip */}
        <MoodCheckIn
          primaryPhysician={vault.primaryPhysician}
          existingQuestions={nextAppt ? nextAppt.elderQuestions : []}
          onCompleted={(msg) => {
            setToastMessage(msg);
            loadState();
          }}
        />

        {/* Upcoming Doctor Visit Bento Card */}
        {nextAppt && (
          <section className="mt-10 bento-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-base font-semibold">
                <Calendar className="w-4 h-4" />
                <span>Upcoming Doctor Visit • Escort: {nextAppt.escortMemberName}</span>
              </div>
              <h2 className="font-display text-[28px] sm:text-[32px] font-semibold text-[#111827]">
                {nextAppt.doctorName} ({nextAppt.specialty})
              </h2>
              <p className="text-[22px] text-slate-600">
                {new Date(nextAppt.appointmentDate).toLocaleString([], {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                • {nextAppt.clinicLocation}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/appointments/brief/${nextAppt.id}`)}
              className="min-h-[68px] min-w-[260px] px-8 py-4 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-display font-semibold text-[20px] flex items-center justify-center gap-3 shadow-sm transition-colors"
            >
              <FileText className="w-6 h-6" />
              <span>View Doctor Visit Brief</span>
            </button>
          </section>
        )}

        {/* Bottom Floating Hackathon Role Switcher Dock */}
        <footer className="mt-12 bg-white border border-[#E2DDD5] rounded-3xl p-6 shadow-bento flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#D97706]" />
            <span className="font-display text-[20px] font-semibold text-[#111827]">
              Hackathon Judge Role Switcher:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleSwitchRole("222222")}
              className="min-h-[64px] min-w-[220px] px-6 py-3 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white font-display font-semibold text-[18px]"
            >
              Switch to Maya (Caretaker PIN 222222)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchRole("333333")}
              className="min-h-[64px] min-w-[200px] px-6 py-3 rounded-full bg-[#111827] hover:bg-slate-800 text-white font-display font-semibold text-[18px]"
            >
              Switch to David, RN (PIN 333333)
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[64px] min-w-[140px] px-6 py-3 rounded-full bg-[#FAF8F5] hover:bg-red-50 text-[#111827] border border-[#E2DDD5] font-display font-semibold text-[18px] flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5 text-red-700" />
              <span>Exit Vault</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Slide-Over "My Privacy & Autonomy" Drawer */}
      <AnimatePresence>
        {showPrivacyDrawer && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-label="My Privacy and Autonomy Controls"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={shouldReduceMotion ? {} : { x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E2DDD5] p-8 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E2DDD5]">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#0F766E] font-semibold">
                      SOVEREIGNTY &amp; CONSENT CONTROLS
                    </span>
                    <h2 className="font-display text-[32px] font-semibold text-[#111827] mt-1">
                      My Privacy &amp; Autonomy
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPrivacyDrawer(false)}
                    className="min-h-[64px] min-w-[120px] px-6 py-3 rounded-full bg-[#111827] text-white font-display font-semibold text-[20px] flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    <span>Done</span>
                  </button>
                </div>

                <p className="text-[22px] text-slate-600 leading-relaxed mb-8">
                  You decide what your family and care team can see and whether changes require your personal sign-off:
                </p>

                <div className="space-y-6">
                  {/* Toggle 1 */}
                  <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <h3 className="font-display text-[24px] font-bold text-[#111827]">
                        1. Require My Sign-Off on Family Schedule Proposals
                      </h3>
                      <p className="text-[20px] text-slate-600 mt-1 leading-relaxed">
                        When ON, Maya or Nurse David cannot add or change medications without your approval card.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingPrivacy}
                      onClick={() =>
                        handleTogglePrivacy(
                          "requireElderApproval",
                          !vault.requireElderApproval
                        )
                      }
                      className={`min-h-[68px] min-w-[190px] px-6 py-3.5 rounded-full font-display font-semibold text-[20px] transition-all shrink-0 ${
                        vault.requireElderApproval
                          ? "bg-[#0F766E] text-white"
                          : "bg-slate-200 text-[#111827]"
                      }`}
                    >
                      {vault.requireElderApproval
                        ? "✓ ON (Protected)"
                        : "OFF (Delegated)"}
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <h3 className="font-display text-[24px] font-bold text-[#111827]">
                        2. Share My Daily Mood &amp; Symptom Notes
                      </h3>
                      <p className="text-[20px] text-slate-600 mt-1 leading-relaxed">
                        When OFF, your subjective mood and symptom notes are hidden on the family dashboard.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingPrivacy}
                      onClick={() =>
                        handleTogglePrivacy(
                          "shareSymptomNotes",
                          !vault.shareSymptomNotes
                        )
                      }
                      className={`min-h-[68px] min-w-[190px] px-6 py-3.5 rounded-full font-display font-semibold text-[20px] transition-all shrink-0 ${
                        vault.shareSymptomNotes
                          ? "bg-[#0F766E] text-white"
                          : "bg-[#D97706] text-white"
                      }`}
                    >
                      {vault.shareSymptomNotes
                        ? "✓ ON (Shared)"
                        : "🔒 OFF (Private)"}
                    </button>
                  </div>

                  {/* Toggle 3 */}
                  <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <h3 className="font-display text-[24px] font-bold text-[#111827]">
                        3. Auto-Escalate Missed Doses After 90 Minutes
                      </h3>
                      <p className="text-[20px] text-slate-600 mt-1 leading-relaxed">
                        When ON, AURA•CARE sends a check-in alert to your Care-Circle if a pill is 90 minutes overdue.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={updatingPrivacy}
                      onClick={() =>
                        handleTogglePrivacy(
                          "autoEscalateMissed",
                          !vault.autoEscalateMissed
                        )
                      }
                      className={`min-h-[68px] min-w-[190px] px-6 py-3.5 rounded-full font-display font-semibold text-[20px] transition-all shrink-0 ${
                        vault.autoEscalateMissed
                          ? "bg-[#0F766E] text-white"
                          : "bg-[#D97706] text-white"
                      }`}
                    >
                      {vault.autoEscalateMissed
                        ? "✓ ON (Safety Net)"
                        : "OFF (Paused)"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E2DDD5] mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrivacyDrawer(false)}
                  className="min-h-[64px] min-w-[200px] px-8 py-4 rounded-full bg-[#0F766E] text-white font-display font-semibold text-[20px]"
                >
                  Save &amp; Return to Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ElderSovereignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] text-[#111827] flex items-center justify-center p-8">
          <div className="font-display text-[28px] font-semibold text-[#0F766E]">
            Loading Elder Sovereign Mode...
          </div>
        </div>
      }
    >
      <ElderSovereignContent />
    </Suspense>
  );
}
