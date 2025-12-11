"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressIndicator } from "@/components/onboarding/progress-indicator";
import { WelcomeStep, type WelcomeStepData } from "@/components/onboarding/welcome-step";
import {
  BrokerConnectionStep,
  type BrokerConnectionStepData,
} from "@/components/onboarding/broker-connection-step";
import {
  SeedDataStep,
  type SeedDataStepData,
} from "@/components/onboarding/seed-data-step";
import {
  PreferencesStep,
  type PreferencesStepData,
} from "@/components/onboarding/preferences-step";
import { CompletionStep } from "@/components/onboarding/completion-step";

interface OnboardingData {
  step1?: WelcomeStepData;
  step2?: BrokerConnectionStepData;
  step3?: SeedDataStepData;
  step4?: PreferencesStepData;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<OnboardingData>({});
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = 5;

  // Save progress to server (for resumability)
  async function saveProgress(step: number, data: OnboardingData) {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStep: step,
          wizardData: data,
        }),
      });
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
    }
  }

  // Handle skip - mark onboarding complete and redirect
  async function handleSkip() {
    if (!confirm("Skip the setup wizard? You can configure these settings later from the Settings page.")) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "skip",
          data: {},
        }),
      });

      if (response.ok) {
        router.push("/market-desk");
      } else {
        alert("Failed to skip onboarding. Please try again.");
      }
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Step 1: Welcome & Proficiency
  function handleStep1Next(data: WelcomeStepData) {
    const updatedData = { ...wizardData, step1: data };
    setWizardData(updatedData);
    saveProgress(2, updatedData);
    setCurrentStep(2);
  }

  // Step 2: Broker Connections
  function handleStep2Next(data: BrokerConnectionStepData) {
    const updatedData = { ...wizardData, step2: data };
    setWizardData(updatedData);
    saveProgress(3, updatedData);
    setCurrentStep(3);
  }

  // Step 3: Seed Data
  function handleStep3Next(data: SeedDataStepData) {
    const updatedData = { ...wizardData, step3: data };
    setWizardData(updatedData);
    saveProgress(4, updatedData);
    setCurrentStep(4);
  }

  // Step 4: Preferences
  function handleStep4Next(data: PreferencesStepData) {
    const updatedData = { ...wizardData, step4: data };
    setWizardData(updatedData);
    saveProgress(5, updatedData);
    setCurrentStep(5);
  }

  // Step 5: Complete
  async function handleComplete() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "complete",
          data: wizardData,
        }),
      });

      if (response.ok) {
        router.push("/market-desk");
      } else {
        alert("Failed to complete onboarding. Please try again.");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSaving) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 dark:border-gold-400 mb-4"></div>
          <div className="text-slate-600 dark:text-slate-400">
            Saving your preferences...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

      {/* Step Content */}
      {currentStep === 1 && (
        <WelcomeStep
          initialData={wizardData.step1}
          onNext={handleStep1Next}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 2 && (
        <BrokerConnectionStep
          initialData={wizardData.step2}
          onNext={handleStep2Next}
          onBack={() => setCurrentStep(1)}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 3 && (
        <SeedDataStep
          initialData={wizardData.step3}
          hasConnections={(wizardData.step2?.connections?.length ?? 0) > 0}
          onNext={handleStep3Next}
          onBack={() => setCurrentStep(2)}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 4 && (
        <PreferencesStep
          initialData={wizardData.step4}
          onNext={handleStep4Next}
          onBack={() => setCurrentStep(3)}
          onSkip={handleSkip}
        />
      )}

      {currentStep === 5 && (
        <CompletionStep
          wizardData={{
            proficiencyLevel: wizardData.step1?.proficiencyLevel,
            goals: wizardData.step1?.goals,
            connectionsCount: wizardData.step2?.connections?.length ?? 0,
            seedDataOption: wizardData.step3?.seedDataOption,
            startingCapital: wizardData.step4?.startingCapital ?? null,
            benchmarks: wizardData.step4?.benchmarks,
          }}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
