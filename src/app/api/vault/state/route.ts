import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { ensureTodayDoseLogs } from "@/lib/bootstrap";
import { ApiEnvelope, safeParseJsonArray, SessionPayload } from "@/lib/types";

export interface VaultStatePayload {
  session: SessionPayload;
  vault: {
    id: string;
    vaultCode: string;
    elderName: string;
    elderAge: number;
    elderEmail: string;
    bloodType: string;
    allergies: string[];
    primaryPhysician: string;
    physicianPhone: string;
    shareSymptomNotes: boolean;
    requireElderApproval: boolean;
    autoEscalateMissed: boolean;
  };
  members: Array<{
    id: string;
    name: string;
    relationship: string;
    role: string;
    email: string;
    receiveEscalations: boolean;
  }>;
  medications: Array<{
    id: string;
    name: string;
    genericName: string;
    drugClass: string;
    dosage: string;
    frequency: string;
    scheduledTimes: string[];
    foodRule: string;
    instructions: string;
    pillShape: string;
    pillColorPrimary: string;
    pillColorSecondary: string;
    pillImprint: string;
    stockCount: number;
    refillThreshold: number;
    status: string;
    proposalReason: string | null;
  }>;
  todayDoses: Array<{
    id: string;
    medicationId: string;
    scheduledFor: string;
    status: string;
    loggedAt: string | null;
    loggedByMemberId: string | null;
    loggedByName: string | null;
    lockVersion: number;
    note: string | null;
    escalationTierSent: number;
    medication: {
      id: string;
      name: string;
      genericName: string;
      drugClass: string;
      dosage: string;
      foodRule: string;
      instructions: string;
      pillShape: string;
      pillColorPrimary: string;
      pillColorSecondary: string;
      pillImprint: string;
      stockCount: number;
    };
  }>;
  adherenceSummary: {
    trailing30DayPercent: number;
    takenCount: number;
    missedOrSkippedCount: number;
    totalEvaluated: number;
    dailyHeatmap: Array<{
      dateStr: string;
      label: string;
      taken: number;
      total: number;
      adherenceRate: number;
    }>;
  };
  pendingProposals: Array<{
    id: string;
    medicationId: string | null;
    actionType: string;
    proposedPayload: string;
    plainEnglishSummary: string;
    proposedByName: string;
    status: string;
    elderResponseNote: string | null;
    createdAt: string;
  }>;
  appointments: Array<{
    id: string;
    doctorName: string;
    specialty: string;
    clinicLocation: string;
    appointmentDate: string;
    purpose: string;
    escortMemberName: string;
    elderQuestions: string[];
    prepEmailSent: boolean;
    status: string;
  }>;
  wellnessCheckIns: Array<{
    id: string;
    mood: string;
    bloodPressureSystolic: number | null;
    bloodPressureDiastolic: number | null;
    note: string | null;
    createdAt: string;
  }>;
  emailOutboxCount: number;
}

export async function GET(): Promise<
  NextResponse<ApiEnvelope<VaultStatePayload>>
> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No active CareVault session." },
        { status: 401 }
      );
    }

    await ensureTodayDoseLogs(session.vaultId);

    const vault = await prisma.careVault.findUnique({
      where: { id: session.vaultId },
      include: {
        members: {
          orderBy: { name: "asc" },
        },
        medications: {
          orderBy: { name: "asc" },
        },
        scheduleProposals: {
          orderBy: { createdAt: "desc" },
        },
        appointments: {
          orderBy: { appointmentDate: "asc" },
        },
        wellnessCheckIns: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!vault) {
      return NextResponse.json(
        { success: false, error: "CareVault not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayDoseRecords = await prisma.doseLog.findMany({
      where: {
        vaultId: vault.id,
        scheduledFor: {
          gte: startOfDay,
          lte: endOfDay,
        },
        medication: {
          status: "ACTIVE",
        },
      },
      include: {
        medication: true,
      },
      orderBy: {
        scheduledFor: "asc",
      },
    });

    // Compute 30-day adherence & 14-day heatmap
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const historicalLogs = await prisma.doseLog.findMany({
      where: {
        vaultId: vault.id,
        scheduledFor: { gte: thirtyDaysAgo },
        status: { in: ["TAKEN", "MISSED", "SKIPPED"] },
      },
      orderBy: { scheduledFor: "asc" },
    });

    const takenCount = historicalLogs.filter(
      (d) => d.status === "TAKEN"
    ).length;
    const missedOrSkippedCount = historicalLogs.filter(
      (d) => d.status === "MISSED" || d.status === "SKIPPED"
    ).length;
    const totalEvaluated = historicalLogs.length;
    const trailing30DayPercent =
      totalEvaluated > 0 ? Math.round((takenCount / totalEvaluated) * 100) : 100;

    const dailyHeatmap: VaultStatePayload["adherenceSummary"]["dailyHeatmap"] =
      [];
    for (let offset = -13; offset <= 0; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const dayKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });

      const logsForDay = historicalLogs.filter(
        (l) => l.scheduledFor.toISOString().slice(0, 10) === dayKey
      );
      const dayTaken = logsForDay.filter((l) => l.status === "TAKEN").length;
      const dayTotal = logsForDay.length;
      const adherenceRate =
        dayTotal > 0 ? Math.round((dayTaken / dayTotal) * 100) : 100;

      dailyHeatmap.push({
        dateStr: dayKey,
        label,
        taken: dayTaken,
        total: dayTotal,
        adherenceRate,
      });
    }

    const emailOutboxCount = await prisma.emailDispatchLog.count({
      where: { vaultId: vault.id },
    });

    // RULE-DIGNITY-02: Sovereign Privacy Enforcement
    // If CareVault.shareSymptomNotes is false and the caller is not ELDER_SOVEREIGN, strip subjective mood and free-text symptom notes
    const shouldRedactSymptoms =
      !vault.shareSymptomNotes && session.role !== "ELDER_SOVEREIGN";

    const sanitizedWellness = vault.wellnessCheckIns.map((w) => ({
      id: w.id,
      mood: shouldRedactSymptoms ? "PRIVATE" : w.mood,
      bloodPressureSystolic: w.bloodPressureSystolic,
      bloodPressureDiastolic: w.bloodPressureDiastolic,
      note: shouldRedactSymptoms
        ? "Protected by Elder Sovereign Privacy Settings"
        : w.note,
      createdAt: w.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        session,
        vault: {
          id: vault.id,
          vaultCode: vault.vaultCode,
          elderName: vault.elderName,
          elderAge: vault.elderAge,
          elderEmail: vault.elderEmail,
          bloodType: vault.bloodType,
          allergies: safeParseJsonArray<string>(vault.allergies, []),
          primaryPhysician: vault.primaryPhysician,
          physicianPhone: vault.physicianPhone,
          shareSymptomNotes: vault.shareSymptomNotes,
          requireElderApproval: vault.requireElderApproval,
          autoEscalateMissed: vault.autoEscalateMissed,
        },
        members: vault.members.map((m) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship,
          role: m.role,
          email: m.email,
          receiveEscalations: m.receiveEscalations,
        })),
        medications: vault.medications.map((m) => ({
          id: m.id,
          name: m.name,
          genericName: m.genericName,
          drugClass: m.drugClass,
          dosage: m.dosage,
          frequency: m.frequency,
          scheduledTimes: safeParseJsonArray<string>(m.scheduledTimes, []),
          foodRule: m.foodRule,
          instructions: m.instructions,
          pillShape: m.pillShape,
          pillColorPrimary: m.pillColorPrimary,
          pillColorSecondary: m.pillColorSecondary,
          pillImprint: m.pillImprint,
          stockCount: m.stockCount,
          refillThreshold: m.refillThreshold,
          status: m.status,
          proposalReason: m.proposalReason,
        })),
        todayDoses: todayDoseRecords.map((d) => ({
          id: d.id,
          medicationId: d.medicationId,
          scheduledFor: d.scheduledFor.toISOString(),
          status: d.status,
          loggedAt: d.loggedAt ? d.loggedAt.toISOString() : null,
          loggedByMemberId: d.loggedByMemberId,
          loggedByName: d.loggedByName,
          lockVersion: d.lockVersion,
          note: d.note,
          escalationTierSent: d.escalationTierSent,
          medication: {
            id: d.medication.id,
            name: d.medication.name,
            genericName: d.medication.genericName,
            drugClass: d.medication.drugClass,
            dosage: d.medication.dosage,
            foodRule: d.medication.foodRule,
            instructions: d.medication.instructions,
            pillShape: d.medication.pillShape,
            pillColorPrimary: d.medication.pillColorPrimary,
            pillColorSecondary: d.medication.pillColorSecondary,
            pillImprint: d.medication.pillImprint,
            stockCount: d.medication.stockCount,
          },
        })),
        adherenceSummary: {
          trailing30DayPercent,
          takenCount,
          missedOrSkippedCount,
          totalEvaluated,
          dailyHeatmap,
        },
        pendingProposals: vault.scheduleProposals.map((p) => ({
          id: p.id,
          medicationId: p.medicationId,
          actionType: p.actionType,
          proposedPayload: p.proposedPayload,
          plainEnglishSummary: p.plainEnglishSummary,
          proposedByName: p.proposedByName,
          status: p.status,
          elderResponseNote: p.elderResponseNote,
          createdAt: p.createdAt.toISOString(),
        })),
        appointments: vault.appointments.map((a) => ({
          id: a.id,
          doctorName: a.doctorName,
          specialty: a.specialty,
          clinicLocation: a.clinicLocation,
          appointmentDate: a.appointmentDate.toISOString(),
          purpose: a.purpose,
          escortMemberName: a.escortMemberName,
          elderQuestions: safeParseJsonArray<string>(a.elderQuestions, []),
          prepEmailSent: a.prepEmailSent,
          status: a.status,
        })),
        wellnessCheckIns: sanitizedWellness,
        emailOutboxCount,
      },
    });
  } catch (err) {
    console.error("[GET /api/vault/state] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load CareVault state." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest
): Promise<
  NextResponse<
    ApiEnvelope<{
      shareSymptomNotes: boolean;
      requireElderApproval: boolean;
      autoEscalateMissed: boolean;
    }>
  >
> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // RULE-SEC-03: Server-Side Role Enforcement — only ELDER_SOVEREIGN may update privacy & autonomy toggles
    if (session.role !== "ELDER_SOVEREIGN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden (RULE-SEC-03): Only the Elder Sovereign may modify personal privacy and autonomy settings.",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      shareSymptomNotes?: boolean;
      requireElderApproval?: boolean;
      autoEscalateMissed?: boolean;
    };

    const updated = await prisma.careVault.update({
      where: { id: session.vaultId },
      data: {
        ...(typeof body.shareSymptomNotes === "boolean"
          ? { shareSymptomNotes: body.shareSymptomNotes }
          : {}),
        ...(typeof body.requireElderApproval === "boolean"
          ? { requireElderApproval: body.requireElderApproval }
          : {}),
        ...(typeof body.autoEscalateMissed === "boolean"
          ? { autoEscalateMissed: body.autoEscalateMissed }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        shareSymptomNotes: updated.shareSymptomNotes,
        requireElderApproval: updated.requireElderApproval,
        autoEscalateMissed: updated.autoEscalateMissed,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/vault/state] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update sovereignty settings." },
      { status: 500 }
    );
  }
}
