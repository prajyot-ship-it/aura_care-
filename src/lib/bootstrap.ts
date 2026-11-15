import { prisma } from "./prisma";
import { safeParseJsonArray } from "./types";

export async function ensureTodayDoseLogs(vaultId: string): Promise<void> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const activeMeds = await prisma.medication.findMany({
    where: {
      vaultId,
      status: "ACTIVE",
    },
  });

  const existingTodayLogs = await prisma.doseLog.findMany({
    where: {
      vaultId,
      scheduledFor: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  for (const med of activeMeds) {
    const times = safeParseJsonArray<string>(med.scheduledTimes, ["08:00"]);
    for (const hhmm of times) {
      const [hStr, mStr] = hhmm.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      const scheduledFor = new Date(now);
      scheduledFor.setHours(h, m, 0, 0);

      const alreadyExists = existingTodayLogs.some(
        (log) =>
          log.medicationId === med.id &&
          Math.abs(log.scheduledFor.getTime() - scheduledFor.getTime()) <
            5 * 60 * 1000
      );

      if (!alreadyExists) {
        await prisma.doseLog.create({
          data: {
            medicationId: med.id,
            vaultId,
            scheduledFor,
            status: "PENDING",
            lockVersion: 0,
            escalationTierSent: 0,
          },
        });
      }
    }
  }
}
