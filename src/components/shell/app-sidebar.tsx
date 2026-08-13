import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shell/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";

/** Fixed desktop sidebar (hidden below lg; mobile uses the drawer + bottom nav). */
export function AppSidebar({ planLabel }: { planLabel: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Logo />
      </div>
      <SidebarNav />
      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current plan</span>
          <Badge variant="secondary" className="capitalize">
            {planLabel}
          </Badge>
        </div>
      </div>
    </aside>
  );
}
