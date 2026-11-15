"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Mail, X, RefreshCw, CheckCircle2, AlertTriangle, Clock, Calendar, FileText } from "lucide-react";
import { EmailOutboxRecord, EmailTier } from "@/lib/types";

interface LiveEmailOutboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
}

export function LiveEmailOutboxDrawer({
  isOpen,
  onClose,
  refreshTrigger = 0,
}: LiveEmailOutboxDrawerProps) {
  const [emails, setEmails] = useState<EmailOutboxRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/emails", { cache: "no-store" });
      const json = (await res.json()) as {
        success: boolean;
        data?: { emails: EmailOutboxRecord[] };
      };
      if (json.success && json.data) {
        setEmails(json.data.emails);
        if (json.data.emails.length > 0 && !selectedEmailId) {
          setSelectedEmailId(json.data.emails[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch outbox emails:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmailId]);

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen, refreshTrigger, fetchEmails]);

  if (!isOpen || typeof document === "undefined") return null;

  const filteredEmails =
    tierFilter === "ALL"
      ? emails
      : emails.filter((e) => e.tier === tierFilter);

  const selectedEmail =
    filteredEmails.find((e) => e.id === selectedEmailId) ||
    filteredEmails[0] ||
    null;

  function renderTierBadge(tier: EmailTier) {
    switch (tier) {
      case "UPCOMING_CUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Clock className="w-3.5 h-3.5" /> Tier 1: T-15m Cue
          </span>
        );
      case "MISSED_NUDGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Tier 2: +30m Nudge
          </span>
        );
      case "CARE_CIRCLE_ESCALATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Tier 3: +90m Escalation
          </span>
        );
      case "APPOINTMENT_PREP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Calendar className="w-3.5 h-3.5" /> 24h Appt Prep
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <FileText className="w-3.5 h-3.5" /> Dignity Co-Sign
          </span>
        );
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Live Email Outbox Inspector Drawer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white h-dvh max-h-dvh shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header so Close (X) is always visible */}
        <div className="sticky top-0 z-20 shrink-0 px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight truncate">
                  Live Email Outbox &amp; Escalation Inspector
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {emails.length} Dispatched
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Dual-Channel Persistence (EmailDispatchLog + Nodemailer SMTP Bridge) — Inspect full HTML emails in real time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchEmails}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1"
              aria-label="Close Email Outbox"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Tier Filter Bar */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          {[
            { id: "ALL", label: "All Dispatches" },
            { id: "UPCOMING_CUE", label: "Tier 1 (T-15m Cue)" },
            { id: "MISSED_NUDGE", label: "Tier 2 (+30m Nudge)" },
            { id: "CARE_CIRCLE_ESCALATION", label: "Tier 3 (+90m Escalation)" },
            { id: "APPOINTMENT_PREP", label: "24h Appt Prep" },
            { id: "PROPOSAL_NOTICE", label: "Dignity Co-Sign" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                tierFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Split Pane: List + Live HTML Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Message List */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-200 bg-slate-50">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No dispatched emails in this filter yet. Trigger a Time-Travel check or propose a medication to inspect live HTML dispatches.
              </div>
            ) : (
              filteredEmails.map((item) => {
                const isSelected = selectedEmail?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedEmailId(item.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      isSelected
                        ? "bg-blue-50/90 border-l-4 border-l-blue-700"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {renderTierBadge(item.tier)}
                      <span className="text-[11px] font-medium text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 line-clamp-2 mb-1">
                      {item.subject}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      To: <span className="font-semibold">{item.recipientName}</span> ({item.recipientEmail})
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right HTML Email Renderer */}
          <div className="md:col-span-7 overflow-y-auto p-6 bg-white">
            {selectedEmail ? (
              <div>
                <div className="border-b border-slate-200 pb-4 mb-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {renderTierBadge(selectedEmail.tier)}
                    <span className="text-xs text-slate-500">
                      Logged ID: <code className="font-mono">{selectedEmail.id.slice(0, 10)}</code> •{" "}
                      {new Date(selectedEmail.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedEmail.subject}
                  </h3>
                  <div className="mt-2 text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-lg flex flex-wrap justify-between gap-2">
                    <div>
                      <strong>Recipient:</strong> {selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;
                    </div>
                    <div>
                      <strong>Delivery Status:</strong>{" "}
                      <span className="text-emerald-700 font-bold">
                        PERSISTED &amp; RENDERED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rendered HTML Body */}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Select an email from the left column to inspect its rendered HTML payload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
