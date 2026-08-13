import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma, no bcrypt) shared by the middleware and
 * the full server-side auth instance. Providers that need Node APIs are added
 * in `src/lib/auth/index.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isDashboard = pathname.startsWith("/dashboard");
      const isAuthPage = ["/login", "/signup", "/forgot-password", "/reset-password"].some((p) =>
        pathname.startsWith(p),
      );

      if (isDashboard) return isLoggedIn; // false -> redirect to signIn page
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
  providers: [], // populated in src/lib/auth/index.ts
} satisfies NextAuthConfig;
