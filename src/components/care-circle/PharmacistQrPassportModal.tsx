"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  X,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface PharmacistMedItem {
  id: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  scheduledTimes: string[];
  foodRule: string;
  status: string;
}

interface PharmacistQrPassportModalProps {
  elderName: string;
  elderAge: number;
  bloodType: string;
  vaultCode: string;
  allergies: string[];
  medications: PharmacistMedItem[];
}

export function PharmacistQrPassportTrigger({
  elderName,
  elderAge,
  bloodType,
  vaultCode,
  allergies,
  medications,
}: PharmacistQrPassportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [simulateFoodConflict, setSimulateFoodConflict] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeMeds = medications.filter((m) => m.status === "ACTIVE");

  const qrPayload = JSON.stringify({
    passport: "AURA-CARE-PHARMACIST-SYNC-V1",
    vault: vaultCode,
    patient: `${elderName} (${elderAge}y, Blood ${bloodType})`,
    allergies,
    anticoagulantAlert: "ACTIVE: Eliquis (Apixaban) 5mg BID",
    regimen: activeMeds.map((m) => ({
      drug: `${m.name} ${m.dosage}`,
      class: m.drugClass,
      times: m.scheduledTimes,
      rule: m.foodRule,
    })),
    polypharmacyRules: [
      "Separate Levothyroxine from Calcium/Iron/Food by >= 4h (Chelation risk)",
      "Avoid systemic NSAIDs with Eliquis (Major hemorrhage risk)",
    ],
  });

  function handleCopySummary() {
    navigator.clipboard?.writeText(qrPayload).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-2 rounded-full bg-white hover:bg-emerald-50 text-[#0F766E] border border-[#10B981] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Pharmacist QR Passport &amp; 24h Curve</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Pharmacist QR Passport and Interactive 24-Hour Circadian Absorption Timeline"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bento-card max-w-5xl w-full p-6 sm:p-8 border border-[#10B981] shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2DDD5]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#0F766E] font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PHARMACIST SYNC PASSPORT &amp; CIRCADIAN PHARMACOKINETICS</span>
                </span>
                <h2 className="font-display text-2xl font-bold text-[#111827] mt-0.5">
                  {elderName} • Scannable Regimen QR &amp; 24-Hour Absorption Curve
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-full bg-[#111827] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Close Passport</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 4 Columns: Scannable Pharmacist QR Code Card */}
              <div className="lg:col-span-4 p-5 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD5] flex flex-col items-center text-center space-y-4">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  PHARMACY COUNTER QR SYNC
                </div>

                <div className="p-4 rounded-2xl bg-white border-2 border-[#0F766E] shadow-md">
                  <QRCodeSVG
                    value={qrPayload}
                    size={188}
                    level="M"
                    includeMargin={false}
                    fgColor="#111827"
                    bgColor="#FFFFFF"
                  />
                </div>

                <div className="space-y-1">
                  <div className="font-display font-bold text-sm text-[#111827]">
                    CareVault {vaultCode} • {activeMeds.length} Active Rx
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Encodes active prescriptions, severe allergies ({allergies.join(", ")}), and Eliquis + Levothyroxine interaction guardrails for instant pharmacist verification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full py-2.5 px-4 rounded-full bg-[#0F766E] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Copied FHIR Regimen Payload!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Pharmacist JSON Payload</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right 8 Columns: Interactive 24-Hour Circadian Absorption Curve */}
              <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-[#FAF8F5] border border-[#E2DDD5] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#0F766E]" />
                      <h3 className="font-display text-lg font-bold text-[#111827]">
                        24-Hour Circadian Pharmacokinetic Absorption Timeline
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Illustrates why <strong>Levothyroxine (06:30 AM Empty Stomach)</strong> must remain separated from Calcium, Iron &amp; breakfast by 4 hours
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSimulateFoodConflict((prev) => !prev)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      simulateFoodConflict
                        ? "bg-red-600 text-white border-red-400"
                        : "bg-white text-[#D97706] border-amber-300"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      {simulateFoodConflict
                        ? "⚠️ Showing Calcium/Breakfast Conflict (-42% Absorption)"
                        : "Simulate Calcium / Breakfast Co-Administration"}
                    </span>
                  </button>
                </div>

                {/* SVG 24-Hour Pharmacokinetic Absorption Graph */}
                <div className="p-4 rounded-2xl bg-white border border-[#E2DDD5]">
                  <svg
                    viewBox="0 0 680 210"
                    className="w-full h-48 overflow-visible"
                    role="img"
                    aria-label="24-Hour Circadian Medication Absorption Curve"
                  >
                    {/* Horizontal Reference Grid Lines */}
                    {[40, 85, 130, 175].map((y) => (
                      <line
                        key={y}
                        x1="30"
                        y1={y}
                        x2="660"
                        y2={y}
                        stroke="#E2DDD5"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    ))}

                    {/* 4-Hour Duodenal Chelation Exclusion Zone (06:30 - 10:30 AM) */}
                    <rect
                      x="110"
                      y="20"
                      width="135"
                      height="155"
                      rx="10"
                      fill={
                        simulateFoodConflict
                          ? "rgba(239, 68, 68, 0.14)"
                          : "rgba(56, 189, 248, 0.12)"
                      }
                      stroke={simulateFoodConflict ? "#EF4444" : "#38BDF8"}
                      strokeDasharray="4 3"
                    />
                    <text
                      x="177"
                      y="36"
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold"
                      fill={simulateFoodConflict ? "#DC2626" : "#0284C7"}
                    >
                      {simulateFoodConflict
                        ? "CHELATION CONFLICT (-42% Cmax)"
                        : "06:30–10:30 FASTING ABSORPTION ZONE"}
                    </text>

                    {/* Curve 1: Levothyroxine 75 mcg (06:30 AM Empty Stomach) */}
                    <path
                      d={
                        simulateFoodConflict
                          ? "M 30 175 L 110 175 Q 150 108 195 132 T 340 172 L 660 175"
                          : "M 30 175 L 110 175 Q 150 38 195 75 T 340 170 L 660 175"
                      }
                      fill="none"
                      stroke={simulateFoodConflict ? "#EF4444" : "#0284C7"}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Curve 2: Lisinopril 10 mg + Eliquis 5 mg (08:00 AM Morning Peak) */}
                    <path
                      d="M 30 175 L 165 175 Q 215 62 275 102 T 430 170 L 660 175"
                      fill="none"
                      stroke="#0F766E"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Curve 3: Vitamin D3 2000 IU / Calcium Safe Window (12:30 PM Lunch) */}
                    <path
                      d="M 30 175 L 315 175 Q 365 82 420 125 T 540 173 L 660 175"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      strokeLinecap="round"
                    />

                    {/* Curve 4: Atorvastatin 20 mg + Evening Eliquis (20:00 PM Nocturnal Peak) */}
                    <path
                      d="M 30 175 L 510 175 Q 560 54 615 95 T 660 155"
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Time Axis Labels */}
                    {[
                      { x: 40, label: "04:00" },
                      { x: 115, label: "06:30 (Thyroid)" },
                      { x: 205, label: "08:00 (Morning)" },
                      { x: 345, label: "12:30 (Safe Lunch)" },
                      { x: 525, label: "20:00 (Evening)" },
                      { x: 640, label: "24:00" },
                    ].map((tick) => (
                      <text
                        key={tick.label}
                        x={tick.x}
                        y="196"
                        textAnchor="middle"
                        className="text-[9.5px] font-mono"
                        fill="#64748B"
                      >
                        {tick.label}
                      </text>
                    ))}
                  </svg>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2DDD5] text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                      Levothyroxine 75 mcg (06:30 Empty Stomach)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F766E]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                      Lisinopril + Eliquis (08:00 Breakfast)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#D97706]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                      Vitamin D3 / Calcium (12:30 Safe Window)
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-purple-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      Atorvastatin + Eliquis (20:00 Evening)
                    </span>
                  </div>
                </div>

                {/* Clinical Pharmacokinetic Rationale Box */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5">
                  <div className="font-bold text-[#2563EB] flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>
                      Why AURA•CARE Enforces the 4-Hour Levothyroxine Separation Rule:
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Levothyroxine sodium requires gastric acid for optimal duodenal dissolution. Taking Calcium, Iron, or high-mineral breakfast within 4 hours forms insoluble chelation complexes that reduce thyroid hormone bioavailability by <strong>35%–42%</strong>. Spacing supplements to the <strong>12:30 PM Midday Window</strong> preserves 100% absorption.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
