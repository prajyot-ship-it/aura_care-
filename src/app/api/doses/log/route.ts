import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { ApiEnvelope, DoseStatus } from "@/lib/types";

interface DoseLogMutationRequest {
  doseLogId?: string;
  action?: "TAKEN" | "SNOOZED" | "SKIPPED";
  expectedLockVersion?: number;
  note?: string;
}

interface DoseLogMutationResponse {
  doseLog: {
    id: string;
    status: DoseStatus;
    loggedAt: string | null;
    loggedByName: string | null;
    lockVersion: number;
    note: string | null;
    scheduledFor: string;
  };
  mutexMessage: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiEnvelope<DoseLogMutationResponse>>> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as DoseLogMutationRequest;
    const doseLogId = (body.doseLogId || "").trim();
    const action = body.action || "TAKEN";
    const expectedLockVersion =
      typeof body.expectedLockVersion === "number"
        ? body.expectedLockVersion
        : undefined;

    if (!doseLogId) {
      return NextResponse.json(
        { success: false, error: "doseLogId is required." },
        { status: 400 }
      );
    }

    // RULE-CLIN-01: Execute inside a Prisma $transaction with Optimistic Concurrency Control (lockVersion)
    const txResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.doseLog.findUnique({
        where: { id: doseLogId },
        include: { medication: true },
      });

      if (!existing || existing.vaultId !== session.vaultId) {
        return {
          conflict: false,
          notFound: true,
          errorMsg: "Dose window record not found in this CareVault.",
          record: null,
        };
      }

      const originalTimeStr = existing.loggedAt
        ? existing.loggedAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "earlier today";

      if (
        existing.status === "TAKEN" ||
        (expectedLockVersion !== undefined &&
          existing.lockVersion !== expectedLockVersion)
      ) {
        const lockedBy = existing.loggedByName || "another Care-Circle member";
        return {
          conflict: true,
          notFound: false,
          errorMsg: `DOUBLE-DOSE MUTEX LOCK ACTIVE: Already confirmed by ${lockedBy} at ${originalTimeStr} (Lock v${existing.lockVersion}). Duplicate administration prevented.`,
          record: existing,
        };
      }

      const now = new Date();
      const nextLockVersion = existing.lockVersion + 1;
      const actorDisplay =
        session.role === "ELDER_SOVEREIGN"
          ? `${session.name} (Self)`
          : `${session.name} (${session.relationship})`;

      let nextScheduledFor = existing.scheduledFor;
      let nextStatus: DoseStatus = action;
      let nextNote = body.note?.trim() || existing.note;

      if (action === "SNOOZED") {
        nextScheduledFor = new Date(existing.scheduledFor.getTime() + 15 * 60000);
        nextStatus = "PENDING";
        nextNote =
          body.note?.trim() ||
          `Snoozed +15m by ${actorDisplay} at ${now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
      }

      // Atomic compare-and-swap update using lockVersion
      const updateCount = await tx.doseLog.updateMany({
        where: {
          id: doseLogId,
          lockVersion: existing.lockVersion,
          status: { not: "TAKEN" },
        },
        data: {
          status: nextStatus,
          loggedAt: now,
          loggedByMemberId: session.memberId,
          loggedByName: actorDisplay,
          lockVersion: nextLockVersion,
          scheduledFor: nextScheduledFor,
          note: nextNote,
        },
      });

      if (updateCount.count === 0) {
        const latest = await tx.doseLog.findUnique({
          where: { id: doseLogId },
        });
        const lockedBy = latest?.loggedByName || "another Care-Circle member";
        return {
          conflict: true,
          notFound: false,
          errorMsg: `DOUBLE-DOSE MUTEX LOCK ACTIVE: Concurrent confirmation already completed by ${lockedBy}.`,
          record: latest,
        };
      }

      if (action === "TAKEN" && existing.medication.stockCount > 0) {
        await tx.medication.update({
          where: { id: existing.medicationId },
          data: {
            stockCount: Math.max(0, existing.medication.stockCount - 1),
          },
        });
      }

      const updatedRecord = await tx.doseLog.findUnique({
        where: { id: doseLogId },
      });

      return {
        conflict: false,
        notFound: false,
        errorMsg: "",
        record: updatedRecord,
      };
    });

    if (txResult.notFound) {
      return NextResponse.json(
        { success: false, error: txResult.errorMsg },
        { status: 404 }
      );
    }

    if (txResult.conflict || !txResult.record) {
      return NextResponse.json(
        {
          success: false,
          error: txResult.errorMsg,
        },
        { status: 409 }
      );
    }

    const r = txResult.record;
    const formattedTime = r.loggedAt
      ? r.loggedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return NextResponse.json({
      success: true,
      data: {
        doseLog: {
          id: r.id,
          status: r.status as DoseStatus,
          loggedAt: r.loggedAt ? r.loggedAt.toISOString() : null,
          loggedByName: r.loggedByName,
          lockVersion: r.lockVersion,
          note: r.note,
          scheduledFor: r.scheduledFor.toISOString(),
        },
        mutexMessage:
          action === "TAKEN"
            ? `LOCKED (v${r.lockVersion}): Confirmed by ${r.loggedByName} at ${formattedTime}`
            : action === "SNOOZED"
              ? `Snoozed 15 minutes until ${r.scheduledFor.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : `Marked as Skipped by ${r.loggedByName} (${r.note || "No note"})`,
      },
    });
  } catch (err) {
    console.error("[POST /api/doses/log] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process atomic dose lock." },
      { status: 500 }
    );
  }
}
