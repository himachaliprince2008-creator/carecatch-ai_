import { NextResponse } from "next/server";
import { parseHospitalSearchQuery, runHospitalSearch, jsonSafe } from "@/lib/api/hospital-search";
import { RepositoryError } from "@/lib/repositories/hospital-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const parsed = parseHospitalSearchQuery(new URL(request.url).searchParams);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_QUERY", message: "One or more filters are invalid.", details: parsed.error.flatten() } }, { status: 400 });

  try {
    const result = await runHospitalSearch(parsed.data);
    return NextResponse.json({ data: jsonSafe(result.items), meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: result.pageCount } });
  } catch (error) {
    if (error instanceof RepositoryError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 500 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The hospital search could not be completed." } }, { status: 500 });
  }
}
