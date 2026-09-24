import "server-only";

import { parseHealthcareSearchRequest, type ParsedSearchRequirements } from "@/lib/ai/gemini-search-assistant";
import { searchHospitals } from "@/lib/repositories/hospital-repository";
import { recommendHospitals, type RecommendationRequirements } from "@/lib/recommendations/hospital-recommendation-engine";

export type AiSearchResult =
  | { kind: "clarification"; parsed: ParsedSearchRequirements; question: string }
  | { kind: "results"; parsed: ParsedSearchRequirements; items: ReturnType<typeof recommendHospitals>; meta: { totalCandidates: number; returned: number } };

function toRecommendationRequirements(parsed: ParsedSearchRequirements): RecommendationRequirements {
  return {
    disease: parsed.treatment ?? undefined,
    specialty: parsed.specialty ?? undefined,
    maximumBudget: parsed.maxBudget ?? undefined,
    maxDistanceKm: parsed.maxDistanceKm ?? undefined,
    requiredFacilities: parsed.requiredFacilities,
    requirePmJay: parsed.requirePMJAY,
    requireEmergency: parsed.requireEmergency,
    requireIcu: parsed.requireICU,
  };
}

export async function runAiHospitalSearch(userQuery: string): Promise<AiSearchResult> {
  const parsed = await parseHealthcareSearchRequest(userQuery);
  if (parsed.clarificationNeeded) return { kind: "clarification", parsed, question: parsed.clarificationQuestion! };

  const requirements = toRecommendationRequirements(parsed);
  const candidates = await searchHospitals({
    city: parsed.location ?? undefined,
    specialty: parsed.specialty ?? undefined,
    maximumBudget: parsed.maxBudget ?? undefined,
    page: 1,
    pageSize: 100,
    sort: "name",
  });
  const items = recommendHospitals(candidates.items, requirements);
  return { kind: "results", parsed, items, meta: { totalCandidates: candidates.total, returned: items.length } };
}
