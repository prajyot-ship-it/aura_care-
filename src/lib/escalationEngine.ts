import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { EmailTier, safeParseJsonArray } from "./types";

export type SimulationMode =
  | "AUTO"
  | "SIMULATE_TIER_1"
  | "SIMULATE_TIER_2"
  | "SIMULATE_TIER_3"
  | "SIMULATE_APPT_PREP";

export interface DispatchedEmailItem {
  id: string;
  recipientEmail: string;
  recipientName: string;
  tier: EmailTier;
  subject: string;
  createdAt: Date;
}

export interface EscalationTickSummary {
  mode: SimulationMode;
  dispatchedCount: number;
  suppressedByPrivacyCount: number;
  dispatchedEmails: DispatchedEmailItem[];
  message: string;
}

async function deliverDualChannelEmail(params: {
  vaultId: string;
  recipientEmail: string;
  recipientName: string;
  tier: EmailTier;
  subject: string;
  htmlBody: string;
}): Promise<DispatchedEmailItem> {
  // RULE-EMAIL-01: Write complete HTML record to EmailDispatchLog first
  const logRecord = await prisma.emailDispatchLog.create({
    data: {
      vaultId: params.vaultId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      tier: params.tier,
      subject: params.subject,
      htmlBody: params.htmlBody,
    },
  });

  // Attempt external SMTP delivery if SMTP_HOST is configured
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });

      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          "AURA-CARE Sovereign Co-Pilot <care@aura-care.local>",
        to: `${params.recipientName} <${params.recipientEmail}>`,
        subject: params.subject,
        html: params.htmlBody,
      });
    } catch (err) {
      console.warn(
        "[AURA-CARE SMTP Warning] External SMTP failed; email safely persisted in EmailDispatchLog:",
        err
      );
    }
  }

  return {
    id: logRecord.id,
    recipientEmail: logRecord.recipientEmail,
    recipientName: logRecord.recipientName,
    tier: logRecord.tier as EmailTier,
    subject: logRecord.subject,
    createdAt: logRecord.createdAt,
  };
}

function formatFoodRuleBadge(foodRule: string): string {
  switch (foodRule) {
    case "EMPTY_STOMACH":
      return "Take on an Empty Stomach (30–60 mins before meals with water)";
    case "WITH_FOOD":
      return "Take with a Meal or Snack";
    case "BEFORE_SLEEP":
      return "Take in the Evening Before Sleep";
    default:
      return "May be taken with or without food";
  }
}

export function buildTier1UpcomingCueHtml(params: {
  elderName: string;
  recipientName: string;
  medName: string;
  genericName: string;
  dosage: string;
  scheduledTimeStr: string;
  pillShape: string;
  pillColorPrimary: string;
  pillImprint: string;
  foodRule: string;
  instructions: string;
}): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAF8F5; border: 2px solid #D8D2C7; border-radius: 16px; overflow: hidden; color: #1A1D1F;">
  <div style="background-color: #046A38; color: #FFFFFF; padding: 20px 24px;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; font-weight: 700;">AURA-CARE • TIER 1 UPCOMING DOSE CUE (T-15 MIN)</div>
    <h2 style="margin: 6px 0 0; font-size: 24px;">Gentle Medication Reminder for ${params.elderName}</h2>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 18px; line-height: 1.5; margin-top: 0;">Hello <strong>${params.recipientName}</strong>,</p>
    <p style="font-size: 18px; line-height: 1.5;">It is almost time for <strong>${params.elderName}’s ${params.scheduledTimeStr}</strong> medication routine:</p>
    <div style="background: #FFFFFF; border: 2px solid #046A38; border-radius: 12px; padding: 18px; margin: 16px 0;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 44px; height: 28px; border-radius: 999px; background-color: ${params.pillColorPrimary}; border: 2px solid #334155; display: inline-block; text-align: center; line-height: 28px; font-weight: 800; font-size: 11px; color: #0F172A;">
          ${params.pillImprint}
        </div>
        <div>
          <div style="font-size: 22px; font-weight: 800; color: #1A1D1F;">${params.medName} ${params.dosage}</div>
          <div style="font-size: 15px; color: #475569;">Generic: ${params.genericName} • Visual Match: ${params.pillShape} tablet (${params.pillImprint})</div>
        </div>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 14px 0;" />
      <p style="margin: 6px 0; font-size: 16px;"><strong>Food & Water Guide:</strong> ${formatFoodRuleBadge(params.foodRule)}</p>
      <p style="margin: 6px 0; font-size: 16px;"><strong>Clinical Note:</strong> ${params.instructions}</p>
    </div>
    <p style="font-size: 14px; color: #64748B; margin-bottom: 0;">Sovereign Co-Pilot Notice: Once confirmed by ${params.elderName} or a caregiver, the Double-Dose Mutex Lock will automatically prevent duplicate administration.</p>
  </div>
</div>`.trim();
}

export function buildTier2MissedNudgeHtml(params: {
  elderName: string;
  recipientName: string;
  medName: string;
  dosage: string;
  scheduledTimeStr: string;
  pillShape: string;
  pillImprint: string;
  doseId: string;
  appUrl: string;
}): string {
  const confirmUrl = `${params.appUrl}/elder?action=confirm&doseId=${encodeURIComponent(params.doseId)}`;
  const snoozeUrl = `${params.appUrl}/elder?action=snooze&doseId=${encodeURIComponent(params.doseId)}`;
  const assistUrl = `${params.appUrl}/dashboard?action=assist&doseId=${encodeURIComponent(params.doseId)}`;

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FFFBEB; border: 2px solid #F59E0B; border-radius: 16px; overflow: hidden; color: #1A1D1F;">
  <div style="background-color: #B45309; color: #FFFFFF; padding: 20px 24px;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">AURA-CARE • TIER 2 SOFT MISSED-DOSE CHECK-IN (T+30 MIN)</div>
    <h2 style="margin: 6px 0 0; font-size: 24px;">Checking In: ${params.medName} (${params.dosage})</h2>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 18px; line-height: 1.5; margin-top: 0;">Hello <strong>${params.recipientName}</strong>,</p>
    <p style="font-size: 18px; line-height: 1.5;"><strong>${params.elderName}’s ${params.medName} ${params.dosage}</strong> (${params.pillShape}, imprint <strong>${params.pillImprint}</strong>) scheduled for <strong>${params.scheduledTimeStr}</strong> has not been marked as taken yet.</p>
    <p style="font-size: 16px; color: #475569;">Use any one-click action below to update the CareVault and engage the Double-Dose Mutex Lock:</p>
    <div style="margin: 22px 0; display: flex; flex-wrap: wrap; gap: 12px;">
      <a href="${confirmUrl}" style="background-color: #046A38; color: #FFFFFF; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; margin-right: 10px; margin-bottom: 10px;">✓ Confirm Taken</a>
      <a href="${snoozeUrl}" style="background-color: #1E40AF; color: #FFFFFF; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; margin-right: 10px; margin-bottom: 10px;">⏰ Snooze 15m</a>
      <a href="${assistUrl}" style="background-color: #B45309; color: #FFFFFF; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; margin-bottom: 10px;">🤝 Need Assistance</a>
    </div>
    <p style="font-size: 14px; color: #78350F; margin-bottom: 0;">If unconfirmed after 90 minutes, AURA-CARE will escalate to the extended Care-Circle (if enabled by ${params.elderName}).</p>
  </div>
</div>`.trim();
}

export function buildTier3CareCircleEscalationHtml(params: {
  elderName: string;
  recipientName: string;
  medName: string;
  genericName: string;
  dosage: string;
  drugClass: string;
  scheduledTimeStr: string;
  primaryPhysician: string;
  physicianPhone: string;
  latestWellnessSummary: string;
  appUrl: string;
}): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FEF2F2; border: 2px solid #DC2626; border-radius: 16px; overflow: hidden; color: #1A1D1F;">
  <div style="background-color: #991B1B; color: #FFFFFF; padding: 20px 24px;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">AURA-CARE • TIER 3 CARE-CIRCLE ESCALATION ALERT (T+90 MIN)</div>
    <h2 style="margin: 6px 0 0; font-size: 24px;">Priority Care-Circle Check: ${params.elderName}</h2>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 17px; line-height: 1.5; margin-top: 0;">Attention <strong>${params.recipientName}</strong>,</p>
    <p style="font-size: 17px; line-height: 1.5;"><strong>${params.elderName}’s</strong> scheduled dose of <strong>${params.medName} ${params.dosage}</strong> (${params.genericName} — <em>${params.drugClass}</em>) at <strong>${params.scheduledTimeStr}</strong> remains unconfirmed <strong>90+ minutes</strong> past the dose window.</p>
    <div style="background: #FFFFFF; border-left: 5px solid #DC2626; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-size: 15px;"><strong>Recent Wellness Context:</strong> ${params.latestWellnessSummary}</p>
      <p style="margin: 0; font-size: 15px;"><strong>Primary Physician Contact:</strong> ${params.primaryPhysician} (${params.physicianPhone})</p>
    </div>
    <div style="margin: 20px 0;">
      <a href="${params.appUrl}/dashboard" style="background-color: #991B1B; color: #FFFFFF; text-decoration: none; padding: 14px 22px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">Open Care-Circle Command Center & Coordinate Check-In</a>
    </div>
    <p style="font-size: 13px; color: #7F1D1D; margin-bottom: 0;">Non-Diagnostic Notice: Please contact ${params.elderName} before administering any catch-up dose. Once administered, log the dose immediately in AURA-CARE to engage the Double-Dose Mutex Lock.</p>
  </div>
</div>`.trim();
}

export function buildAppointmentPrepHtml(params: {
  elderName: string;
  recipientName: string;
  doctorName: string;
  specialty: string;
  clinicLocation: string;
  appointmentDateStr: string;
  purpose: string;
  escortMemberName: string;
  elderQuestions: string[];
  activeMedList: string[];
  briefUrl: string;
}): string {
  const questionsHtml =
    params.elderQuestions.length > 0
      ? params.elderQuestions
          .map((q) => `<li style="margin-bottom: 6px;">“${q}”</li>`)
          .join("")
      : `<li>No custom questions flagged yet.</li>`;

  const medsHtml = params.activeMedList
    .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
    .join("");

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F8FAFC; border: 2px solid #1E40AF; border-radius: 16px; overflow: hidden; color: #1A1D1F;">
  <div style="background-color: #1E3A8A; color: #FFFFFF; padding: 20px 24px;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">AURA-CARE • T-24H APPOINTMENT PREP DISPATCH</div>
    <h2 style="margin: 6px 0 0; font-size: 22px;">Upcoming Visit with ${params.doctorName} (${params.specialty})</h2>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 17px; margin-top: 0;">Hello <strong>${params.recipientName}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.5;">Here is the 24-hour preparation checklist for <strong>${params.elderName}’s</strong> upcoming appointment:</p>
    <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${params.appointmentDateStr}</p>
      <p style="margin: 4px 0;"><strong>Clinic Location:</strong> ${params.clinicLocation}</p>
      <p style="margin: 4px 0;"><strong>Visit Purpose:</strong> ${params.purpose}</p>
      <p style="margin: 4px 0;"><strong>Designated Care Escort:</strong> ${params.escortMemberName}</p>
    </div>
    <h3 style="font-size: 17px; color: #1E3A8A; margin-bottom: 8px;">Questions Flagged by ${params.elderName}:</h3>
    <ul style="font-size: 15px; line-height: 1.5; background: #EFF6FF; padding: 14px 28px; border-radius: 10px;">
      ${questionsHtml}
    </ul>
    <h3 style="font-size: 17px; color: #1E3A8A; margin-bottom: 8px;">Active Medications to Bring / Review:</h3>
    <ul style="font-size: 14px; line-height: 1.5; color: #334155;">
      ${medsHtml}
    </ul>
    <div style="margin-top: 20px;">
      <a href="${params.briefUrl}" style="background-color: #1E40AF; color: #FFFFFF; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">📄 View & Print 1-Page Physician Clinical Brief</a>
    </div>
  </div>
</div>`.trim();
}

export async function dispatchProposalNoticeEmail(params: {
  vaultId: string;
  elderName: string;
  elderEmail: string;
  proposedByName: string;
  plainEnglishSummary: string;
  conflictWarningSummary?: string;
}): Promise<DispatchedEmailItem> {
  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAF8F5; border: 2px solid #1E40AF; border-radius: 16px; overflow: hidden; color: #1A1D1F;">
  <div style="background-color: #1E40AF; color: #FFFFFF; padding: 20px 24px;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">AURA-CARE • DIGNITY CO-SIGN PROTOCOL</div>
    <h2 style="margin: 6px 0 0; font-size: 22px;">New Routine Proposal Awaiting Your Sign-Off</h2>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 18px; margin-top: 0;">Hello <strong>${params.elderName}</strong>,</p>
    <p style="font-size: 18px; line-height: 1.5;"><strong>${params.proposedByName}</strong> proposed an update to your CareVault routine. In accordance with your Sovereign Dignity settings, nothing has changed on your schedule until you review and approve it:</p>
    <div style="background: #EFF6FF; border: 2px solid #93C5FD; border-radius: 12px; padding: 18px; margin: 16px 0; font-size: 18px; line-height: 1.5;">
      “${params.plainEnglishSummary}”
    </div>
    ${
      params.conflictWarningSummary
        ? `<div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; color: #92400E;"><strong>Clinical Check Note:</strong> ${params.conflictWarningSummary}</div>`
        : ""
    }
    <p style="font-size: 16px;">Open your <strong>Elder Sovereign Mode</strong> tablet screen to tap <strong>“Approve & Add to My Routine”</strong> or <strong>“Hold — Ask Doctor First”</strong>.</p>
  </div>
</div>`.trim();

  return deliverDualChannelEmail({
    vaultId: params.vaultId,
    recipientEmail: params.elderEmail,
    recipientName: params.elderName,
    tier: "PROPOSAL_NOTICE",
    subject: `[Dignity Co-Sign] ${params.proposedByName} proposed a schedule update for your review`,
    htmlBody,
  });
}

export async function runEscalationTick(
  vaultId: string,
  mode: SimulationMode = "AUTO"
): Promise<EscalationTickSummary> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const vault = await prisma.careVault.findUnique({
    where: { id: vaultId },
    include: {
      members: true,
      medications: {
        where: { status: "ACTIVE" },
      },
      appointments: {
        where: { status: "UPCOMING" },
        orderBy: { appointmentDate: "asc" },
      },
      wellnessCheckIns: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!vault) {
    return {
      mode,
      dispatchedCount: 0,
      suppressedByPrivacyCount: 0,
      dispatchedEmails: [],
      message: "CareVault not found.",
    };
  }

  const dispatchedEmails: DispatchedEmailItem[] = [];
  let suppressedByPrivacyCount = 0;

  const elderMember = vault.members.find((m) => m.role === "ELDER_SOVEREIGN");
  const primaryCaretaker = vault.members.find(
    (m) => m.role === "PRIMARY_CARETAKER"
  );
  const escalationCircle = vault.members.filter((m) => m.receiveEscalations);

  const latestCheckIn = vault.wellnessCheckIns[0];
  const latestWellnessSummary = !vault.shareSymptomNotes
    ? "Detailed symptom notes private per Elder Sovereignty settings."
    : latestCheckIn
      ? `Mood: ${latestCheckIn.mood}${
          latestCheckIn.bloodPressureSystolic
            ? ` (BP ${latestCheckIn.bloodPressureSystolic}/${latestCheckIn.bloodPressureDiastolic} mmHg)`
            : ""
        }${latestCheckIn.note ? ` — "${latestCheckIn.note}"` : ""}`
      : "No recent symptom issues reported.";

  // Find today's PENDING dose logs
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const pendingDoses = await prisma.doseLog.findMany({
    where: {
      vaultId,
      status: "PENDING",
      scheduledFor: {
        gte: new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(endOfDay.getTime() + 12 * 60 * 60 * 1000),
      },
    },
    include: {
      medication: true,
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });

  const targetDose = pendingDoses[0];

  // Handle SIMULATE_TIER_1 (T-15m Upcoming Dose Cue)
  if (mode === "SIMULATE_TIER_1" && targetDose) {
    const timeStr = targetDose.scheduledFor.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const recipients = [elderMember, primaryCaretaker].filter(
      (m): m is NonNullable<typeof m> => Boolean(m)
    );

    for (const recipient of recipients) {
      const html = buildTier1UpcomingCueHtml({
        elderName: vault.elderName,
        recipientName: recipient.name,
        medName: targetDose.medication.name,
        genericName: targetDose.medication.genericName,
        dosage: targetDose.medication.dosage,
        scheduledTimeStr: timeStr,
        pillShape: targetDose.medication.pillShape,
        pillColorPrimary: targetDose.medication.pillColorPrimary,
        pillImprint: targetDose.medication.pillImprint,
        foodRule: targetDose.medication.foodRule,
        instructions: targetDose.medication.instructions,
      });

      const sent = await deliverDualChannelEmail({
        vaultId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        tier: "UPCOMING_CUE",
        subject: `[Upcoming Dose T-15m] ${targetDose.medication.name} ${targetDose.medication.dosage} at ${timeStr}`,
        htmlBody: html,
      });
      dispatchedEmails.push(sent);
    }

    if (targetDose.escalationTierSent < 1) {
      await prisma.doseLog.update({
        where: { id: targetDose.id },
        data: { escalationTierSent: 1 },
      });
    }

    return {
      mode,
      dispatchedCount: dispatchedEmails.length,
      suppressedByPrivacyCount,
      dispatchedEmails,
      message: `Dispatched Tier 1 (T-15m Upcoming Dose Cue) for ${targetDose.medication.name} (${targetDose.medication.dosage}) to ${dispatchedEmails.length} recipients.`,
    };
  }

  // Handle SIMULATE_TIER_2 (+30m Soft Missed-Dose Nudge)
  if (mode === "SIMULATE_TIER_2" && targetDose) {
    const timeStr = targetDose.scheduledFor.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const recipients = [elderMember, primaryCaretaker].filter(
      (m): m is NonNullable<typeof m> => Boolean(m)
    );

    for (const recipient of recipients) {
      const html = buildTier2MissedNudgeHtml({
        elderName: vault.elderName,
        recipientName: recipient.name,
        medName: targetDose.medication.name,
        dosage: targetDose.medication.dosage,
        scheduledTimeStr: timeStr,
        pillShape: targetDose.medication.pillShape,
        pillImprint: targetDose.medication.pillImprint,
        doseId: targetDose.id,
        appUrl,
      });

      const sent = await deliverDualChannelEmail({
        vaultId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        tier: "MISSED_NUDGE",
        subject: `[Check-In +30m] ${vault.elderName}'s ${targetDose.medication.name} (${targetDose.medication.dosage}) is still pending`,
        htmlBody: html,
      });
      dispatchedEmails.push(sent);
    }

    if (targetDose.escalationTierSent < 2) {
      await prisma.doseLog.update({
        where: { id: targetDose.id },
        data: { escalationTierSent: 2 },
      });
    }

    return {
      mode,
      dispatchedCount: dispatchedEmails.length,
      suppressedByPrivacyCount,
      dispatchedEmails,
      message: `Dispatched Tier 2 (+30m Soft Missed-Dose Nudge) with 1-click confirmation links for ${targetDose.medication.name} to ${dispatchedEmails.length} recipients.`,
    };
  }

  // Handle SIMULATE_TIER_3 (+90m Care-Circle Escalation Alert)
  if (mode === "SIMULATE_TIER_3" && targetDose) {
    // RULE-DIGNITY-03: Respect CareVault.autoEscalateMissed opt-out
    if (!vault.autoEscalateMissed) {
      suppressedByPrivacyCount = escalationCircle.length;
      return {
        mode,
        dispatchedCount: 0,
        suppressedByPrivacyCount,
        dispatchedEmails: [],
        message: `Tier 3 Care-Circle Escalation suppressed: ${vault.elderName} has toggled OFF "Auto-Escalate Missed Doses After 90 Minutes" in Sovereign Privacy settings (RULE-DIGNITY-03).`,
      };
    }

    const timeStr = targetDose.scheduledFor.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const member of escalationCircle) {
      const html = buildTier3CareCircleEscalationHtml({
        elderName: vault.elderName,
        recipientName: member.name,
        medName: targetDose.medication.name,
        genericName: targetDose.medication.genericName,
        dosage: targetDose.medication.dosage,
        drugClass: targetDose.medication.drugClass,
        scheduledTimeStr: timeStr,
        primaryPhysician: vault.primaryPhysician,
        physicianPhone: vault.physicianPhone,
        latestWellnessSummary,
        appUrl,
      });

      const sent = await deliverDualChannelEmail({
        vaultId,
        recipientEmail: member.email,
        recipientName: member.name,
        tier: "CARE_CIRCLE_ESCALATION",
        subject: `[URGENT +90m Care-Circle Escalation] Unconfirmed ${targetDose.medication.name} (${targetDose.medication.dosage}) for ${vault.elderName}`,
        htmlBody: html,
      });
      dispatchedEmails.push(sent);
    }

    await prisma.doseLog.update({
      where: { id: targetDose.id },
      data: { escalationTierSent: 3 },
    });

    return {
      mode,
      dispatchedCount: dispatchedEmails.length,
      suppressedByPrivacyCount,
      dispatchedEmails,
      message: `Dispatched Tier 3 (+90m Care-Circle Escalation) for ${targetDose.medication.name} to all ${dispatchedEmails.length} authorized Care-Circle members.`,
    };
  }

  // Handle SIMULATE_APPT_PREP (T-24h Appointment Prep Dispatch)
  if (mode === "SIMULATE_APPT_PREP") {
    const nextAppt = vault.appointments[0];
    if (!nextAppt) {
      return {
        mode,
        dispatchedCount: 0,
        suppressedByPrivacyCount: 0,
        dispatchedEmails: [],
        message: "No upcoming appointments found to prepare.",
      };
    }

    const questions = safeParseJsonArray<string>(nextAppt.elderQuestions, []);
    const activeMedList = vault.medications.map(
      (m) => `${m.name} (${m.genericName}) ${m.dosage} — ${m.drugClass}`
    );
    const apptDateStr = nextAppt.appointmentDate.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const escortMember =
      vault.members.find((m) =>
        m.name.toLowerCase().includes(nextAppt.escortMemberName.toLowerCase())
      ) || primaryCaretaker;

    const recipients = [elderMember, escortMember].filter(
      (m): m is NonNullable<typeof m> => Boolean(m)
    );

    for (const recipient of recipients) {
      const html = buildAppointmentPrepHtml({
        elderName: vault.elderName,
        recipientName: recipient.name,
        doctorName: nextAppt.doctorName,
        specialty: nextAppt.specialty,
        clinicLocation: nextAppt.clinicLocation,
        appointmentDateStr: apptDateStr,
        purpose: nextAppt.purpose,
        escortMemberName: nextAppt.escortMemberName,
        elderQuestions: questions,
        activeMedList,
        briefUrl: `${appUrl}/appointments/brief/${nextAppt.id}`,
      });

      const sent = await deliverDualChannelEmail({
        vaultId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        tier: "APPOINTMENT_PREP",
        subject: `[24h Appointment Prep] Checklist & Questions for ${nextAppt.doctorName} (${nextAppt.specialty})`,
        htmlBody: html,
      });
      dispatchedEmails.push(sent);
    }

    await prisma.appointment.update({
      where: { id: nextAppt.id },
      data: { prepEmailSent: true },
    });

    return {
      mode,
      dispatchedCount: dispatchedEmails.length,
      suppressedByPrivacyCount: 0,
      dispatchedEmails,
      message: `Dispatched 24-Hour Appointment Prep & Checklist for ${nextAppt.doctorName} to ${dispatchedEmails.length} recipients.`,
    };
  }

  // Handle AUTO mode: inspect all pending doses against current clock
  for (const dose of pendingDoses) {
    const diffMinutes = Math.round(
      (now.getTime() - dose.scheduledFor.getTime()) / 60000
    );
    const timeStr = dose.scheduledFor.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // T-15m window: -20 <= diffMinutes <= 0 and escalationTierSent < 1
    if (diffMinutes >= -20 && diffMinutes < 30 && dose.escalationTierSent < 1) {
      const recipients = [elderMember, primaryCaretaker].filter(
        (m): m is NonNullable<typeof m> => Boolean(m)
      );
      for (const recipient of recipients) {
        const html = buildTier1UpcomingCueHtml({
          elderName: vault.elderName,
          recipientName: recipient.name,
          medName: dose.medication.name,
          genericName: dose.medication.genericName,
          dosage: dose.medication.dosage,
          scheduledTimeStr: timeStr,
          pillShape: dose.medication.pillShape,
          pillColorPrimary: dose.medication.pillColorPrimary,
          pillImprint: dose.medication.pillImprint,
          foodRule: dose.medication.foodRule,
          instructions: dose.medication.instructions,
        });
        const sent = await deliverDualChannelEmail({
          vaultId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          tier: "UPCOMING_CUE",
          subject: `[Upcoming Dose T-15m] ${dose.medication.name} ${dose.medication.dosage} at ${timeStr}`,
          htmlBody: html,
        });
        dispatchedEmails.push(sent);
      }
      await prisma.doseLog.update({
        where: { id: dose.id },
        data: { escalationTierSent: 1 },
      });
    } else if (
      diffMinutes >= 30 &&
      diffMinutes < 90 &&
      dose.escalationTierSent < 2
    ) {
      const recipients = [elderMember, primaryCaretaker].filter(
        (m): m is NonNullable<typeof m> => Boolean(m)
      );
      for (const recipient of recipients) {
        const html = buildTier2MissedNudgeHtml({
          elderName: vault.elderName,
          recipientName: recipient.name,
          medName: dose.medication.name,
          dosage: dose.medication.dosage,
          scheduledTimeStr: timeStr,
          pillShape: dose.medication.pillShape,
          pillImprint: dose.medication.pillImprint,
          doseId: dose.id,
          appUrl,
        });
        const sent = await deliverDualChannelEmail({
          vaultId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          tier: "MISSED_NUDGE",
          subject: `[Check-In +30m] ${vault.elderName}'s ${dose.medication.name} (${dose.medication.dosage}) is pending`,
          htmlBody: html,
        });
        dispatchedEmails.push(sent);
      }
      await prisma.doseLog.update({
        where: { id: dose.id },
        data: { escalationTierSent: 2 },
      });
    } else if (diffMinutes >= 90 && dose.escalationTierSent < 3) {
      if (!vault.autoEscalateMissed) {
        suppressedByPrivacyCount += escalationCircle.length;
      } else {
        for (const member of escalationCircle) {
          const html = buildTier3CareCircleEscalationHtml({
            elderName: vault.elderName,
            recipientName: member.name,
            medName: dose.medication.name,
            genericName: dose.medication.genericName,
            dosage: dose.medication.dosage,
            drugClass: dose.medication.drugClass,
            scheduledTimeStr: timeStr,
            primaryPhysician: vault.primaryPhysician,
            physicianPhone: vault.physicianPhone,
            latestWellnessSummary,
            appUrl,
          });
          const sent = await deliverDualChannelEmail({
            vaultId,
            recipientEmail: member.email,
            recipientName: member.name,
            tier: "CARE_CIRCLE_ESCALATION",
            subject: `[URGENT +90m Care-Circle Escalation] Unconfirmed ${dose.medication.name} for ${vault.elderName}`,
            htmlBody: html,
          });
          dispatchedEmails.push(sent);
        }
        await prisma.doseLog.update({
          where: { id: dose.id },
          data: { escalationTierSent: 3 },
        });
      }
    }
  }

  return {
    mode,
    dispatchedCount: dispatchedEmails.length,
    suppressedByPrivacyCount,
    dispatchedEmails,
    message:
      dispatchedEmails.length > 0
        ? `Processed escalation check and dispatched ${dispatchedEmails.length} proactive email(s).`
        : "All active dose windows are up to date for their current escalation tier.",
  };
}
