export type OnboardingData = {
  businessType: string | null;
  platform: string | null;
  goals: string[];
  firstName: string;
  countryCode: string;
  whatsapp: string;
};

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  businessType: null,
  platform: null,
  goals: [],
  firstName: "",
  countryCode: "+244",
  whatsapp: "",
};
