import "server-only";

import { z } from "zod";
import {
  hospitalValidationSchema,
  outcomeValidationSchema,
  treatmentValidationSchema,
  type HospitalRecord,
  type OutcomeRecord,
  type TreatmentRecord,
} from "@/lib/validation/healthcare-schemas";

export type QualityFlag = {
  code: string;
  field: string;
  message: string;
  severity: "REVIEW";
};

export type ValidationResult<T> =
  | { success: true; data: T; flags: QualityFlag[] }
  | { success: false; data: null; errors: string[]; flags: QualityFlag[] };

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.length ? issue.path.join(".") : "record"}: ${issue.message}`);
}

export function validateHospital(input: unknown): ValidationResult<HospitalRecord> {
  const parsed = hospitalValidationSchema.safeParse(input);
  if (!parsed.success) return { success: false, data: null, errors: formatIssues(parsed.error), flags: [] };

  const flags: QualityFlag[] = [];
  if (parsed.data.rating > 0 && parsed.data.reviewCount === 0) {
    flags.push({ code: "RATING_WITHOUT_REVIEWS", field: "reviewCount", message: "A positive rating has no reported reviews; verify the source.", severity: "REVIEW" });
  }
  if (parsed.data.rating === 5 && parsed.data.reviewCount < 10) {
    flags.push({ code: "PERFECT_RATING_SMALL_SAMPLE", field: "rating", message: "A perfect rating with a small review sample requires review.", severity: "REVIEW" });
  }
  if (Math.abs(parsed.data.latitude) < 0.0001 && Math.abs(parsed.data.longitude) < 0.0001) {
    flags.push({ code: "ZERO_POINT_COORDINATES", field: "latitude", message: "Coordinates are near the geographic zero point; verify location data.", severity: "REVIEW" });
  }
  return { success: true, data: parsed.data, flags };
}

export function validateTreatment(input: unknown): ValidationResult<TreatmentRecord> {
  const parsed = treatmentValidationSchema.safeParse(input);
  if (!parsed.success) return { success: false, data: null, errors: formatIssues(parsed.error), flags: [] };

  const flags: QualityFlag[] = [];
  if (parsed.data.minimumCost === 0 && parsed.data.maximumCost === 0) {
    flags.push({ code: "ZERO_COST_RANGE", field: "minimumCost", message: "A zero cost range requires source review; no value was changed.", severity: "REVIEW" });
  }
  return { success: true, data: parsed.data, flags };
}

export function validateOutcome(input: unknown): ValidationResult<OutcomeRecord> {
  const parsed = outcomeValidationSchema.safeParse(input);
  if (!parsed.success) return { success: false, data: null, errors: formatIssues(parsed.error), flags: [] };

  const flags: QualityFlag[] = [];
  if (parsed.data.totalReportedPatients === 0) {
    flags.push({ code: "ZERO_REPORTED_PATIENTS", field: "totalReportedPatients", message: "The reporting period has no reported patients; verify the source.", severity: "REVIEW" });
  }
  return { success: true, data: parsed.data, flags };
}

export function formatValidationErrors(result: ValidationResult<unknown>): string[] {
  return result.success ? [] : result.errors;
}
