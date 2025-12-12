import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * POST /api/onboarding
 * Complete or skip onboarding wizard
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: { take: 1 } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { step, data } = body;

    // Handle skip
    if (step === "skip") {
      // Mark onboarding as completed without saving any preferences
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: { onboardingCompleted: true },
        create: {
          userId: user.id,
          onboardingCompleted: true,
        },
      });

      // Clear any saved progress
      await prisma.onboardingProgress.deleteMany({
        where: { userId: user.id },
      });

      return NextResponse.json({
        success: true,
        message: "Onboarding skipped",
        redirectUrl: "/market-desk",
      });
    }

    // Handle partial completion (Phase 1 - only Step 1 implemented)
    if (step === "partial_complete") {
      const { step1 } = data;

      // Save user preferences from Step 1
      await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {
          onboardingCompleted: true,
          proficiencyLevel: step1?.proficiencyLevel || null,
          goals: step1?.goals || [],
        },
        create: {
          userId: user.id,
          onboardingCompleted: true,
          proficiencyLevel: step1?.proficiencyLevel || null,
          goals: step1?.goals || [],
        },
      });

      // Clear onboarding progress
      await prisma.onboardingProgress.deleteMany({
        where: { userId: user.id },
      });

      // Log completion
      if (user.memberships[0]) {
        await prisma.auditLog.create({
          data: {
            orgId: user.memberships[0].orgId,
            userId: user.id,
            action: "CREATE",
            entity: "Onboarding",
            entityId: "partial_complete",
            before: null,
            after: { step: "partial_complete", data },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Onboarding completed (partial)",
        redirectUrl: "/market-desk",
      });
    }

    // Handle full completion with all steps
    if (step === "complete") {
      const { step1, step2, step3, step4 } = data;

      // Ensure user has an organization membership
      if (!user.memberships || user.memberships.length === 0) {
        return NextResponse.json(
          { error: "User has no organization membership" },
          { status: 400 }
        );
      }

      const orgId = user.memberships[0].orgId;

      await prisma.$transaction(async (tx) => {
        // 1. Save user preferences from Step 1
        await tx.userPreferences.upsert({
          where: { userId: user.id },
          update: {
            onboardingCompleted: true,
            proficiencyLevel: step1?.proficiencyLevel || null,
            goals: step1?.goals || [],
          },
          create: {
            userId: user.id,
            onboardingCompleted: true,
            proficiencyLevel: step1?.proficiencyLevel || null,
            goals: step1?.goals || [],
          },
        });

        // 2. Generate seed data if requested (Step 3)
        if (step3?.seedDataOption === "demo" || step3?.seedDataOption === "hybrid") {
          const { generateSeedData } = await import("@/lib/onboarding/seed-data-generator");

          const seedResult = await generateSeedData({
            orgId,
            userId: user.id,
            includeSamplePositions: true,
            includeSampleJournal: true,
            includeSamplePnl: true,
            includeSampleNav: true,
          });

          if (!seedResult.success) {
            console.error("Seed data generation failed:", seedResult.error);
          }
        }

        // 3. Create YearlyPerformanceSettings if starting capital provided (Step 4)
        if (step4?.startingCapital) {
          const currentYear = new Date().getFullYear();

          await tx.yearlyPerformanceSettings.upsert({
            where: {
              orgId_year: {
                orgId,
                year: currentYear,
              },
            },
            update: {
              startingCapital: new Prisma.Decimal(step4.startingCapital),
            },
            create: {
              orgId,
              year: currentYear,
              startingCapital: new Prisma.Decimal(step4.startingCapital),
            },
          });
        }

        // 4. Create or update AI configuration (Step 4)
        if (step4?.aiProvider) {
          const aiProvider = step4.aiProvider.toUpperCase();
          const defaultBaseUrls: Record<string, string> = {
            OPENAI: "https://api.openai.com/v1",
            ANTHROPIC: "https://api.anthropic.com/v1",
            GEMINI: "https://generativelanguage.googleapis.com/v1beta",
            OPENROUTER: "https://openrouter.ai/api/v1",
            OLLAMA: "http://localhost:11434/v1",
            CUSTOM: step4.aiBaseUrl || "https://api.openai.com/v1",
          };

          const baseUrl = step4.aiBaseUrl || defaultBaseUrls[aiProvider] || "https://api.openai.com/v1";

          await tx.aiConfig.upsert({
            where: { orgId },
            update: {
              provider: aiProvider as any,
              baseUrl,
            },
            create: {
              orgId,
              provider: aiProvider as any,
              baseUrl,
            },
          });
        }

        // 5. Clear onboarding progress
        await tx.onboardingProgress.deleteMany({
          where: { userId: user.id },
        });

        // 6. Log completion
        await tx.auditLog.create({
          data: {
            orgId,
            userId: user.id,
            action: "CREATE",
            entity: "Onboarding",
            entityId: "complete",
            before: null,
            after: {
              step: "complete",
              proficiencyLevel: step1?.proficiencyLevel,
              seedDataOption: step3?.seedDataOption,
              hasStartingCapital: !!step4?.startingCapital,
              aiProvider: step4?.aiProvider,
            },
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Onboarding completed successfully",
        redirectUrl: "/market-desk",
      });
    }

    return NextResponse.json(
      { error: "Invalid step parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
