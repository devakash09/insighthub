import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { reportConfigSchema, funnelQuerySchema } from "@/lib/validations/analytics";
import { alertSchema, eventDefinitionSchema, changeRoleSchema } from "@/lib/validations/resources";

describe("auth schemas", () => {
  it("normalizes email case and whitespace", () => {
    const parsed = loginSchema.parse({ email: "  Owner@Insighthub.DEMO ", password: "x" });
    expect(parsed.email).toBe("owner@insighthub.demo");
  });

  it("rejects weak signup passwords", () => {
    const result = signupSchema.safeParse({ name: "Ava", email: "a@b.co", password: "short" });
    expect(result.success).toBe(false);
  });

  it("requires a plausible reset token", () => {
    expect(resetPasswordSchema.safeParse({ token: "tiny", password: "longenough1" }).success).toBe(false);
  });
});

describe("report config schema", () => {
  it("accepts a full config and defaults chart/filters", () => {
    const parsed = reportConfigSchema.parse({ metric: "revenue", dimension: "country" });
    expect(parsed.chart).toBe("line");
    expect(parsed.filters).toEqual({});
  });

  it("rejects unknown metrics and dimensions", () => {
    expect(reportConfigSchema.safeParse({ metric: "profit", dimension: "date" }).success).toBe(false);
    expect(reportConfigSchema.safeParse({ metric: "users", dimension: "planet" }).success).toBe(false);
  });
});

describe("funnel schema", () => {
  it("requires between 2 and 8 steps", () => {
    expect(funnelQuerySchema.safeParse({ steps: ["a"], range: {} }).success).toBe(false);
    expect(funnelQuerySchema.safeParse({ steps: ["a", "b"], range: {} }).success).toBe(true);
    expect(funnelQuerySchema.safeParse({ steps: Array(9).fill("s"), range: {} }).success).toBe(false);
  });
});

describe("alert schema", () => {
  it("requires at least one channel", () => {
    const result = alertSchema.safeParse({
      name: "Revenue drop",
      metric: "REVENUE",
      condition: "DECREASES_BY_PCT",
      threshold: 20,
      channels: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative thresholds", () => {
    const result = alertSchema.safeParse({
      name: "DAU floor",
      metric: "ACTIVE_USERS",
      condition: "BELOW",
      threshold: -5,
      channels: ["IN_APP"],
    });
    expect(result.success).toBe(false);
  });
});

describe("event definition schema", () => {
  it("enforces snake_case names", () => {
    expect(eventDefinitionSchema.safeParse({ name: "checkout_started" }).success).toBe(true);
    expect(eventDefinitionSchema.safeParse({ name: "Checkout Started" }).success).toBe(false);
    expect(eventDefinitionSchema.safeParse({ name: "9lives" }).success).toBe(false);
  });
});

describe("member role schema", () => {
  it("only accepts known roles", () => {
    expect(changeRoleSchema.safeParse({ membershipId: "m1", role: "ADMIN" }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ membershipId: "m1", role: "SUPERUSER" }).success).toBe(false);
  });
});
