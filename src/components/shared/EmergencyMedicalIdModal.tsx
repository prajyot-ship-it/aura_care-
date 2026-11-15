"use client";

import React, { useState } from "react";
import { AccessibleModal } from "./AccessibleModal";
import {
  HeartPulse,
  ShieldAlert,
  PhoneCall,
  Clock,
  X,
  Printer,
  CheckCircle2,
  Droplets,
  Stethoscope,
} from "lucide-react";

interface EmergencyDoseSummary {
  name: string;
  dosage: string;
  status: string;
  time: string;
}

export function EmergencyMedicalIdTrigger({
  size = "compact",
  liveDoses,
}: {
  size?: "compact" | "elder";
  liveDoses?: EmergencyDoseSummary[];
}) {
  const [open, setOpen] = useState(false);

  const defaultDoses: EmergencyDoseSummary[] =
    liveDoses && liveDoses.length > 0
      ? liveDoses
      : [
          {
            name: "Levothyroxine (Thyroid Hormone)",
            dosage: "75 mcg",
            status: "TAKEN",
            time: "08:02 AM Today",
          },
          {
            name: "Lisinopril (ACE Inhibitor)",
            dosage: "10 mg",
            status: "TAKEN",
            time: "08:05 AM Today",
          },
          {
            name: "Eliquis / Apixaban (Factor Xa Anticoagulant)",
            dosage: "5 mg",
            status: "PENDING",
            time: "Scheduled 08:00 AM & 08:00 PM",
          },
          {
            name: "Atorvastatin (Statin)",
            dosage: "20 mg",
            status: "PENDING",
            time: "Scheduled 08:00 PM",
          },
        ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          size === "elder"
            ? "min-h-[64px] min-w-[270px] px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-display font-bold text-[19px] flex items-center justify-center gap-2.5 border-2 border-red-300 shadow-[0_0_24px_rgba(239,68,68,0.45)] animate-pulse"
            : "px-3.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-500 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
        }
      >
        <HeartPulse className={size === "elder" ? "w-5 h-5" : "w-3.5 h-3.5"} />
        <span>Emergency Medical ID (No PIN Needed)</span>
      </button>

      <AccessibleModal
        isOpen={open}
        onClose={() => setOpen(false)}
        ariaLabel="First-Responder Emergency Medical ID (ICE Mode)"
        overlayClassName="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 overflow-y-auto"
      >
        <div
          className="bento-card max-w-2xl w-full p-6 sm:p-8 border-2 border-red-500 shadow-2xl space-y-6 my-8"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2DDD5]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-mono text-[11px] font-bold uppercase tracking-wider">
                    ZERO-PIN FIRST-RESPONDER ICE CARD • VAULT AURA-7842
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111827] mt-1">
                    Arthur Pendelton • Age 78
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-[#111827] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Close ICE Card</span>
              </button>
            </div>

            {/* Critical Red Triage Banner (Anticoagulant & Severe Allergies) */}
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-500 space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-display font-bold text-base">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <span>
                  CRITICAL TRIAGE ALERT: ACTIVE FACTOR Xa ANTICOAGULANT (ELIQUIS / APIXABAN 5 MG BID)
                </span>
              </div>
              <p className="text-xs text-red-900 leading-relaxed">
                Patient is anticoagulated for atrial fibrillation stroke prophylaxis. Avoid systemic NSAIDs (Ketorolac/Ibuprofen) and monitor for hemorrhage in trauma triage.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                  ALLERGY: Penicillin (Anaphylaxis)
                </span>
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                  ALLERGY: Sulfa Drugs (Severe Rash)
                </span>
              </div>
            </div>

            {/* Vitals & Blood Type Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5]">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-red-600" />
                  <span>BLOOD TYPE</span>
                </div>
                <div className="font-display text-2xl font-bold text-[#111827] mt-0.5">
                  O+ Positive
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5]">
                <div className="text-[11px] font-mono text-slate-500">
                  BASELINE BP
                </div>
                <div className="font-display text-xl font-bold text-[#111827] mt-0.5 font-mono">
                  124/76 mmHg
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5]">
                <div className="text-[11px] font-mono text-slate-500">
                  PRIMARY DX
                </div>
                <div className="font-display text-sm font-bold text-[#111827] mt-1">
                  HTN • AFib • Hypothyroid
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5]">
                <div className="text-[11px] font-mono text-slate-500">
                  CODE STATUS
                </div>
                <div className="font-display text-sm font-bold text-[#0F766E] mt-1">
                  Full Code • Sovereign
                </div>
              </div>
            </div>

            {/* Today's Active Bloodstream Medication Log */}
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Today’s Medication Administration &amp; Bloodstream Status</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {defaultDoses.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#111827]">
                        {d.name} ({d.dosage})
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {d.time}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        d.status === "TAKEN"
                          ? "bg-emerald-100 text-[#0F766E]"
                          : "bg-amber-100 text-[#D97706]"
                      }`}
                    >
                      {d.status === "TAKEN" ? "✓ IN SYSTEM" : d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2DDD5]">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    PRIMARY CARETAKER / PROXY
                  </div>
                  <div className="font-bold text-sm text-[#111827]">
                    Maya Pendelton (Daughter)
                  </div>
                  <div className="font-mono text-xs text-[#2563EB]">
                    +1 (555) 234-8910
                  </div>
                </div>
                <PhoneCall className="w-5 h-5 text-[#2563EB]" />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E2DDD5] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    ATTENDING CARDIOLOGIST
                  </div>
                  <div className="font-bold text-sm text-[#111827]">
                    Dr. Eleanor Vance, MD
                  </div>
                  <div className="font-mono text-xs text-[#0F766E]">
                    +1 (555) 890-4411
                  </div>
                </div>
                <Stethoscope className="w-5 h-5 text-[#0F766E]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                Read-Only ICE Override • Zero Private Vault Access Granted
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-full bg-[#0F766E] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Paramedic Triage Sheet</span>
              </button>
            </div>
        </div>
      </AccessibleModal>
    </>
  );
}
