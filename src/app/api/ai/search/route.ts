import { NextResponse } from "next/server";
import { runAiHospitalSearch } from "@/lib/api/ai-search";
import { jsonSafe } from "@/lib/api/hospital-search";
import { errorResponse } from "@/lib/api/error-response";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { sanitizePrompt } from "@/lib/security/prompt-sanitizer";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Rate limiting
  const ip = getClientIp(request as any);
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);
  if (!allowed) {
    logger.warn(`Rate limit exceeded for IP ${ip}`);
    return NextResponse.json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests", details: { remaining, resetInMs } } }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse({ code: "INVALID_JSON", message: "Request body must be valid JSON.", status: 400 });
  }

  // Validate request body using Zod schema

  const requestSchema = z.object({
    query: z.string().min(1, { message: "query must be a non-empty string." })
  });

  const parseResult = requestSchema.safeParse(body);
  if (!parseResult.success) {
    const { message } = parseResult.error.issues[0] ?? { message: "Invalid request body." };
    return errorResponse({ code: "INVALID_QUERY", message, status: 400 });
  }
  const query = parseResult.data.query.trim();

  try {
    const safeQuery = sanitizePrompt(query);
    const result = await runAiHospitalSearch(safeQuery);
    if (result.kind === "clarification") {
      return NextResponse.json({ data: { type: "clarification", question: result.question, parsedRequirements: result.parsed } });
    }
    return NextResponse.json({ data: { type: "results", parsedRequirements: result.parsed, items: jsonSafe(result.items) }, meta: result.meta });
  } catch (error) {
    logger.error('AI search handler error', { error });
    const message = error instanceof Error ? error.message : "The AI search could not be completed.";
    const isConfigurationError = message.includes("GEMINI_API_KEY");
    return errorResponse({ code: isConfigurationError ? "AI_NOT_CONFIGURED" : "AI_SEARCH_FAILED", message: isConfigurationError ? "AI search is not configured on the server." : "The request could not be understood safely. Please try a clearer location and specialty.", status: isConfigurationError ? 503 : 502 });
  }
}
