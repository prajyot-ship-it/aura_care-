import { describe, it, expect } from "vitest";
import { safeHydrateState, verifyVaultPin } from "@/domain/schemas";

function createCleanSeed() {
  return {
    vault: {
      id: "vault-aura-7842",
      vaultCode: "AURA-7842",
      elderName: "Arthur Pendelton",
      elderAge: 78,
      bloodType: "O+",
      allergies: ["Penicillin"],
      primaryPhysician: "Dr. Eleanor Vance, MD",
      shareSymptomNotes: true,
      requireElderApproval: true,
      autoEscalateMissed: true,
    },
    members: [{ id: "mem-arthur", name: "Arthur Pendelton" }],
    medications: [
      {
        id: "med-eliquis",
        name: "Eliquis",
        genericName: "Apixaban",
        drugClass: "ANTICOAGULANT",
        dosage: "5 mg",
        frequency: "Twice Daily",
        scheduledTimes: ["08:00", "20:00"],
        foodRule: "ANY",
        instructions: "Take twice daily",
        pillShape: "OVAL",
        pillColorPrimary: "#F472B6",
        pillColorSecondary: "#FBCFE8",
        pillImprint: "894",
        stockCount: 5,
        refillThreshold: 7,
        status: "ACTIVE",
      },
    ],
    todayDoses: [],
    adherenceSummary: {
      trailing30DayPercent: 94,
      takenCount: 113,
      missedOrSkippedCount: 7,
      totalEvaluated: 120,
      dailyHeatmap: [],
    },
    pendingProposals: [],
    appointments: [],
    wellnessCheckIns: [],
    emails: [],
  };
}

describe("security-schemas: Zod Hydration & SHA-256 PIN Verification", () => {
  it("rejects malformed JSON and falls back cleanly", () => {
    const hydrated = safeHydrateState("{not-valid-json", createCleanSeed);
    expect(hydrated.vault.vaultCode).toBe("AURA-7842");
  });

  it("rejects JSON missing required schema fields", () => {
    const hydrated = safeHydrateState(
      JSON.stringify({ vault: { vaultCode: "AURA-7842" } }),
      createCleanSeed
    );
    expect(hydrated.medications).toHaveLength(1);
    expect(hydrated.vault.elderName).toBe("Arthur Pendelton");
  });

  it("rejects __proto__ prototype-pollution payload and returns clean seed", () => {
    const malicious = JSON.stringify(createCleanSeed()).replace(
      '"vaultCode":"AURA-7842"',
      '"vaultCode":"AURA-7842","__proto__":{"polluted":true}'
    );
    const hydrated = safeHydrateState(malicious, createCleanSeed);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(hydrated.vault.vaultCode).toBe("AURA-7842");
  });

  it("hydrates valid persisted state faithfully", () => {
    const valid = createCleanSeed();
    valid.vault.elderAge = 79;
    const hydrated = safeHydrateState(JSON.stringify(valid), createCleanSeed);
    expect(hydrated.vault.elderAge).toBe(79);
  });

  it("verifies SHA-256 PIN digests for 111111, 222222, 333333 and rejects 000000", async () => {
    const elder = await verifyVaultPin("111111");
    expect(elder?.role).toBe("ELDER");
    expect(elder?.redirectPath).toBe("/elder");

    const caregiver = await verifyVaultPin("222222");
    expect(caregiver?.role).toBe("CAREGIVER");
    expect(caregiver?.redirectPath).toBe("/dashboard");

    const nurse = await verifyVaultPin("333333");
    expect(nurse?.role).toBe("NURSE");
    expect(nurse?.redirectPath).toBe("/dashboard");

    const invalid = await verifyVaultPin("000000");
    expect(invalid).toBeNull();

    const malformed = await verifyVaultPin("abc");
    expect(malformed).toBeNull();
  });
});
