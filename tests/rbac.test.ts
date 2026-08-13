import { describe, expect, it } from "vitest";
import { atLeast, can, ROLE_RANK } from "@/lib/auth/rbac";

describe("role hierarchy", () => {
  it("ranks OWNER > ADMIN > ANALYST > VIEWER", () => {
    expect(ROLE_RANK.OWNER).toBeGreaterThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeGreaterThan(ROLE_RANK.ANALYST);
    expect(ROLE_RANK.ANALYST).toBeGreaterThan(ROLE_RANK.VIEWER);
  });

  it("atLeast() is inclusive", () => {
    expect(atLeast("ADMIN", "ADMIN")).toBe(true);
    expect(atLeast("OWNER", "VIEWER")).toBe(true);
    expect(atLeast("VIEWER", "ANALYST")).toBe(false);
  });
});

describe("permission matrix", () => {
  it("viewers can only view", () => {
    expect(can("VIEWER", "analytics.view")).toBe(true);
    expect(can("VIEWER", "reports.create")).toBe(false);
    expect(can("VIEWER", "alerts.manage")).toBe(false);
    expect(can("VIEWER", "data.export")).toBe(false);
    expect(can("VIEWER", "members.manage")).toBe(false);
  });

  it("analysts create reports/alerts/events and export, but cannot administer", () => {
    expect(can("ANALYST", "reports.create")).toBe(true);
    expect(can("ANALYST", "alerts.manage")).toBe(true);
    expect(can("ANALYST", "events.manage")).toBe(true);
    expect(can("ANALYST", "data.export")).toBe(true);
    expect(can("ANALYST", "members.manage")).toBe(false);
    expect(can("ANALYST", "audit.view")).toBe(false);
    expect(can("ANALYST", "org.settings")).toBe(false);
  });

  it("admins administer but cannot delete the org", () => {
    expect(can("ADMIN", "members.manage")).toBe(true);
    expect(can("ADMIN", "org.settings")).toBe(true);
    expect(can("ADMIN", "audit.view")).toBe(true);
    expect(can("ADMIN", "org.delete")).toBe(false);
  });

  it("owner can do everything", () => {
    expect(can("OWNER", "org.delete")).toBe(true);
    expect(can("OWNER", "members.manage")).toBe(true);
    expect(can("OWNER", "analytics.view")).toBe(true);
  });
});
