import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HospitalDetail, type HospitalDetailData } from "@/components/hospital-detail";
import { getHospitalById } from "@/lib/repositories/hospital-repository";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const hospital = await getHospitalById(id, { includeSynthetic: true });
  if (!hospital) return { title: "Hospital not found | CareMatch AI" };
  return {
    title: `${hospital.name} | CareMatch AI`,
    description: (
      hospital.description ??
      `Review facility details, treatment costs, outcome evidence, and verification status for ${hospital.name}.`
    ).slice(0, 160),
  };
}

export default async function HospitalDetailPage({ params }: Props) {
  const { id } = await params;
  const hospital = await getHospitalById(id, { includeSynthetic: true });

  if (!hospital) notFound();

  const toIso = (d: unknown) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString();
    try {
      return new Date(String(d)).toISOString();
    } catch {
      return null;
    }
  };

  const data: HospitalDetailData = {
    id: hospital.id,
    name: hospital.name,
    slug: hospital.slug,
    description: hospital.description ?? null,
    addressLine1: hospital.addressLine1 ?? null,
    city: hospital.city,
    state: hospital.state ?? null,
    postalCode: hospital.postalCode ?? null,
    country: hospital.country ?? "US",
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
    isSynthetic: hospital.isSynthetic,
    createdAt: toIso(hospital.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(hospital.updatedAt) ?? new Date().toISOString(),

    specializations: (hospital.specializations ?? []).map((s) => ({
      specialty: s.specialty,
      disease: {
        id: s.disease?.id ?? s.diseaseId ?? "d-gen",
        name: s.disease?.name ?? s.specialty ?? "General Care",
        description: s.disease?.description ?? null,
        outcomes: (s.disease?.outcomes ?? []).map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description ?? null,
          value: o.value ?? null,
          reportingPeriodStart: toIso(o.reportingPeriodStart),
          reportingPeriodEnd: toIso(o.reportingPeriodEnd),
          isSynthetic: o.isSynthetic,
          source: o.source
            ? {
                name: o.source.name,
                type: String(o.source.type),
                url: o.source.url ?? null,
                publisher: o.source.publisher ?? null,
                retrievedAt: toIso(o.source.retrievedAt),
                isSynthetic: o.source.isSynthetic,
              }
            : null,
        })),
      },
    })),

    facilities: (hospital.facilities ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description ?? null,
    })),

    treatmentCosts: (hospital.treatmentCosts ?? []).map((c) => ({
      id: c.id,
      currency: c.currency,
      minAmount: c.minAmount != null ? Number(c.minAmount) : null,
      maxAmount: c.maxAmount != null ? Number(c.maxAmount) : null,
      notes: c.notes ?? null,
      isSynthetic: c.isSynthetic,
      disease: { name: c.disease?.name ?? "Specialized Treatment" },
      source: c.source
        ? { name: c.source.name, type: String(c.source.type), isSynthetic: c.source.isSynthetic }
        : null,
    })),

    reviews: (hospital.reviews ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body ?? null,
      isSynthetic: r.isSynthetic,
      createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    })),

    verification: hospital.verification
      ? {
          status: String(hospital.verification.status),
          verifiedAt: toIso(hospital.verification.verifiedAt),
          verifiedBy: hospital.verification.verifiedBy ?? null,
          notes: hospital.verification.notes ?? null,
          source: hospital.verification.source
            ? {
                name: hospital.verification.source.name,
                type: String(hospital.verification.source.type),
                url: hospital.verification.source.url ?? null,
                isSynthetic: hospital.verification.source.isSynthetic,
              }
            : null,
        }
      : null,
  };

  return <HospitalDetail hospital={data} />;
}
