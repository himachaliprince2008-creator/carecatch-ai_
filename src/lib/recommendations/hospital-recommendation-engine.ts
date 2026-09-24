import "server-only";

import type { HospitalSearchResult } from "@/lib/repositories/hospital-repository";

export type RecommendationRequirements = {
  disease?: string;
  specialty?: string;
  minimumBudget?: number;
  maximumBudget?: number;
  maxDistanceKm?: number;
  requiredFacilities?: string[];
  requirePmJay?: boolean;
  requireEmergency?: boolean;
  requireIcu?: boolean;
};

export type RecommendationWeights = {
  treatmentMatch: number;
  budget: number;
  distance: number;
  facilities: number;
  pmJay: number;
  emergency: number;
  icu: number;
  outcome: number;
  rating: number;
};

export const defaultRecommendationWeights: RecommendationWeights = {
  treatmentMatch: 25,
  budget: 15,
  distance: 15,
  facilities: 15,
  pmJay: 8,
  emergency: 7,
  icu: 5,
  outcome: 5,
  rating: 5,
};

export type HospitalRecommendation = {
  hospital: HospitalSearchResult;
  matchScore: number;
  matchReasons: string[];
  matchedRequirements: string[];
  unmatchedRequirements: string[];
  dataAvailability: {
    cost: boolean;
    outcome: boolean;
    distance: boolean;
    facilities: boolean;
    verification: boolean;
    rating: boolean;
  };
  dataVerificationStatus: "VERIFIED" | "PENDING" | "REJECTED" | "UNKNOWN";
};

function normalizedWeights(weights: Partial<RecommendationWeights> = {}): RecommendationWeights {
  const raw = { ...defaultRecommendationWeights, ...weights };
  const total = Object.values(raw).reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total === 0) return defaultRecommendationWeights;
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, (Math.max(0, value) / total) * 100])) as RecommendationWeights;
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function includesMatch(value: string, query?: string): boolean {
  return Boolean(query && normalized(value).includes(normalized(query)));
}

function moneyCompatible(candidate: HospitalSearchResult, requirements: RecommendationRequirements): boolean {
  if (requirements.minimumBudget === undefined && requirements.maximumBudget === undefined) return true;
  const costs = candidate.treatmentCosts;
  if (costs.length === 0) return false;
  return costs.some((cost) => {
    const minimum = cost.minAmount === null ? null : Number(cost.minAmount);
    const maximum = cost.maxAmount === null ? null : Number(cost.maxAmount);
    return (requirements.maximumBudget === undefined || minimum === null || minimum <= requirements.maximumBudget) &&
      (requirements.minimumBudget === undefined || maximum === null || maximum >= requirements.minimumBudget);
  });
}

function treatmentMatches(candidate: HospitalSearchResult, requirements: RecommendationRequirements): boolean {
  const relevant = candidate.specializations.some((specialization) =>
    (!requirements.specialty || includesMatch(specialization.specialty, requirements.specialty)) &&
    (!requirements.disease || includesMatch(specialization.disease.name, requirements.disease)),
  );
  return Boolean(requirements.specialty || requirements.disease) ? relevant : true;
}

function scoreRequirement(value: boolean, weight: number): number {
  return value ? weight : 0;
}

export function recommendHospitals(
  candidates: readonly HospitalSearchResult[],
  requirements: RecommendationRequirements,
  configuredWeights: Partial<RecommendationWeights> = {},
): HospitalRecommendation[] {
  const weights = normalizedWeights(configuredWeights);
  return candidates.map((candidate) => {
    const matchedRequirements: string[] = [];
    const unmatchedRequirements: string[] = [];
    const matchReasons: string[] = [];
    const treatmentMatch = treatmentMatches(candidate, requirements);
    const costAvailable = candidate.treatmentCosts.length > 0;
    const budgetMatch = moneyCompatible(candidate, requirements);
    const distanceAvailable = candidate.distanceKm !== null;
    const distanceMatch = requirements.maxDistanceKm === undefined || (distanceAvailable && candidate.distanceKm! <= requirements.maxDistanceKm);
    const facilityNames = candidate.facilities.map((facility) => normalized(facility.name));
    const requestedFacilities = (requirements.requiredFacilities ?? []).map(normalized).filter(Boolean);
    const matchedFacilities = requestedFacilities.filter((facility) => facilityNames.some((name) => name.includes(facility)));
    const facilitiesMatch = requestedFacilities.length === 0 || matchedFacilities.length === requestedFacilities.length;
    const pmJayMatch = !requirements.requirePmJay || candidate.acceptsPmJay;
    const emergencyMatch = !requirements.requireEmergency || candidate.hasEmergency;
    const icuMatch = !requirements.requireIcu || candidate.hasIcu;
    const outcomeAvailable = candidate.specializations.some((specialization) => specialization.disease.outcomes.length > 0);
    const ratingAvailable = candidate.rating !== null;

    if (treatmentMatch && requirements.disease) { matchedRequirements.push(`${requirements.disease} specialization available`); matchReasons.push("The hospital has a matching disease specialization."); }
    else if (requirements.disease) unmatchedRequirements.push(`${requirements.disease} specialization not confirmed`);
    if (treatmentMatch && requirements.specialty) matchedRequirements.push(`${requirements.specialty} available`);
    else if (requirements.specialty) unmatchedRequirements.push(`${requirements.specialty} not confirmed`);
    if (requirements.minimumBudget !== undefined || requirements.maximumBudget !== undefined) {
      if (budgetMatch) { matchedRequirements.push("Within requested budget"); matchReasons.push("At least one stored cost range overlaps the requested budget."); }
      else unmatchedRequirements.push("Within requested budget not confirmed");
    }
    if (requirements.maxDistanceKm !== undefined) {
      if (distanceMatch) matchedRequirements.push("Within selected radius");
      else unmatchedRequirements.push("Outside selected radius or distance unavailable");
    }
    if (requestedFacilities.length > 0) {
      if (facilitiesMatch) matchedRequirements.push("Required facilities available");
      else unmatchedRequirements.push(`Missing facilities: ${requestedFacilities.filter((facility) => !matchedFacilities.includes(facility)).join(", ")}`);
    }
    if (requirements.requirePmJay) matchedRequirements.push(...(pmJayMatch ? ["PM-JAY compatibility available"] : []));
    if (requirements.requirePmJay && !pmJayMatch) unmatchedRequirements.push("PM-JAY compatibility not confirmed");
    if (requirements.requireEmergency) matchedRequirements.push(...(emergencyMatch ? ["Emergency facility available"] : []));
    if (requirements.requireEmergency && !emergencyMatch) unmatchedRequirements.push("Emergency facility not confirmed");
    if (requirements.requireIcu) matchedRequirements.push(...(icuMatch ? ["ICU availability confirmed"] : []));
    if (requirements.requireIcu && !icuMatch) unmatchedRequirements.push("ICU availability not confirmed");
    if (outcomeAvailable) matchReasons.push("Disease-specific outcome evidence is present in stored source data.");
    if (candidate.verification?.status === "VERIFIED") matchReasons.push("Hospital verification status is VERIFIED.");

    const ratingScore = ratingAvailable ? Number(candidate.rating) / 5 : 0;
    const distanceScore = requirements.maxDistanceKm === undefined ? (distanceAvailable ? 1 : 0) : distanceMatch ? Math.max(0, 1 - (candidate.distanceKm! / requirements.maxDistanceKm)) : 0;
    const facilityScore = requestedFacilities.length === 0 ? 1 : matchedFacilities.length / requestedFacilities.length;
    const matchScore = Math.round(
      scoreRequirement(treatmentMatch, weights.treatmentMatch) +
      scoreRequirement(budgetMatch, weights.budget) +
      scoreRequirement(distanceScore > 0, weights.distance) * distanceScore +
      weights.facilities * facilityScore +
      scoreRequirement(pmJayMatch, weights.pmJay) +
      scoreRequirement(emergencyMatch, weights.emergency) +
      scoreRequirement(icuMatch, weights.icu) +
      scoreRequirement(outcomeAvailable, weights.outcome) +
      ratingScore * weights.rating,
    );

    const dataVerificationStatus: HospitalRecommendation["dataVerificationStatus"] = candidate.verification?.status === "VERIFIED" || candidate.verification?.status === "PENDING" || candidate.verification?.status === "REJECTED"
      ? candidate.verification.status
      : "UNKNOWN";

    return {
      hospital: candidate,
      matchScore: Math.min(100, Math.max(0, matchScore)),
      matchReasons,
      matchedRequirements,
      unmatchedRequirements,
      dataAvailability: { cost: costAvailable, outcome: outcomeAvailable, distance: distanceAvailable, facilities: candidate.facilities.length > 0, verification: candidate.verification !== null, rating: ratingAvailable },
      dataVerificationStatus,
    };
  }).sort((first, second) => second.matchScore - first.matchScore || first.hospital.name.localeCompare(second.hospital.name));
}
