import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  CircleDollarSign,
  FileText,
  Filter,
  Rocket,
  Search,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Preview" },
  { href: "#faq", label: "FAQ" },
];

const STATS = [
  { value: "2.4B", label: "events tracked monthly" },
  { value: "99.99%", label: "uptime, last 12 months" },
  { value: "SOC 2", label: "ready security posture" },
  { value: "5 min", label: "from signup to first chart" },
];

const FEATURES = [
  {
    icon: Activity,
    title: "Real-time dashboards",
    description: "Live traffic, revenue, and event streams that update the second data arrives — no refresh button.",
  },
  {
    icon: Filter,
    title: "Funnel analysis",
    description: "Build multi-step funnels in seconds and see exactly where users drop off, segmented any way you like.",
  },
  {
    icon: Users,
    title: "Cohort retention",
    description: "Weekly and monthly retention grids that show whether the users you acquire actually stick around.",
  },
  {
    icon: CircleDollarSign,
    title: "Revenue analytics",
    description: "MRR, expansion, churn, and LTV tied directly to product behavior — not a spreadsheet export away.",
  },
  {
    icon: FileText,
    title: "Custom reports",
    description: "Compose metrics, dimensions, and filters into shareable reports your whole team can rerun anytime.",
  },
  {
    icon: Bell,
    title: "Alerts & notifications",
    description: "Set thresholds on any metric and get pinged in email or Slack the moment something moves.",
  },
];

const TEAM_COLUMNS = [
  {
    icon: Search,
    title: "Analysts",
    description:
      "Slice events by any property without writing SQL. Saved segments, custom reports, and CSV export keep deep dives fast and repeatable.",
  },
  {
    icon: Rocket,
    title: "Founders",
    description:
      "One screen with the numbers that matter: signups, activation, revenue, retention. Know how the business is doing before your first coffee.",
  },
  {
    icon: Terminal,
    title: "Engineers",
    description:
      "A drop-in snippet and typed SDKs. Track an event in one line, verify it live, and never babysit an ETL pipeline again.",
  },
];

const FAQS = [
  {
    q: "How does the free plan work?",
    a: "The free plan includes up to 100,000 events per month, every core feature, and unlimited teammates. No credit card required — upgrade only when you outgrow it.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams see their first live chart in under five minutes. Paste one script tag or install an SDK for JavaScript, iOS, or Android, and events start flowing immediately.",
  },
  {
    q: "Can I control what my team can see and do?",
    a: "Yes. Workspaces support owner, admin, analyst, and viewer roles, so you decide who can manage settings, build reports, or just browse dashboards.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted in transit and at rest, and our controls are SOC 2 ready. You can export or permanently delete your workspace data at any time.",
  },
];

const FOOTER_COLUMNS = [
  { heading: "Product", links: ["Features", "Pricing", "Changelog", "Docs"] },
  { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { heading: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
];

/* ── Dashboard preview (pure CSS/SVG mock) ─────────────────────────────── */

const KPIS = [
  { label: "Revenue", value: "$128.4K", delta: "+12.4%", up: true },
  { label: "Active users", value: "48,210", delta: "+8.1%", up: true },
  { label: "Conversion", value: "3.42%", delta: "−0.4%", up: false },
  { label: "Avg. session", value: "4m 32s", delta: "+2.9%", up: true },
];

const DONUT_LEGEND = [
  { label: "Organic", value: "55%", token: "var(--chart-1)" },
  { label: "Direct", value: "27%", token: "var(--chart-2)" },
  { label: "Referral", value: "18%", token: "var(--chart-3)" },
];

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex w-full max-w-xs items-center justify-center rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground">
          insighthub.app/dashboard
        </div>
        <div className="w-12" aria-hidden />
      </div>

      <div className="flex">
        {/* Sidebar strip */}
        <div className="hidden w-12 flex-col items-center gap-2.5 border-r py-4 sm:flex" aria-hidden>
          <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M4 20V10M10 20V4M16 20v-8M22 20V8" stroke="var(--primary-foreground)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="h-6 w-6 rounded-md bg-primary/15 ring-1 ring-primary/30" />
          <span className="h-6 w-6 rounded-md bg-muted" />
          <span className="h-6 w-6 rounded-md bg-muted" />
          <span className="h-6 w-6 rounded-md bg-muted" />
          <span className="h-6 w-6 rounded-md bg-muted" />
        </div>

        {/* Main pane */}
        <div className="flex-1 space-y-3 p-3 sm:p-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border bg-background/60 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-sm font-semibold tracking-tight tabular-nums sm:text-base">{kpi.value}</span>
                  <span className={`text-[11px] font-medium tabular-nums ${kpi.up ? "text-success" : "text-destructive"}`}>
                    {kpi.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {/* Area chart */}
            <div className="rounded-lg border bg-background/60 p-3 lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium">Revenue — last 30 days</p>
                <div className="flex gap-1 text-[10px] text-muted-foreground" aria-hidden>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">30d</span>
                  <span className="rounded px-1.5 py-0.5">90d</span>
                  <span className="rounded px-1.5 py-0.5">12m</span>
                </div>
              </div>
              <svg viewBox="0 0 560 170" className="h-auto w-full" role="img" aria-label="Illustrative area chart of revenue trending upward over 30 days">
                <defs>
                  <linearGradient id="hero-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120].map((y) => (
                  <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
                ))}
                <path
                  d="M0 142 C 45 136, 70 126, 105 121 C 140 116, 165 131, 200 119 C 235 107, 260 86, 295 90 C 330 94, 355 68, 390 60 C 425 52, 455 58, 490 45 C 515 37, 542 30, 560 26 L560 170 L0 170 Z"
                  fill="url(#hero-area-fill)"
                />
                <path
                  d="M0 142 C 45 136, 70 126, 105 121 C 140 116, 165 131, 200 119 C 235 107, 260 86, 295 90 C 330 94, 355 68, 390 60 C 425 52, 455 58, 490 45 C 515 37, 542 30, 560 26"
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="490" cy="45" r="4" fill="var(--chart-1)" stroke="var(--card)" strokeWidth="2" />
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
                <span>Jul 13</span>
                <span>Jul 23</span>
                <span>Aug 2</span>
                <span>Aug 12</span>
              </div>
            </div>

            {/* Donut */}
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="mb-3 text-xs font-medium">Traffic sources</p>
              <div className="flex items-center justify-center py-1">
                <div
                  aria-hidden
                  className="relative h-28 w-28 rounded-full"
                  style={{
                    background:
                      "conic-gradient(var(--chart-1) 0 54.6%, var(--card) 54.6% 55.4%, var(--chart-2) 55.4% 81.6%, var(--card) 81.6% 82.4%, var(--chart-3) 82.4% 99.2%, var(--card) 99.2% 100%)",
                  }}
                >
                  <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
                    <span className="text-sm font-semibold tabular-nums">48.2K</span>
                    <span className="text-[10px] text-muted-foreground">sessions</span>
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {DONUT_LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: item.token }} />
                      {item.label}
                    </span>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo href="/" />
            <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild>
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Start free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(56rem 32rem at 50% -8rem, color-mix(in oklab, var(--primary) 14%, transparent), transparent 70%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
            <Badge variant="secondary" className="gap-1.5 border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-3" aria-hidden />
              Product analytics, minus the noise
            </Badge>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Understand your product. Grow your revenue.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
              InsightHub turns raw events into clear answers — traffic, funnels, retention, and revenue in one
              fast, real-time dashboard your whole team will actually use.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">View live demo</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free up to 100k events/month · demo credentials on the sign-in page
            </p>
          </div>

          {/* Dashboard preview */}
          <div id="preview" className="relative mx-auto w-full max-w-5xl scroll-mt-24 px-4 pb-20 sm:px-6">
            <DashboardPreview />
          </div>
        </section>

        {/* Metrics band */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">
                Everything you need to answer &ldquo;what happened, and why?&rdquo;
              </h2>
              <p className="mt-4 text-muted-foreground">
                Six tools, one data model. Every chart drills down to the exact users and events behind it.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border bg-card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team section */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Built for the whole team</h2>
              <p className="mt-4 text-muted-foreground">
                One source of truth, three very different mornings made easier.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {TEAM_COLUMNS.map((col) => (
                <div key={col.title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <col.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-medium">{col.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{col.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
              <p className="mt-4 text-muted-foreground">Short answers to the things teams ask before switching.</p>
            </div>
            <div className="mt-10 space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-lg border bg-card p-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {faq.q}
                      <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          <div className="rounded-2xl bg-foreground px-6 py-16 text-center text-background sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance">
              Start understanding your product today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-background/70">
              Free for your first 100k events every month. Set up in five minutes — no credit card, no sales call.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8 bg-background text-foreground hover:bg-background/90">
              <Link href="/signup">
                Start free
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <Logo href="/" />
              <p className="mt-3 text-sm text-muted-foreground">
                Product analytics for teams who want answers, not another data project.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.heading}>
                  <p className="text-sm font-medium">{col.heading}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((label) => (
                      <li key={label}>
                        <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-10 border-t pt-6 text-sm text-muted-foreground">© 2026 InsightHub Labs</p>
        </div>
      </footer>
    </div>
  );
}
