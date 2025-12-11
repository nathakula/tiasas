import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

/**
 * GET /api/onboarding/progress
 * Retrieve saved onboarding progress for resumability
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const progress = await prisma.onboardingProgress.findUnique({
      where: { userId: user.id },
    });

    if (!progress) {
      return NextResponse.json({
        currentStep: 1,
        wizardData: {},
      });
    }

    return NextResponse.json({
      currentStep: progress.currentStep,
      wizardData: progress.wizardData || {},
    });
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/progress
 * Save onboarding progress (called after each step)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { currentStep, wizardData } = body;

    // Validate step number
    if (typeof currentStep !== "number" || currentStep < 1 || currentStep > 5) {
      return NextResponse.json(
        { error: "Invalid step number" },
        { status: 400 }
      );
    }

    // Save or update progress
    await prisma.onboardingProgress.upsert({
      where: { userId: user.id },
      update: {
        currentStep,
        wizardData: wizardData || {},
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        currentStep,
        wizardData: wizardData || {},
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
