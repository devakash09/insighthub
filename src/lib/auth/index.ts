import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const ip = request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const limited = await rateLimit(`login:${ip}:${email}`, 10, 10 * 60);
      if (!limited.ok) return null;

      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

// OAuth-ready: providers register themselves when credentials are configured.
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      const membership = await db.membership.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      if (membership) {
        await recordAudit({ orgId: membership.orgId, actorId: user.id, action: "auth.login", targetType: "user", targetId: user.id });
      }
    },
  },
});
