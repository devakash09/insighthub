import { Suspense } from "react";
import { getOrgContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileBottomNav } from "@/components/shell/mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  const unreadNotifications = await db.notification.count({
    where: { userId: ctx.user.id, readAt: null },
  });

  return (
    <div className="min-h-screen">
      <AppSidebar planLabel={ctx.org.plan} />
      <div className="lg:pl-60">
        <Suspense>
          <Topbar
            workspaces={ctx.memberships.map((m) => ({ id: m.org.id, name: m.org.name, role: m.role }))}
            activeOrgId={ctx.org.id}
            user={ctx.user}
            role={ctx.role}
            unreadNotifications={unreadNotifications}
          />
        </Suspense>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 md:pb-8 lg:px-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
