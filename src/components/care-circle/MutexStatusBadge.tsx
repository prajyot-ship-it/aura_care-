"use client";

import React from "react";
import { Lock, Clock, AlertTriangle } from "lucide-react";

interface MutexStatusBadgeProps {
  status: string;
  loggedByName: string | null;
  loggedAt: string | null;
  lockVersion: number;
  note?: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return "AP";
  const cleaned = name.split("(")[0].replace(", RN", "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function MutexStatusBadge({
  status,
  loggedByName,
  loggedAt,
  lockVersion,
  note,
}: MutexStatusBadgeProps) {
  const timeStr = loggedAt
    ? new Date(loggedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (status === "TAKEN") {
    const initials = getInitials(loggedByName);
    return (
      <div className="inline-flex flex-col items-end">
        <div className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#0F766E] border border-[#10B981]/50 shadow-2xs">
          <span className="w-6 h-6 rounded-full bg-[#0F766E] text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
            {initials}
          </span>
          <Lock className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <span>
            LOCKED (v{lockVersion}): Administered by {loggedByName || "Elder"}{" "}
            <span className="font-mono">at {timeStr}</span>
          </span>
        </div>
        {note && (
          <span className="text-[11px] text-slate-500 mt-1 italic">
            “{note}”
          </span>
        )}
      </div>
    );
  }

  if (status === "SKIPPED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        SKIPPED by {loggedByName || "Elder"} ({note || "Logged"})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#F8F7F4] text-slate-700 border border-[#E2DDD5]">
      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
      UNLOCKED (v{lockVersion}) • Awaiting Dose
    </span>
  );
}
