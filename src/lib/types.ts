export type MemberRole = "ELDER_SOVEREIGN" | "PRIMARY_CARETAKER" | "FAMILY_MEMBER";

export type MedFrequency = "DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "WEEKLY";

export type FoodRule = "EMPTY_STOMACH" | "WITH_FOOD" | "BEFORE_SLEEP" | "ANYTIME";

export type PillShape = "ROUND" | "OVAL" | "CAPSULE" | "DIAMOND";

export type MedStatus = "ACTIVE" | "PENDING_ELDER_APPROVAL" | "PAUSED";

export type DoseStatus = "PENDING" | "TAKEN" | "SNOOZED" | "SKIPPED" | "MISSED";

export type ProposalActionType =
  | "ADD_MED"
  | "UPDATE_DOSAGE"
  | "PAUSE_MED"
  | "ADD_APPOINTMENT";

export type ProposalStatus = "PENDING" | "APPROVED" | "HELD_FOR_DOCTOR";

export type AppointmentStatus = "UPCOMING" | "COMPLETED" | "CANCELLED";

export type WellnessMood = "GREAT" | "OKAY" | "TIRED" | "DIZZY" | "NAUSEOUS";

export type EmailTier =
  | "UPCOMING_CUE"
  | "MISSED_NUDGE"
  | "CARE_CIRCLE_ESCALATION"
  | "APPOINTMENT_PREP"
  | "PROPOSAL_NOTICE";

export interface SessionPayload {
  memberId: string;
  vaultId: string;
  vaultCode: string;
  role: MemberRole;
  name: string;
  relationship: string;
  email: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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

export function safeParseJsonArray<T = string>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function safeParseJsonObject<T extends Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T
): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
