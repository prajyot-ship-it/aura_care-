import { describe, it, expect } from "vitest";
import {
  acquireDoseMutexLock,
  MutexConflictError,
  createProposedMedication,
  approveProposedMedication,
  holdProposedMedication,
  filterActiveScheduleMedications,
  MutexDoseRecord,
} from "@/domain/dose-mutex";

describe("dose-mutex: Atomic Double-Dose OCC Mutex & Sovereign Co-Sign", () => {
  const initialDose: MutexDoseRecord = {
    id: "dose-eliquis-am",
    medicationId: "med-eliquis",
    scheduledFor: "2026-11-15T08:00:00",
    status: "PENDING",
    lockVersion: 1,
    loggedAt: null,
    loggedByName: null,
    note: null,
  };

  it("increments lockVersion (1 -> 2) and records caregiver attribution on TAKEN", () => {
    const updated = acquireDoseMutexLock(initialDose, {
      action: "TAKEN",
      actorName: "David Ortiz, RN",
      expectedLockVersion: 1,
      note: "Morning dose verified",
      nowIso: "2026-11-15T08:02:00.000Z",
    });

    expect(updated.status).toBe("TAKEN");
    expect(updated.lockVersion).toBe(2);
    expect(updated.loggedByName).toBe("David Ortiz, RN");
    expect(updated.loggedAt).toBe("2026-11-15T08:02:00.000Z");
  });

  it("supports SNOOZED_15M and SKIPPED transitions when lockVersion matches", () => {
    const snoozed = acquireDoseMutexLock(initialDose, {
      action: "SNOOZED_15M",
      actorName: "Arthur Pendelton",
      expectedLockVersion: 1,
    });

    expect(snoozed.status).toBe("SNOOZED");
    expect(snoozed.lockVersion).toBe(2);

    const skipped = acquireDoseMutexLock(snoozed, {
      action: "SKIPPED",
      actorName: "Arthur Pendelton",
      expectedLockVersion: 2,
    });
    expect(skipped.status).toBe("SKIPPED");
    expect(skipped.lockVersion).toBe(3);
  });

  it("throws MutexConflictError (HTTP_409_CONFLICT) on stale expectedLockVersion", () => {
    const lockedByNurse = acquireDoseMutexLock(initialDose, {
      action: "TAKEN",
      actorName: "David Ortiz, RN",
      expectedLockVersion: 1,
      nowIso: "2026-11-15T08:02:00.000Z",
    });

    expect(() =>
      acquireDoseMutexLock(lockedByNurse, {
        action: "TAKEN",
        actorName: "Maya Pendelton",
        expectedLockVersion: 1,
      })
    ).toThrowError(MutexConflictError);

    try {
      acquireDoseMutexLock(lockedByNurse, {
        action: "TAKEN",
        actorName: "Maya Pendelton",
        expectedLockVersion: 1,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(MutexConflictError);
      const conflict = err as MutexConflictError;
      expect(conflict.code).toBe("HTTP_409_CONFLICT");
      expect(conflict.statusCode).toBe(409);
      expect(conflict.winningCaregiver).toBe("David Ortiz, RN");
      expect(conflict.currentLockVersion).toBe(2);
    }
  });

  it("enforces Sovereign Co-Sign: PROPOSED med stays out of active schedule until approveProposedMedication()", () => {
    const proposed = createProposedMedication({
      id: "med-vitd3",
      name: "Vitamin D3",
      dosage: "2000 IU",
      proposedByName: "Maya Pendelton",
    });

    expect(proposed.status).toBe("PROPOSED");
    expect(filterActiveScheduleMedications([proposed])).toHaveLength(0);

    const approved = approveProposedMedication(proposed, "Sounds good!");
    expect(approved.status).toBe("ELDER_APPROVED");
    expect(filterActiveScheduleMedications([approved])).toHaveLength(1);

    const held = holdProposedMedication(proposed, "Ask Dr. Vance first");
    expect(held.status).toBe("HELD_FOR_MD");
    expect(filterActiveScheduleMedications([held])).toHaveLength(0);

    // Default notes when omitted
    const approvedDefault = approveProposedMedication(proposed);
    expect(approvedDefault.elderResponseNote).toBe("Approved by Elder Sovereign");
    const heldDefault = holdProposedMedication(proposed);
    expect(heldDefault.elderResponseNote).toBe("Held for Physician Review");
  });
});
