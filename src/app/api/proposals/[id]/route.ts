import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { ensureTodayDoseLogs } from "@/lib/bootstrap";
import { ApiEnvelope, ProposalStatus } from "@/lib/types";

interface ProposalDecisionRequest {
  decision?: "APPROVE" | "HOLD";
  elderResponseNote?: string;
}

interface ProposalDecisionResponse {
  proposalId: string;
  status: ProposalStatus;
  medicationActivated: boolean;
  message: string;
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<ApiEnvelope<ProposalDecisionResponse>>> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // RULE-SEC-03: Server-Side Role Enforcement — restricted strictly to ELDER_SOVEREIGN
    if (session.role !== "ELDER_SOVEREIGN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden (RULE-SEC-03): Only the Elder Sovereign can approve or hold proposed routine changes.",
        },
        { status: 403 }
      );
    }

    const proposalId = context.params.id;
    const body = (await req.json()) as ProposalDecisionRequest;
    const decision = body.decision;

    if (decision !== "APPROVE" && decision !== "HOLD") {
      return NextResponse.json(
        {
          success: false,
          error: "decision must be 'APPROVE' or 'HOLD'.",
        },
        { status: 400 }
      );
    }

    const proposal = await prisma.scheduleProposal.findFirst({
      where: {
        id: proposalId,
        vaultId: session.vaultId,
      },
      include: {
        vault: {
          include: {
            members: true,
          },
        },
        medication: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: "Schedule proposal not found." },
        { status: 404 }
      );
    }

    const nextProposalStatus: ProposalStatus =
      decision === "APPROVE" ? "APPROVED" : "HELD_FOR_DOCTOR";

    const responseNote =
      body.elderResponseNote?.trim() ||
      (decision === "APPROVE"
        ? `Approved by ${session.name} and added to active daily routine.`
        : `Held by ${session.name}: Will review with ${proposal.vault.primaryPhysician} at next visit.`);

    await prisma.scheduleProposal.update({
      where: { id: proposal.id },
      data: {
        status: nextProposalStatus,
        elderResponseNote: responseNote,
      },
    });

    let medicationActivated = false;

    if (proposal.medicationId) {
      await prisma.medication.update({
        where: { id: proposal.medicationId },
        data: {
          status: decision === "APPROVE" ? "ACTIVE" : "PAUSED",
        },
      });
      if (decision === "APPROVE") {
        medicationActivated = true;
        await ensureTodayDoseLogs(session.vaultId);
      }
    }

    // If held for doctor, automatically append a question to the upcoming appointment so nothing is lost!
    if (decision === "HOLD" && proposal.medication) {
      const nextAppt = await prisma.appointment.findFirst({
        where: { vaultId: session.vaultId, status: "UPCOMING" },
        orderBy: { appointmentDate: "asc" },
      });
      if (nextAppt) {
        let questions: string[] = [];
        try {
          questions = JSON.parse(nextAppt.elderQuestions) as string[];
        } catch {
          questions = [];
        }
        const holdQuestion = `Confirm whether to start proposed ${proposal.medication.name} (${proposal.medication.dosage}) — held by ${session.name} for physician confirmation.`;
        if (!questions.includes(holdQuestion)) {
          questions.push(holdQuestion);
          await prisma.appointment.update({
            where: { id: nextAppt.id },
            data: { elderQuestions: JSON.stringify(questions) },
          });
        }
      }
    }

    // Record email audit notification to Primary Caretaker in EmailDispatchLog
    const primaryCaretaker = proposal.vault.members.find(
      (m) => m.role === "PRIMARY_CARETAKER"
    );
    if (primaryCaretaker) {
      await prisma.emailDispatchLog.create({
        data: {
          vaultId: session.vaultId,
          recipientEmail: primaryCaretaker.email,
          recipientName: primaryCaretaker.name,
          tier: "PROPOSAL_NOTICE",
          subject: `[Dignity Co-Sign ${
            decision === "APPROVE" ? "APPROVED" : "HELD FOR DOCTOR"
          }] ${session.name} responded to your schedule proposal`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; background: #FAF8F5; border: 2px solid ${
            decision === "APPROVE" ? "#046A38" : "#B45309"
          }; border-radius: 12px;">
            <h3 style="color: ${
              decision === "APPROVE" ? "#046A38" : "#B45309"
            }; margin-top: 0;">Elder Sovereign Decision: ${
              decision === "APPROVE"
                ? "Approved & Added to Routine"
                : "Held — Ask Physician First"
            }</h3>
            <p><strong>${session.name}</strong> reviewed the proposal:</p>
            <blockquote style="background: #FFFFFF; padding: 12px; border-left: 4px solid #64748B;">"${
              proposal.plainEnglishSummary
            }"</blockquote>
            <p><strong>Elder Note:</strong> ${responseNote}</p>
          </div>`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        proposalId: proposal.id,
        status: nextProposalStatus,
        medicationActivated,
        message:
          decision === "APPROVE"
            ? "Approved! Medication is now ACTIVE and added to your daily schedule."
            : "Placed on Hold and added to your questions for Dr. Elena Vance.",
      },
    });
  } catch (err) {
    console.error("[POST /api/proposals/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process proposal decision." },
      { status: 500 }
    );
  }
}
