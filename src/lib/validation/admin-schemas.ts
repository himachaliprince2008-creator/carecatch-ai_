import { z } from "zod";

export const ADMIN_RECORD_STATUSES = [
  "PENDING_REVIEW",
  "VERIFIED",
  "HOSPITAL_REPORTED",
  "ESTIMATED",
  "DEMO_DATA",
  "REJECTED",
] as const;

export type AdminRecordStatus = (typeof ADMIN_RECORD_STATUSES)[number];
export const adminRecordStatusSchema = z.enum(ADMIN_RECORD_STATUSES);

export const SUSPICIOUS_FLAG_REASONS = [
  "OUTLIER_PRICING",
  "UNSUBSTANTIATED_OUTCOME_CLAIMS",
  "MISSING_ACCREDITATION_PROOF",
  "EXPIRED_LICENSURE",
  "INCONSISTENT_FACILITY_DATA",
  "POSSIBLE_SYNTHETIC_DUPLICATE",
  "OTHER",
] as const;

export type SuspiciousFlagReason = (typeof SUSPICIOUS_FLAG_REASONS)[number];

export const verifyRecordSchema = z.object({
  recordId: z.string().min(1, "Record ID is required"),
  recordType: z.enum(["HOSPITAL", "TREATMENT", "COST", "OUTCOME", "FACILITY", "DATA_SOURCE"]),
  status: adminRecordStatusSchema,
  verifiedBy: z.string().min(1, "Verifier name or email is required"),
  notes: z.string().optional().nullable(),
  isSuspicious: z.boolean().default(false),
  suspiciousReason: z.enum(SUSPICIOUS_FLAG_REASONS).optional().nullable(),
  suspiciousNotes: z.string().optional().nullable(),
});

export type VerifyRecordInput = z.infer<typeof verifyRecordSchema>;

export const hospitalAdminFormSchema = z.object({
  name: z.string().trim().min(2, "Hospital name must be at least 2 characters").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().length(2, "2-letter country code required").default("US"),
  hospitalType: z.enum(["HOSPITAL", "CLINIC", "SPECIALTY_CENTER", "AMBULATORY_CENTER", "OTHER"]),
  hasIcu: z.boolean().default(false),
  hasEmergency: z.boolean().default(false),
  acceptsPmJay: z.boolean().default(false),
  hasNabhAccreditation: z.boolean().default(false),
  phone: z.string().trim().optional().nullable(),
  websiteUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: adminRecordStatusSchema.default("PENDING_REVIEW"),
  notes: z.string().optional().nullable(),
});

export type HospitalAdminFormInput = z.infer<typeof hospitalAdminFormSchema>;

export const treatmentCostAdminSchema = z
  .object({
    hospitalId: z.string().min(1, "Hospital ID is required"),
    diseaseName: z.string().min(1, "Disease name is required"),
    currency: z.enum(["USD", "INR", "EUR", "GBP"]).default("INR"),
    minAmount: z.number().nonnegative("Minimum amount cannot be negative"),
    maxAmount: z.number().nonnegative("Maximum amount cannot be negative"),
    notes: z.string().optional().nullable(),
    status: adminRecordStatusSchema.default("PENDING_REVIEW"),
    sourceId: z.string().optional().nullable(),
  })
  .refine((data) => data.minAmount <= data.maxAmount, {
    message: "Minimum amount cannot be greater than Maximum amount",
    path: ["maxAmount"],
  });

export type TreatmentCostAdminInput = z.infer<typeof treatmentCostAdminSchema>;

export const outcomeDataAdminSchema = z
  .object({
    diseaseName: z.string().min(1, "Disease name is required"),
    label: z.string().min(1, "Outcome metric label is required"),
    totalReportedPatients: z.number().int().nonnegative("Reported patients must be a non-negative integer"),
    reportedSuccessfulOutcomes: z.number().int().nonnegative("Successful outcomes must be a non-negative integer"),
    reportingPeriodStart: z.string().optional().nullable(),
    reportingPeriodEnd: z.string().optional().nullable(),
    sourceName: z.string().min(1, "Source publisher name is required"),
    status: adminRecordStatusSchema.default("PENDING_REVIEW"),
  })
  .refine((data) => data.reportedSuccessfulOutcomes <= data.totalReportedPatients, {
    message: "Reported successful outcomes cannot exceed total reported patients",
    path: ["reportedSuccessfulOutcomes"],
  });

export type OutcomeDataAdminInput = z.infer<typeof outcomeDataAdminSchema>;

export type CsvRowValidationError = {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
};

export type CsvImportParsedRow = {
  rowNumber: number;
  name: string;
  city: string;
  state: string;
  country: string;
  hospitalType: "HOSPITAL" | "CLINIC" | "SPECIALTY_CENTER" | "AMBULATORY_CENTER" | "OTHER";
  hasIcu: boolean;
  hasEmergency: boolean;
  acceptsPmJay: boolean;
  hasNabhAccreditation: boolean;
  specialties: string[];
  facilities: string[];
  treatmentCost?: {
    diseaseName: string;
    currency: string;
    minAmount: number;
    maxAmount: number;
  };
  outcome?: {
    label: string;
    totalPatients: number;
    successfulOutcomes: number;
  };
  status: AdminRecordStatus;
  isValid: boolean;
  errors: string[];
};

export function parseAndValidateHospitalCsv(csvText: string): {
  rows: CsvImportParsedRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  errors: CsvRowValidationError[];
} {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { rows: [], totalRows: 0, validCount: 0, invalidCount: 0, errors: [] };
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\"']/g, ""));
  const dataLines = lines.slice(1);

  const errors: CsvRowValidationError[] = [];
  const parsedRows: CsvImportParsedRow[] = [];

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2; // 1-based index + header
    // Parse comma-separated line (handling quotes)
    const values: string[] = [];
    let insideQuote = false;
    let currentToken = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        values.push(currentToken.trim().replace(/^"|"$/g, ""));
        currentToken = "";
      } else {
        currentToken += char;
      }
    }
    values.push(currentToken.trim().replace(/^"|"$/g, ""));

    const rowErrors: string[] = [];
    const getVal = (colNames: string[]): string => {
      for (const col of colNames) {
        const index = header.indexOf(col);
        if (index !== -1 && values[index] !== undefined) {
          return values[index].trim();
        }
      }
      return "";
    };

    const name = getVal(["name", "hospital_name", "hospital"]);
    const city = getVal(["city", "location", "town"]);
    const state = getVal(["state", "province", "region"]);
    const country = (getVal(["country", "nation"]) || "US").toUpperCase();
    const typeRaw = getVal(["hospital_type", "type", "category"]).toUpperCase();
    const hasIcuRaw = getVal(["has_icu", "icu"]).toLowerCase();
    const hasEmergencyRaw = getVal(["has_emergency", "emergency"]).toLowerCase();
    const pmjayRaw = getVal(["pmjay", "accepts_pmjay", "pm_jay"]).toLowerCase();
    const nabhRaw = getVal(["nabh", "has_nabh", "accreditation"]).toLowerCase();
    const specialtiesRaw = getVal(["specialties", "specialty", "departments"]);
    const facilitiesRaw = getVal(["facilities", "amenities", "services"]);
    const diseaseName = getVal(["treatment_disease", "disease", "condition"]);
    const minCostRaw = getVal(["min_cost", "min_amount", "cost_min"]);
    const maxCostRaw = getVal(["max_cost", "max_amount", "cost_max"]);
    const currency = (getVal(["currency"]) || "INR").toUpperCase();
    const outcomeLabel = getVal(["outcome_label", "outcome"]);
    const totalPatientsRaw = getVal(["total_patients", "reported_patients"]);
    const successOutcomesRaw = getVal(["successful_outcomes", "success_count"]);
    const statusRaw = getVal(["status", "verification_status"]).toUpperCase();

    // Validation
    if (!name) {
      const err = "Hospital name is required";
      rowErrors.push(err);
      errors.push({ rowNumber, field: "name", value: "", message: err });
    }

    if (!city) {
      const err = "City is required";
      rowErrors.push(err);
      errors.push({ rowNumber, field: "city", value: "", message: err });
    }

    let hospitalType: CsvImportParsedRow["hospitalType"] = "HOSPITAL";
    if (["CLINIC", "SPECIALTY_CENTER", "AMBULATORY_CENTER", "OTHER"].includes(typeRaw)) {
      hospitalType = typeRaw as CsvImportParsedRow["hospitalType"];
    }

    let status: AdminRecordStatus = "PENDING_REVIEW";
    if (ADMIN_RECORD_STATUSES.includes(statusRaw as AdminRecordStatus)) {
      status = statusRaw as AdminRecordStatus;
    }

    let treatmentCost: CsvImportParsedRow["treatmentCost"] = undefined;
    if (diseaseName && (minCostRaw || maxCostRaw)) {
      const minAmount = Number(minCostRaw) || 0;
      const maxAmount = Number(maxCostRaw) || minAmount;
      if (minAmount > maxAmount) {
        const err = `Minimum cost (${minAmount}) cannot exceed maximum cost (${maxAmount})`;
        rowErrors.push(err);
        errors.push({ rowNumber, field: "max_cost", value: maxCostRaw, message: err });
      } else {
        treatmentCost = { diseaseName, currency, minAmount, maxAmount };
      }
    }

    let outcome: CsvImportParsedRow["outcome"] = undefined;
    if (outcomeLabel && (totalPatientsRaw || successOutcomesRaw)) {
      const totalPatients = parseInt(totalPatientsRaw, 10) || 0;
      const successfulOutcomes = parseInt(successOutcomesRaw, 10) || 0;
      if (successfulOutcomes > totalPatients) {
        const err = `Successful outcomes (${successfulOutcomes}) cannot exceed total patients (${totalPatients})`;
        rowErrors.push(err);
        errors.push({ rowNumber, field: "successful_outcomes", value: successOutcomesRaw, message: err });
      } else {
        outcome = { label: outcomeLabel, totalPatients, successfulOutcomes };
      }
    }

    parsedRows.push({
      rowNumber,
      name,
      city,
      state,
      country,
      hospitalType,
      hasIcu: ["true", "1", "yes", "y"].includes(hasIcuRaw),
      hasEmergency: ["true", "1", "yes", "y"].includes(hasEmergencyRaw),
      acceptsPmJay: ["true", "1", "yes", "y"].includes(pmjayRaw),
      hasNabhAccreditation: ["true", "1", "yes", "y"].includes(nabhRaw),
      specialties: specialtiesRaw ? specialtiesRaw.split(";").map((s) => s.trim()).filter(Boolean) : [],
      facilities: facilitiesRaw ? facilitiesRaw.split(";").map((f) => f.trim()).filter(Boolean) : [],
      treatmentCost,
      outcome,
      status,
      isValid: rowErrors.length === 0,
      errors: rowErrors,
    });
  });

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
    validCount: parsedRows.filter((r) => r.isValid).length,
    invalidCount: parsedRows.filter((r) => !r.isValid).length,
    errors,
  };
}
