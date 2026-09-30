import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AvatarSection } from "@/components/dashboard/settings/profile/avatar-section";
import { ProfileForm } from "@/components/dashboard/settings/profile/profile-form";
import { PreferencesSection } from "@/components/dashboard/settings/profile/preferences-section";
import { getCurrentUser } from "@/lib/auth/current-user";

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  return (
    source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();

  return (
    <>
      <DashboardPageHeader
        title="Perfil e Preferências"
        subtitle="Gira os seus dados pessoais e a forma como usa a Zentrix."
      />

      <div className="space-y-6">
        <AvatarSection initials={getInitials(user?.name ?? null, user?.email ?? "")} />
        <ProfileForm />
        <PreferencesSection />
      </div>
    </>
  );
}
