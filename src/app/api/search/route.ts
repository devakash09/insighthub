import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withErrorHandling } from "@/lib/api";
import { getApiContext } from "@/lib/auth/context";

const querySchema = z.object({ q: z.string().trim().min(2).max(80) });

interface SearchResult {
  type: "user" | "report" | "event" | "page";
  label: string;
  sublabel?: string;
  href: string;
}

export const GET = withErrorHandling(async (req) => {
  const ctx = await getApiContext();
  const url = new URL(req.url);
  const { q } = querySchema.parse({ q: url.searchParams.get("q") ?? "" });

  const [visitors, reports, eventDefs, pages] = await Promise.all([
    db.visitor.findMany({
      where: {
        projectId: ctx.project.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, name: true, email: true },
    }),
    db.savedReport.findMany({
      where: { orgId: ctx.org.id, name: { contains: q, mode: "insensitive" } },
      take: 4,
      select: { id: true, name: true, description: true },
    }),
    db.eventDefinition.findMany({
      where: { projectId: ctx.project.id, name: { contains: q, mode: "insensitive" } },
      take: 4,
      select: { name: true, description: true },
    }),
    db.$queryRaw<{ path: string }[]>`
      SELECT DISTINCT "path" FROM "PageView"
      WHERE "projectId" = ${ctx.project.id} AND "path" ILIKE ${"%" + q + "%"}
      LIMIT 4`,
  ]);

  const results: SearchResult[] = [
    ...visitors.map((v) => ({
      type: "user" as const,
      label: v.name ?? "Anonymous user",
      sublabel: v.email ?? v.id,
      href: `/dashboard/users/${v.id}`,
    })),
    ...reports.map((r) => ({
      type: "report" as const,
      label: r.name,
      sublabel: r.description ?? undefined,
      href: `/dashboard/reports?highlight=${r.id}`,
    })),
    ...eventDefs.map((e) => ({
      type: "event" as const,
      label: e.name,
      sublabel: e.description ?? undefined,
      href: `/dashboard/events/${encodeURIComponent(e.name)}`,
    })),
    ...pages.map((p) => ({
      type: "page" as const,
      label: p.path,
      sublabel: "Top pages",
      href: `/dashboard/traffic`,
    })),
  ];

  return NextResponse.json({ results });
});
