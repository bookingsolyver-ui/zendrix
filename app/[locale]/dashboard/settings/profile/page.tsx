import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AvatarSection } from "@/components/dashboard/settings/profile/avatar-section";
import { ProfileForm } from "@/components/dashboard/settings/profile/profile-form";
import { PreferencesSection } from "@/components/dashboard/settings/profile/preferences-section";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Perfil e Preferências"
        subtitle="Gira os seus dados pessoais e a forma como usa a Zentrix."
      />

      <div className="space-y-6">
        <AvatarSection initials="FO" />
        <ProfileForm />
        <PreferencesSection />
      </div>
    </>
  );
}
