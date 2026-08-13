import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WorkspaceForm } from "./_components/workspace-form";
import { DeleteWorkspaceDialog } from "./_components/delete-workspace-dialog";

export const metadata: Metadata = { title: "Workspace settings" };
export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
  const ctx = await requirePermission("org.settings");
  const projects = await db.project.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Workspace</CardTitle>
          <CardDescription className="text-xs">
            The workspace name is visible to every member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceForm name={ctx.org.name} slug={ctx.org.slug} plan={ctx.org.plan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Projects</CardTitle>
          <CardDescription className="text-xs">
            Sites and apps tracked in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Projects appear here once tracking is set up for a site or app."
            />
          ) : (
            <ul className="divide-y">
              {projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.domain}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    Created {formatDate(project.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Projects are read-only here — tracking setup is managed from the project itself.
          </p>
        </CardFooter>
      </Card>

      {ctx.role === "OWNER" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-destructive">Danger zone</CardTitle>
            <CardDescription className="text-xs">
              Deleting a workspace permanently removes its projects, analytics data, reports, and
              members. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{ctx.org.name}</span> and all of
              its data.
            </p>
            <DeleteWorkspaceDialog orgName={ctx.org.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
