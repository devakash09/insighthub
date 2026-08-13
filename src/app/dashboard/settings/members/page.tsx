import type { Metadata } from "next";
import type { Role } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "./_components/invite-member-dialog";
import { MemberRoleSelect } from "./_components/member-role-select";
import { RemoveMemberButton } from "./_components/remove-member-button";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export default async function MembersPage() {
  const ctx = await requirePermission("members.manage");
  const memberships = await db.membership.findMany({
    where: { orgId: ctx.org.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Members</CardTitle>
          <CardDescription className="text-xs">
            {memberships.length === 1 ? "1 person has" : `${memberships.length} people have`} access
            to {ctx.org.name}.
          </CardDescription>
          <CardAction>
            <InviteMemberDialog />
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-px text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((membership) => {
                const isSelf = membership.userId === ctx.user.id;
                const targetIsOwner = membership.role === "OWNER";
                const iAmOwner = ctx.role === "OWNER";
                const disableRoleSelect = isSelf || (targetIsOwner && !iAmOwner);
                const showRemove = !isSelf && (!targetIsOwner || iAmOwner);

                return (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {membership.user.image && <AvatarImage src={membership.user.image} alt="" />}
                          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                            {initials(membership.user.name, membership.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {membership.user.name ?? "Unnamed user"}
                            {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{membership.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <MemberRoleSelect
                        membershipId={membership.id}
                        role={membership.role}
                        disabled={disableRoleSelect}
                        canGrantOwner={iAmOwner}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(membership.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {showRemove && (
                        <RemoveMemberButton
                          membershipId={membership.id}
                          memberName={membership.user.name ?? membership.user.email ?? "this member"}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <dl className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((role) => (
              <div key={role} className="flex gap-1.5">
                <dt className="shrink-0 font-medium text-foreground">{ROLE_LABELS[role]}:</dt>
                <dd>{ROLE_DESCRIPTIONS[role]}</dd>
              </div>
            ))}
          </dl>
        </CardFooter>
      </Card>
    </div>
  );
}
