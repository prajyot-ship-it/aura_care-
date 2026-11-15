import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { ApiEnvelope, EmailTier } from "@/lib/types";

export interface EmailOutboxRecord {
  id: string;
  recipientEmail: string;
  recipientName: string;
  tier: EmailTier;
  subject: string;
  htmlBody: string;
  createdAt: string;
}

export async function GET(): Promise<
  NextResponse<ApiEnvelope<{ emails: EmailOutboxRecord[] }>>
> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const logs = await prisma.emailDispatchLog.findMany({
      where: { vaultId: session.vaultId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: {
        emails: logs.map((l) => ({
          id: l.id,
          recipientEmail: l.recipientEmail,
          recipientName: l.recipientName,
          tier: l.tier as EmailTier,
          subject: l.subject,
          htmlBody: l.htmlBody,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[GET /api/emails] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load email outbox logs." },
      { status: 500 }
    );
  }
}
