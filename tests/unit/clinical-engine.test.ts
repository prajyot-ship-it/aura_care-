import { describe, it, expect } from "vitest";
import {
  evaluateProposedMedication,
  parseHhMmToMinutes,
  circularMinutesDistance,
  formatMinutesToHhMm,
  MedicationDescriptor,
} from "@/domain/clinical-engine";

const ARTHUR_REGIMEN: MedicationDescriptor[] = [
  {
    id: "med-eliquis",
    name: "Eliquis",
    genericName: "Apixaban",
    drugClass: "FACTOR_XA_ANTICOAGULANT",
    dosage: "5 mg",
    scheduledTimes: ["08:00", "20:00"],
    foodRule: "ANY",
    status: "ACTIVE",
  },
  {
    id: "med-levothyroxine",
    name: "Levothyroxine",
    genericName: "Levothyroxine Sodium",
    drugClass: "THYROID_HORMONE",
    dosage: "75 mcg",
    scheduledTimes: ["06:30"],
    foodRule: "EMPTY_STOMACH",
    status: "ACTIVE",
  },
  {
    id: "med-atorvastatin",
    name: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    drugClass: "STATIN",
    dosage: "20 mg",
    scheduledTimes: ["21:00"],
    foodRule: "BEFORE_SLEEP",
    status: "ACTIVE",
  },
  {
    id: "med-lisinopril",
    name: "Lisinopril",
    genericName: "Lisinopril",
    drugClass: "ACE_INHIBITOR",
    dosage: "10 mg",
    scheduledTimes: ["08:00"],
    foodRule: "WITH_FOOD",
    status: "ACTIVE",
  },
];

describe("clinical-engine: Isomorphic Polypharmacy & Circadian Chelation Solver", () => {
  it("flags Ibuprofen + Eliquis as CRITICAL bleeding risk (passed: false)", () => {
    const result = evaluateProposedMedication(
      {
        name: "Ibuprofen",
        genericName: "Ibuprofen",
        drugClass: "NSAID",
        dosage: "400 mg",
        scheduledTimes: ["08:00", "20:00"],
        foodRule: "WITH_FOOD",
      },
      ARTHUR_REGIMEN
    );

    expect(result.passed).toBe(false);
    expect(result.highestSeverity).toBe("CRITICAL");
    expect(result.alerts.some((a) => a.category === "DRUG_INTERACTION")).toBe(true);
    expect(result.alerts[0]?.conflictingMedication).toContain("Eliquis");
  });

  it("flags Calcium Carbonate @ 07:00 + Levothyroxine @ 06:30 as WARNING chelation conflict and hints >= 10:30", () => {
    const result = evaluateProposedMedication(
      {
        name: "Calcium Carbonate",
        genericName: "Elemental Calcium",
        drugClass: "SUPPLEMENT",
        dosage: "600 mg",
        scheduledTimes: ["07:00"],
        foodRule: "WITH_FOOD",
      },
      ARTHUR_REGIMEN
    );

    expect(result.passed).toBe(false);
    expect(result.highestSeverity).toBe("WARNING");
    const alert = result.alerts.find((a) => a.category === "CIRCADIAN_CHELATION");
    expect(alert).toBeDefined();
    expect(alert?.safeWindowHint).toBe(">= 10:30");
  });

  it("passes Calcium Carbonate @ 12:00 + Levothyroxine @ 06:30 with CLEAR (passed: true)", () => {
    const result = evaluateProposedMedication(
      {
        name: "Calcium Carbonate",
        genericName: "Elemental Calcium",
        drugClass: "SUPPLEMENT",
        dosage: "600 mg",
        scheduledTimes: ["12:00"],
        foodRule: "WITH_FOOD",
      },
      ARTHUR_REGIMEN
    );

    expect(result.passed).toBe(true);
    expect(result.highestSeverity).toBe("CLEAR");
    expect(result.alerts).toHaveLength(0);
  });

  it("flags duplicate therapeutic class (Simvastatin + Atorvastatin)", () => {
    const result = evaluateProposedMedication(
      {
        name: "simvastatin",
        genericName: "SIMVASTATIN",
        drugClass: "STATIN",
        dosage: "20 mg",
        scheduledTimes: ["21:00"],
        foodRule: "BEFORE_SLEEP",
      },
      ARTHUR_REGIMEN
    );

    expect(result.passed).toBe(false);
    expect(result.highestSeverity).toBe("WARNING");
    expect(result.alerts.some((a) => a.category === "DUPLICATE_CLASS")).toBe(true);
  });

  it("handles midnight wrap-around chelation timing (23:30 vs 01:00 = 90 min < 240 min)", () => {
    const midnightRegimen: MedicationDescriptor[] = [
      {
        id: "thyroid-night",
        name: "Levothyroxine",
        genericName: "Levothyroxine",
        drugClass: "THYROID_HORMONE",
        dosage: "75 mcg",
        scheduledTimes: ["23:30"],
        foodRule: "EMPTY_STOMACH",
        status: "ACTIVE",
      },
    ];

    const result = evaluateProposedMedication(
      {
        name: "Magnesium Oxide",
        genericName: "Magnesium",
        drugClass: "Mineral",
        dosage: "400 mg",
        scheduledTimes: ["01:00"],
        foodRule: "ANY",
      },
      midnightRegimen
    );

    expect(result.passed).toBe(false);
    expect(result.highestSeverity).toBe("WARNING");
    expect(circularMinutesDistance(23 * 60 + 30, 60)).toBe(90);
  });

  it("handles empty regimen and utility time helpers safely", () => {
    const result = evaluateProposedMedication(
      {
        name: "Amlodipine",
        genericName: "Amlodipine Besylate",
        drugClass: "CALCIUM_CHANNEL_BLOCKER",
        dosage: "5 mg",
        scheduledTimes: ["08:00"],
        foodRule: "ANY",
      },
      []
    );
    expect(result.passed).toBe(true);
    expect(result.highestSeverity).toBe("CLEAR");

    expect(parseHhMmToMinutes("06:30")).toBe(390);
    expect(parseHhMmToMinutes("25:99")).toBeNull();
    expect(parseHhMmToMinutes("invalid")).toBeNull();
    expect(formatMinutesToHhMm(1500)).toBe("01:00");
  });

  it("flags ACE Inhibitor + Spironolactone as CRITICAL hyperkalemia risk", () => {
    const result = evaluateProposedMedication(
      {
        name: "Spironolactone",
        genericName: "Spironolactone",
        drugClass: "POTASSIUM_SPARING_DIURETIC",
        dosage: "25 mg",
        scheduledTimes: ["08:00"],
        foodRule: "WITH_FOOD",
      },
      ARTHUR_REGIMEN
    );

    expect(result.passed).toBe(false);
    expect(result.highestSeverity).toBe("CRITICAL");
    expect(result.alerts.some((a) => a.id.includes("ace-potassium"))).toBe(true);
  });

  it("handles reverse direction interactions (Anticoagulant added to NSAID, Thyroid added to Calcium)", () => {
    const regimen: MedicationDescriptor[] = [
      {
        id: "med-ibu",
        name: "Ibuprofen",
        genericName: "Ibuprofen",
        drugClass: "NSAID",
        dosage: "400 mg",
        scheduledTimes: ["08:00"],
        foodRule: "WITH_FOOD",
        status: "ACTIVE",
      },
      {
        id: "med-cal",
        name: "Calcium Carbonate",
        genericName: "Calcium",
        drugClass: "Mineral",
        dosage: "600 mg",
        scheduledTimes: ["07:00"],
        foodRule: "WITH_FOOD",
        status: "ACTIVE",
      },
    ];

    const anticoagResult = evaluateProposedMedication(
      {
        name: "Eliquis",
        genericName: "Apixaban",
        drugClass: "ANTICOAGULANT",
        dosage: "5 mg",
        scheduledTimes: ["08:00"],
        foodRule: "ANY",
      },
      regimen
    );
    expect(anticoagResult.highestSeverity).toBe("CRITICAL");

    const thyroidResult = evaluateProposedMedication(
      {
        name: "Levothyroxine",
        genericName: "Levothyroxine",
        drugClass: "THYROID_HORMONE",
        dosage: "75 mcg",
        scheduledTimes: ["06:30"],
        foodRule: "EMPTY_STOMACH",
      },
      regimen
    );
    expect(thyroidResult.highestSeverity).toBe("WARNING");
  });
});
