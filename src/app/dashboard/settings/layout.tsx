import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getOrgContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsNav } from "./_components/settings-nav";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await getOrgContext();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description={`Manage your profile and the ${ctx.org.name} workspace.`}
      />
      <SettingsNav role={ctx.role} />
      {/* Each page sets its own max width (audit log needs the full width). */}
      <div className="max-w-none">{children}</div>
    </div>
  );
}
