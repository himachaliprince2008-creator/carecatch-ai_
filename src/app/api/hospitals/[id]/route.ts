import { NextResponse } from "next/server";
import { getHospitalById, getHospitalDiseaseMetrics, RepositoryError } from "@/lib/repositories/hospital-repository";
import { jsonSafe } from "@/lib/api/hospital-search";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) return NextResponse.json({ error: { code: "INVALID_ID", message: "Hospital id is required." } }, { status: 400 });

  try {
    const [hospital, diseaseMetrics] = await Promise.all([getHospitalById(id), getHospitalDiseaseMetrics(id)]);
    if (!hospital) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Hospital not found." } }, { status: 404 });
    return NextResponse.json({ data: jsonSafe({ ...hospital, diseaseMetrics }) });
  } catch (error) {
    if (error instanceof RepositoryError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 500 });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The hospital could not be loaded." } }, { status: 500 });
  }
}
