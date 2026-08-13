import type { Role } from "@prisma/client";

/** Role hierarchy: OWNER > ADMIN > ANALYST > VIEWER. */
export const ROLE_RANK: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  ANALYST: 2,
  VIEWER: 1,
};

export type Permission =
  | "analytics.view"
  | "reports.create"
  | "reports.manage"
  | "alerts.manage"
  | "events.manage"
  | "data.export"
  | "members.manage"
  | "org.settings"
  | "audit.view"
  | "org.delete";

/** Minimum role required for each permission. */
const MIN_ROLE: Record<Permission, Role> = {
  "analytics.view": "VIEWER",
  "reports.create": "ANALYST",
  "reports.manage": "ANALYST",
  "alerts.manage": "ANALYST",
  "events.manage": "ANALYST",
  "data.export": "ANALYST",
  "members.manage": "ADMIN",
  "org.settings": "ADMIN",
  "audit.view": "ADMIN",
  "org.delete": "OWNER",
};

export function atLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function can(role: Role, permission: Permission): boolean {
  return atLeast(role, MIN_ROLE[permission]);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ANALYST: "Analyst",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access, including billing and deleting the workspace",
  ADMIN: "Manage members, settings, and all analytics resources",
  ANALYST: "Create reports, alerts, and events; export data",
  VIEWER: "Read-only access to dashboards and reports",
};
