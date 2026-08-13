import { Logo } from "@/components/shell/logo";
import { MobileSidebar } from "@/components/shell/mobile-nav";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/shell/workspace-switcher";
import { GlobalSearch } from "@/components/shell/global-search";
import { DateRangePicker } from "@/components/shell/date-range-picker";
import { NotificationsMenu } from "@/components/shell/notifications-menu";
import { HelpMenu } from "@/components/shell/help-menu";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@prisma/client";

export function Topbar({
  workspaces,
  activeOrgId,
  user,
  role,
  unreadNotifications,
}: {
  workspaces: WorkspaceOption[];
  activeOrgId: string;
  user: { name: string | null; email: string | null; image: string | null };
  role: Role;
  unreadNotifications: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
        <MobileSidebar />
        <div className="lg:hidden">
          <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </div>
        <Separator orientation="vertical" className="mx-1 hidden !h-5 lg:block" />
        <WorkspaceSwitcher workspaces={workspaces} activeId={activeOrgId} />
        <div className="ml-auto flex items-center gap-1.5">
          <GlobalSearch />
          <DateRangePicker />
          <Separator orientation="vertical" className="mx-0.5 hidden !h-5 sm:block" />
          <NotificationsMenu initialUnread={unreadNotifications} />
          <HelpMenu />
          <UserMenu name={user.name} email={user.email} image={user.image} role={role} />
        </div>
      </div>
    </header>
  );
}
