import { HospitalType } from "@prisma/client";
import { z } from "zod";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true");
const numberQuery = z.coerce.number().finite();

export const hospitalSearchQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  disease: z.string().trim().min(1).optional(),
  diseaseId: z.string().trim().min(1).optional(),
  specialty: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  latitude: numberQuery.min(-90).max(90).optional(),
  longitude: numberQuery.min(-180).max(180).optional(),
  radius: numberQuery.positive().max(1000).optional(),
  minimumBudget: numberQuery.nonnegative().optional(),
  maximumBudget: numberQuery.nonnegative().optional(),
  hospitalType: z.nativeEnum(HospitalType).optional(),
  icu: booleanQuery.optional(),
  emergency: booleanQuery.optional(),
  pmJay: booleanQuery.optional(),
  nabh: booleanQuery.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["name", "newest", "oldest", "distance"]).default("name"),
  includeSynthetic: booleanQuery.default(false),
}).superRefine((value, context) => {
  const hasLatitude = value.latitude !== undefined;
  const hasLongitude = value.longitude !== undefined;
  const hasRadius = value.radius !== undefined;
  if (hasLatitude !== hasLongitude || hasLatitude !== hasRadius) {
    context.addIssue({ code: "custom", path: ["radius"], message: "latitude, longitude, and radius must be provided together." });
  }
  if (value.minimumBudget !== undefined && value.maximumBudget !== undefined && value.minimumBudget > value.maximumBudget) {
    context.addIssue({ code: "custom", path: ["maximumBudget"], message: "maximumBudget cannot be lower than minimumBudget." });
  }
  if (value.sort === "distance" && (!hasLatitude || !hasLongitude || !hasRadius)) {
    context.addIssue({ code: "custom", path: ["sort"], message: "distance sorting requires latitude, longitude, and radius." });
  }
});

export type HospitalSearchQuery = z.infer<typeof hospitalSearchQuerySchema>;

export function parseHospitalSearchQuery(searchParams: URLSearchParams) {
  return hospitalSearchQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
}
