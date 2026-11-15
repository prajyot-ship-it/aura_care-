import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/auth";
import {
  ClinicalBriefReport,
  generateClinicalBrief,
} from "@/lib/clinicalBriefGenerator";
import { ApiEnvelope, safeParseJsonArray } from "@/lib/types";

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiEnvelope<{ brief: ClinicalBriefReport }>>> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const briefId = searchParams.get("briefId") || "default";

    const brief = await generateClinicalBrief(briefId, session.vaultId);
    if (!brief) {
      return NextResponse.json(
        { success: false, error: "Appointment clinical brief not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { brief },
    });
  } catch (err) {
    console.error("[GET /api/appointments] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate clinical brief." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest
): Promise<
  NextResponse<
    ApiEnvelope<{
      appointmentId: string;
      elderQuestions: string[];
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
      action?: "ADD_QUESTION" | "CREATE_APPOINTMENT";
      appointmentId?: string;
      question?: string;
      doctorName?: string;
      specialty?: string;
      clinicLocation?: string;
      appointmentDate?: string;
      purpose?: string;
      escortMemberName?: string;
    };

    if (body.action === "CREATE_APPOINTMENT") {
      const doctorName = (body.doctorName || "").trim();
      const specialty = (body.specialty || "General Medicine").trim();
      const clinicLocation = (
        body.clinicLocation || "Main Medical Plaza"
      ).trim();
      const purpose = (body.purpose || "Follow-up consultation").trim();
      const escortMemberName = (body.escortMemberName || session.name).trim();
      const appointmentDate = body.appointmentDate
        ? new Date(body.appointmentDate)
        : new Date(Date.now() + 48 * 60 * 60 * 1000);

      if (!doctorName) {
        return NextResponse.json(
          { success: false, error: "Doctor name is required." },
          { status: 400 }
        );
      }

      const created = await prisma.appointment.create({
        data: {
          vaultId: session.vaultId,
          doctorName,
          specialty,
          clinicLocation,
          appointmentDate,
          purpose,
          escortMemberName,
          elderQuestions: JSON.stringify([]),
          status: "UPCOMING",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          appointmentId: created.id,
          elderQuestions: [],
          message: `Scheduled appointment with ${doctorName}.`,
        },
      });
    }

    // Default: ADD_QUESTION to upcoming appointment
    const questionText = (body.question || "").trim();
    if (!questionText) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a question for the doctor.",
        },
        { status: 400 }
      );
    }

    const targetAppt = body.appointmentId
      ? await prisma.appointment.findFirst({
          where: { id: body.appointmentId, vaultId: session.vaultId },
        })
      : await prisma.appointment.findFirst({
          where: { vaultId: session.vaultId, status: "UPCOMING" },
          orderBy: { appointmentDate: "asc" },
        });

    if (!targetAppt) {
      return NextResponse.json(
        { success: false, error: "No upcoming appointment found." },
        { status: 404 }
      );
    }

    const existingQuestions = safeParseJsonArray<string>(
      targetAppt.elderQuestions,
      []
    );
    const updatedQuestions = [...existingQuestions, questionText];

    await prisma.appointment.update({
      where: { id: targetAppt.id },
      data: {
        elderQuestions: JSON.stringify(updatedQuestions),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appointmentId: targetAppt.id,
        elderQuestions: updatedQuestions,
        message: `Question added to your upcoming visit with ${targetAppt.doctorName}.`,
      },
    });
  } catch (err) {
    console.error("[POST /api/appointments] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update appointment." },
      { status: 500 }
    );
  }
}
