import { z } from "zod";
import { reportConfigSchema } from "@/lib/validations/analytics";

// ── Saved reports ────────────────────────────────────────────────────────────
export const createReportSchema = z.object({
  name: z.string().trim().min(2, "Give the report a name").max(80),
  description: z.string().trim().max(300).optional(),
  config: reportConfigSchema,
  schedule: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]).default("NONE"),
});
export const updateReportSchema = createReportSchema.partial();

// ── Alerts ───────────────────────────────────────────────────────────────────
export const alertSchema = z.object({
  name: z.string().trim().min(2, "Give the alert a name").max(80),
  metric: z.enum(["REVENUE", "ACTIVE_USERS", "NEW_USERS", "SESSIONS", "CONVERSION_RATE", "PAGE_VIEWS", "ERROR_RATE"]),
  condition: z.enum(["ABOVE", "BELOW", "INCREASES_BY_PCT", "DECREASES_BY_PCT"]),
  threshold: z.coerce.number().finite().min(0, "Threshold must be positive"),
  frequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]).default("DAILY"),
  channels: z.array(z.enum(["IN_APP", "EMAIL"])).min(1, "Pick at least one notification method").default(["IN_APP"]),
  isActive: z.boolean().default(true),
});
export const updateAlertSchema = alertSchema.partial();

// ── Event definitions ────────────────────────────────────────────────────────
export const eventDefinitionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case, e.g. checkout_started"),
  description: z.string().trim().max(300).optional(),
  isConversion: z.boolean().default(false),
});

// ── Members & org ────────────────────────────────────────────────────────────
export const changeRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "ANALYST", "VIEWER"]),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]).default("VIEWER"),
});

export const updateOrgSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is too short").max(60),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
});
