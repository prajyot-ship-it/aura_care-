import { FoodRule, MedFrequency, PillShape } from "./types";

export type ConflictSeverity = "SEVERE" | "TIMING_CONFLICT" | "DUPLICATE_THERAPY" | "CIRCADIAN_ADVISORY";

export interface ExistingMedicationSummary {
  id: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  scheduledTimes: string[]; // ["08:00", "20:00"]
  foodRule: FoodRule | string;
  status: string;
}

export interface CandidateMedicationInput {
  id?: string; // omit if new, provide if editing existing
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  scheduledTimes: string[];
  foodRule: FoodRule | string;
}

export interface PolypharmacyConflict {
  id: string;
  severity: ConflictSeverity;
  title: string;
  conflictingMedicationName: string;
  conflictingMedicationId: string;
  mechanism: string;
  clinicalRecommendation: string;
  requiresExplicitOverride: boolean;
  recommendedTimes?: string[];
  recommendedFoodRule?: FoodRule;
}

export interface PolypharmacyEvaluationResult {
  hasConflicts: boolean;
  hasSevereConflict: boolean;
  hasTimingConflict: boolean;
  hasDuplicateTherapy: boolean;
  conflicts: PolypharmacyConflict[];
  evaluatedAt: string;
}

export interface MedicationPreset {
  label: string;
  badge: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  frequency: MedFrequency;
  scheduledTimes: string[];
  foodRule: FoodRule;
  instructions: string;
  pillShape: PillShape;
  pillColorPrimary: string;
  pillColorSecondary: string;
  pillImprint: string;
}

export const CLINICAL_MEDICATION_PRESETS: MedicationPreset[] = [
  {
    label: "Ibuprofen 400 mg (Test NSAID + Eliquis Conflict)",
    badge: "Triggers Severe Bleeding Alert",
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    drugClass: "NSAID",
    dosage: "400 mg",
    frequency: "TWICE_DAILY",
    scheduledTimes: ["08:00", "20:00"],
    foodRule: "WITH_FOOD",
    instructions: "Take with food or milk to reduce stomach upset.",
    pillShape: "OVAL",
    pillColorPrimary: "#EA580C",
    pillColorSecondary: "#FDBA74",
    pillImprint: "IBU400",
  },
  {
    label: "Calcium Carbonate 600 mg @ 07:00 (Test Levothyroxine Spacing)",
    badge: "Triggers 4h Chelation Spacing Alert",
    name: "Calcium Carbonate",
    genericName: "Elemental Calcium",
    drugClass: "Mineral Supplement",
    dosage: "600 mg",
    frequency: "DAILY",
    scheduledTimes: ["07:00"],
    foodRule: "WITH_FOOD",
    instructions: "Take with meals for bone support. Keep 4 hours apart from thyroid medications.",
    pillShape: "OVAL",
    pillColorPrimary: "#F8FAFC",
    pillColorSecondary: "#CBD5E1",
    pillImprint: "CAL600",
  },
  {
    label: "Simvastatin 20 mg (Test Duplicate Statin Class)",
    badge: "Triggers Duplicate Class Alert",
    name: "Simvastatin",
    genericName: "Simvastatin",
    drugClass: "Statin (Cholesterol)",
    dosage: "20 mg",
    frequency: "DAILY",
    scheduledTimes: ["21:00"],
    foodRule: "BEFORE_SLEEP",
    instructions: "Take in the evening before bed. Avoid grapefruit juice.",
    pillShape: "ROUND",
    pillColorPrimary: "#FBBF24",
    pillColorSecondary: "#FEF3C7",
    pillImprint: "ZOC20",
  },
  {
    label: "Amlodipine 5 mg (Safe Calcium Channel Blocker)",
    badge: "No Interaction Conflict",
    name: "Amlodipine",
    genericName: "Amlodipine Besylate",
    drugClass: "Calcium Channel Blocker",
    dosage: "5 mg",
    frequency: "DAILY",
    scheduledTimes: ["12:00"],
    foodRule: "ANYTIME",
    instructions: "Take once daily at midday with a full glass of water.",
    pillShape: "DIAMOND",
    pillColorPrimary: "#FFFFFF",
    pillColorSecondary: "#E2E8F0",
    pillImprint: "NOR5",
  },
];

function parseTimeToMinutes(hhmm: string): number | null {
  const parts = hhmm.trim().split(":");
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getCircularMinutesDiff(m1: number, m2: number): number {
  const diff = Math.abs(m1 - m2);
  return Math.min(diff, 1440 - diff);
}

function matchesKeywordSet(
  med: { name: string; genericName: string; drugClass: string },
  keywords: string[]
): boolean {
  const haystack = `${med.name} ${med.genericName} ${med.drugClass}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

const ANTICOAGULANT_KEYWORDS = [
  "anticoagulant",
  "apixaban",
  "eliquis",
  "warfarin",
  "coumadin",
  "rivaroxaban",
  "xarelto",
  "dabigatran",
  "pradaxa",
  "edoxaban",
  "clopidogrel",
  "plavix",
  "blood thinner",
];

const NSAID_KEYWORDS = [
  "nsaid",
  "ibuprofen",
  "advil",
  "motrin",
  "naproxen",
  "aleve",
  "aspirin",
  "celecoxib",
  "celebrex",
  "meloxicam",
  "mobic",
  "diclofenac",
  "ketorolac",
  "indomethacin",
];

const THYROID_KEYWORDS = [
  "thyroid",
  "levothyroxine",
  "synthroid",
  "liothyronine",
  "cytomel",
  "armour thyroid",
  "tirosint",
];

const MULTIVALENT_CATION_KEYWORDS = [
  "calcium",
  "iron",
  "ferrous",
  "magnesium",
  "antacid",
  "tums",
  "mineral supplement",
  "multivitamin with iron",
  "sucralfate",
];

const ACE_ARB_KEYWORDS = [
  "lisinopril",
  "enalapril",
  "ramipril",
  "benazepril",
  "losartan",
  "valsartan",
  "irbesartan",
  "olmesartan",
  "ace inhibitor",
  "angiotensin",
];

const POTASSIUM_KEYWORDS = [
  "potassium",
  "spironolactone",
  "aldactone",
  "amiloride",
  "triamterene",
  "eplerenone",
];

const STATIN_KEYWORDS = [
  "statin",
  "atorvastatin",
  "lipitor",
  "simvastatin",
  "zocor",
  "rosuvastatin",
  "crestor",
  "pravastatin",
  "lovastatin",
  "cholesterol",
];

function computeSafeFourHourSpacing(
  anchorTimes: string[],
  candidateCount: number
): string[] {
  const anchorMinutes = anchorTimes
    .map(parseTimeToMinutes)
    .filter((m): m is number => m !== null);

  if (anchorMinutes.length === 0) {
    return ["12:30"];
  }

  // Prefer 12:30 (lunchtime) or 4.5 hours after the earliest anchor time
  const primaryAnchor = Math.min(...anchorMinutes);
  const proposedFirst = Math.max(primaryAnchor + 270, 12 * 60); // at least +4.5h or 12:00 PM
  const safeSlots: string[] = [formatMinutesToTime(proposedFirst)];

  if (candidateCount > 1) {
    safeSlots.push(formatMinutesToTime(proposedFirst + 360));
  }
  return safeSlots;
}

export function evaluatePolypharmacyConflicts(
  candidate: CandidateMedicationInput,
  existingMedications: ExistingMedicationSummary[]
): PolypharmacyEvaluationResult {
  const conflicts: PolypharmacyConflict[] = [];

  const activeOrPendingMeds = existingMedications.filter(
    (m) =>
      (m.status === "ACTIVE" || m.status === "PENDING_ELDER_APPROVAL") &&
      (!candidate.id || m.id !== candidate.id)
  );

  for (const existing of activeOrPendingMeds) {
    // 1. Check Anticoagulant + NSAID Severe Contraindication
    const pairIsAnticoagNsaid =
      (matchesKeywordSet(candidate, ANTICOAGULANT_KEYWORDS) &&
        matchesKeywordSet(existing, NSAID_KEYWORDS)) ||
      (matchesKeywordSet(candidate, NSAID_KEYWORDS) &&
        matchesKeywordSet(existing, ANTICOAGULANT_KEYWORDS));

    if (pairIsAnticoagNsaid) {
      conflicts.push({
        id: `severe-bleed-${existing.id}`,
        severity: "SEVERE",
        title: "Major Bleeding Risk: NSAID + Anticoagulant Co-Administration",
        conflictingMedicationName: `${existing.name} (${existing.dosage})`,
        conflictingMedicationId: existing.id,
        mechanism: `${candidate.name} inhibits platelet cyclooxygenase (COX-1) and causes gastric mucosal irritation. When combined with ${existing.name} (${existing.genericName}), the risk of severe upper gastrointestinal and systemic hemorrhage increases more than 3-fold in older adults.`,
        clinicalRecommendation:
          "Avoid systemic NSAIDs while on anticoagulation therapy. Consider Acetaminophen (Tylenol) or topical analgesics after consulting Dr. Elena Vance. Explicit clinical override required to proceed.",
        requiresExplicitOverride: true,
      });
    }

    // 2. Check ACE Inhibitor / ARB + Potassium / Spironolactone Severe Contraindication
    const pairIsAcePotassium =
      (matchesKeywordSet(candidate, ACE_ARB_KEYWORDS) &&
        matchesKeywordSet(existing, POTASSIUM_KEYWORDS)) ||
      (matchesKeywordSet(candidate, POTASSIUM_KEYWORDS) &&
        matchesKeywordSet(existing, ACE_ARB_KEYWORDS));

    if (pairIsAcePotassium) {
      conflicts.push({
        id: `severe-hyperkalemia-${existing.id}`,
        severity: "SEVERE",
        title: "Hyperkalemia Risk: Renin-Angiotensin Blocker + Potassium Agent",
        conflictingMedicationName: `${existing.name} (${existing.dosage})`,
        conflictingMedicationId: existing.id,
        mechanism: `${existing.name} reduces aldosterone-mediated renal potassium excretion. Adding ${candidate.name} can precipitate dangerous serum potassium elevation (hyperkalemia) and cardiac conduction abnormalities.`,
        clinicalRecommendation:
          "Verify recent basic metabolic panel (BMP) serum potassium levels with primary physician before co-prescribing. Explicit clinical override required.",
        requiresExplicitOverride: true,
      });
    }

    // 3. Check Levothyroxine + Calcium / Iron / Magnesium Chelation Timing Conflict (< 240 mins)
    const candidateIsThyroid = matchesKeywordSet(candidate, THYROID_KEYWORDS);
    const existingIsThyroid = matchesKeywordSet(existing, THYROID_KEYWORDS);
    const candidateIsCation = matchesKeywordSet(
      candidate,
      MULTIVALENT_CATION_KEYWORDS
    );
    const existingIsCation = matchesKeywordSet(
      existing,
      MULTIVALENT_CATION_KEYWORDS
    );

    if (
      (candidateIsThyroid && existingIsCation) ||
      (candidateIsCation && existingIsThyroid)
    ) {
      const candidateMinutes = candidate.scheduledTimes
        .map(parseTimeToMinutes)
        .filter((m): m is number => m !== null);
      const existingMinutes = existing.scheduledTimes
        .map(parseTimeToMinutes)
        .filter((m): m is number => m !== null);

      let minGapMinutes = Infinity;
      let clashingCandidateTime = "";
      let clashingExistingTime = "";

      for (const cTime of candidate.scheduledTimes) {
        const cMin = parseTimeToMinutes(cTime);
        if (cMin === null) continue;
        for (const eTime of existing.scheduledTimes) {
          const eMin = parseTimeToMinutes(eTime);
          if (eMin === null) continue;
          const gap = getCircularMinutesDiff(cMin, eMin);
          if (gap < minGapMinutes) {
            minGapMinutes = gap;
            clashingCandidateTime = cTime;
            clashingExistingTime = eTime;
          }
        }
      }

      if (minGapMinutes < 240) {
        const recommendedTimes = computeSafeFourHourSpacing(
          existing.scheduledTimes,
           Math.max(1, candidateMinutes.length)
        );
        conflicts.push({
          id: `timing-chelation-${existing.id}`,
          severity: "TIMING_CONFLICT",
          title: `GI Absorption Chelation Conflict (${minGapMinutes} min gap < required 240 min)`,
          conflictingMedicationName: `${existing.name} (${existing.dosage} @ ${clashingExistingTime})`,
          conflictingMedicationId: existing.id,
          mechanism: `Polyvalent cations in ${
            candidateIsCation ? candidate.name : existing.name
          } bind directly to ${
            candidateIsThyroid ? candidate.name : existing.name
          } in the gastrointestinal tract, forming insoluble chelates that reduce thyroid hormone absorption by up to 45% when taken within 4 hours (${clashingCandidateTime} vs ${clashingExistingTime}).`,
          clinicalRecommendation: `Separate administration by at least 4 hours (240 minutes). Recommended safe slot for ${candidate.name}: ${recommendedTimes.join(", ")}.`,
          requiresExplicitOverride: false,
          recommendedTimes,
          recommendedFoodRule: candidateIsCation ? "WITH_FOOD" : "EMPTY_STOMACH",
        });
      }
    }

    // 4. Check Duplicate Therapeutic Class / Same Medication
    const sameNameOrGeneric =
      (candidate.name.trim().toLowerCase() ===
        existing.name.trim().toLowerCase() &&
        candidate.name.trim().length > 0) ||
      (candidate.genericName.trim().toLowerCase() ===
        existing.genericName.trim().toLowerCase() &&
        candidate.genericName.trim().length > 0);

    const bothStatins =
      matchesKeywordSet(candidate, STATIN_KEYWORDS) &&
      matchesKeywordSet(existing, STATIN_KEYWORDS);

    const bothAnticoagulants =
      matchesKeywordSet(candidate, ANTICOAGULANT_KEYWORDS) &&
      matchesKeywordSet(existing, ANTICOAGULANT_KEYWORDS);

    const bothAceArb =
      matchesKeywordSet(candidate, ACE_ARB_KEYWORDS) &&
      matchesKeywordSet(existing, ACE_ARB_KEYWORDS);

    const sameDrugClass =
      candidate.drugClass.trim().length > 2 &&
      candidate.drugClass.trim().toLowerCase() ===
        existing.drugClass.trim().toLowerCase() &&
      !["supplement", "vitamin", "other"].includes(
        candidate.drugClass.trim().toLowerCase()
      );

    if (
      sameNameOrGeneric ||
      bothStatins ||
      bothAnticoagulants ||
      bothAceArb ||
      sameDrugClass
    ) {
      conflicts.push({
        id: `duplicate-class-${existing.id}`,
        severity: "DUPLICATE_THERAPY",
        title: sameNameOrGeneric
          ? `Duplicate Active Prescription: ${existing.name}`
          : `Duplicate Therapeutic Class (${existing.drugClass})`,
        conflictingMedicationName: `${existing.name} (${existing.dosage})`,
        conflictingMedicationId: existing.id,
        mechanism: `${candidate.name} (${candidate.genericName}) shares the same pharmacological class or active ingredient as ${existing.name} (${existing.genericName}), risking unintended cumulative dosing toxicity (e.g., myopathy/rhabdomyolysis with dual statins or hypotension with dual antihypertensives).`,
        clinicalRecommendation: `Verify whether ${candidate.name} is intended to replace ${existing.name} rather than run concurrently. Explicit override required to add alongside ${existing.name}.`,
        requiresExplicitOverride: true,
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    hasSevereConflict: conflicts.some((c) => c.severity === "SEVERE"),
    hasTimingConflict: conflicts.some((c) => c.severity === "TIMING_CONFLICT"),
    hasDuplicateTherapy: conflicts.some(
      (c) => c.severity === "DUPLICATE_THERAPY"
    ),
    conflicts,
    evaluatedAt: new Date().toISOString(),
  };
}
