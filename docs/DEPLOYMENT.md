# Deployment

InsightHub ships as a single Docker image (Next.js standalone output) plus
PostgreSQL, with optional Redis. Any container platform works: Fly.io, Railway,
Render, AWS ECS/App Runner, Google Cloud Run, Azure Container Apps, or a VM.

## 1. Build the image

```bash
docker build -t insighthub:latest .
```

The multi-stage Dockerfile produces a ~150MB runtime image, runs as a non-root
user, and bakes in a `HEALTHCHECK` against `/api/health`.

## 2. Provision backing services

- **PostgreSQL 15+** (managed: RDS, Cloud SQL, Neon, Supabase…)
- **Redis 6+** (optional but recommended: ElastiCache, Upstash…)
- **SMTP** (optional: Resend, Postmark, SES…) for password reset + alert emails
- **S3-compatible bucket** (optional) for export storage

## 3. Configure environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string (enable TLS in prod: `?sslmode=require`) |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` — rotating it invalidates sessions |
| `AUTH_URL` | ✅ | canonical public URL, e.g. `https://app.example.com` |
| `AUTH_TRUST_HOST` | ✅ | `true` behind a proxy/load balancer |
| `REDIS_URL` | – | enables shared cache + rate limits across instances |
| `SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM` | – | else emails log to stdout |
| `S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY` | – | export storage |
| `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET` | – | enable OAuth buttons |

Never commit secrets — inject via your platform's secret manager.

## 4. Migrate & seed

Run once per release (release phase / init container / CI step):

```bash
npx prisma migrate deploy
```

Optional demo data: `npx prisma db seed` (dev/staging only).

## 5. Run

```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL=… -e AUTH_SECRET=… -e AUTH_URL=… -e AUTH_TRUST_HOST=true \
  -e REDIS_URL=… \
  insighthub:latest
```

Or prod-like locally with compose:

```bash
AUTH_SECRET=$(openssl rand -base64 32) docker compose --profile app up -d --build
```

## Health & scaling

- **Probes:** `GET /api/health` → 200 healthy / 503 when the DB is unreachable.
  Wire it to liveness/readiness checks and LB health checks.
- **Horizontal scaling:** the app is stateless (JWT sessions). With multiple
  instances, set `REDIS_URL` so caching and rate limits are shared.
- **Headers/TLS:** the app sets security headers itself; terminate TLS at your
  proxy and forward `x-forwarded-*` (Auth.js needs `AUTH_TRUST_HOST=true`).

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR:

1. **quality** — lint, strict typecheck, unit tests
2. **build** — production Next build against a real Postgres service container
   (migrations applied first)
3. **docker** — image build on `main` (add a registry push + deploy step for
   your platform to make it continuous deployment)

## Rollbacks

Images are immutable — redeploy the previous tag. Prisma migrations are
forward-only; write additive migrations (expand → migrate → contract) so old
and new app versions can coexist during deploys.
