import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Throwable, status-carrying error for API route handlers. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const unauthorized = () => new ApiError(401, "Authentication required");
export const forbidden = (msg = "You do not have permission to perform this action") => new ApiError(403, msg);
export const notFound = (msg = "Not found") => new ApiError(404, msg);
export const badRequest = (msg: string) => new ApiError(400, msg);
export const tooManyRequests = (retryAfterSec = 60) =>
  Object.assign(new ApiError(429, "Too many requests, please try again later"), { retryAfterSec });

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/**
 * Wraps a route handler with uniform error handling:
 * Zod issues -> 422 with field details, ApiError -> its status, else 500.
 */
export function withErrorHandling<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          { status: 422 },
        );
      }
      if (err instanceof ApiError) {
        const headers: Record<string, string> = {};
        const retryAfter = (err as ApiError & { retryAfterSec?: number }).retryAfterSec;
        if (retryAfter) headers["Retry-After"] = String(retryAfter);
        return NextResponse.json({ error: err.message }, { status: err.status, headers });
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

export async function parseJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}
