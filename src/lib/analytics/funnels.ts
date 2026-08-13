import "server-only";
import { db } from "@/lib/db";
import type { DateRange } from "@/lib/date-range";
import type { FunnelStage } from "@/lib/analytics/types";

export const DEFAULT_FUNNEL_STEPS = ["page_view", "signup", "product_view", "checkout_started", "purchase"];

export const STEP_LABELS: Record<string, string> = {
  page_view: "Landing Page",
  signup: "Signup",
  product_view: "Product View",
  checkout_started: "Checkout",
  purchase: "Purchase",
  login: "Login",
  subscription_created: "Subscription",
  button_clicked: "CTA Click",
};

/**
 * Sequential funnel: a visitor counts toward stage N only if they also
 * appear in every earlier stage within the window.
 */
export async function computeFunnel(projectId: string, range: DateRange, steps: string[]): Promise<FunnelStage[]> {
  const stageSets: Set<string>[] = [];
  for (const step of steps) {
    const rows = await db.$queryRaw<{ visitorId: string }[]>`
      SELECT DISTINCT "visitorId" FROM "Event"
      WHERE "projectId" = ${projectId} AND "name" = ${step}
        AND "occurredAt" >= ${range.from} AND "occurredAt" < ${range.to}`;
    stageSets.push(new Set(rows.map((r) => r.visitorId)));
  }

  const stages: FunnelStage[] = [];
  let survivors: Set<string> | null = null;
  steps.forEach((step, i) => {
    survivors = survivors === null ? stageSets[i] : new Set([...survivors].filter((id) => stageSets[i].has(id)));
    const users = survivors.size;
    const prevUsers = i === 0 ? users : stages[i - 1].users;
    const conversionPct = i === 0 ? 100 : prevUsers === 0 ? 0 : (users / prevUsers) * 100;
    stages.push({
      name: step,
      label: STEP_LABELS[step] ?? step,
      users,
      conversionPct,
      dropOffPct: i === 0 ? 0 : 100 - conversionPct,
    });
  });
  return stages;
}
