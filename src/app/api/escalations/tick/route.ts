import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  EscalationTickSummary,
  runEscalationTick,
  SimulationMode,
} from "@/lib/escalationEngine";
import { ApiEnvelope } from "@/lib/types";

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiEnvelope<EscalationTickSummary>>> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { mode?: SimulationMode };
    const mode: SimulationMode = body.mode || "AUTO";

    const summary = await runEscalationTick(session.vaultId, mode);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error("[POST /api/escalations/tick] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to run escalation engine tick." },
      { status: 500 }
    );
  }
}
