/**
 * @module clinical-engine
 * @description Isomorphic Polypharmacy & Circadian Chelation Solver for AURA•CARE.
 * Pure, deterministic, zero-side-effect TypeScript engine that runs identically on
 * the Node.js server and in static client-side exports (GitHub Pages).
 */

export type AlertSeverity = "CRITICAL" | "WARNING" | "CLEAR";

export interface ClinicalAlert {
  id: string;
  severity: AlertSeverity;
  category: "DRUG_INTERACTION" | "CIRCADIAN_CHELATION" | "DUPLICATE_CLASS";
  title: string;
  rationale: string;
  conflictingMedication: string;
  recommendedAction: string;
  safeWindowHint?: string;
}

export interface ClinicalEvaluationResult {
  passed: boolean;
  highestSeverity: AlertSeverity;
  alerts: ClinicalAlert[];
  evaluatedAtIso: string;
}

export interface MedicationDescriptor {
  id?: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosage: string;
  scheduledTimes: string[];
  foodRule: string;
  status?: string;
}

const ANTICOAGULANT_TERMS = [
  "anticoagulant",
  "factor_xa_anticoagulant",
  "apixaban",
  "eliquis",
  "warfarin",
  "rivaroxaban",
  "xarelto",
  "dabigatran",
  "edoxaban",
  "clopidogrel",
];

const NSAID_TERMS = [
  "nsaid",
  "ibuprofen",
  "naproxen",
  "aspirin",
  "celecoxib",
  "meloxicam",
  "diclofenac",
  "ketorolac",
  "indomethacin",
];

const THYROID_TERMS = [
  "thyroid_hormone",
  "thyroid",
  "levothyroxine",
  "synthroid",
  "liothyronine",
  "tirosint",
];

const POLYVALENT_CATION_TERMS = [
  "calcium",
  "iron",
  "ferrous",
  "magnesium",
  "multivitamin",
  "antacid",
  "tums",
  "mineral supplement",
  "sucralfate",
];

const STATIN_TERMS = [
  "statin",
  "atorvastatin",
  "simvastatin",
  "rosuvastatin",
  "pravastatin",
  "lovastatin",
];

const ACE_ARB_TERMS = [
  "ace_inhibitor",
  "ace inhibitor",
  "lisinopril",
  "enalapril",
  "ramipril",
  "losartan",
  "valsartan",
];

const POTASSIUM_TERMS = [
  "potassium",
  "spironolactone",
  "eplerenone",
  "amiloride",
];

function matchesAnyTerm(med: MedicationDescriptor, terms: string[]): boolean {
  const haystack = `${med.name} ${med.genericName} ${med.drugClass}`.toLowerCase();
  return terms.some((t) => haystack.includes(t.toLowerCase()));
}

/**
 * Parses an "HH:mm" time string into minutes since midnight [0, 1439].
 * Returns null if the string is not valid 24-hour HH:mm notation.
 */
export function parseHhMmToMinutes(hhmm: string): number | null {
  const trimmed = hhmm.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

/**
 * Computes shortest circular distance in minutes across a 24-hour (1440-minute) clock.
 * Handles midnight wrap-around (e.g., 23:30 vs 00:30 = 60 minutes).
 */
export function circularMinutesDistance(minA: number, minB: number): number {
  const diff = Math.abs(minA - minB);
  return Math.min(diff, 1440 - diff);
}

/**
 * Formats minutes since midnight into "HH:mm".
 */
export function formatMinutesToHhMm(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Evaluates a candidate medication against an existing active/pending regimen
 * for severe drug-drug interactions, 4-hour (±240 min) circadian chelation overlaps,
 * and duplicate therapeutic classes.
 *
 * @param candidate - The proposed or edited medication descriptor.
 * @param existingRegimen - Active or pending medications in the CareVault.
 * @returns Deterministic {@link ClinicalEvaluationResult} with explainable rationale.
 */
export function evaluateProposedMedication(
  candidate: MedicationDescriptor,
  existingRegimen: MedicationDescriptor[]
): ClinicalEvaluationResult {
  const alerts: ClinicalAlert[] = [];

  const activeMeds = existingRegimen.filter(
    (m) =>
      (!m.status || m.status === "ACTIVE" || m.status === "PENDING_ELDER_APPROVAL" || m.status === "PROPOSED" || m.status === "ELDER_APPROVED") &&
      (!candidate.id || m.id !== candidate.id)
  );

  for (const existing of activeMeds) {
    // 1. NSAID + Anticoagulant Rule (CRITICAL)
    const isNsaidAnticoag =
      (matchesAnyTerm(candidate, NSAID_TERMS) &&
        matchesAnyTerm(existing, ANTICOAGULANT_TERMS)) ||
      (matchesAnyTerm(candidate, ANTICOAGULANT_TERMS) &&
        matchesAnyTerm(existing, NSAID_TERMS));

    if (isNsaidAnticoag) {
      alerts.push({
        id: `critical-nsaid-anticoag-${existing.id ?? existing.name}`,
        severity: "CRITICAL",
        category: "DRUG_INTERACTION",
        title: "Major Bleeding Risk: NSAID + Factor Xa Anticoagulant",
        rationale: `${candidate.name} (${candidate.dosage}) inhibits platelet COX-1 and erodes gastric mucosa. Combined with ${existing.name} (${existing.genericName} ${existing.dosage}), gastrointestinal and systemic hemorrhage risk increases >3-fold.`,
        conflictingMedication: `${existing.name} (${existing.dosage})`,
        recommendedAction:
          "Avoid systemic NSAIDs while anticoagulated. Consult attending cardiologist for non-NSAID analgesic alternatives or confirm explicit clinical override.",
      });
    }

    // 2. ACE Inhibitor / ARB + Potassium Agent (CRITICAL)
    const isAcePotassium =
      (matchesAnyTerm(candidate, ACE_ARB_TERMS) &&
        matchesAnyTerm(existing, POTASSIUM_TERMS)) ||
      (matchesAnyTerm(candidate, POTASSIUM_TERMS) &&
        matchesAnyTerm(existing, ACE_ARB_TERMS));

    if (isAcePotassium) {
      alerts.push({
        id: `critical-ace-potassium-${existing.id ?? existing.name}`,
        severity: "CRITICAL",
        category: "DRUG_INTERACTION",
        title: "Hyperkalemia Risk: ACE Inhibitor + Potassium-Sparing Agent",
        rationale: `${existing.name} decreases renal potassium excretion; co-administration with ${candidate.name} can precipitate severe hyperkalemia.`,
        conflictingMedication: `${existing.name} (${existing.dosage})`,
        recommendedAction: "Verify serum potassium BMP before co-prescribing.",
      });
    }

    // 3. Thyroid Hormone + Polyvalent Cation Chelation Rule (WARNING within ±240 min)
    const candidateIsThyroid = matchesAnyTerm(candidate, THYROID_TERMS);
    const existingIsThyroid = matchesAnyTerm(existing, THYROID_TERMS);
    const candidateIsCation = matchesAnyTerm(candidate, POLYVALENT_CATION_TERMS);
    const existingIsCation = matchesAnyTerm(existing, POLYVALENT_CATION_TERMS);

    if (
      (candidateIsThyroid && existingIsCation) ||
      (existingIsThyroid && candidateIsCation)
    ) {
      const thyroidMed = existingIsThyroid ? existing : candidate;
      const cationMed = existingIsThyroid ? candidate : existing;

      const thyroidMins = thyroidMed.scheduledTimes
        .map(parseHhMmToMinutes)
        .filter((v): v is number => v !== null);
      const cationMins = cationMed.scheduledTimes
        .map(parseHhMmToMinutes)
        .filter((v): v is number => v !== null);

      let minGap = Infinity;
      let anchorMin = 390; // default 06:30
      for (const tm of thyroidMins) {
        for (const cm of cationMins) {
          const dist = circularMinutesDistance(tm, cm);
          if (dist < minGap) {
            minGap = dist;
            anchorMin = tm;
          }
        }
      }

      if (minGap < 240) {
        const safeStart = formatMinutesToHhMm(anchorMin + 240);
        const suggestedLunch = formatMinutesToHhMm(
          Math.max(anchorMin + 240, 12 * 60 + 30)
        );
        alerts.push({
          id: `warning-chelation-${existing.id ?? existing.name}`,
          severity: "WARNING",
          category: "CIRCADIAN_CHELATION",
          title: "4-Hour Thyroid Chelation Buffer Violation",
          rationale: `Polyvalent cations (${cationMed.name}) bind ${thyroidMed.name} in the GI tract, reducing thyroid hormone absorption by 35%–42%. Current separation is ${minGap} minutes (< 240 min required).`,
          conflictingMedication: `${existing.name} (${existing.dosage})`,
          recommendedAction: `Reschedule ${cationMed.name} to >= ${safeStart} (recommended midday window: ${suggestedLunch}).`,
          safeWindowHint: `>= ${safeStart}`,
        });
      }
    }

    // 4. Duplicate Therapeutic Class Rule (WARNING)
    const sameDrugClass =
      candidate.drugClass.trim().length > 0 &&
      existing.drugClass.trim().length > 0 &&
      candidate.drugClass.trim().toLowerCase() ===
        existing.drugClass.trim().toLowerCase();

    const bothStatins =
      matchesAnyTerm(candidate, STATIN_TERMS) &&
      matchesAnyTerm(existing, STATIN_TERMS);

    const bothNsaids =
      matchesAnyTerm(candidate, NSAID_TERMS) &&
      matchesAnyTerm(existing, NSAID_TERMS);

    if (sameDrugClass || bothStatins || bothNsaids) {
      alerts.push({
        id: `warning-duplicate-class-${existing.id ?? existing.name}`,
        severity: "WARNING",
        category: "DUPLICATE_CLASS",
        title: `Duplicate Therapeutic Class (${candidate.drugClass})`,
        rationale: `${candidate.name} overlaps with active ${existing.name} in the same therapeutic class (${existing.drugClass}), increasing cumulative toxicity without added efficacy.`,
        conflictingMedication: `${existing.name} (${existing.dosage})`,
        recommendedAction:
          "Confirm whether this is a replacement therapy or discontinue duplicate agent.",
      });
    }
  }

  let highestSeverity: AlertSeverity = "CLEAR";
  if (alerts.some((a) => a.severity === "CRITICAL")) {
    highestSeverity = "CRITICAL";
  } else if (alerts.some((a) => a.severity === "WARNING")) {
    highestSeverity = "WARNING";
  }

  return {
    passed: alerts.length === 0,
    highestSeverity,
    alerts,
    evaluatedAtIso: new Date().toISOString(),
  };
}
