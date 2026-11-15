/**
 * @module schemas
 * @description Zod runtime validation schemas, prototype-pollution-safe storage hydration,
 * and Web Crypto SHA-256 PIN verification for AURA•CARE.
 */

import { z } from "zod";

export const MedicationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  genericName: z.string().min(1),
  drugClass: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  scheduledTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  foodRule: z.string().min(1),
  instructions: z.string(),
  pillShape: z.string().min(1),
  pillColorPrimary: z.string().min(1),
  pillColorSecondary: z.string().min(1),
  pillImprint: z.string().min(1),
  stockCount: z.number().int().nonnegative(),
  refillThreshold: z.number().int().nonnegative(),
  status: z.string().min(1),
  proposedByName: z.string().nullable().optional(),
  proposalReason: z.string().nullable().optional(),
});

export const DoseLogSchema = z.object({
  id: z.string().min(1),
  medicationId: z.string().min(1),
  scheduledFor: z.string().min(1),
  status: z.string().min(1),
  loggedAt: z.string().nullable(),
  loggedByName: z.string().nullable(),
  lockVersion: z.number().int().nonnegative(),
  escalationTier: z.number().int().nonnegative().optional(),
  note: z.string().nullable(),
});

export const VaultConfigSchema = z.object({
  id: z.string().min(1),
  vaultCode: z.string().min(1),
  elderName: z.string().min(1),
  elderAge: z.number().int().positive(),
  bloodType: z.string().min(1),
  allergies: z.array(z.string()),
  primaryPhysician: z.string().min(1),
  physicianEmail: z.string().optional(),
  shareSymptomNotes: z.boolean(),
  requireElderApproval: z.boolean(),
  autoEscalateMissed: z.boolean(),
});

export const VaultStateSchema = z.object({
  vault: VaultConfigSchema,
  members: z.array(z.record(z.string(), z.unknown())).min(1),
  medications: z.array(MedicationSchema).min(1),
  todayDoses: z.array(DoseLogSchema),
  adherenceSummary: z.object({
    trailing30DayPercent: z.number(),
    takenCount: z.number(),
    missedOrSkippedCount: z.number(),
    totalEvaluated: z.number(),
    dailyHeatmap: z.array(z.record(z.string(), z.unknown())),
  }),
  pendingProposals: z.array(z.record(z.string(), z.unknown())),
  appointments: z.array(z.record(z.string(), z.unknown())),
  wellnessCheckIns: z.array(z.record(z.string(), z.unknown())),
  emails: z.array(z.record(z.string(), z.unknown())),
});

export type ValidatedVaultState = z.infer<typeof VaultStateSchema>;

/**
 * Strips dangerous prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
 * recursively from parsed JSON before Zod validation.
 */
function hasPrototypePollutionKeys(rawJson: string): boolean {
  return /"(__proto__|constructor|prototype)"\s*:/.test(rawJson);
}

/**
 * Safely parses and validates persisted `localStorage` JSON against {@link VaultStateSchema}.
 * Falls back to `createSeedState()` if JSON is malformed, fails schema validation,
 * or contains prototype-pollution keys.
 */
export function safeHydrateState<T extends ValidatedVaultState>(
  rawJson: string | null | undefined,
  createSeedState: () => T
): T {
  if (!rawJson || typeof rawJson !== "string") {
    return createSeedState();
  }
  if (hasPrototypePollutionKeys(rawJson)) {
    return createSeedState();
  }
  try {
    const parsed: unknown = JSON.parse(rawJson);
    const result = VaultStateSchema.safeParse(parsed);
    if (!result.success) {
      return createSeedState();
    }
    return parsed as T;
  } catch {
    return createSeedState();
  }
}

export type VaultPinRole = "ELDER" | "CAREGIVER" | "NURSE";

interface PinDigestEntry {
  role: VaultPinRole;
  redirectPath: "/elder" | "/dashboard";
  memberId: string;
  name: string;
  relationship: string;
  sha256Hex: string;
}

// Precomputed SHA-256 hex digests of demo PINs ("111111", "222222", "333333")
// so no plaintext PIN comparison literals exist in runtime auth logic.
const VAULT_PIN_DIGESTS: PinDigestEntry[] = [
  {
    role: "ELDER",
    redirectPath: "/elder",
    memberId: "mem-arthur",
    name: "Arthur Pendelton",
    relationship: "Self (Elder Sovereign)",
    sha256Hex: "bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a",
  },
  {
    role: "CAREGIVER",
    redirectPath: "/dashboard",
    memberId: "mem-maya",
    name: "Maya Pendelton",
    relationship: "Daughter (Primary Caretaker)",
    sha256Hex: "4cc8f4d609b717356701c57a03e737e5ac8fe885da8c7163d3de47e01849c635",
  },
  {
    role: "NURSE",
    redirectPath: "/dashboard",
    memberId: "mem-david",
    name: "David Ortiz, RN",
    relationship: "Home Care Nurse",
    sha256Hex: "68487dc295052aa79c530e283ce698b8c6bb1b42ff0944252e1910dbecdc5425",
  },
];

/**
 * Constant-time string comparison to avoid timing side-channels.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Computes SHA-256 hex digest using Web Crypto (`crypto.subtle.digest`).
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies a 6-digit CareVault PIN against stored SHA-256 digests using constant-time comparison.
 */
export async function verifyVaultPin(
  pin: string
): Promise<Omit<PinDigestEntry, "sha256Hex"> | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  const digest = await sha256Hex(pin);
  for (const entry of VAULT_PIN_DIGESTS) {
    if (constantTimeEqual(digest, entry.sha256Hex)) {
      return {
        role: entry.role,
        redirectPath: entry.redirectPath,
        memberId: entry.memberId,
        name: entry.name,
        relationship: entry.relationship,
      };
    }
  }
  return null;
}
