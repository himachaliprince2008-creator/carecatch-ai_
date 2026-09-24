import { z } from "zod";
import { HospitalType } from "@prisma/client";
import { searchHospitals } from "@/lib/repositories/hospital-repository";
import { recommendHospitals, type RecommendationWeights } from "@/lib/recommendations/hospital-recommendation-engine";

const finiteNumber = z.number().finite();

export const recommendationRequestSchema = z.object({
  requirements: z.object({
    disease: z.string().trim().min(1).optional(),
    specialty: z.string().trim().min(1).optional(),
    minimumBudget: finiteNumber.nonnegative().optional(),
    maximumBudget: finiteNumber.nonnegative().optional(),
    maxDistanceKm: finiteNumber.positive().max(1000).optional(),
    latitude: finiteNumber.min(-90).max(90).optional(),
    longitude: finiteNumber.min(-180).max(180).optional(),
    requiredFacilities: z.array(z.string().trim().min(1)).max(20).default([]),
    requirePmJay: z.boolean().default(false),
    requireEmergency: z.boolean().default(false),
    requireIcu: z.boolean().default(false),
    city: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    hospitalType: z.nativeEnum(HospitalType).optional(),
  }).superRefine((value, context) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) context.addIssue({ code: "custom", path: ["longitude"], message: "latitude and longitude must be provided together." });
    if (value.maximumBudget !== undefined && value.minimumBudget !== undefined && value.minimumBudget > value.maximumBudget) context.addIssue({ code: "custom", path: ["maximumBudget"], message: "maximumBudget cannot be lower than minimumBudget." });
    if (value.maxDistanceKm !== undefined && value.latitude === undefined) context.addIssue({ code: "custom", path: ["maxDistanceKm"], message: "maxDistanceKm requires latitude and longitude." });
  }),
  weights: z.object({
    treatmentMatch: finiteNumber.nonnegative().optional(),
    budget: finiteNumber.nonnegative().optional(),
    distance: finiteNumber.nonnegative().optional(),
    facilities: finiteNumber.nonnegative().optional(),
    pmJay: finiteNumber.nonnegative().optional(),
    emergency: finiteNumber.nonnegative().optional(),
    icu: finiteNumber.nonnegative().optional(),
    outcome: finiteNumber.nonnegative().optional(),
    rating: finiteNumber.nonnegative().optional(),
  }).optional(),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export async function generateRecommendations(request: RecommendationRequest) {
  const candidates = await searchHospitals({
    disease: request.requirements.disease,
    specialty: request.requirements.specialty,
    city: request.requirements.city,
    state: request.requirements.state,
    hospitalType: request.requirements.hospitalType,
    latitude: request.requirements.latitude,
    longitude: request.requirements.longitude,
    radiusKm: request.requirements.maxDistanceKm,
    sort: request.requirements.latitude !== undefined ? "distance" : "name",
    page: 1,
    pageSize: 100,
  });

  const recommendations = recommendHospitals(candidates.items, request.requirements, request.weights as Partial<RecommendationWeights> | undefined);
  return {
    items: recommendations.slice(0, request.pageSize),
    meta: { totalCandidates: candidates.total, returned: Math.min(recommendations.length, request.pageSize), weightsNormalized: true },
  };
}
