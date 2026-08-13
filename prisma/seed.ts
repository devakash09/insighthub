 
/**
 * InsightHub seed — generates ~180 days of realistic analytics data:
 * visitor cohorts with retention decay, weekday seasonality, a signup→purchase
 * funnel, subscription renewals, and demo users for every role.
 *
 * Deterministic (faker seeded) so demo screenshots are reproducible.
 */
import { PrismaClient, Prisma, DeviceType, TrafficSource, VisitorStatus, TransactionStatus, TransactionType, Role } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
faker.seed(20260812);

const DAY = 86_400_000;
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

type Weighted<T> = [T, number][];
function pick<T>(options: Weighted<T>): T {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const [value, w] of options) {
    r -= w;
    if (r <= 0) return value;
  }
  return options[options.length - 1][0];
}

const DEVICES: Weighted<DeviceType> = [[DeviceType.DESKTOP, 58], [DeviceType.MOBILE, 34], [DeviceType.TABLET, 8]];
const BROWSERS: Weighted<string> = [["Chrome", 61], ["Safari", 18], ["Firefox", 8], ["Edge", 8], ["Other", 5]];
const OSES: Record<string, Weighted<string>> = {
  DESKTOP: [["Windows", 55], ["macOS", 38], ["Linux", 7]],
  MOBILE: [["iOS", 52], ["Android", 48]],
  TABLET: [["iPadOS", 70], ["Android", 30]],
};
const SOURCES: Weighted<TrafficSource> = [
  [TrafficSource.ORGANIC, 34], [TrafficSource.DIRECT, 22], [TrafficSource.SOCIAL, 14],
  [TrafficSource.REFERRAL, 12], [TrafficSource.PAID, 11], [TrafficSource.EMAIL, 7],
];
const GEO: Weighted<{ country: string; region: string; city: string }> = [
  [{ country: "United States", region: "California", city: "San Francisco" }, 14],
  [{ country: "United States", region: "New York", city: "New York" }, 10],
  [{ country: "United States", region: "Texas", city: "Austin" }, 6],
  [{ country: "India", region: "Karnataka", city: "Bengaluru" }, 9],
  [{ country: "India", region: "Maharashtra", city: "Mumbai" }, 6],
  [{ country: "United Kingdom", region: "England", city: "London" }, 9],
  [{ country: "Germany", region: "Berlin", city: "Berlin" }, 6],
  [{ country: "Germany", region: "Bavaria", city: "Munich" }, 3],
  [{ country: "France", region: "Île-de-France", city: "Paris" }, 5],
  [{ country: "Brazil", region: "São Paulo", city: "São Paulo" }, 5],
  [{ country: "Canada", region: "Ontario", city: "Toronto" }, 5],
  [{ country: "Australia", region: "New South Wales", city: "Sydney" }, 4],
  [{ country: "Netherlands", region: "North Holland", city: "Amsterdam" }, 4],
  [{ country: "Japan", region: "Tokyo", city: "Tokyo" }, 4],
  [{ country: "Spain", region: "Madrid", city: "Madrid" }, 3],
  [{ country: "Singapore", region: "Singapore", city: "Singapore" }, 3],
];
const PAGES: Weighted<{ path: string; title: string }> = [
  [{ path: "/", title: "Home" }, 22],
  [{ path: "/pricing", title: "Pricing" }, 12],
  [{ path: "/features", title: "Features" }, 11],
  [{ path: "/blog", title: "Blog" }, 7],
  [{ path: "/blog/product-analytics-guide", title: "The Product Analytics Guide" }, 5],
  [{ path: "/docs", title: "Documentation" }, 8],
  [{ path: "/docs/getting-started", title: "Getting Started" }, 4],
  [{ path: "/integrations", title: "Integrations" }, 6],
  [{ path: "/signup", title: "Sign up" }, 7],
  [{ path: "/login", title: "Log in" }, 5],
  [{ path: "/dashboard", title: "Dashboard" }, 8],
  [{ path: "/about", title: "About" }, 3],
  [{ path: "/careers", title: "Careers" }, 2],
  [{ path: "/changelog", title: "Changelog" }, 3],
];
// Hour-of-day weights (UTC) — business-hours hump.
const HOURS: Weighted<number> = Array.from({ length: 24 }, (_, h) => [h, h < 6 ? 1 : h < 9 ? 3 : h < 18 ? 8 : h < 22 ? 4 : 2]);

const EVENT_DEFS = [
  { name: "page_view", description: "A page was viewed", isConversion: false },
  { name: "signup", description: "A visitor created an account", isConversion: true },
  { name: "login", description: "A user signed in", isConversion: false },
  { name: "product_view", description: "A product/plan page was viewed", isConversion: false },
  { name: "checkout_started", description: "Checkout flow was started", isConversion: false },
  { name: "purchase", description: "A payment was completed", isConversion: true },
  { name: "subscription_created", description: "A new subscription started", isConversion: true },
  { name: "button_clicked", description: "A CTA button was clicked", isConversion: false },
];

const PRODUCTS = [
  { name: "Starter Plan", category: "Subscription", price: 29, weight: 40, segment: "smb" },
  { name: "Pro Plan", category: "Subscription", price: 79, weight: 34, segment: "smb" },
  { name: "Business Plan", category: "Subscription", price: 199, weight: 16, segment: "mid-market" },
  { name: "Enterprise Plan", category: "Subscription", price: 499, weight: 6, segment: "enterprise" },
  { name: "Extra Seats", category: "Add-on", price: 12, weight: 14, segment: "smb" },
  { name: "Data Retention Add-on", category: "Add-on", price: 49, weight: 8, segment: "mid-market" },
];

async function insertMany<T>(label: string, rows: T[], fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 5000) await fn(rows.slice(i, i + 5000));
  console.log(`  · ${label}: ${rows.length.toLocaleString()}`);
}

function at(dayOffset: number): Date {
  const hour = pick(HOURS);
  const t = startOfToday.getTime() - dayOffset * DAY + hour * 3_600_000 + faker.number.int({ min: 0, max: 3_599_000 });
  return new Date(Math.min(t, now.getTime() - 60_000));
}

async function seedProject(projectId: string, opts: { visitors: number; days: number; idPrefix: string }) {
  const { visitors: visitorCount, days, idPrefix } = opts;

  const defs = await Promise.all(
    EVENT_DEFS.map((d) => prisma.eventDefinition.create({ data: { ...d, projectId } })),
  );
  const defByName = new Map(defs.map((d) => [d.name, d.id]));

  const products = await Promise.all(
    PRODUCTS.map((p) =>
      prisma.product.create({ data: { projectId, name: p.name, category: p.category, price: new Prisma.Decimal(p.price) } }),
    ),
  );
  const productMeta = products.map((p, i) => ({ ...p, weight: PRODUCTS[i].weight, segment: PRODUCTS[i].segment, price: PRODUCTS[i].price }));

  type VisitorRow = Prisma.VisitorCreateManyInput & { id: string };
  const visitors: VisitorRow[] = [];
  const sessions: Prisma.AnalyticsSessionCreateManyInput[] = [];
  const pageViews: Prisma.PageViewCreateManyInput[] = [];
  const events: Prisma.EventCreateManyInput[] = [];
  const transactions: Prisma.RevenueTransactionCreateManyInput[] = [];

  let sessionSeq = 0;

  for (let v = 0; v < visitorCount; v++) {
    const id = `${idPrefix}_vis_${v.toString().padStart(5, "0")}`;
    const geo = pick(GEO);
    const device = pick(DEVICES);
    const browser = pick(BROWSERS);
    const os = pick(OSES[device]);
    const source = pick(SOURCES);
    // Growth: newer cohorts are larger. Bias first-seen toward recent days.
    const firstSeenDay = Math.min(days - 1, Math.floor(Math.pow(faker.number.float({ min: 0, max: 1 }), 1.6) * days));
    const identified = faker.number.float({ min: 0, max: 1 }) < 0.42;
    const fullName = identified ? faker.person.fullName() : null;

    // Session days: first day, then weekly retention decay for 16 weeks.
    const sessionDays: number[] = [firstSeenDay];
    for (let week = 1; week <= 16; week++) {
      const dayOfWeek = firstSeenDay - week * 7 + faker.number.int({ min: -2, max: 2 });
      if (dayOfWeek < 0) break;
      const p = 0.46 * Math.pow(0.87, week - 1);
      if (faker.number.float({ min: 0, max: 1 }) < p) {
        sessionDays.push(dayOfWeek);
        if (faker.number.float({ min: 0, max: 1 }) < 0.3) sessionDays.push(Math.max(0, dayOfWeek - faker.number.int({ min: 1, max: 3 })));
      }
    }
    sessionDays.sort((a, b) => b - a);

    let totalRevenue = 0;
    let purchased = false;
    let lastSeenAt = at(firstSeenDay);
    const firstSeenAt = lastSeenAt;

    sessionDays.forEach((dayOffset, si) => {
      const sessionId = `${idPrefix}_ses_${(sessionSeq++).toString(36).padStart(7, "0")}`;
      const startedAt = si === 0 ? firstSeenAt : at(dayOffset);
      if (startedAt > lastSeenAt) lastSeenAt = startedAt;

      const pvCount = pick<number>([[1, 30], [2, 22], [3, 18], [4, 12], [5, 8], [6, 5], [8, 3], [11, 2]]);
      const durationSec = pvCount === 1 ? faker.number.int({ min: 4, max: 45 }) : faker.number.int({ min: 40, max: 240 }) * Math.min(pvCount, 5);
      const endedAt = new Date(startedAt.getTime() + durationSec * 1000);
      const sessionSource = si === 0 ? source : pick(SOURCES);

      const visited: { path: string; title: string }[] = [pick(PAGES)];
      for (let i = 1; i < pvCount; i++) visited.push(pick(PAGES));

      let cursor = startedAt.getTime();
      visited.forEach((pg, i) => {
        const dwell = Math.max(3, Math.round(durationSec / pvCount) + faker.number.int({ min: -10, max: 10 }));
        pageViews.push({
          projectId, sessionId, visitorId: id, path: pg.path, title: pg.title,
          occurredAt: new Date(cursor), durationSec: dwell, bounced: pvCount === 1,
        });
        events.push({ projectId, definitionId: defByName.get("page_view"), name: "page_view", visitorId: id, sessionId, occurredAt: new Date(cursor), metadata: { path: pg.path } });
        cursor += dwell * 1000;
        void i;
      });

      const evt = (name: string, offsetSec: number, metadata?: Prisma.InputJsonValue) =>
        events.push({ projectId, definitionId: defByName.get(name), name, visitorId: id, sessionId, occurredAt: new Date(startedAt.getTime() + offsetSec * 1000), metadata });

      // Funnel: product_view → checkout_started → purchase, plus auth events.
      if (si === 0 && identified && faker.number.float({ min: 0, max: 1 }) < 0.55) evt("signup", 20);
      if (si > 0 && identified && faker.number.float({ min: 0, max: 1 }) < 0.6) evt("login", 5);
      if (faker.number.float({ min: 0, max: 1 }) < 0.32) evt("button_clicked", faker.number.int({ min: 1, max: Math.max(10, durationSec) }), { label: pick<string>([["Start free trial", 5], ["Book a demo", 3], ["View pricing", 4], ["Read docs", 2]]) });

      let converted = false;
      if (faker.number.float({ min: 0, max: 1 }) < 0.44) {
        evt("product_view", Math.min(30, durationSec));
        if (faker.number.float({ min: 0, max: 1 }) < 0.27) {
          evt("checkout_started", Math.min(60, durationSec));
          if (faker.number.float({ min: 0, max: 1 }) < 0.3) {
            converted = true;
            const product = pick<typeof productMeta[number]>(productMeta.map((p) => [p, p.weight]));
            const isSub = product.category === "Subscription";
            evt("purchase", Math.min(90, durationSec), { product: product.name, amount: product.price });
            if (isSub && !purchased) evt("subscription_created", Math.min(95, durationSec), { plan: product.name });
            const status = pick<TransactionStatus>([[TransactionStatus.SUCCEEDED, 91], [TransactionStatus.REFUNDED, 4], [TransactionStatus.PENDING, 3], [TransactionStatus.FAILED, 2]]);
            transactions.push({
              projectId, visitorId: id, productId: product.id, amount: new Prisma.Decimal(product.price),
              currency: "USD", status, type: isSub ? (purchased ? TransactionType.RENEWAL : TransactionType.SUBSCRIPTION) : TransactionType.ONE_TIME,
              segment: product.segment, country: geo.country, occurredAt: new Date(startedAt.getTime() + 95_000),
            });
            if (status === TransactionStatus.SUCCEEDED) totalRevenue += product.price;
            // Monthly renewals from purchase until now, with churn.
            if (isSub && !purchased) {
              purchased = true;
              let renewalDay = dayOffset - 30;
              while (renewalDay > 0) {
                if (faker.number.float({ min: 0, max: 1 }) < 0.09) break; // churn
                const rStatus = pick<TransactionStatus>([[TransactionStatus.SUCCEEDED, 95], [TransactionStatus.REFUNDED, 2], [TransactionStatus.FAILED, 3]]);
                transactions.push({
                  projectId, visitorId: id, productId: product.id, amount: new Prisma.Decimal(product.price),
                  currency: "USD", status: rStatus, type: TransactionType.RENEWAL, segment: product.segment,
                  country: geo.country, occurredAt: at(renewalDay),
                });
                if (rStatus === TransactionStatus.SUCCEEDED) totalRevenue += product.price;
                renewalDay -= 30;
              }
            }
          }
        }
      }

      sessions.push({
        id: sessionId, projectId, visitorId: id, startedAt, endedAt, durationSec,
        device, browser, os, country: geo.country, region: geo.region, city: geo.city,
        source: sessionSource, landingPage: visited[0].path, exitPage: visited[visited.length - 1].path,
        pageViewsCount: pvCount, converted,
      });
    });

    const daysSinceSeen = (now.getTime() - lastSeenAt.getTime()) / DAY;
    visitors.push({
      id, projectId, anonId: faker.string.uuid(), name: fullName,
      email: identified && fullName ? faker.internet.email({ firstName: fullName.split(" ")[0], lastName: fullName.split(" ").slice(-1)[0] }).toLowerCase() : null,
      country: geo.country, region: geo.region, city: geo.city, device, browser, os, source,
      status: daysSinceSeen <= 14 ? VisitorStatus.ACTIVE : daysSinceSeen <= 45 ? VisitorStatus.DORMANT : VisitorStatus.CHURNED,
      firstSeenAt, lastSeenAt, sessionsCount: sessionDays.length, totalRevenue: new Prisma.Decimal(totalRevenue.toFixed(2)),
    });
  }

  await insertMany("visitors", visitors, (c) => prisma.visitor.createMany({ data: c }));
  await insertMany("sessions", sessions, (c) => prisma.analyticsSession.createMany({ data: c }));
  await insertMany("page views", pageViews, (c) => prisma.pageView.createMany({ data: c }));
  await insertMany("events", events, (c) => prisma.event.createMany({ data: c }));
  await insertMany("transactions", transactions, (c) => prisma.revenueTransaction.createMany({ data: c }));
}

async function main() {
  console.log("Clearing existing data…");
  // Order matters (FK constraints); cascades handle children of each root.
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating demo users & workspaces…");
  const password = await hash("demo1234", 12);
  const [owner, admin, analyst, viewer] = await Promise.all([
    prisma.user.create({ data: { name: "Ava Patel", email: "owner@insighthub.demo", passwordHash: password, emailVerified: now } }),
    prisma.user.create({ data: { name: "Marcus Chen", email: "admin@insighthub.demo", passwordHash: password, emailVerified: now } }),
    prisma.user.create({ data: { name: "Lena Fischer", email: "analyst@insighthub.demo", passwordHash: password, emailVerified: now } }),
    prisma.user.create({ data: { name: "Tom Okafor", email: "viewer@insighthub.demo", passwordHash: password, emailVerified: now } }),
  ]);

  const acme = await prisma.organization.create({
    data: {
      name: "Acme Inc", slug: "acme-inc", plan: "business",
      memberships: {
        create: [
          { userId: owner.id, role: Role.OWNER },
          { userId: admin.id, role: Role.ADMIN },
          { userId: analyst.id, role: Role.ANALYST },
          { userId: viewer.id, role: Role.VIEWER },
        ],
      },
      dashboards: { create: { name: "Company overview", isDefault: true } },
    },
  });
  const acmeProject = await prisma.project.create({ data: { orgId: acme.id, name: "acme.com", domain: "acme.com" } });

  const labs = await prisma.organization.create({
    data: {
      name: "Northlight Labs", slug: "northlight-labs", plan: "starter",
      memberships: { create: [{ userId: owner.id, role: Role.OWNER }, { userId: analyst.id, role: Role.ADMIN }] },
    },
  });
  const labsProject = await prisma.project.create({ data: { orgId: labs.id, name: "northlight.dev", domain: "northlight.dev" } });

  console.log("Seeding Acme Inc analytics (this takes ~a minute)…");
  await seedProject(acmeProject.id, { visitors: 3200, days: 180, idPrefix: "acme" });
  console.log("Seeding Northlight Labs analytics…");
  await seedProject(labsProject.id, { visitors: 420, days: 90, idPrefix: "nlab" });

  console.log("Creating saved reports, alerts, notifications, audit trail…");
  await prisma.savedReport.createMany({
    data: [
      { orgId: acme.id, projectId: acmeProject.id, createdById: analyst.id, name: "Revenue by country", description: "Weekly revenue split by billing country", config: { metric: "revenue", dimension: "country", chart: "bar", filters: {} }, schedule: "WEEKLY", lastRunAt: new Date(now.getTime() - 2 * DAY) },
      { orgId: acme.id, projectId: acmeProject.id, createdById: analyst.id, name: "Signups by traffic source", description: "Where new accounts come from", config: { metric: "conversions", dimension: "source", chart: "bar", filters: { event: "signup" } }, schedule: "NONE" },
      { orgId: acme.id, projectId: acmeProject.id, createdById: admin.id, name: "Mobile sessions trend", description: "Daily sessions on mobile devices", config: { metric: "sessions", dimension: "date", chart: "line", filters: { device: "MOBILE" } }, schedule: "DAILY", lastRunAt: new Date(now.getTime() - DAY) },
    ],
  });
  await prisma.alert.createMany({
    data: [
      { orgId: acme.id, projectId: acmeProject.id, createdById: owner.id, name: "Revenue drop", metric: "REVENUE", condition: "DECREASES_BY_PCT", threshold: 20, frequency: "DAILY", channels: ["IN_APP", "EMAIL"], lastTriggeredAt: new Date(now.getTime() - 6 * DAY) },
      { orgId: acme.id, projectId: acmeProject.id, createdById: admin.id, name: "DAU floor", metric: "ACTIVE_USERS", condition: "BELOW", threshold: 120, frequency: "DAILY", channels: ["IN_APP"] },
      { orgId: acme.id, projectId: acmeProject.id, createdById: admin.id, name: "Conversion spike", metric: "CONVERSION_RATE", condition: "INCREASES_BY_PCT", threshold: 30, frequency: "WEEKLY", channels: ["EMAIL"], isActive: false },
    ],
  });
  await prisma.notification.createMany({
    data: [
      { userId: owner.id, orgId: acme.id, type: "alert", title: "Revenue drop alert triggered", body: "Revenue decreased 24.3% vs the previous day.", link: "/dashboard/alerts", createdAt: new Date(now.getTime() - 6 * DAY) },
      { userId: owner.id, orgId: acme.id, type: "report", title: "Weekly report ready", body: "“Revenue by country” finished running.", link: "/dashboard/reports", createdAt: new Date(now.getTime() - 2 * DAY) },
      { userId: owner.id, orgId: acme.id, type: "info", title: "Welcome to InsightHub", body: "Your workspace is set up and collecting data.", createdAt: new Date(now.getTime() - 30 * DAY), readAt: new Date(now.getTime() - 29 * DAY) },
      { userId: admin.id, orgId: acme.id, type: "alert", title: "Revenue drop alert triggered", body: "Revenue decreased 24.3% vs the previous day.", link: "/dashboard/alerts", createdAt: new Date(now.getTime() - 6 * DAY) },
    ],
  });
  await prisma.auditLog.createMany({
    data: [
      { orgId: acme.id, actorId: owner.id, action: "org.settings_updated", targetType: "organization", targetId: acme.id, metadata: { field: "name" }, createdAt: new Date(now.getTime() - 40 * DAY) },
      { orgId: acme.id, actorId: owner.id, action: "member.role_changed", targetType: "user", targetId: analyst.id, metadata: { from: "VIEWER", to: "ANALYST" }, createdAt: new Date(now.getTime() - 33 * DAY) },
      { orgId: acme.id, actorId: admin.id, action: "alert.created", targetType: "alert", metadata: { name: "DAU floor" }, createdAt: new Date(now.getTime() - 21 * DAY) },
      { orgId: acme.id, actorId: analyst.id, action: "report.created", targetType: "report", metadata: { name: "Revenue by country" }, createdAt: new Date(now.getTime() - 14 * DAY) },
      { orgId: acme.id, actorId: analyst.id, action: "report.exported", targetType: "report", metadata: { format: "csv" }, createdAt: new Date(now.getTime() - 7 * DAY) },
      { orgId: acme.id, actorId: owner.id, action: "auth.login", targetType: "user", targetId: owner.id, createdAt: new Date(now.getTime() - DAY) },
      { orgId: acme.id, actorId: viewer.id, action: "auth.login", targetType: "user", targetId: viewer.id, createdAt: new Date(now.getTime() - 2 * DAY) },
    ],
  });

  console.log("✔ Seed complete.");
  console.log("  Demo logins (password: demo1234):");
  console.log("  owner@insighthub.demo · admin@insighthub.demo · analyst@insighthub.demo · viewer@insighthub.demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
