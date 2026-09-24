import type { Metadata } from "next";
import { PageIntro } from "@/components/dashboard-shell";
import { ComparisonWorkspace, type ComparisonHospital } from "@/components/comparison-workspace";
import { getHospitalById } from "@/lib/repositories/hospital-repository";

export const metadata: Metadata = {
  title: "Compare Hospitals | CareMatch AI",
  description: "Compare hospitals side-by-side across treatment availability, costs, facilities, outcome evidence, and verification status.",
};

export const dynamic = "force-dynamic";

function toComparison(hospital: NonNullable<Awaited<ReturnType<typeof getHospitalById>>>): ComparisonHospital {
  const toIso = (d: unknown) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString();
    try {
      return new Date(String(d)).toISOString();
    } catch {
      return null;
    }
  };

  return {
    id: hospital.id,
    name: hospital.name,
    city: hospital.city,
    state: hospital.state ?? null,
    hospitalType: hospital.hospitalType,
    hasIcu: hospital.hasIcu,
    hasEmergency: hospital.hasEmergency,
    acceptsPmJay: hospital.acceptsPmJay,
    hasNabhAccreditation: hospital.hasNabhAccreditation,
    rating: hospital.rating != null ? Number(hospital.rating) : null,
    reviewCount: hospital.reviewCount,
    phone: hospital.phone ?? null,
    websiteUrl: hospital.websiteUrl ?? null,
    latitude: hospital.latitude != null ? Number(hospital.latitude) : null,
    longitude: hospital.longitude != null ? Number(hospital.longitude) : null,
    distanceKm: null,
    isSynthetic: hospital.isSynthetic,
    updatedAt: toIso(hospital.updatedAt) ?? new Date().toISOString(),
    specializations: (hospital.specializations ?? []).map((s) => ({
      specialty: s.specialty,
      disease: { name: s.disease.name },
    })),
    facilities: (hospital.facilities ?? []).map((f) => ({ name: f.name })),
    treatmentCosts: (hospital.treatmentCosts ?? []).map((c) => ({
      currency: c.currency,
      minAmount: c.minAmount != null ? Number(c.minAmount) : null,
      maxAmount: c.maxAmount != null ? Number(c.maxAmount) : null,
      isSynthetic: c.isSynthetic,
      disease: { name: c.disease.name },
      source: c.source
        ? { name: c.source.name, type: String(c.source.type), isSynthetic: c.source.isSynthetic }
        : null,
    })),
    outcomes: (hospital.specializations ?? []).flatMap((s) =>
      (s.disease?.outcomes ?? []).map((o) => ({
        label: o.label,
        value: o.value ?? null,
        reportingPeriodStart: toIso(o.reportingPeriodStart),
        reportingPeriodEnd: toIso(o.reportingPeriodEnd),
        isSynthetic: o.isSynthetic,
        source: o.source
          ? { name: o.source.name, type: String(o.source.type), isSynthetic: o.source.isSynthetic }
          : null,
      })),
    ),
    verification: hospital.verification
      ? {
          status: String(hospital.verification.status),
          verifiedAt: toIso(hospital.verification.verifiedAt),
          verifiedBy: hospital.verification.verifiedBy ?? null,
          source: hospital.verification.source
            ? { name: hospital.verification.source.name, type: String(hospital.verification.source.type), isSynthetic: hospital.verification.source.isSynthetic }
            : null,
        }
      : null,
  };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;

  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const initialHospitals: ComparisonHospital[] = [];
  for (const id of idList) {
    const hospital = await getHospitalById(id, { includeSynthetic: true });
    if (hospital) initialHospitals.push(toComparison(hospital));
  }

  return (
    <div>
      <PageIntro
        eyebrow="Decision workspace"
        title="Compare care options"
        description="Add hospitals and compare them side by side. CareMatch does not rank facilities — you review the evidence and decide."
      />
      <ComparisonWorkspace initialHospitals={initialHospitals} />
    </div>
  );
}
