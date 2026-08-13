import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Edge middleware uses the adapter-free config; route protection lives in the
// `authorized` callback. Session cookies are httpOnly + sameSite=lax and
// `__Secure-` prefixed in production (Auth.js defaults).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};
