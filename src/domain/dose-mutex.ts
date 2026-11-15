/**
 * @module dose-mutex
 * @description Optimistic Concurrency Control (OCC) Atomic Dose Mutex &
 * Sovereign Elder Co-Sign State Machine for AURA•CARE.
 */

export type DoseAction = "TAKEN" | "SNOOZED_15M" | "SKIPPED";

export interface MutexDoseRecord {
  id: string;
  medicationId: string;
  scheduledFor: string;
  status: string;
  lockVersion: number;
  loggedAt: string | null;
  loggedByName: string | null;
  note: string | null;
}

export type ProposalStatus = "PROPOSED" | "ELDER_APPROVED" | "HELD_FOR_MD";

export interface SovereignMedicationProposal {
  id: string;
  name: string;
  dosage: string;
  status: ProposalStatus;
  proposedByName: string;
  elderResponseNote?: string | null;
  decidedAtIso?: string | null;
}

/**
 * Typed error thrown when an optimistic concurrency lock version check fails.
 */
export class MutexConflictError extends Error {
  public readonly code = "HTTP_409_CONFLICT" as const;
  public readonly statusCode = 409 as const;
  public readonly currentLockVersion: number;
  public readonly winningCaregiver: string;
  public readonly winningTimestamp: string;

  constructor(params: {
    currentLockVersion: number;
    winningCaregiver: string;
    winningTimestamp: string;
    doseId: string;
  }) {
    super(
      `HTTP 409 Atomic Mutex Conflict on ${params.doseId}: Already locked (v${params.currentLockVersion}) by ${params.winningCaregiver} at ${params.winningTimestamp}. Duplicate administration blocked.`
    );
    this.name = "MutexConflictError";
    this.currentLockVersion = params.currentLockVersion;
    this.winningCaregiver = params.winningCaregiver;
    this.winningTimestamp = params.winningTimestamp;
  }
}

/**
 * Executes an atomic compare-and-swap dose confirmation or snooze using `expectedLockVersion`.
 * Throws {@link MutexConflictError} (`HTTP_409_CONFLICT`) if another caregiver or elder
 * already mutated the dose record.
 *
 * @param currentDose - Current persisted dose record.
 * @param params - Transition action, actor name, expected lock version, and optional note.
 * @returns Updated immutable dose record with `lockVersion` incremented by 1.
 */
export function acquireDoseMutexLock(
  currentDose: MutexDoseRecord,
  params: {
    action: DoseAction;
    actorName: string;
    expectedLockVersion: number;
    note?: string;
    nowIso?: string;
  }
): MutexDoseRecord {
  if (params.expectedLockVersion !== currentDose.lockVersion) {
    throw new MutexConflictError({
      doseId: currentDose.id,
      currentLockVersion: currentDose.lockVersion,
      winningCaregiver: currentDose.loggedByName || "Care-Circle Member",
      winningTimestamp: currentDose.loggedAt || new Date().toISOString(),
    });
  }

  const nowIso = params.nowIso || new Date().toISOString();
  const nextStatus =
    params.action === "TAKEN"
      ? "TAKEN"
      : params.action === "SNOOZED_15M"
        ? "SNOOZED"
        : "SKIPPED";

  return {
    ...currentDose,
    status: nextStatus,
    lockVersion: currentDose.lockVersion + 1,
    loggedAt: nowIso,
    loggedByName: params.actorName,
    note: params.note ?? currentDose.note,
  };
}

/**
 * Creates a new caregiver-proposed medication in the `PROPOSED` state.
 * Proposed medications cannot enter the active daily schedule until elder approval.
 */
export function createProposedMedication(params: {
  id: string;
  name: string;
  dosage: string;
  proposedByName: string;
}): SovereignMedicationProposal {
  return {
    id: params.id,
    name: params.name,
    dosage: params.dosage,
    status: "PROPOSED",
    proposedByName: params.proposedByName,
    elderResponseNote: null,
    decidedAtIso: null,
  };
}

/**
 * Transitions a `PROPOSED` medication to `ELDER_APPROVED` via Sovereign Co-Sign.
 */
export function approveProposedMedication(
  proposal: SovereignMedicationProposal,
  elderResponseNote?: string
): SovereignMedicationProposal {
  return {
    ...proposal,
    status: "ELDER_APPROVED",
    elderResponseNote: elderResponseNote ?? "Approved by Elder Sovereign",
    decidedAtIso: new Date().toISOString(),
  };
}

/**
 * Transitions a `PROPOSED` medication to `HELD_FOR_MD` for physician consultation.
 */
export function holdProposedMedication(
  proposal: SovereignMedicationProposal,
  elderResponseNote?: string
): SovereignMedicationProposal {
  return {
    ...proposal,
    status: "HELD_FOR_MD",
    elderResponseNote: elderResponseNote ?? "Held for Physician Review",
    decidedAtIso: new Date().toISOString(),
  };
}

/**
 * Returns only medications that are active or elder-approved for daily dose generation.
 */
export function filterActiveScheduleMedications<
  T extends { status: string },
>(medications: T[]): T[] {
  return medications.filter(
    (m) => m.status === "ACTIVE" || m.status === "ELDER_APPROVED"
  );
}
