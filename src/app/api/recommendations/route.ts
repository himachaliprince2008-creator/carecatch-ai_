import { NextResponse } from "next/server";
import { generateRecommendations, recommendationRequestSchema } from "@/lib/api/recommendations";
import { RepositoryError } from "@/lib/repositories/hospital-repository";
import { jsonSafe } from "@/lib/api/hospital-search";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 });
  }

  const parsed = recommendationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Recommendation requirements are invalid.", details: parsed.error.flatten() } }, { status: 400 });

  try {
    const result = await generateRecommendations(parsed.data);
    return NextResponse.json({ data: jsonSafe(result.items), meta: result.meta });
  } catch (error) {
    if (error instanceof RepositoryError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 500 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Recommendations could not be generated." } }, { status: 500 });
  }
}
