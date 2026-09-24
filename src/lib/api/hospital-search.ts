import { searchHospitals } from "@/lib/repositories/hospital-repository";
import { parseHospitalSearchQuery, type HospitalSearchQuery } from "@/lib/api/hospital-search-query";

export { parseHospitalSearchQuery } from "@/lib/api/hospital-search-query";
export type { HospitalSearchQuery } from "@/lib/api/hospital-search-query";

export async function runHospitalSearch(query: HospitalSearchQuery) {
  return searchHospitals({
    ...query,
    radiusKm: query.radius,
    hasIcu: query.icu,
    hasEmergency: query.emergency,
    acceptsPmJay: query.pmJay,
    hasNabhAccreditation: query.nabh,
  });
}

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item && typeof item === "object" && typeof item.toJSON === "function") return item.toJSON();
    return item;
  })) as T;
}
