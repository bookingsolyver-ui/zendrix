import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AvatarSection } from "@/components/dashboard/settings/profile/avatar-section";
import { ProfileForm } from "@/components/dashboard/settings/profile/profile-form";
import { DeleteAccountCard } from "@/components/dashboard/settings/profile/delete-account-card";
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
        title="Perfil"
        subtitle="Gira os seus dados pessoais."
      />

      <div className="space-y-6">
        <AvatarSection initials={getInitials(user?.name ?? null, user?.email ?? "")} name={user?.name ?? null} email={user?.email ?? ""} />
        <ProfileForm />
        {/* Só o proprietário elimina a organização (a API também o exige). */}
        {user?.role === "OWNER" && <DeleteAccountCard />}
      </div>
    </>
  );
}
