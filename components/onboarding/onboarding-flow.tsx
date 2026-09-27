"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ProgressHeader } from "@/components/onboarding/progress-header";
import { StepBusinessType } from "@/components/onboarding/step-business-type";
import { StepPlatform } from "@/components/onboarding/step-platform";
import { StepGoals } from "@/components/onboarding/step-goals";
import { StepContact } from "@/components/onboarding/step-contact";
import { StepWhatsApp } from "@/components/onboarding/step-whatsapp";
import { INITIAL_ONBOARDING_DATA, type OnboardingData } from "@/components/onboarding/types";

const TOTAL_STEPS = 5;

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);

  function goNext() {
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  function goToDashboard() {
    router.push("/dashboard");
  }

  function toggleGoal(value: string) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(value)
        ? prev.goals.filter((goal) => goal !== value)
        : [...prev.goals, value],
    }));
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return data.businessType !== null;
      case 2:
        return data.platform !== null;
      case 3:
        return data.goals.length > 0;
      case 4:
        return data.firstName.trim().length > 0 && data.whatsapp.trim().length > 0;
      default:
        return true;
    }
  }, [step, data]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ProgressHeader step={step} total={TOTAL_STEPS} onSkip={goToDashboard} />

      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div key={step} className="w-full max-w-3xl animate-step-in">
          {step === 1 && (
            <StepBusinessType
              value={data.businessType}
              onSelect={(value) => setData((prev) => ({ ...prev, businessType: value }))}
            />
          )}

          {step === 2 && (
            <StepPlatform
              value={data.platform}
              onSelect={(value) => setData((prev) => ({ ...prev, platform: value }))}
            />
          )}

          {step === 3 && <StepGoals value={data.goals} onToggle={toggleGoal} />}

          {step === 4 && (
            <StepContact
              firstName={data.firstName}
              countryCode={data.countryCode}
              whatsapp={data.whatsapp}
              onFirstNameChange={(value) => setData((prev) => ({ ...prev, firstName: value }))}
              onCountryCodeChange={(value) => setData((prev) => ({ ...prev, countryCode: value }))}
              onWhatsappChange={(value) => setData((prev) => ({ ...prev, whatsapp: value }))}
            />
          )}

          {step === 5 && <StepWhatsApp onBack={goBack} onFinish={goToDashboard} />}

          {step < TOTAL_STEPS && (
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1}
                className="text-sm text-muted transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="neon-green-btn rounded-full bg-green-500 px-8 py-3 text-sm font-semibold text-background transition-opacity hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
