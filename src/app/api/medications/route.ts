import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import {
  evaluatePolypharmacyConflicts,
  ExistingMedicationSummary,
  PolypharmacyEvaluationResult,
} from "@/lib/polypharmacyEngine";
import { dispatchProposalNoticeEmail } from "@/lib/escalationEngine";
import { ensureTodayDoseLogs } from "@/lib/bootstrap";
import {
  ApiEnvelope,
  FoodRule,
  MedFrequency,
  PillShape,
  safeParseJsonArray,
} from "@/lib/types";

interface CreateMedicationRequest {
  dryRun?: boolean;
  overrideConfirmed?: boolean;
  name?: string;
  genericName?: string;
  drugClass?: string;
  dosage?: string;
  frequency?: MedFrequency;
  scheduledTimes?: string[];
  foodRule?: FoodRule;
  instructions?: string;
  pillShape?: PillShape;
  pillColorPrimary?: string;
  pillColorSecondary?: string;
  pillImprint?: string;
  stockCount?: number;
  refillThreshold?: number;
  proposalReason?: string;
}

interface CreateMedicationResponse {
  evaluation: PolypharmacyEvaluationResult;
  stagedForElderApproval: boolean;
  medication?: {
    id: string;
    name: string;
    dosage: string;
    status: string;
  };
  proposalId?: string;
}

export async function GET(): Promise<
  NextResponse<ApiEnvelope<{ medications: ExistingMedicationSummary[] }>>
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const meds = await prisma.medication.findMany({
    where: { vaultId: session.vaultId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      medications: meds.map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        drugClass: m.drugClass,
        dosage: m.dosage,
        scheduledTimes: safeParseJsonArray<string>(m.scheduledTimes, []),
        foodRule: m.foodRule,
        status: m.status,
      })),
    },
  });
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiEnvelope<CreateMedicationResponse>>> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateMedicationRequest;
    const name = (body.name || "").trim();
    const genericName = (body.genericName || name).trim();
    const drugClass = (body.drugClass || "General").trim();
    const dosage = (body.dosage || "").trim();
    const scheduledTimes =
      Array.isArray(body.scheduledTimes) && body.scheduledTimes.length > 0
        ? body.scheduledTimes
        : ["08:00"];
    const foodRule: FoodRule = body.foodRule || "ANYTIME";

    if (!name || !dosage) {
      return NextResponse.json(
        {
          success: false,
          error: "Medication name and dosage are required.",
        },
        { status: 400 }
      );
    }

    const vault = await prisma.careVault.findUnique({
      where: { id: session.vaultId },
      include: { medications: true },
    });

    if (!vault) {
      return NextResponse.json(
        { success: false, error: "CareVault not found." },
        { status: 404 }
      );
    }

    const existingSummaries: ExistingMedicationSummary[] =
      vault.medications.map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        drugClass: m.drugClass,
        dosage: m.dosage,
        scheduledTimes: safeParseJsonArray<string>(m.scheduledTimes, []),
        foodRule: m.foodRule,
        status: m.status,
      }));

    // RULE-CLIN-02: Mandatory Polypharmacy Evaluation
    const evaluation = evaluatePolypharmacyConflicts(
      {
        name,
        genericName,
        drugClass,
        dosage,
        scheduledTimes,
        foodRule,
      },
      existingSummaries
    );

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          evaluation,
          stagedForElderApproval:
            vault.requireElderApproval && session.role !== "ELDER_SOVEREIGN",
        },
      });
    }

    const requiresOverride = evaluation.conflicts.some(
      (c) => c.requiresExplicitOverride
    );

    if (requiresOverride && !body.overrideConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "High-severity polypharmacy interaction detected (RULE-CLIN-02). Please review the clinical contraindication warning and acknowledge explicit physician override before submitting.",
          data: {
            evaluation,
            stagedForElderApproval:
              vault.requireElderApproval && session.role !== "ELDER_SOVEREIGN",
          },
        },
        { status: 422 }
      );
    }

    // RULE-DIGNITY-01: No Silent Schedule Overwrites when requireElderApproval is true
    const mustAwaitElderApproval =
      vault.requireElderApproval && session.role !== "ELDER_SOVEREIGN";

    const medStatus = mustAwaitElderApproval
      ? "PENDING_ELDER_APPROVAL"
      : "ACTIVE";

    const frequency: MedFrequency = body.frequency || "DAILY";
    const pillShape: PillShape = body.pillShape || "OVAL";
    const pillColorPrimary = body.pillColorPrimary || "#38BDF8";
    const pillColorSecondary = body.pillColorSecondary || "#E0F2FE";
    const pillImprint = (body.pillImprint || name.slice(0, 4).toUpperCase()).trim();
    const instructions =
      (body.instructions || "").trim() ||
      `Take ${dosage} at ${scheduledTimes.join(", ")}.`;
    const proposalReason =
      (body.proposalReason || "").trim() ||
      `Recommended addition to your daily care routine by ${session.name}.`;

    const createdMed = await prisma.medication.create({
      data: {
        vaultId: vault.id,
        name,
        genericName,
        drugClass,
        dosage,
        frequency,
        scheduledTimes: JSON.stringify(scheduledTimes),
        foodRule,
        instructions,
        pillShape,
        pillColorPrimary,
        pillColorSecondary,
        pillImprint,
        stockCount: body.stockCount ?? 30,
        refillThreshold: body.refillThreshold ?? 7,
        status: medStatus,
        proposedByMemberId: session.memberId,
        proposalReason,
      },
    });

    let createdProposalId: string | undefined;

    if (mustAwaitElderApproval) {
      const plainSummary = `${session.name} (${session.relationship}) proposed adding ${name} ${dosage} at ${scheduledTimes.join(
        ", "
      )} (${foodRule.replace("_", " ").toLowerCase()}) because: "${proposalReason}"`;

      const proposal = await prisma.scheduleProposal.create({
        data: {
          vaultId: vault.id,
          medicationId: createdMed.id,
          actionType: "ADD_MED",
          proposedPayload: JSON.stringify({
            name,
            genericName,
            drugClass,
            dosage,
            frequency,
            scheduledTimes,
            foodRule,
            pillShape,
            pillColorPrimary,
            pillColorSecondary,
            pillImprint,
          }),
          plainEnglishSummary: plainSummary,
          proposedByName: `${session.name} (${session.relationship})`,
          status: "PENDING",
        },
      });
      createdProposalId = proposal.id;

      await dispatchProposalNoticeEmail({
        vaultId: vault.id,
        elderName: vault.elderName,
        elderEmail: vault.elderEmail,
        proposedByName: `${session.name} (${session.relationship})`,
        plainEnglishSummary: plainSummary,
        conflictWarningSummary:
          evaluation.conflicts.length > 0
            ? evaluation.conflicts.map((c) => c.title).join("; ")
            : undefined,
      });
    } else {
      await ensureTodayDoseLogs(vault.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluation,
        stagedForElderApproval: mustAwaitElderApproval,
        medication: {
          id: createdMed.id,
          name: createdMed.name,
          dosage: createdMed.dosage,
          status: createdMed.status,
        },
        proposalId: createdProposalId,
      },
    });
  } catch (err) {
    console.error("[POST /api/medications] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save medication." },
      { status: 500 }
    );
  }
}
