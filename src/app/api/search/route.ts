import { NextResponse } from "next/server";
import { parseHospitalSearchQuery, runHospitalSearch, jsonSafe } from "@/lib/api/hospital-search";
import { RepositoryError } from "@/lib/repositories/hospital-repository";
import { errorResponse } from "@/lib/api/error-response";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { sanitizePrompt } from "@/lib/security/prompt-sanitizer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  // Rate limiting
  const ip = getClientIp(request as any);
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);
  if (!allowed) {
    logger.warn(`Rate limit exceeded for IP ${ip}`);
    return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests", details: { remaining, resetInMs } } }, { status: 429 });
  }

  const parsed = parseHospitalSearchQuery(new URL(request.url).searchParams);
  if (!parsed.success) {
    logger.info('Invalid search query', { details: parsed.error.flatten() });
    return errorResponse({ code: "INVALID_QUERY", message: "One or more search filters are invalid.", details: parsed.error.flatten(), status: 400 });
  }

  // Sanitize user-provided query parameters
  const sanitized = {
    ...parsed.data,
    query: parsed.data.query ? sanitizePrompt(parsed.data.query) : undefined,
  };

  try {
    const result = await runHospitalSearch(sanitized);
    return NextResponse.json({ data: jsonSafe(result.items), meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: result.pageCount } });
  } catch (error) {
    logger.error('Search handler error', { error });
    if (error instanceof RepositoryError) {
      return errorResponse({ code: error.code, message: error.message, status: 500 });
    }
    return errorResponse({ code: "INTERNAL_ERROR", message: "The search could not be completed.", status: 500 });
  }
}
