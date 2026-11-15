"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  Mail,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Stethoscope,
  MessageSquare,
  Activity,
} from "lucide-react";
import { ClinicalBriefReport } from "@/lib/clinicalBriefGenerator";

export function BriefClientView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [brief, setBrief] = useState<ClinicalBriefReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

  const loadBrief = useCallback(async () => {
    try {
      const briefId = params?.id || "default";
      const res = await fetch(
        `/api/appointments?briefId=${encodeURIComponent(briefId)}`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const json = (await res.json()) as {
        success: boolean;
        data?: { brief: ClinicalBriefReport };
      };
      if (json.success && json.data) {
        setBrief(json.data.brief);
      }
    } catch (err) {
      console.error("Failed to load clinical brief:", err);
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    loadBrief();
  }, [loadBrief]);

  async function handleEmailBrief() {
    setEmailing(true);
    setEmailSuccessMsg(null);
    try {
      const res = await fetch("/api/escalations/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "SIMULATE_APPT_PREP" }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string };
      };
      if (json.success && json.data) {
        setEmailSuccessMsg(json.data.message);
      }
    } finally {
      setEmailing(false);
    }
  }

  if (loading || !brief) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-8">
        <div className="font-display text-lg font-semibold text-[#0F766E]">
          Synthesizing 30-Day Physician Clinical Brief...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111827] py-8 px-4 sm:px-8 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E2DDD5] text-xs font-semibold text-[#111827] flex items-center gap-2 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to CareVault</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={emailing}
            onClick={handleEmailBrief}
            className="px-5 py-2.5 rounded-full bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <Mail className="w-4 h-4" />
            <span>
              {emailing
                ? "Dispatching..."
                : "Email Pre-Visit Summary to Elder & Escort"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-full bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print 1-Page Clinical Brief</span>
          </button>
        </div>
      </div>

      {emailSuccessMsg && (
        <div className="max-w-5xl mx-auto mb-4 p-4 rounded-2xl bg-emerald-50 border border-[#10B981] text-[#0F766E] text-xs font-semibold flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{emailSuccessMsg}</span>
        </div>
      )}

      <article className="max-w-5xl mx-auto bento-card bg-white p-8 sm:p-10 print:shadow-none print:border-0 print:p-4">
        <header className="border-b border-[#E2DDD5] pb-6 mb-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-7 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F8F7F4] border border-[#E2DDD5] text-[11px] font-mono font-semibold uppercase tracking-widest text-[#0F766E]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AURA•CARE CLINICAL BRIEF • NON-DIAGNOSTIC</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#111827] tracking-tight">
              {brief.vault.elderName}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Age: <strong className="text-[#111827]">{brief.vault.elderAge}</strong>
              </span>
              <span>•</span>
              <span>
                Blood Type:{" "}
                <strong className="font-mono text-[#111827]">
                  {brief.vault.bloodType}
                </strong>
              </span>
              <span>•</span>
              <span>
                Vault ID:{" "}
                <strong className="font-mono text-[#111827]">
                  {brief.vault.vaultCode}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {brief.vault.allergies.map((a) => (
                <span
                  key={a}
                  className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-900 border border-red-200 font-semibold text-[11px]"
                >
                  Allergy: {a}
                </span>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] text-xs space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              ATTENDING SPECIALIST APPOINTMENT
            </div>
            <div className="font-display text-sm font-bold text-[#111827]">
              {brief.appointment.doctorName}
            </div>
            <div className="text-slate-600">{brief.appointment.specialty}</div>
            <div className="font-mono text-slate-700 pt-1">
              {new Date(brief.appointment.appointmentDate).toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              • Escort: {brief.appointment.escortMemberName}
            </div>
          </div>
        </header>

        <section className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>01 / Trailing 30-Day Adherence &amp; Circadian Pattern</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 p-5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Overall Medication Adherence
                </span>
                <div className="font-display text-4xl font-bold text-[#0F766E] tabular-nums mt-1">
                  {brief.overallMetrics.overallAdherencePercent}%
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  <strong className="font-mono text-[#111827]">
                    {brief.overallMetrics.takenCount}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-mono text-[#111827]">
                    {brief.overallMetrics.totalEvaluatedDoses}
                  </strong>{" "}
                  scheduled doses confirmed
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="h-2 w-full rounded-full bg-[#E2DDD5] overflow-hidden flex">
                  <div
                    style={{
                      width: `${brief.overallMetrics.overallAdherencePercent}%`,
                    }}
                    className="bg-[#0F766E] h-full"
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] text-slate-500">
                  <span>Missed: {brief.overallMetrics.missedCount}</span>
                  <span>Skipped: {brief.overallMetrics.skippedCount}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 p-5 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-[#D97706] mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Observed Circadian Adherence Pattern (Objective Summary)</span>
                </div>
                <p className="text-sm text-[#111827] font-medium leading-relaxed">
                  {brief.overallMetrics.primaryPatternFinding}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-4">
                {brief.timeOfDayClusters.map((c) => (
                  <div
                    key={c.windowLabel}
                    className="bg-white p-3 rounded-xl border border-[#E2DDD5]"
                  >
                    <div className="text-[11px] font-medium text-slate-500">
                      {c.windowLabel}
                    </div>
                    <div className="font-display text-lg font-bold text-[#111827] tabular-nums mt-0.5">
                      {c.missSharePercent}%{" "}
                      <span className="text-xs font-normal text-slate-500">
                        of misses
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {c.missedCount} missed / {c.totalDoses} scheduled
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-7">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>02 / Active Prescription Regimen &amp; Per-Medication Adherence</span>
          </h2>

          <div className="overflow-x-auto border border-[#E2DDD5] rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F5] text-slate-600 border-b border-[#E2DDD5]">
                  <th className="py-3 px-4 font-semibold">Medication</th>
                  <th className="py-3 px-4 font-semibold">Therapeutic Class</th>
                  <th className="py-3 px-4 font-semibold">Schedule &amp; Rule</th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Taken / Total
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    30d Adherence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD5]">
                {brief.medicationBreakdown.map((m) => (
                  <tr key={m.medicationId} className="hover:bg-[#FAF8F5]/50">
                    <td className="py-3 px-4 font-semibold text-[#111827]">
                      {m.name} {m.dosage}{" "}
                      <span className="font-normal text-slate-500">
                        ({m.genericName})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.drugClass}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {m.scheduledTimes.join(", ")} ({m.foodRule})
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {m.takenCount} / {m.totalScheduled}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono font-bold ${
                          m.adherencePercent >= 90
                            ? "bg-emerald-50 text-[#0F766E] border border-[#10B981]/30"
                            : "bg-amber-50 text-[#D97706] border border-amber-200"
                        }`}
                      >
                        {m.adherencePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <section className="md:col-span-7">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>03 / Logged Blood Pressure &amp; Symptom Correlations</span>
            </h2>

            <div className="space-y-2.5">
              {brief.recentWellnessCheckIns.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-semibold text-[#111827]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">
                        {new Date(w.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-[#E2DDD5]">
                        Mood: {w.mood}
                      </span>
                    </div>
                    {w.bloodPressureSystolic && (
                      <span className="font-mono text-[#2563EB]">
                        BP: {w.bloodPressureSystolic}/
                        {w.bloodPressureDiastolic} mmHg
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-1">{w.note}</p>
                  {w.correlatedMedicationNote && (
                    <p className="text-[11px] font-medium text-[#D97706] mt-1">
                      ↳ {w.correlatedMedicationNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="md:col-span-5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>04 / Questions Flagged by {brief.vault.elderName}</span>
            </h2>

            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 h-full">
              <ol className="list-decimal pl-4 space-y-2.5 text-xs font-semibold text-[#111827] leading-relaxed">
                {brief.appointment.elderQuestions.map((q, idx) => (
                  <li key={idx}>“{q}”</li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <footer className="mt-8 pt-4 border-t border-[#E2DDD5] text-[11px] text-slate-500 flex flex-wrap justify-between gap-2 font-mono">
          <span>
            AURA•CARE SOVEREIGN CO-PILOT (RULE-CLIN-03: OBJECTIVE ADHERENCE &amp; SYMPTOM SYNTHESIS)
          </span>
          <span>GENERATED: {new Date(brief.generatedAt).toLocaleString()}</span>
        </footer>
      </article>
    </div>
  );
}
