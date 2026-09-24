import type { Metadata } from "next";
import { PageIntro } from "@/components/dashboard-shell";
import { TreatmentCostSimulator } from "@/components/cost-simulator";
import { simulateTreatmentCost, type Currency } from "@/lib/services/cost-simulator-service";
import { searchHospitals } from "@/lib/repositories/hospital-repository";

export const metadata: Metadata = {
  title: "Treatment Cost Simulator | CareMatch AI",
  description:
    "Simulate treatment cost ranges across procedures, locations, hospital tiers, and government schemes like PM-JAY. Clear estimates with component breakdowns.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    treatment?: string;
    disease?: string;
    location?: string;
    budget?: string;
    currency?: string;
    pmjay?: string;
  }>;
};

export default async function CostPage({ searchParams }: Props) {
  const params = await searchParams;

  const currency = (params.currency?.toUpperCase() === "USD" ? "USD" : "INR") as Currency;
  const budgetRaw = params.budget ? Number(params.budget) : undefined;
  const budgetAmount = isNaN(budgetRaw as number) ? 100000 : budgetRaw;
  const isPmjayEnrolled = params.pmjay === "true" || params.pmjay === "1";

  const initialSimulation = simulateTreatmentCost({
    treatmentId: params.treatment,
    diseaseId: params.disease,
    location: params.location,
    budgetAmount,
    currency,
    isPmjayEnrolled,
  });

  // Query matching hospitals to provide specific regional pricing
  const hospitalsResult = await searchHospitals({
    city: params.location,
    specialty: initialSimulation.treatment.specialty,
    pageSize: 10,
    includeSynthetic: true,
  });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Financial Transparency & Planning"
        title="Treatment Cost Simulator"
        description="Explore indicative procedure cost distributions, calculate budget compatibility, and simulate government scheme subsidies like Ayushman Bharat PM-JAY. All numbers are statistical estimates."
      />

      <TreatmentCostSimulator
        initialSimulation={initialSimulation}
        availableHospitals={hospitalsResult.items}
      />
    </div>
  );
}
