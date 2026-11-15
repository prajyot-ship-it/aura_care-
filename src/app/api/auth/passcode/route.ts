import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  getSessionFromCookies,
  setSessionCookie,
  verifyPasscode,
} from "@/lib/auth";
import { ensureTodayDoseLogs } from "@/lib/bootstrap";
import { ApiEnvelope, MemberRole, SessionPayload } from "@/lib/types";
import { seedDatabase } from "../../../../../prisma/seed";

interface AuthResponseData {
  session: SessionPayload;
  redirectPath: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiEnvelope<AuthResponseData>>> {
  try {
    const body = (await req.json()) as {
      vaultCode?: string;
      passcode?: string;
    };

    const rawVaultCode = (body.vaultCode || "AURA-7842").trim().toUpperCase();
    const rawPasscode = (body.passcode || "").trim();

    if (!/^\d{6}$/.test(rawPasscode)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid 6-digit numeric passcode.",
        },
        { status: 400 }
      );
    }

    // Auto-seed if database is empty on first boot
    let vault = await prisma.careVault.findUnique({
      where: { vaultCode: rawVaultCode },
      include: { members: true },
    });

    if (!vault && rawVaultCode === "AURA-7842") {
      await seedDatabase();
      vault = await prisma.careVault.findUnique({
        where: { vaultCode: rawVaultCode },
        include: { members: true },
      });
    }

    if (!vault) {
      return NextResponse.json(
        {
          success: false,
          error: `CareVault "${rawVaultCode}" was not found. Use demo code AURA-7842.`,
        },
        { status: 404 }
      );
    }

    let matchedMember: (typeof vault.members)[number] | null = null;
    for (const member of vault.members) {
      const isValid = await verifyPasscode(rawPasscode, member.passcodeHash);
      if (isValid) {
        matchedMember = member;
        break;
      }
    }

    if (!matchedMember) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid 6-digit passcode for this CareVault. Please verify your personal PIN.",
        },
        { status: 401 }
      );
    }

    await ensureTodayDoseLogs(vault.id);

    const sessionPayload: SessionPayload = {
      memberId: matchedMember.id,
      vaultId: vault.id,
      vaultCode: vault.vaultCode,
      role: matchedMember.role as MemberRole,
      name: matchedMember.name,
      relationship: matchedMember.relationship,
      email: matchedMember.email,
    };

    await setSessionCookie(sessionPayload);

    const redirectPath =
      sessionPayload.role === "ELDER_SOVEREIGN" ? "/elder" : "/dashboard";

    return NextResponse.json({
      success: true,
      data: {
        session: sessionPayload,
        redirectPath,
      },
    });
  } catch (err) {
    console.error("[POST /api/auth/passcode] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal authentication error.",
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<
  NextResponse<ApiEnvelope<{ session: SessionPayload | null }>>
> {
  const session = await getSessionFromCookies();
  return NextResponse.json({
    success: true,
    data: { session },
  });
}

export async function DELETE(): Promise<
  NextResponse<ApiEnvelope<{ loggedOut: boolean }>>
> {
  clearSessionCookie();
  return NextResponse.json({
    success: true,
    data: { loggedOut: true },
  });
}
