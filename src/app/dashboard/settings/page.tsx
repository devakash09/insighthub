import type { Metadata } from "next";
import { getOrgContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./_components/profile-form";
import { PasswordForm } from "./_components/password-form";
import { ThemePicker } from "./_components/theme-picker";

export const metadata: Metadata = { title: "Profile settings" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const ctx = await getOrgContext();
  const user = await db.user.findUnique({
    where: { id: ctx.user.id },
    select: { name: true, email: true, passwordHash: true },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Profile</CardTitle>
          <CardDescription className="text-xs">
            How your name appears to teammates across InsightHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user?.name ?? ctx.user.name ?? ""} email={user?.email ?? ctx.user.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Password</CardTitle>
          <CardDescription className="text-xs">
            {user?.passwordHash
              ? "Use at least 8 characters. You will stay signed in on this device."
              : "This account signs in with a social provider and has no password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          <CardDescription className="text-xs">
            Choose how InsightHub looks on this device. The same picker also lives in the avatar
            menu in the top bar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>
    </div>
  );
}
