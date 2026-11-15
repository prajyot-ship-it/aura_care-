import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import { ApiEnvelope, WellnessMood } from "@/lib/types";

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    ApiEnvelope<{
      id: string;
      mood: WellnessMood;
      createdAt: string;
      message: string;
    }>
  >
> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      mood?: WellnessMood;
      bloodPressureSystolic?: number | null;
      bloodPressureDiastolic?: number | null;
      note?: string;
    };

    const validMoods: WellnessMood[] = [
      "GREAT",
      "OKAY",
      "TIRED",
      "DIZZY",
      "NAUSEOUS",
    ];
    const mood: WellnessMood =
      body.mood && validMoods.includes(body.mood) ? body.mood : "OKAY";

    const created = await prisma.wellnessCheckIn.create({
      data: {
        vaultId: session.vaultId,
        mood,
        bloodPressureSystolic:
          typeof body.bloodPressureSystolic === "number"
            ? body.bloodPressureSystolic
            : null,
        bloodPressureDiastolic:
          typeof body.bloodPressureDiastolic === "number"
            ? body.bloodPressureDiastolic
            : null,
        note: body.note?.trim() || `Logged by ${session.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        mood: created.mood as WellnessMood,
        createdAt: created.createdAt.toISOString(),
        message: "Wellness check-in saved to your CareVault.",
      },
    });
  } catch (err) {
    console.error("[POST /api/wellness] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save wellness check-in." },
      { status: 500 }
    );
  }
}
