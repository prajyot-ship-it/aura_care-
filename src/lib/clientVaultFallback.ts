"use client";

import { evaluatePolypharmacyConflicts } from "./polypharmacyEngine";

const STORAGE_KEY = "aura_care_static_vault_v1";
const SESSION_KEY = "aura_care_static_session_v1";

interface StaticSession {
  memberId: string;
  vaultId: string;
  vaultCode: string;
  name: string;
  role: "ELDER" | "CARETAKER" | "FAMILY_VIEWER";
  relationship: string;
}

function getInitialVaultData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayPrefix = `${y}-${m}-${d}`;

  // Generate 14-day heatmap
  const dailyHeatmap = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(now.getTime() - i * 86400000);
    const dateStr = dt.toISOString().slice(0, 10);
    const label = dt.toLocaleDateString([], { month: "short", day: "numeric" });
    const missed = i === 4 || i === 9 ? 1 : 0;
    const total = 4;
    const taken = total - missed;
    dailyHeatmap.push({
      dateStr,
      label,
      total,
      taken,
      adherenceRate: Math.round((taken / total) * 100),
    });
  }

  return {
    vault: {
      id: "vault-aura-7842",
      vaultCode: "AURA-7842",
      elderName: "Arthur Pendelton",
      elderAge: 78,
      bloodType: "O+",
      allergies: ["Penicillin", "Sulfa Drugs"],
      primaryPhysician: "Dr. Eleanor Vance, MD (Cardiology)",
      physicianEmail: "e.vance@metrocardiology.org",
      shareSymptomNotes: true,
      requireElderApproval: true,
      autoEscalateMissed: true,
    },
    members: [
      {
        id: "mem-arthur",
        name: "Arthur Pendelton",
        role: "ELDER",
        relationship: "Self (Elder Sovereign)",
        email: "arthur.pendelton@example.com",
        phone: "+1-555-0101",
      },
      {
        id: "mem-maya",
        name: "Maya Pendelton",
        role: "CARETAKER",
        relationship: "Daughter (Primary Caretaker)",
        email: "maya.pendelton@example.com",
        phone: "+1-555-0102",
      },
      {
        id: "mem-david",
        name: "David Ortiz, RN",
        role: "CARETAKER",
        relationship: "Home Care Nurse",
        email: "david.ortiz.rn@example.com",
        phone: "+1-555-0103",
      },
    ],
    medications: [
      {
        id: "med-lisinopril",
        name: "Lisinopril",
        genericName: "Lisinopril",
        drugClass: "ACE_INHIBITOR",
        dosage: "10 mg",
        frequency: "Once Daily",
        scheduledTimes: ["08:00"],
        foodRule: "WITH_FOOD",
        instructions: "Take 1 tablet every morning with breakfast for blood pressure.",
        pillShape: "ROUND",
        pillColorPrimary: "#F8FAFC",
        pillColorSecondary: "#CBD5E1",
        pillImprint: "L10",
        stockCount: 24,
        refillThreshold: 7,
        status: "ACTIVE",
        proposedByName: null,
        proposalReason: null,
      },
      {
        id: "med-eliquis",
        name: "Eliquis",
        genericName: "Apixaban",
        drugClass: "ANTICOAGULANT",
        dosage: "5 mg",
        frequency: "Twice Daily",
        scheduledTimes: ["08:00", "20:00"],
        foodRule: "ANY",
        instructions: "Take 1 oval tablet morning and evening to prevent blood clots.",
        pillShape: "OVAL",
        pillColorPrimary: "#F472B6",
        pillColorSecondary: "#FBCFE8",
        pillImprint: "894",
        stockCount: 5,
        refillThreshold: 7,
        status: "ACTIVE",
        proposedByName: null,
        proposalReason: null,
      },
      {
        id: "med-levothyroxine",
        name: "Levothyroxine",
        genericName: "Levothyroxine Sodium",
        drugClass: "THYROID_HORMONE",
        dosage: "75 mcg",
        frequency: "Once Daily (Morning)",
        scheduledTimes: ["08:00"],
        foodRule: "EMPTY_STOMACH",
        instructions: "Take on an empty stomach with a full glass of water 30–60 minutes before breakfast.",
        pillShape: "CAPSULE",
        pillColorPrimary: "#38BDF8",
        pillColorSecondary: "#E0F2FE",
        pillImprint: "LV75",
        stockCount: 18,
        refillThreshold: 7,
        status: "ACTIVE",
        proposedByName: null,
        proposalReason: null,
      },
      {
        id: "med-atorvastatin",
        name: "Atorvastatin",
        genericName: "Atorvastatin Calcium",
        drugClass: "STATIN",
        dosage: "20 mg",
        frequency: "Once Daily (Evening)",
        scheduledTimes: ["20:00"],
        foodRule: "BEFORE_SLEEP",
        instructions: "Take 1 tablet in the evening for cholesterol support.",
        pillShape: "DIAMOND",
        pillColorPrimary: "#A78BFA",
        pillColorSecondary: "#EDE9FE",
        pillImprint: "ATV20",
        stockCount: 28,
        refillThreshold: 7,
        status: "ACTIVE",
        proposedByName: null,
        proposalReason: null,
      },
      {
        id: "med-vitd3",
        name: "Vitamin D3",
        genericName: "Cholecalciferol",
        drugClass: "SUPPLEMENT",
        dosage: "2000 IU",
        frequency: "Once Daily (Midday)",
        scheduledTimes: ["12:30"],
        foodRule: "WITH_FOOD",
        instructions: "Take 1 golden capsule with lunch for bone and immune support.",
        pillShape: "CAPSULE",
        pillColorPrimary: "#F59E0B",
        pillColorSecondary: "#FEF3C7",
        pillImprint: "D3",
        stockCount: 60,
        refillThreshold: 10,
        status: "PENDING_ELDER_APPROVAL",
        proposedByName: "Maya Pendelton",
        proposalReason: "Dr. Vance recommended adding Vitamin D3 2000 IU with lunch after last week's lab panel.",
      },
    ],
    todayDoses: [
      {
        id: "dose-1",
        medicationId: "med-levothyroxine",
        scheduledFor: `${todayPrefix}T08:00:00`,
        status: "TAKEN",
        loggedAt: `${todayPrefix}T08:02:00`,
        loggedByName: "Arthur Pendelton",
        lockVersion: 1,
        escalationTier: 0,
        note: "Taken with water before breakfast",
      },
      {
        id: "dose-2",
        medicationId: "med-lisinopril",
        scheduledFor: `${todayPrefix}T08:00:00`,
        status: "TAKEN",
        loggedAt: `${todayPrefix}T08:05:00`,
        loggedByName: "David Ortiz, RN",
        lockVersion: 1,
        escalationTier: 0,
        note: "Assisted morning administration",
      },
      {
        id: "dose-3",
        medicationId: "med-eliquis",
        scheduledFor: `${todayPrefix}T08:00:00`,
        status: "PENDING",
        loggedAt: null,
        loggedByName: null,
        lockVersion: 0,
        escalationTier: 0,
        note: null,
      },
      {
        id: "dose-4",
        medicationId: "med-eliquis",
        scheduledFor: `${todayPrefix}T20:00:00`,
        status: "PENDING",
        loggedAt: null,
        loggedByName: null,
        lockVersion: 0,
        escalationTier: 0,
        note: null,
      },
      {
        id: "dose-5",
        medicationId: "med-atorvastatin",
        scheduledFor: `${todayPrefix}T20:00:00`,
        status: "PENDING",
        loggedAt: null,
        loggedByName: null,
        lockVersion: 0,
        escalationTier: 0,
        note: null,
      },
    ],
    adherenceSummary: {
      trailing30DayPercent: 94,
      takenCount: 113,
      missedOrSkippedCount: 7,
      totalEvaluated: 120,
      dailyHeatmap,
    },
    pendingProposals: [
      {
        id: "prop-vitd3",
        medicationId: "med-vitd3",
        proposedByName: "Maya Pendelton",
        changeType: "NEW_MEDICATION",
        plainEnglishSummary:
          "Add Vitamin D3 2000 IU (1 golden capsule at 12:30 PM with lunch) — Recommended by Dr. Vance for bone strength.",
        status: "PENDING",
        elderResponseNote: null,
        createdAt: new Date(now.getTime() - 3600000).toISOString(),
      },
    ],
    appointments: [
      {
        id: "appt-cardio-1",
        doctorName: "Dr. Eleanor Vance, MD",
        specialty: "Cardiology & Geriatric Hypertension",
        clinicLocation: "Metro Heart & Vascular Pavilion, Suite 410",
        appointmentDate: new Date(now.getTime() + 3 * 86400000).toISOString(),
        escortMemberName: "Maya Pendelton",
        elderQuestions: [
          "Sometimes I feel mildly lightheaded around 9:00 AM after taking my morning Lisinopril—should we adjust the timing?",
          "Can I take my afternoon Vitamin D3 capsule alongside lunch?",
        ],
        briefGenerated: true,
      },
    ],
    wellnessCheckIns: [
      {
        id: "well-1",
        mood: "GOOD",
        symptomTags: ["Steady Energy"],
        note: "Slept 7.5 hours, morning walk went well.",
        bloodPressureSystolic: 124,
        bloodPressureDiastolic: 76,
        heartRate: 68,
        createdAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      },
      {
        id: "well-2",
        mood: "DIZZY",
        symptomTags: ["Mild Lightheadedness"],
        note: "Brief lightheadedness standing up 60 minutes after morning Lisinopril.",
        bloodPressureSystolic: 112,
        bloodPressureDiastolic: 68,
        heartRate: 72,
        createdAt: new Date(now.getTime() - 30 * 3600000).toISOString(),
      },
    ],
    emails: [
      {
        id: "email-seed-1",
        recipientEmail: "maya.pendelton@example.com",
        recipientName: "Maya Pendelton",
        tier: "CO_SIGN_REQUEST",
        subject: "Co-Sign Requested: Vitamin D3 2000 IU awaiting Arthur Pendelton's Approval",
        htmlBody:
          "<div style='font-family:sans-serif;padding:16px'><h3>AURA•CARE Dignity Co-Sign Protocol</h3><p>Maya proposed adding <strong>Vitamin D3 2000 IU</strong> at 12:30 PM. Awaiting Arthur's Sovereign Sign-Off.</p></div>",
        status: "DISPATCHED_LOCAL_OUTBOX",
        sentAt: new Date(now.getTime() - 3600000).toISOString(),
      },
      {
        id: "email-seed-2",
        recipientEmail: "arthur.pendelton@example.com",
        recipientName: "Arthur Pendelton",
        tier: "TIER_1_UPCOMING",
        subject: "Upcoming 08:00 AM Dose Cue: Eliquis 5 mg (Pink Oval Tablet 894)",
        htmlBody:
          "<div style='font-family:sans-serif;padding:16px'><h3>Gentle Reminder: 08:00 AM Medication Window</h3><p>Hi Arthur, your <strong>Eliquis 5 mg</strong> (Pink Oval Tablet marked 894) is scheduled for 08:00 AM.</p></div>",
        status: "DISPATCHED_LOCAL_OUTBOX",
        sentAt: new Date(now.getTime() - 1800000).toISOString(),
      },
    ],
  };
}

function loadStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReturnType<typeof getInitialVaultData>;
  } catch {
    // ignore
  }
  const initial = getInitialVaultData();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function saveStore(store: ReturnType<typeof getInitialVaultData>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function getSession(): StaticSession {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as StaticSession;
  } catch {
    // ignore
  }
  return {
    memberId: "mem-arthur",
    vaultId: "vault-aura-7842",
    vaultCode: "AURA-7842",
    name: "Arthur Pendelton",
    role: "ELDER",
    relationship: "Self (Elder Sovereign)",
  };
}

function setSession(s: StaticSession) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleClientApi(urlStr: string, init?: RequestInit): Promise<Response> {
  const url = new URL(urlStr, window.location.origin);
  const path = url.pathname.replace(/^\/aura_care-/, "");
  const method = (init?.method || "GET").toUpperCase();
  const bodyText = typeof init?.body === "string" ? init.body : "";
  const body = bodyText ? JSON.parse(bodyText) : {};

  const store = loadStore();
  const session = getSession();

  // 1. POST / DELETE /api/auth/passcode
  if (path.endsWith("/api/auth/passcode")) {
    if (method === "DELETE") {
      return jsonResponse({ success: true });
    }
    const pin = String(body.passcode || "");
    if (pin === "111111") {
      const s: StaticSession = {
        memberId: "mem-arthur",
        vaultId: store.vault.id,
        vaultCode: store.vault.vaultCode,
        name: "Arthur Pendelton",
        role: "ELDER",
        relationship: "Self (Elder Sovereign)",
      };
      setSession(s);
      return jsonResponse({
        success: true,
        data: { session: s, redirectPath: "/elder" },
      });
    }
    if (pin === "222222") {
      const s: StaticSession = {
        memberId: "mem-maya",
        vaultId: store.vault.id,
        vaultCode: store.vault.vaultCode,
        name: "Maya Pendelton",
        role: "CARETAKER",
        relationship: "Daughter (Primary Caretaker)",
      };
      setSession(s);
      return jsonResponse({
        success: true,
        data: { session: s, redirectPath: "/dashboard" },
      });
    }
    if (pin === "333333") {
      const s: StaticSession = {
        memberId: "mem-david",
        vaultId: store.vault.id,
        vaultCode: store.vault.vaultCode,
        name: "David Ortiz, RN",
        role: "CARETAKER",
        relationship: "Home Care Nurse",
      };
      setSession(s);
      return jsonResponse({
        success: true,
        data: { session: s, redirectPath: "/dashboard" },
      });
    }
    return jsonResponse(
      { success: false, error: "Invalid 6-digit CareVault PIN. Try 111111, 222222, or 333333." },
      401
    );
  }

  // 2. GET / PATCH /api/vault/state
  if (path.endsWith("/api/vault/state")) {
    if (method === "PATCH") {
      if (typeof body.shareSymptomNotes === "boolean") {
        store.vault.shareSymptomNotes = body.shareSymptomNotes;
      }
      if (typeof body.requireElderApproval === "boolean") {
        store.vault.requireElderApproval = body.requireElderApproval;
      }
      if (typeof body.autoEscalateMissed === "boolean") {
        store.vault.autoEscalateMissed = body.autoEscalateMissed;
      }
      saveStore(store);
      return jsonResponse({ success: true, data: store.vault });
    }

    const hydratedDoses = store.todayDoses.map((d) => {
      const med =
        store.medications.find((m) => m.id === d.medicationId) ||
        store.medications[0];
      return { ...d, medication: med };
    });

    const hydratedProposals = store.pendingProposals.map((p) => ({
      ...p,
      medication:
        store.medications.find((m) => m.id === p.medicationId) || null,
    }));

    return jsonResponse({
      success: true,
      data: {
        session,
        vault: store.vault,
        members: store.members,
        medications: store.medications,
        todayDoses: hydratedDoses,
        adherenceSummary: store.adherenceSummary,
        pendingProposals: hydratedProposals,
        appointments: store.appointments,
        wellnessCheckIns: store.wellnessCheckIns,
        emailOutboxCount: store.emails.length,
      },
    });
  }

  // 3. POST /api/doses/log (Double-Dose Atomic Mutex Lock)
  if (path.endsWith("/api/doses/log") && method === "POST") {
    const dose = store.todayDoses.find((d) => d.id === body.doseLogId);
    if (!dose) {
      return jsonResponse({ success: false, error: "Dose not found." }, 404);
    }
    if (
      body.expectedLockVersion !== undefined &&
      body.expectedLockVersion !== dose.lockVersion
    ) {
      return jsonResponse(
        {
          success: false,
          error: `HTTP 409 Atomic Mutex Conflict: Dose already locked (v${dose.lockVersion}) by ${
            dose.loggedByName || "Care-Circle Member"
          }. Duplicate administration blocked.`,
        },
        409
      );
    }
    dose.status = body.action || "TAKEN";
    dose.loggedAt = new Date().toISOString();
    dose.loggedByName = session.name;
    dose.lockVersion += 1;
    if (body.note) dose.note = body.note;
    saveStore(store);

    return jsonResponse({
      success: true,
      data: {
        dose,
        mutexMessage: `Atomic Mutex Lock v${dose.lockVersion} acquired by ${session.name}.`,
      },
    });
  }

  // 4. POST /api/proposals/[id]
  if (path.includes("/api/proposals/") && method === "POST") {
    const propId = path.split("/api/proposals/")[1];
    const prop = store.pendingProposals.find((p) => p.id === propId);
    if (!prop) {
      return jsonResponse({ success: false, error: "Proposal not found." }, 404);
    }
    const decision = body.decision === "APPROVE" ? "APPROVED" : "HELD_FOR_DOCTOR";
    prop.status = decision;
    prop.elderResponseNote = body.elderResponseNote || null;

    const med = store.medications.find((m) => m.id === prop.medicationId);
    if (med && decision === "APPROVED") {
      med.status = "ACTIVE";
      const now = new Date();
      const todayPrefix = now.toISOString().slice(0, 10);
      store.todayDoses.push({
        id: `dose-${Date.now()}`,
        medicationId: med.id,
        scheduledFor: `${todayPrefix}T12:30:00`,
        status: "PENDING",
        loggedAt: null,
        loggedByName: null,
        lockVersion: 0,
        escalationTier: 0,
        note: null,
      });
    }
    saveStore(store);
    return jsonResponse({
      success: true,
      data: {
        message:
          decision === "APPROVED"
            ? "Approved! Medication added to your daily routine."
            : "Placed on hold for Dr. Eleanor Vance's review.",
      },
    });
  }

  // 5. POST /api/medications
  if (path.endsWith("/api/medications") && method === "POST") {
    const check = evaluatePolypharmacyConflicts(
      {
        name: body.name || "",
        genericName: body.genericName || body.name || "",
        drugClass: body.drugClass || "SUPPLEMENT",
        dosage: body.dosage || "10 mg",
        scheduledTimes: body.scheduledTimes || ["08:00"],
        foodRule: body.foodRule || "WITH_FOOD",
      },
      store.medications
    );

    if (body.dryRun) {
      return jsonResponse({ success: true, data: { conflictCheck: check } });
    }

    const newMedId = `med-${Date.now()}`;
    const status = store.vault.requireElderApproval
      ? "PENDING_ELDER_APPROVAL"
      : "ACTIVE";

    store.medications.push({
      id: newMedId,
      name: body.name,
      genericName: body.genericName || body.name,
      drugClass: body.drugClass || "SUPPLEMENT",
      dosage: body.dosage || "10 mg",
      frequency: body.frequency || "Once Daily",
      scheduledTimes: body.scheduledTimes || ["12:30"],
      foodRule: body.foodRule || "WITH_FOOD",
      instructions: body.instructions || "Take as directed.",
      pillShape: body.pillShape || "CAPSULE",
      pillColorPrimary: body.pillColorPrimary || "#0F766E",
      pillColorSecondary: body.pillColorSecondary || "#CCFBF1",
      pillImprint: body.pillImprint || "AC1",
      stockCount: 30,
      refillThreshold: 7,
      status,
      proposedByName: session.name,
      proposalReason: body.proposalReason || "Proposed via Command Center",
    });

    if (status === "PENDING_ELDER_APPROVAL") {
      store.pendingProposals.unshift({
        id: `prop-${Date.now()}`,
        medicationId: newMedId,
        proposedByName: session.name,
        changeType: "NEW_MEDICATION",
        plainEnglishSummary: `Add ${body.name} ${body.dosage} (${
          body.proposalReason || "Care-Circle schedule proposal"
        })`,
        status: "PENDING",
        elderResponseNote: null,
        createdAt: new Date().toISOString(),
      });
    }
    saveStore(store);
    return jsonResponse({
      success: true,
      data: {
        message:
          status === "PENDING_ELDER_APPROVAL"
            ? `Submitted ${body.name} for ${store.vault.elderName}'s Sovereign Co-Sign.`
            : `Added ${body.name} to active schedule.`,
      },
    });
  }

  // 6. POST /api/wellness
  if (path.endsWith("/api/wellness") && method === "POST") {
    if (body.doctorQuestion && store.appointments[0]) {
      store.appointments[0].elderQuestions.push(body.doctorQuestion);
    }
    if (body.mood) {
      store.wellnessCheckIns.unshift({
        id: `well-${Date.now()}`,
        mood: body.mood,
        symptomTags: body.symptomTags || [],
        note: body.note || `Logged ${body.mood} check-in`,
        bloodPressureSystolic: body.bloodPressureSystolic || 122,
        bloodPressureDiastolic: body.bloodPressureDiastolic || 76,
        heartRate: 70,
        createdAt: new Date().toISOString(),
      });
    }
    saveStore(store);
    return jsonResponse({
      success: true,
      data: { message: "Saved to your CareVault wellness log." },
    });
  }

  // 7. GET /api/emails & POST /api/escalations/tick
  if (path.endsWith("/api/emails")) {
    return jsonResponse({
      success: true,
      data: { emails: store.emails },
    });
  }

  if (path.endsWith("/api/escalations/tick") && method === "POST") {
    const mode = String(body.mode || "TIER_1");
    const tierMap: Record<string, { tier: string; subject: string; body: string }> = {
      SIMULATE_T_MINUS_15: {
        tier: "TIER_1_UPCOMING",
        subject: "Tier 1 Upcoming Dose Cue (T-15m): Eliquis 5 mg (Oval 894)",
        body: "<div style='font-family:sans-serif;padding:16px'><h3>Tier 1 Gentle Reminder (T-15m)</h3><p>Arthur's <strong>Eliquis 5 mg</strong> is coming up in 15 minutes.</p></div>",
      },
      SIMULATE_T_PLUS_30: {
        tier: "TIER_2_SOFT_NUDGE",
        subject: "Tier 2 Soft Missed-Dose Nudge (T+30m): Actionable 1-Click Check-In",
        body: "<div style='font-family:sans-serif;padding:16px'><h3>Tier 2 Soft Nudge (T+30m)</h3><p>Eliquis 5 mg is 30m past window. Use 1-click links to confirm or snooze.</p></div>",
      },
      SIMULATE_T_PLUS_90: {
        tier: "TIER_3_ESCALATION",
        subject: "URGENT Tier 3 Care-Circle Escalation (T+90m): Unconfirmed Anticoagulant Dose",
        body: "<div style='font-family:sans-serif;padding:16px'><h3>Tier 3 All-Hands Escalation (T+90m)</h3><p>Arthur's Eliquis 5 mg remains unconfirmed at T+90m. Care-Circle notified.</p></div>",
      },
    };
    const picked = tierMap[mode] || {
      tier: "APPOINTMENT_PREP",
      subject: "Pre-Visit 1-Page Cardiology Brief Dispatched to Dr. Eleanor Vance & Maya",
      body: "<div style='font-family:sans-serif;padding:16px'><h3>Physician Clinical Brief Attached</h3><p>30-Day Adherence: 94%. Circadian pattern & BP logs included.</p></div>",
    };

    store.emails.unshift({
      id: `email-${Date.now()}`,
      recipientEmail: "maya.pendelton@example.com",
      recipientName: "Maya Pendelton & Arthur Pendelton",
      tier: picked.tier,
      subject: picked.subject,
      htmlBody: picked.body,
      status: "DISPATCHED_LOCAL_OUTBOX",
      sentAt: new Date().toISOString(),
    });
    saveStore(store);

    return jsonResponse({
      success: true,
      data: {
        dispatchedCount: 1,
        message: `Dispatched ${picked.tier} HTML email to Care-Circle Outbox.`,
      },
    });
  }

  // 8. GET /api/appointments
  if (path.endsWith("/api/appointments")) {
    return jsonResponse({
      success: true,
      data: {
        brief: {
          generatedAt: new Date().toISOString(),
          vault: store.vault,
          appointment: store.appointments[0],
          overallMetrics: {
            overallAdherencePercent: 94,
            takenCount: 113,
            missedCount: 5,
            skippedCount: 2,
            totalEvaluatedDoses: 120,
            primaryPatternFinding:
              "71% of missed or delayed doses occurred during the 20:00 Evening window, whereas Morning 08:00 adherence is 98%.",
          },
          timeOfDayClusters: [
            { windowLabel: "Morning (08:00)", missedCount: 1, totalDoses: 60, missSharePercent: 14 },
            { windowLabel: "Midday (12:30)", missedCount: 1, totalDoses: 15, missSharePercent: 15 },
            { windowLabel: "Evening (20:00)", missedCount: 5, totalDoses: 45, missSharePercent: 71 },
          ],
          medicationBreakdown: store.medications
            .filter((m) => m.status === "ACTIVE")
            .map((m) => ({
              medicationId: m.id,
              name: m.name,
              genericName: m.genericName,
              drugClass: m.drugClass,
              dosage: m.dosage,
              scheduledTimes: m.scheduledTimes,
              foodRule: m.foodRule,
              takenCount: 28,
              totalScheduled: 30,
              adherencePercent: 93,
            })),
          recentWellnessCheckIns: store.wellnessCheckIns.map((w) => ({
            ...w,
            correlatedMedicationNote:
              w.mood === "DIZZY"
                ? "Logged ~60m after 08:00 AM Lisinopril 10 mg (ACE_INHIBITOR)"
                : null,
          })),
        },
      },
    });
  }

  return jsonResponse({ success: true, data: {} });
}

let installed = false;

export function installClientVaultFallback() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const isApiCall = urlStr.includes("/api/");
    const isGitHubPages = window.location.hostname.includes("github.io");

    if (isApiCall && isGitHubPages) {
      return handleClientApi(urlStr, init);
    }

    if (isApiCall) {
      try {
        const res = await originalFetch(input, init);
        if (res.status === 404 || res.status === 405) {
          return handleClientApi(urlStr, init);
        }
        return res;
      } catch {
        return handleClientApi(urlStr, init);
      }
    }

    return originalFetch(input, init);
  };
}
