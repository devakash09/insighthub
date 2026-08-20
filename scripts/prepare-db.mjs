/* eslint-disable no-console */
/**
 * Build-time database preparation (used on Vercel and other PaaS builds):
 *   1. applies pending Prisma migrations
 *   2. seeds demo data when the database is completely empty
 *
 * Fails soft: builds without a (reachable) database still succeed — the app
 * then reports the problem at runtime via /api/health.
 */
import { spawnSync } from "node:child_process";

// Prefer a direct (non-pooled) connection for DDL — pgbouncer breaks migrate.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!directUrl) {
  console.warn("[prepare-db] DATABASE_URL is not set — skipping migrate/seed.");
  process.exit(0);
}
if (/localhost|127\.0\.0\.1/.test(directUrl) && process.env.VERCEL) {
  console.warn("[prepare-db] DATABASE_URL points at localhost, which is unreachable from Vercel — skipping.");
  console.warn("[prepare-db] Attach a hosted Postgres (e.g. Vercel Storage -> Neon) and redeploy.");
  process.exit(0);
}

const env = { ...process.env, DATABASE_URL: directUrl };

function run(label, command, args) {
  console.log(`[prepare-db] ${label}…`);
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  return result.status === 0;
}

if (!run("applying migrations", "npx", ["prisma", "migrate", "deploy"])) {
  console.warn("[prepare-db] migrate deploy failed (database unreachable?) — continuing without it.");
  process.exit(0);
}

// Seed only a completely empty database, so real data is never touched.
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
try {
  const users = await prisma.user.count();
  if (users > 0) {
    console.log(`[prepare-db] database already has ${users} user(s) — skipping seed.`);
  } else if (!run("seeding demo data (first deploy only)", "npx", ["prisma", "db", "seed"])) {
    console.warn("[prepare-db] seed failed — the app will start with an empty database.");
  }
} catch (err) {
  console.warn("[prepare-db] could not inspect database:", err?.message ?? err);
} finally {
  await prisma.$disconnect();
}
