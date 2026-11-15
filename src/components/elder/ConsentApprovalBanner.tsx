"use client";

import React, { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Check, HelpCircle } from "lucide-react";
import { PillSvgTwin } from "@/components/shared/PillSvgTwin";
import { safeParseJsonObject } from "@/lib/types";

const InteractivePill3D = dynamic(
  () => import("@/components/three/InteractivePill3D"),
  { ssr: false }
);

interface PendingProposalItem {
  id: string;
  medicationId: string | null;
  actionType: string;
  proposedPayload: string;
  plainEnglishSummary: string;
  proposedByName: string;
  status: string;
}

interface ConsentApprovalBannerProps {
  proposals: PendingProposalItem[];
  primaryPhysician: string;
  onDecisionComplete: (message: string) => void;
}

export function ConsentApprovalBanner({
  proposals,
  primaryPhysician,
  onDecisionComplete,
}: ConsentApprovalBannerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingOnly = proposals.filter((p) => p.status === "PENDING");
  if (pendingOnly.length === 0) return null;

  async function handleDecision(
    proposalId: string,
    decision: "APPROVE" | "HOLD"
  ) {
    setProcessingId(proposalId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { message: string };
        error?: string;
      };
      if (json.success && json.data) {
        onDecisionComplete(json.data.message);
      } else {
        onDecisionComplete(json.error || "Could not process decision.");
      }
    } catch {
      onDecisionComplete("Network error while saving your choice.");
    } finally {
      setProcessingId(null);
    }
  }

  const doctorShortName = (primaryPhysician.split("(")[0] ?? primaryPhysician).trim();

  return (
    <section
      aria-label="Review Proposed Routine Changes"
      className="space-y-6 mb-10"
    >
      {pendingOnly.map((proposal) => {
        const payload = safeParseJsonObject<{
          name?: string;
          dosage?: string;
          pillShape?: string;
          pillColorPrimary?: string;
          pillColorSecondary?: string;
          pillImprint?: string;
          scheduledTimes?: string[];
        }>(proposal.proposedPayload, {});

        return (
          <motion.div
            key={proposal.id}
            layout
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card border-l-4 border-l-[#2563EB] p-7 sm:p-9 bg-white text-[#111827]"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] font-semibold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>Review Proposed Change — Sovereign Co-Sign</span>
              </div>
              <span className="text-base font-medium text-slate-600">
                Proposed by{" "}
                <strong className="text-[#111827]">
                  {proposal.proposedByName}
                </strong>
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-7 my-6 bg-[#FAF8F5] p-6 rounded-2xl border border-[#E2DDD5]">
              {payload.pillShape && (
                <Suspense
                  fallback={
                    <PillSvgTwin
                      shape={payload.pillShape}
                      primaryColor={payload.pillColorPrimary || "#F59E0B"}
                      secondaryColor={payload.pillColorSecondary || "#FDE68A"}
                      imprint={payload.pillImprint || "MED"}
                      size="lg"
                    />
                  }
                >
                  <InteractivePill3D
                    shape={payload.pillShape}
                    primaryColor={payload.pillColorPrimary || "#F59E0B"}
                    secondaryColor={payload.pillColorSecondary || "#FDE68A"}
                    imprint={payload.pillImprint || "MED"}
                    medName={payload.name}
                    dosage={payload.dosage}
                    instructions={proposal.plainEnglishSummary}
                    size="lg"
                    reducedMotion={Boolean(shouldReduceMotion)}
                    allowModalInspect={true}
                  />
                </Suspense>
              )}
              <div className="flex-1 space-y-2">
                <h2 className="font-display text-[28px] sm:text-[32px] font-semibold leading-tight text-[#111827]">
                  {payload.name
                    ? `Add ${payload.name} (${payload.dosage || ""})`
                    : "Proposed Schedule Update"}
                </h2>
                <p className="text-[22px] leading-[1.5] text-[#111827]">
                  {proposal.plainEnglishSummary}
                </p>
              </div>
            </div>

            <p className="text-[20px] font-medium text-slate-600 mb-6">
              Nothing changes on your daily medication routine unless you approve it:
            </p>

            {/* Two Oversized 68px-Tall Pill Buttons */}
            <div className="flex flex-wrap items-center gap-5">
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                disabled={processingId === proposal.id}
                onClick={() => handleDecision(proposal.id, "APPROVE")}
                className="min-h-[68px] min-w-[270px] px-8 py-4 rounded-full bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-display font-semibold text-[20px] flex items-center justify-center gap-3 shadow-sm transition-colors"
              >
                <Check className="w-6 h-6 stroke-[2.5]" />
                <span>Approve &amp; Add to My Routine</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                disabled={processingId === proposal.id}
                onClick={() => handleDecision(proposal.id, "HOLD")}
                className="min-h-[68px] min-w-[250px] px-8 py-4 rounded-full bg-white hover:bg-amber-50/70 disabled:opacity-50 text-[#111827] font-display font-semibold text-[20px] flex items-center justify-center gap-3 border-2 border-[#D97706] transition-colors"
              >
                <HelpCircle className="w-6 h-6 text-[#D97706]" />
                <span>Hold — Ask {doctorShortName} First</span>
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
