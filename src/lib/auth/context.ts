import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Organization, Project, Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/auth/rbac";
import { ApiError, forbidden, unauthorized } from "@/lib/api";

export const ORG_COOKIE = "ih_org";

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface OrgContext {
  user: SessionUser;
  org: Organization;
  role: Role;
  project: Project;
  memberships: { org: Organization; role: Role }[];
}

async function loadOrgContext(userId: string): Promise<Omit<OrgContext, "user"> | null> {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { org: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.orgId === preferred) ?? memberships[0];

  const project = await db.project.findFirst({ where: { orgId: active.orgId }, orderBy: { createdAt: "asc" } });
  if (!project) return null;

  return {
    org: active.org,
    role: active.role,
    project,
    memberships: memberships.map((m) => ({ org: m.org, role: m.role })),
  };
}

/** For server components/pages: resolves the session or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}

/**
 * For dashboard pages: session + active workspace + role + project.
 * Users with no workspace (e.g. removed from all orgs) are sent to /login.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const user = await requireUser();
  const ctx = await loadOrgContext(user.id);
  if (!ctx) redirect("/login?error=no-workspace");
  return { user, ...ctx };
}

/** Page-level permission gate: redirects to the dashboard when denied. */
export async function requirePermission(permission: Permission): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!can(ctx.role, permission)) redirect("/dashboard?error=forbidden");
  return ctx;
}

/** For API route handlers: same resolution but throws ApiError instead of redirecting. */
export async function getApiContext(permission?: Permission): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
  const ctx = await loadOrgContext(user.id);
  if (!ctx) throw new ApiError(403, "You are not a member of any workspace");
  if (permission && !can(ctx.role, permission)) throw forbidden();
  return { user, ...ctx };
}
