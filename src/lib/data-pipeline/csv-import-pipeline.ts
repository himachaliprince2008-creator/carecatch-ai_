import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminHospitals, type AdminHospitalRecord } from "@/lib/repositories/admin-repository";
import type { AdminRecordStatus } from "@/lib/validation/admin-schemas";

export type QualityWarningCode =
  | "EXISTING_VERIFIED_RECORD"
  | "DUPLICATE_IN_BATCH"
  | "OUTLIER_PRICING"
  | "UNUSUALLY_HIGH_OUTCOME"
  | "MISSING_COORDINATES"
  | "RATING_WITHOUT_REVIEWS"
  | "PERFECT_RATING_LOW_VOLUME"
  | "FACILITY_INCONSISTENCY";

export type PipelineWarning = {
  code: QualityWarningCode;
  field?: string;
  message: string;
  severity: "WARNING" | "CRITICAL";
};

export type PipelineRowResolution = "IMPORT_NEW" | "UPDATE_EXISTING" | "SKIP" | "FLAG_FOR_AUDIT";

export type ProcessedPipelineRow = {
  rowNumber: number;
  rawInput: Record<string, string>;
  normalized: {
    name: string;
    slug: string;
    city: string;
    state: string | null;
    country: string;
    hospitalType: "HOSPITAL" | "CLINIC" | "SPECIALTY_CENTER" | "AMBULATORY_CENTER" | "OTHER";
    hasIcu: boolean;
    hasEmergency: boolean;
    acceptsPmJay: boolean;
    hasNabhAccreditation: boolean;
    phone: string | null;
    websiteUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    rating: number | null;
    reviewCount: number;
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
      calculatedPercentage: number;
    };
    initialStatus: AdminRecordStatus;
  };
  validation: {
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  };
  duplicateCheck: {
    isDuplicate: boolean;
    duplicateSource: "BATCH" | "EXISTING_REGISTRY" | "NONE";
    existingRecordId?: string;
    existingRecordName?: string;
    isExistingVerified: boolean;
  };
  qualityCheck: {
    hasWarnings: boolean;
    warnings: PipelineWarning[];
  };
  resolution: {
    action: PipelineRowResolution;
    adminConfirmedVerifiedOverwrite: boolean;
    isAccepted: boolean;
  };
};

export type PipelineSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  warnings: number;
  acceptedRows: number;
  existingVerifiedConflicts: number;
};

export type PipelineProcessResult = {
  summary: PipelineSummary;
  rows: ProcessedPipelineRow[];
  timestamp: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function cleanText(val?: string | null): string | null {
  if (!val) return null;
  const t = val.trim().replace(/\s+/g, " ");
  return t.length > 0 ? t : null;
}

export function parseCsvTokens(csvText: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
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
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/[\"']/g, ""));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export async function executeImportPipeline(csvText: string): Promise<PipelineProcessResult> {
  const { headers, rows: rawRows } = parseCsvTokens(csvText);
  const existingHospitals = await getAdminHospitals();

  const processedRows: ProcessedPipelineRow[] = [];
  const batchSlugsSeen = new Set<string>();

  let totalValid = 0;
  let totalInvalid = 0;
  let totalDuplicates = 0;
  let totalWarningsCount = 0;
  let totalVerifiedConflicts = 0;
  let totalAccepted = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNumber = idx + 2; // header + 1-indexed

    const getVal = (aliases: string[]): string => {
      for (const a of aliases) {
        if (raw[a] !== undefined && raw[a] !== "") return raw[a];
      }
      return "";
    };

    const name = cleanText(getVal(["name", "hospital_name", "hospital"])) || "";
    const city = cleanText(getVal(["city", "location", "town"])) || "";
    const state = cleanText(getVal(["state", "province", "region"]));
    const country = (cleanText(getVal(["country", "nation"])) || "US").toUpperCase();
    const typeRaw = getVal(["hospital_type", "type", "category"]).toUpperCase();
    const hasIcuRaw = getVal(["has_icu", "icu"]).toLowerCase();
    const hasEmergencyRaw = getVal(["has_emergency", "emergency"]).toLowerCase();
    const pmjayRaw = getVal(["pmjay", "accepts_pmjay", "pm_jay"]).toLowerCase();
    const nabhRaw = getVal(["nabh", "has_nabh", "accreditation"]).toLowerCase();
    const phone = cleanText(getVal(["phone", "tel", "contact"]));
    const websiteUrl = cleanText(getVal(["website", "website_url", "url"]));
    const latRaw = getVal(["latitude", "lat"]);
    const lngRaw = getVal(["longitude", "lng", "lon"]);
    const ratingRaw = getVal(["rating", "score"]);
    const reviewCountRaw = getVal(["review_count", "reviews"]);
    const specialtiesRaw = getVal(["specialties", "specialty", "departments"]);
    const facilitiesRaw = getVal(["facilities", "amenities", "services"]);
    const diseaseName = cleanText(getVal(["treatment_disease", "disease", "condition"]));
    const minCostRaw = getVal(["min_cost", "min_amount", "cost_min"]);
    const maxCostRaw = getVal(["max_cost", "max_amount", "cost_max"]);
    const currency = (cleanText(getVal(["currency"])) || "INR").toUpperCase();
    const outcomeLabel = cleanText(getVal(["outcome_label", "outcome", "metric"]));
    const totalPatientsRaw = getVal(["total_patients", "reported_patients", "patients"]);
    const successOutcomesRaw = getVal(["successful_outcomes", "success_count", "cured"]);
    const statusRaw = getVal(["status", "verification_status"]).toUpperCase();

    const errors: Array<{ field: string; message: string }> = [];
    const warnings: PipelineWarning[] = [];

    // ── STAGE 2: VALIDATION ──
    if (!name || name.length < 2) {
      errors.push({ field: "name", message: "Hospital name must be at least 2 characters" });
    }
    if (!city) {
      errors.push({ field: "city", message: "City is required" });
    }

    let lat: number | null = null;
    let lng: number | null = null;
    if (latRaw || lngRaw) {
      const parsedLat = parseFloat(latRaw);
      const parsedLng = parseFloat(lngRaw);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        errors.push({ field: "latitude", message: "Latitude must be a valid number between -90 and 90" });
      } else {
        lat = parsedLat;
      }
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        errors.push({ field: "longitude", message: "Longitude must be a valid number between -180 and 180" });
      } else {
        lng = parsedLng;
      }
    }

    let hospitalType: ProcessedPipelineRow["normalized"]["hospitalType"] = "HOSPITAL";
    if (["CLINIC", "SPECIALTY_CENTER", "AMBULATORY_CENTER", "OTHER"].includes(typeRaw)) {
      hospitalType = typeRaw as ProcessedPipelineRow["normalized"]["hospitalType"];
    }

    let treatmentCost: ProcessedPipelineRow["normalized"]["treatmentCost"] = undefined;
    if (diseaseName && (minCostRaw || maxCostRaw)) {
      const min = Number(minCostRaw) || 0;
      const max = Number(maxCostRaw) || min;
      if (min < 0 || max < 0) {
        errors.push({ field: "treatment_cost", message: "Cost amounts cannot be negative" });
      } else if (min > max) {
        errors.push({ field: "treatment_cost", message: `Minimum cost (${min}) cannot exceed maximum cost (${max})` });
      } else {
        treatmentCost = { diseaseName, currency, minAmount: min, maxAmount: max };
      }
    }

    let outcome: ProcessedPipelineRow["normalized"]["outcome"] = undefined;
    if (outcomeLabel && (totalPatientsRaw || successOutcomesRaw)) {
      const tot = parseInt(totalPatientsRaw, 10) || 0;
      const succ = parseInt(successOutcomesRaw, 10) || 0;
      if (tot < 0 || succ < 0) {
        errors.push({ field: "outcome", message: "Reported patients and success counts must be non-negative" });
      } else if (succ > tot) {
        errors.push({ field: "outcome", message: `Successful outcomes (${succ}) cannot exceed total patients (${tot})` });
      } else {
        const calculatedPercentage = tot > 0 ? (succ / tot) * 100 : 0;
        outcome = { label: outcomeLabel, totalPatients: tot, successfulOutcomes: succ, calculatedPercentage };
      }
    }

    // ── STAGE 3: NORMALIZE ──
    const slug = slugify(`${name}-${city}`);
    const rating = ratingRaw ? Math.min(5, Math.max(0, parseFloat(ratingRaw) || 0)) : null;
    const reviewCount = reviewCountRaw ? parseInt(reviewCountRaw, 10) || 0 : 0;
    const specialties = specialtiesRaw ? specialtiesRaw.split(";").map((s) => s.trim()).filter(Boolean) : [];
    const facilities = facilitiesRaw ? facilitiesRaw.split(";").map((f) => f.trim()).filter(Boolean) : [];

    let initialStatus: AdminRecordStatus = "PENDING_REVIEW";
    if (["VERIFIED", "HOSPITAL_REPORTED", "ESTIMATED", "DEMO_DATA", "REJECTED"].includes(statusRaw)) {
      initialStatus = statusRaw as AdminRecordStatus;
    }

    // ── STAGE 4: DUPLICATE DETECTION ──
    let isDuplicate = false;
    let duplicateSource: "BATCH" | "EXISTING_REGISTRY" | "NONE" = "NONE";
    let existingRecordId: string | undefined = undefined;
    let existingRecordName: string | undefined = undefined;
    let isExistingVerified = false;

    if (batchSlugsSeen.has(slug)) {
      isDuplicate = true;
      duplicateSource = "BATCH";
      warnings.push({
        code: "DUPLICATE_IN_BATCH",
        message: `Duplicate hospital entry found within the same CSV batch (${name} in ${city})`,
        severity: "WARNING",
      });
    } else {
      batchSlugsSeen.add(slug);
    }

    // Match against existing registry
    const existingMatch = existingHospitals.find(
      (h) => h.slug === slug || (h.name.toLowerCase() === name.toLowerCase() && h.city.toLowerCase() === city.toLowerCase())
    );

    if (existingMatch) {
      isDuplicate = true;
      duplicateSource = "EXISTING_REGISTRY";
      existingRecordId = existingMatch.id;
      existingRecordName = existingMatch.name;
      isExistingVerified = existingMatch.status === "VERIFIED";

      if (isExistingVerified) {
        totalVerifiedConflicts++;
        warnings.push({
          code: "EXISTING_VERIFIED_RECORD",
          message: `CRITICAL: Matches existing VERIFIED record "${existingMatch.name}". Automatic overwrite is BLOCKED. Explicit admin confirmation required.`,
          severity: "CRITICAL",
        });
      } else {
        warnings.push({
          code: "EXISTING_VERIFIED_RECORD",
          message: `Matches existing unverified record in registry (ID: ${existingMatch.id}).`,
          severity: "WARNING",
        });
      }
    }

    // ── STAGE 5: QUALITY CHECKS & HEURISTICS ──
    if (treatmentCost && treatmentCost.maxAmount > 300000 && treatmentCost.currency === "INR") {
      warnings.push({
        code: "OUTLIER_PRICING",
        field: "treatmentCost",
        message: `High cost range detected (₹${treatmentCost.minAmount.toLocaleString()} - ₹${treatmentCost.maxAmount.toLocaleString()}). Requires clinical pricing review.`,
        severity: "WARNING",
      });
    }

    if (outcome && outcome.calculatedPercentage === 100 && outcome.totalPatients < 20) {
      warnings.push({
        code: "UNUSUALLY_HIGH_OUTCOME",
        field: "outcome",
        message: `Claims 100% success rate with small sample size (${outcome.totalPatients} patients).`,
        severity: "WARNING",
      });
    }

    if (rating && rating > 0 && reviewCount === 0) {
      warnings.push({
        code: "RATING_WITHOUT_REVIEWS",
        field: "rating",
        message: "Rating given without any recorded review count.",
        severity: "WARNING",
      });
    }

    if (rating === 5 && reviewCount < 10) {
      warnings.push({
        code: "PERFECT_RATING_LOW_VOLUME",
        field: "rating",
        message: "Perfect 5.0 rating on fewer than 10 reviews.",
        severity: "WARNING",
      });
    }

    if (!lat || !lng) {
      warnings.push({
        code: "MISSING_COORDINATES",
        field: "coordinates",
        message: "Missing exact geo-coordinates; map positioning will rely on city centroid.",
        severity: "WARNING",
      });
    }

    // ── RESOLUTION & DEFAULT ACTIONS ──
    const isValid = errors.length === 0;
    if (isValid) {
      totalValid++;
    } else {
      totalInvalid++;
    }

    if (isDuplicate) {
      totalDuplicates++;
    }

    if (warnings.length > 0) {
      totalWarningsCount += warnings.length;
    }

    let defaultAction: PipelineRowResolution = "IMPORT_NEW";
    let isAccepted = false;

    if (!isValid) {
      defaultAction = "SKIP";
      isAccepted = false;
    } else if (isExistingVerified) {
      // Rule: Do not automatically overwrite verified records
      defaultAction = "SKIP";
      isAccepted = false;
    } else if (isDuplicate && duplicateSource === "EXISTING_REGISTRY") {
      defaultAction = "UPDATE_EXISTING";
      isAccepted = true;
      totalAccepted++;
    } else {
      defaultAction = "IMPORT_NEW";
      isAccepted = true;
      totalAccepted++;
    }

    processedRows.push({
      rowNumber,
      rawInput: raw,
      normalized: {
        name,
        slug,
        city,
        state,
        country,
        hospitalType,
        hasIcu: ["true", "1", "yes", "y"].includes(hasIcuRaw),
        hasEmergency: ["true", "1", "yes", "y"].includes(hasEmergencyRaw),
        acceptsPmJay: ["true", "1", "yes", "y"].includes(pmjayRaw),
        hasNabhAccreditation: ["true", "1", "yes", "y"].includes(nabhRaw),
        phone,
        websiteUrl,
        latitude: lat,
        longitude: lng,
        rating,
        reviewCount,
        specialties,
        facilities,
        treatmentCost,
        outcome,
        initialStatus,
      },
      validation: {
        isValid,
        errors,
      },
      duplicateCheck: {
        isDuplicate,
        duplicateSource,
        existingRecordId,
        existingRecordName,
        isExistingVerified,
      },
      qualityCheck: {
        hasWarnings: warnings.length > 0,
        warnings,
      },
      resolution: {
        action: defaultAction,
        adminConfirmedVerifiedOverwrite: false,
        isAccepted,
      },
    });
  }

  const summary: PipelineSummary = {
    totalRows: rawRows.length,
    validRows: totalValid,
    invalidRows: totalInvalid,
    duplicates: totalDuplicates,
    warnings: totalWarningsCount,
    acceptedRows: totalAccepted,
    existingVerifiedConflicts: totalVerifiedConflicts,
  };

  return {
    summary,
    rows: processedRows,
    timestamp: new Date().toISOString(),
  };
}

export type CommitPipelinePayload = {
  rows: ProcessedPipelineRow[];
  verifiedBy: string;
  sourceName?: string;
};

export async function commitPipelineToDatabase(payload: CommitPipelinePayload): Promise<{
  committedCount: number;
  skippedCount: number;
  overwrittenVerifiedCount: number;
  details: string[];
}> {
  const existingHospitals = await getAdminHospitals();
  let committedCount = 0;
  let skippedCount = 0;
  let overwrittenVerifiedCount = 0;
  const details: string[] = [];

  for (const row of payload.rows) {
    if (!row.validation.isValid || row.resolution.action === "SKIP") {
      skippedCount++;
      continue;
    }

    // Enforce verified overwrite safety rule:
    if (row.duplicateCheck.isExistingVerified && !row.resolution.adminConfirmedVerifiedOverwrite) {
      skippedCount++;
      details.push(`Row ${row.rowNumber} (${row.normalized.name}): Skipped overwrite of VERIFIED record without explicit admin confirmation.`);
      continue;
    }

    if (row.duplicateCheck.isExistingVerified && row.resolution.adminConfirmedVerifiedOverwrite) {
      overwrittenVerifiedCount++;
      details.push(`Row ${row.rowNumber} (${row.normalized.name}): OVERWRITTEN with explicit confirmation by ${payload.verifiedBy}.`);
    }

    committedCount++;
  }

  return {
    committedCount,
    skippedCount,
    overwrittenVerifiedCount,
    details,
  };
}
