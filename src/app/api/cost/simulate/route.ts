import { NextRequest, NextResponse } from "next/server";
import { simulateTreatmentCost, TREATMENT_CATALOG, type Currency } from "@/lib/services/cost-simulator-service";
import { searchHospitals } from "@/lib/repositories/hospital-repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const treatmentId = searchParams.get("treatmentId") ?? undefined;
    const diseaseId = searchParams.get("diseaseId") ?? undefined;
    const location = searchParams.get("location") ?? undefined;
    const hospitalId = searchParams.get("hospitalId") ?? undefined;
    const budgetRaw = searchParams.get("budget");
    const budgetAmount = budgetRaw ? Number(budgetRaw) : undefined;
    const currency = (searchParams.get("currency")?.toUpperCase() === "INR" ? "INR" : "USD") as Currency;
    const isPmjayEnrolled = searchParams.get("pmjay") === "true";

    const result = simulateTreatmentCost({
      treatmentId,
      diseaseId,
      location,
      hospitalId,
      budgetAmount: isNaN(budgetAmount as number) ? undefined : budgetAmount,
      currency,
      isPmjayEnrolled,
    });

    // Also fetch relevant hospitals that offer this specialty / treatment
    const hospitalsResult = await searchHospitals({
      city: location,
      specialty: result.treatment.specialty,
      diseaseId: result.treatment.diseaseId,
      pageSize: 5,
      includeSynthetic: true,
    });

    return NextResponse.json({
      simulation: result,
      catalog: TREATMENT_CATALOG,
      matchingHospitals: hospitalsResult.items,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to simulate treatment cost", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = simulateTreatmentCost({
      treatmentId: body.treatmentId,
      diseaseId: body.diseaseId,
      location: body.location,
      hospitalId: body.hospitalId,
      budgetAmount: body.budgetAmount ? Number(body.budgetAmount) : undefined,
      currency: body.currency === "INR" ? "INR" : "USD",
      isPmjayEnrolled: Boolean(body.isPmjayEnrolled),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid simulation request", message: (error as Error).message },
      { status: 400 }
    );
  }
}
