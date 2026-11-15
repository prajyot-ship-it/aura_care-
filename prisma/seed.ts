import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function buildDateWithTime(dayOffset: number, hhmm: string): Date {
  const [hStr, mStr] = hhmm.split(":");
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(Number(hStr), Number(mStr), 0, 0);
  return d;
}

export async function seedDatabase() {
  const vaultCode = "AURA-7842";

  // Idempotent cleanup of existing AURA-7842 vault so seed can be safely re-run
  const existing = await prisma.careVault.findUnique({
    where: { vaultCode },
  });
  if (existing) {
    await prisma.careVault.delete({
      where: { id: existing.id },
    });
  }

  const [arthurHash, mayaHash, davidHash] = await Promise.all([
    bcrypt.hash("111111", 10),
    bcrypt.hash("222222", 10),
    bcrypt.hash("333333", 10),
  ]);

  const vault = await prisma.careVault.create({
    data: {
      vaultCode,
      elderName: "Arthur Pendelton",
      elderAge: 78,
      elderEmail: "arthur.pendelton@example.com",
      bloodType: "O+",
      allergies: JSON.stringify(["Penicillin", "Sulfa drugs"]),
      primaryPhysician: "Dr. Elena Vance (Cardiology)",
      physicianPhone: "(555) 234-8910",
      shareSymptomNotes: true,
      requireElderApproval: true,
      autoEscalateMissed: true,
    },
  });

  const [arthurMember, mayaMember, davidMember] = await Promise.all([
    prisma.careMember.create({
      data: {
        vaultId: vault.id,
        name: "Arthur Pendelton",
        relationship: "Self",
        role: "ELDER_SOVEREIGN",
        email: "arthur.pendelton@example.com",
        passcodeHash: arthurHash,
        receiveEscalations: true,
      },
    }),
    prisma.careMember.create({
      data: {
        vaultId: vault.id,
        name: "Maya Pendelton",
        relationship: "Daughter",
        role: "PRIMARY_CARETAKER",
        email: "maya.pendelton@example.com",
        passcodeHash: mayaHash,
        receiveEscalations: true,
      },
    }),
    prisma.careMember.create({
      data: {
        vaultId: vault.id,
        name: "David Ortiz, RN",
        relationship: "Home RN",
        role: "FAMILY_MEMBER",
        email: "david.ortiz.rn@example.com",
        passcodeHash: davidHash,
        receiveEscalations: true,
      },
    }),
  ]);

  // Create 4 Active Medications + 1 Pending Elder Approval Medication
  const eliquis = await prisma.medication.create({
    data: {
      vaultId: vault.id,
      name: "Eliquis",
      genericName: "Apixaban",
      drugClass: "Anticoagulant",
      dosage: "5 mg",
      frequency: "TWICE_DAILY",
      scheduledTimes: JSON.stringify(["08:00", "20:00"]),
      foodRule: "ANYTIME",
      instructions:
        "For stroke prevention and steady blood circulation. Take one pink oval tablet morning and evening with water.",
      pillShape: "OVAL",
      pillColorPrimary: "#F472B6",
      pillColorSecondary: "#FBCFE8",
      pillImprint: "894",
      stockCount: 28,
      refillThreshold: 10,
      status: "ACTIVE",
    },
  });

  const lisinopril = await prisma.medication.create({
    data: {
      vaultId: vault.id,
      name: "Lisinopril",
      genericName: "Lisinopril",
      drugClass: "ACE Inhibitor (Blood Pressure)",
      dosage: "10 mg",
      frequency: "DAILY",
      scheduledTimes: JSON.stringify(["08:00"]),
      foodRule: "WITH_FOOD",
      instructions:
        "For steady blood pressure. Take with breakfast. Stand up slowly from chairs or bed.",
      pillShape: "ROUND",
      pillColorPrimary: "#F8FAFC",
      pillColorSecondary: "#CBD5E1",
      pillImprint: "L10",
      stockCount: 6, // Low stock to demonstrate refill warning badge!
      refillThreshold: 7,
      status: "ACTIVE",
    },
  });

  const levothyroxine = await prisma.medication.create({
    data: {
      vaultId: vault.id,
      name: "Levothyroxine",
      genericName: "Levothyroxine Sodium",
      drugClass: "Thyroid Hormone",
      dosage: "75 mcg",
      frequency: "DAILY",
      scheduledTimes: JSON.stringify(["06:30"]),
      foodRule: "EMPTY_STOMACH",
      instructions:
        "For thyroid energy balance. Take 30-60 mins before breakfast with water; keep 4 hours apart from Calcium or Iron.",
      pillShape: "CAPSULE",
      pillColorPrimary: "#38BDF8",
      pillColorSecondary: "#E0F2FE",
      pillImprint: "LV75",
      stockCount: 24,
      refillThreshold: 7,
      status: "ACTIVE",
    },
  });

  const atorvastatin = await prisma.medication.create({
    data: {
      vaultId: vault.id,
      name: "Atorvastatin",
      genericName: "Atorvastatin Calcium",
      drugClass: "Statin (Cholesterol)",
      dosage: "20 mg",
      frequency: "DAILY",
      scheduledTimes: JSON.stringify(["21:00"]),
      foodRule: "BEFORE_SLEEP",
      instructions:
        "For healthy cholesterol levels. Take one white oval tablet in the evening before sleep.",
      pillShape: "OVAL",
      pillColorPrimary: "#FFFFFF",
      pillColorSecondary: "#CBD5E1",
      pillImprint: "ATV20",
      stockCount: 19,
      refillThreshold: 7,
      status: "ACTIVE",
    },
  });

  const vitaminD3 = await prisma.medication.create({
    data: {
      vaultId: vault.id,
      name: "Vitamin D3",
      genericName: "Cholecalciferol",
      drugClass: "Vitamin Supplement",
      dosage: "2000 IU",
      frequency: "DAILY",
      scheduledTimes: JSON.stringify(["12:30"]),
      foodRule: "WITH_FOOD",
      instructions:
        "For bone strength and immune support. Take with lunch alongside healthy fats.",
      pillShape: "CAPSULE",
      pillColorPrimary: "#F59E0B",
      pillColorSecondary: "#FDE68A",
      pillImprint: "D3-2K",
      stockCount: 60,
      refillThreshold: 10,
      status: "PENDING_ELDER_APPROVAL",
      proposedByMemberId: mayaMember.id,
      proposalReason:
        "Dr. Vance's nurse recommended starting Vitamin D3 after last week's blood panel.",
    },
  });

  // Create Pending ScheduleProposal for Vitamin D3
  await prisma.scheduleProposal.create({
    data: {
      vaultId: vault.id,
      medicationId: vitaminD3.id,
      actionType: "ADD_MED",
      proposedPayload: JSON.stringify({
        name: "Vitamin D3",
        genericName: "Cholecalciferol",
        drugClass: "Vitamin Supplement",
        dosage: "2000 IU",
        frequency: "DAILY",
        scheduledTimes: ["12:30"],
        foodRule: "WITH_FOOD",
        pillShape: "CAPSULE",
        pillColorPrimary: "#F59E0B",
        pillColorSecondary: "#FDE68A",
        pillImprint: "D3-2K",
      }),
      plainEnglishSummary:
        "Maya proposed adding Vitamin D3 2000 IU with lunch (12:30 PM) because Dr. Vance's nurse recommended starting Vitamin D3 after last week's blood panel showed low levels.",
      proposedByName: "Maya Pendelton (Daughter)",
      status: "PENDING",
    },
  });

  // Seed 14 trailing days of DoseLog history (~88% adherence, with evening misses on Atorvastatin)
  const doseEntries: Array<{
    medicationId: string;
    vaultId: string;
    scheduledFor: Date;
    status: string;
    loggedAt: Date | null;
    loggedByMemberId: string | null;
    loggedByName: string | null;
    lockVersion: number;
    note: string | null;
    escalationTierSent: number;
  }> = [];

  for (let dayOffset = -14; dayOffset <= -1; dayOffset++) {
    // 06:30 Levothyroxine (100% taken)
    const levoTime = buildDateWithTime(dayOffset, "06:30");
    doseEntries.push({
      medicationId: levothyroxine.id,
      vaultId: vault.id,
      scheduledFor: levoTime,
      status: "TAKEN",
      loggedAt: new Date(levoTime.getTime() + 4 * 60000),
      loggedByMemberId: arthurMember.id,
      loggedByName: "Arthur Pendelton",
      lockVersion: 1,
      note: null,
      escalationTierSent: 1,
    });

    // 08:00 Lisinopril (missed/skipped once on day -4 due to mild dizziness)
    const lisiTime = buildDateWithTime(dayOffset, "08:00");
    const isLisiSkipped = dayOffset === -4;
    doseEntries.push({
      medicationId: lisinopril.id,
      vaultId: vault.id,
      scheduledFor: lisiTime,
      status: isLisiSkipped ? "SKIPPED" : "TAKEN",
      loggedAt: new Date(lisiTime.getTime() + 8 * 60000),
      loggedByMemberId: isLisiSkipped ? arthurMember.id : davidMember.id,
      loggedByName: isLisiSkipped ? "Arthur Pendelton" : "David Ortiz, RN",
      lockVersion: 1,
      note: isLisiSkipped
        ? "Skipped by Arthur: Felt slightly dizzy upon waking"
        : "Confirmed with breakfast",
      escalationTierSent: 1,
    });

    // 08:00 Eliquis Morning (100% taken)
    const eliqAmTime = buildDateWithTime(dayOffset, "08:00");
    doseEntries.push({
      medicationId: eliquis.id,
      vaultId: vault.id,
      scheduledFor: eliqAmTime,
      status: "TAKEN",
      loggedAt: new Date(eliqAmTime.getTime() + 6 * 60000),
      loggedByMemberId: arthurMember.id,
      loggedByName: "Arthur Pendelton",
      lockVersion: 1,
      note: null,
      escalationTierSent: 1,
    });

    // 20:00 Eliquis Evening (missed once on day -9)
    const eliqPmTime = buildDateWithTime(dayOffset, "20:00");
    const isEliqPmMissed = dayOffset === -9;
    doseEntries.push({
      medicationId: eliquis.id,
      vaultId: vault.id,
      scheduledFor: eliqPmTime,
      status: isEliqPmMissed ? "MISSED" : "TAKEN",
      loggedAt: isEliqPmMissed
        ? null
        : new Date(eliqPmTime.getTime() + 10 * 60000),
      loggedByMemberId: isEliqPmMissed ? null : arthurMember.id,
      loggedByName: isEliqPmMissed ? null : "Arthur Pendelton",
      lockVersion: isEliqPmMissed ? 0 : 1,
      note: isEliqPmMissed ? "Fell asleep early in armchair" : null,
      escalationTierSent: isEliqPmMissed ? 2 : 1,
    });

    // 21:00 Atorvastatin (missed on days -12, -8, -5, -2 -> strong evening miss pattern!)
    const atorTime = buildDateWithTime(dayOffset, "21:00");
    const isAtorMissed = [-12, -8, -5, -2].includes(dayOffset);
    doseEntries.push({
      medicationId: atorvastatin.id,
      vaultId: vault.id,
      scheduledFor: atorTime,
      status: isAtorMissed ? "MISSED" : "TAKEN",
      loggedAt: isAtorMissed ? null : new Date(atorTime.getTime() + 5 * 60000),
      loggedByMemberId: isAtorMissed ? null : arthurMember.id,
      loggedByName: isAtorMissed ? null : "Arthur Pendelton",
      lockVersion: isAtorMissed ? 0 : 1,
      note: isAtorMissed
        ? "Missed evening bedtime window (9:00 PM fatigue)"
        : null,
      escalationTierSent: isAtorMissed ? 2 : 1,
    });
  }

  // Seed TODAY's doses:
  // 1. 06:30 Levothyroxine -> Already TAKEN & LOCKED by David Ortiz, RN (demonstrates Mutex Lock badge immediately)
  const todayLevo = buildDateWithTime(0, "06:30");
  doseEntries.push({
    medicationId: levothyroxine.id,
    vaultId: vault.id,
    scheduledFor: todayLevo,
    status: "TAKEN",
    loggedAt: new Date(todayLevo.getTime() + 4 * 60000),
    loggedByMemberId: davidMember.id,
    loggedByName: "David Ortiz, RN",
    lockVersion: 1,
    note: "Administered with water 45 mins before breakfast",
    escalationTierSent: 1,
  });

  // 2. 08:00 Lisinopril -> PENDING (overdue morning dose ready to test Tier 2 / Tier 3 escalation & Mutex Lock)
  const todayLisi = buildDateWithTime(0, "08:00");
  doseEntries.push({
    medicationId: lisinopril.id,
    vaultId: vault.id,
    scheduledFor: todayLisi,
    status: "PENDING",
    loggedAt: null,
    loggedByMemberId: null,
    loggedByName: null,
    lockVersion: 0,
    note: null,
    escalationTierSent: 1,
  });

  // 3. 08:00 Eliquis Morning -> PENDING
  const todayEliqAm = buildDateWithTime(0, "08:00");
  doseEntries.push({
    medicationId: eliquis.id,
    vaultId: vault.id,
    scheduledFor: todayEliqAm,
    status: "PENDING",
    loggedAt: null,
    loggedByMemberId: null,
    loggedByName: null,
    lockVersion: 0,
    note: null,
    escalationTierSent: 1,
  });

  // 4. 20:00 Eliquis Evening -> PENDING
  const todayEliqPm = buildDateWithTime(0, "20:00");
  doseEntries.push({
    medicationId: eliquis.id,
    vaultId: vault.id,
    scheduledFor: todayEliqPm,
    status: "PENDING",
    loggedAt: null,
    loggedByMemberId: null,
    loggedByName: null,
    lockVersion: 0,
    note: null,
    escalationTierSent: 0,
  });

  // 5. 21:00 Atorvastatin Evening -> PENDING
  const todayAtor = buildDateWithTime(0, "21:00");
  doseEntries.push({
    medicationId: atorvastatin.id,
    vaultId: vault.id,
    scheduledFor: todayAtor,
    status: "PENDING",
    loggedAt: null,
    loggedByMemberId: null,
    loggedByName: null,
    lockVersion: 0,
    note: null,
    escalationTierSent: 0,
  });

  await prisma.doseLog.createMany({
    data: doseEntries,
  });

  // Seed 3 Recent WellnessCheckIn entries
  const now = new Date();
  await prisma.wellnessCheckIn.createMany({
    data: [
      {
        vaultId: vault.id,
        mood: "DIZZY",
        bloodPressureSystolic: 112,
        bloodPressureDiastolic: 68,
        note: "Felt slightly lightheaded standing up from the breakfast table 1 hour after morning Lisinopril.",
        createdAt: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      },
      {
        vaultId: vault.id,
        mood: "OKAY",
        bloodPressureSystolic: 126,
        bloodPressureDiastolic: 76,
        note: "Slept 7 hours; mild morning stiffness in knees but steady energy.",
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
      {
        vaultId: vault.id,
        mood: "GREAT",
        bloodPressureSystolic: 122,
        bloodPressureDiastolic: 74,
        note: "Enjoyed afternoon walk in the neighborhood park with Maya.",
        createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      },
    ],
  });

  // Seed 1 Upcoming Cardiology Appointment in 36 hours with Dr. Elena Vance
  const apptDate = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  apptDate.setMinutes(30, 0, 0);

  await prisma.appointment.create({
    data: {
      vaultId: vault.id,
      doctorName: "Dr. Elena Vance, MD, FACC",
      specialty: "Cardiology & Geriatric Hypertension",
      clinicLocation: "St. Jude Heart & Vascular Institute, Suite 410",
      appointmentDate: apptDate,
      purpose:
        "Quarterly atrial fibrillation & blood pressure medication review; evaluate morning orthostatic dizziness and evening statin timing.",
      escortMemberName: "Maya Pendelton",
      elderQuestions: JSON.stringify([
        "Ask Dr. Vance if Lisinopril 10 mg could be making me dizzy when I stand up in the morning.",
        "Can I take my Atorvastatin 20 mg with dinner at 6:30 PM instead of 9:00 PM so I don't forget it at bedtime?",
      ]),
      prepEmailSent: false,
      status: "UPCOMING",
    },
  });

  // Seed 2 Initial EmailDispatchLog records so the Live Email Outbox Drawer has immediate inspectable content
  await prisma.emailDispatchLog.createMany({
    data: [
      {
        vaultId: vault.id,
        recipientEmail: "arthur.pendelton@example.com",
        recipientName: "Arthur Pendelton",
        tier: "PROPOSAL_NOTICE",
        subject:
          "[Dignity Co-Sign] Maya Pendelton proposed adding Vitamin D3 2000 IU for your review",
        htmlBody: `<div style="font-family: sans-serif; padding: 20px; background: #FAF8F5; border: 2px solid #1E40AF; border-radius: 12px;">
          <h3 style="color: #1E40AF; margin-top: 0;">Dignity Co-Sign Notice: Schedule Proposal Pending</h3>
          <p>Hello <strong>Arthur Pendelton</strong>,</p>
          <p><strong>Maya Pendelton (Daughter)</strong> proposed adding <strong>Vitamin D3 2000 IU</strong> at 12:30 PM with lunch:</p>
          <blockquote style="background: #EFF6FF; padding: 12px; border-left: 4px solid #1E40AF;">"Dr. Vance's nurse recommended starting Vitamin D3 after last week's blood panel."</blockquote>
          <p>Nothing on your medication timeline changes until you tap <strong>Approve</strong> or <strong>Hold for Dr. Vance</strong> in Elder Sovereign Mode.</p>
        </div>`,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        vaultId: vault.id,
        recipientEmail: "maya.pendelton@example.com",
        recipientName: "Maya Pendelton",
        tier: "UPCOMING_CUE",
        subject:
          "[Upcoming Dose T-15m] Lisinopril 10 mg & Eliquis 5 mg scheduled for 08:00 AM",
        htmlBody: `<div style="font-family: sans-serif; padding: 20px; background: #FAF8F5; border: 2px solid #046A38; border-radius: 12px;">
          <h3 style="color: #046A38; margin-top: 0;">Tier 1 Upcoming Dose Cue (T-15 Minutes)</h3>
          <p>Hello <strong>Maya Pendelton</strong>,</p>
          <p>Arthur Pendelton’s <strong>08:00 AM</strong> morning medications are coming up in 15 minutes:</p>
          <ul>
            <li><strong>Lisinopril 10 mg</strong> — Round white scored tablet (Imprint: L10) • Take with breakfast</li>
            <li><strong>Eliquis 5 mg</strong> — Oval pink tablet (Imprint: 894) • Take with water</li>
          </ul>
        </div>`,
        createdAt: new Date(now.getTime() - 45 * 60 * 1000),
      },
    ],
  });

  return vault;
}

if (require.main === module) {
  seedDatabase()
    .then((vault) => {
      console.log(
        `✅ AURA-CARE database seeded cleanly! CareVault Code: ${vault.vaultCode} (${vault.elderName})`
      );
    })
    .catch((err) => {
      console.error("❌ Error seeding AURA-CARE database:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
