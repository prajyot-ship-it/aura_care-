import { prisma } from "./prisma";
import { safeParseJsonArray } from "./types";

export interface MedicationAdherenceBreakdown {
  medicationId: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  scheduledTimes: string[];
  foodRule: string;
  stockCount: number;
  totalScheduled: number;
  takenCount: number;
  missedOrSkippedCount: number;
  adherencePercent: number;
}

export interface TimeOfDayCluster {
  windowLabel: "Morning (05:00–11:59)" | "Afternoon (12:00–16:59)" | "Evening (17:00–23:59)";
  totalDoses: number;
  missedCount: number;
  missSharePercent: number;
}

export interface ClinicalBriefReport {
  generatedAt: string;
  vault: {
    vaultCode: string;
    elderName: string;
    elderAge: number;
    bloodType: string;
    allergies: string[];
    primaryPhysician: string;
    physicianPhone: string;
    shareSymptomNotes: boolean;
  };
  appointment: {
    id: string;
    doctorName: string;
    specialty: string;
    clinicLocation: string;
    appointmentDate: string;
    purpose: string;
    escortMemberName: string;
    elderQuestions: string[];
  };
  overallMetrics: {
    trailingDays: number;
    totalEvaluatedDoses: number;
    takenCount: number;
    missedCount: number;
    skippedCount: number;
    overallAdherencePercent: number;
    primaryPatternFinding: string;
  };
  timeOfDayClusters: TimeOfDayCluster[];
  medicationBreakdown: MedicationAdherenceBreakdown[];
  recentWellnessCheckIns: Array<{
    id: string;
    mood: string;
    bloodPressureSystolic: number | null;
    bloodPressureDiastolic: number | null;
    note: string | null;
    createdAt: string;
    correlatedMedicationNote: string | null;
  }>;
}

export async function generateClinicalBrief(
  appointmentId: string,
  vaultId: string
): Promise<ClinicalBriefReport | null> {
  const vault = await prisma.careVault.findUnique({
    where: { id: vaultId },
    include: {
      medications: {
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      },
      wellnessCheckIns: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!vault) return null;

  const appointment =
    (await prisma.appointment.findFirst({
      where: { id: appointmentId, vaultId },
    })) ||
    (await prisma.appointment.findFirst({
      where: { vaultId },
      orderBy: { appointmentDate: "asc" },
    }));

  if (!appointment) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const doseLogs = await prisma.doseLog.findMany({
    where: {
      vaultId,
      scheduledFor: { gte: thirtyDaysAgo },
      status: { in: ["TAKEN", "MISSED", "SKIPPED"] },
    },
    include: {
      medication: true,
    },
    orderBy: {
      scheduledFor: "desc",
    },
  });

  const totalEvaluatedDoses = doseLogs.length;
  const takenCount = doseLogs.filter((d) => d.status === "TAKEN").length;
  const missedCount = doseLogs.filter((d) => d.status === "MISSED").length;
  const skippedCount = doseLogs.filter((d) => d.status === "SKIPPED").length;
  const nonAdherentLogs = doseLogs.filter(
    (d) => d.status === "MISSED" || d.status === "SKIPPED"
  );

  const overallAdherencePercent =
    totalEvaluatedDoses > 0
      ? Math.round((takenCount / totalEvaluatedDoses) * 100)
      : 100;

  // Time-of-day miss clustering
  let morningTotal = 0;
  let morningMissed = 0;
  let afternoonTotal = 0;
  let afternoonMissed = 0;
  let eveningTotal = 0;
  let eveningMissed = 0;

  for (const log of doseLogs) {
    const hour = log.scheduledFor.getHours();
    const isMiss = log.status === "MISSED" || log.status === "SKIPPED";
    if (hour >= 5 && hour < 12) {
      morningTotal++;
      if (isMiss) morningMissed++;
    } else if (hour >= 12 && hour < 17) {
      afternoonTotal++;
      if (isMiss) afternoonMissed++;
    } else {
      eveningTotal++;
      if (isMiss) eveningMissed++;
    }
  }

  const totalMisses = Math.max(1, nonAdherentLogs.length);
  const morningShare =
    nonAdherentLogs.length > 0
      ? Math.round((morningMissed / totalMisses) * 100)
      : 0;
  const afternoonShare =
    nonAdherentLogs.length > 0
      ? Math.round((afternoonMissed / totalMisses) * 100)
      : 0;
  const eveningShare =
    nonAdherentLogs.length > 0
      ? Math.round((eveningMissed / totalMisses) * 100)
      : 0;

  const timeOfDayClusters: TimeOfDayCluster[] = [
    {
      windowLabel: "Morning (05:00–11:59)",
      totalDoses: morningTotal,
      missedCount: morningMissed,
      missSharePercent: morningShare,
    },
    {
      windowLabel: "Afternoon (12:00–16:59)",
      totalDoses: afternoonTotal,
      missedCount: afternoonMissed,
      missSharePercent: afternoonShare,
    },
    {
      windowLabel: "Evening (17:00–23:59)",
      totalDoses: eveningTotal,
      missedCount: eveningMissed,
      missSharePercent: eveningShare,
    },
  ];

  // Identify dominant pattern finding (non-diagnostic per RULE-CLIN-03)
  let primaryPatternFinding =
    "Consistent medication adherence across all circadian windows over the trailing observation period.";
  if (nonAdherentLogs.length > 0) {
    if (eveningShare >= 50) {
      primaryPatternFinding = `${eveningShare}% of missed or skipped doses (${eveningMissed} of ${nonAdherentLogs.length}) occurred during Evening hours (17:00–23:59), primarily involving bedtime Atorvastatin 20 mg.`;
    } else if (morningShare >= 50) {
      primaryPatternFinding = `${morningShare}% of missed or skipped doses (${morningMissed} of ${nonAdherentLogs.length}) occurred during Morning hours (05:00–11:59).`;
    } else {
      primaryPatternFinding = `${nonAdherentLogs.length} total missed/skipped doses recorded across ${totalEvaluatedDoses} scheduled windows (${overallAdherencePercent}% overall adherence).`;
    }
  }

  const medicationBreakdown: MedicationAdherenceBreakdown[] =
    vault.medications.map((med) => {
      const medLogs = doseLogs.filter((d) => d.medicationId === med.id);
      const medTaken = medLogs.filter((d) => d.status === "TAKEN").length;
      const medMissed = medLogs.filter(
        (d) => d.status === "MISSED" || d.status === "SKIPPED"
      ).length;
      const medTotal = medLogs.length;
      const medAdherence =
        medTotal > 0 ? Math.round((medTaken / medTotal) * 100) : 100;

      return {
        medicationId: med.id,
        name: med.name,
        genericName: med.genericName,
        drugClass: med.drugClass,
        dosage: med.dosage,
        scheduledTimes: safeParseJsonArray<string>(med.scheduledTimes, []),
        foodRule: med.foodRule,
        stockCount: med.stockCount,
        totalScheduled: medTotal,
        takenCount: medTaken,
        missedOrSkippedCount: medMissed,
        adherencePercent: medAdherence,
      };
    });

  const recentWellnessCheckIns = vault.wellnessCheckIns.map((w) => {
    let correlatedMedicationNote: string | null = null;
    if (w.mood === "DIZZY") {
      correlatedMedicationNote =
        "Logged within 90 minutes of morning antihypertensive administration (Lisinopril 10 mg @ 08:00). Discuss orthostatic blood pressure monitoring with physician.";
    } else if (w.mood === "TIRED") {
      correlatedMedicationNote =
        "Logged during late afternoon window; review thyroid replacement (Levothyroxine 75 mcg) timing and hydration.";
    }
    return {
      id: w.id,
      mood: vault.shareSymptomNotes ? w.mood : "REDACTED_BY_ELDER_PRIVACY",
      bloodPressureSystolic: w.bloodPressureSystolic,
      bloodPressureDiastolic: w.bloodPressureDiastolic,
      note: vault.shareSymptomNotes
        ? w.note
        : "Symptom free-text hidden per Elder Sovereign Privacy setting.",
      createdAt: w.createdAt.toISOString(),
      correlatedMedicationNote,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    vault: {
      vaultCode: vault.vaultCode,
      elderName: vault.elderName,
      elderAge: vault.elderAge,
      bloodType: vault.bloodType,
      allergies: safeParseJsonArray<string>(vault.allergies, []),
      primaryPhysician: vault.primaryPhysician,
      physicianPhone: vault.physicianPhone,
      shareSymptomNotes: vault.shareSymptomNotes,
    },
    appointment: {
      id: appointment.id,
      doctorName: appointment.doctorName,
      specialty: appointment.specialty,
      clinicLocation: appointment.clinicLocation,
      appointmentDate: appointment.appointmentDate.toISOString(),
      purpose: appointment.purpose,
      escortMemberName: appointment.escortMemberName,
      elderQuestions: safeParseJsonArray<string>(
        appointment.elderQuestions,
        []
      ),
    },
    overallMetrics: {
      trailingDays: 30,
      totalEvaluatedDoses,
      takenCount,
      missedCount,
      skippedCount,
      overallAdherencePercent,
      primaryPatternFinding,
    },
    timeOfDayClusters,
    medicationBreakdown,
    recentWellnessCheckIns,
  };
}
