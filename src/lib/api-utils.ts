import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, type RATE_LIMITS } from "./rate-limit";
import { requireAuth } from "./auth";

/**
 * Wraps an API handler with auth + rate limiting + error handling.
 * Reduces boilerplate across all API routes.
 */
export function withApi<T>(
  handler: (req: NextRequest, user: { id: number; email: string; name: string | null }, extra: T) => Promise<NextResponse>,
  options?: {
    rateLimit?: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];
  }
) {
  return async (req: NextRequest, extra: T) => {
    try {
      const user = await requireAuth(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (options?.rateLimit) {
        const routeKey = `${req.method}:${req.nextUrl.pathname}`;
        const result = checkRateLimit(`${user.id}:${routeKey}`, options.rateLimit);
        if (!result.allowed) {
          return NextResponse.json(
            { error: "Too many requests. Please slow down." },
            {
              status: 429,
              headers: {
                "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                "X-RateLimit-Remaining": "0",
              },
            }
          );
        }
      }

      return await handler(req, user, extra);
    } catch (err) {
      console.error(`[API ${req.method} ${req.nextUrl.pathname}]`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Parse pagination params from URL search params.
 * Returns validated limit and offset with sensible defaults.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { limit: number; maxLimit: number } = { limit: 50, maxLimit: 200 }
): { limit: number; offset: number } {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");

  let limit = defaults.limit;
  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, defaults.maxLimit);
    }
  }

  let offset = 0;
  if (rawOffset) {
    const parsed = parseInt(rawOffset, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}
