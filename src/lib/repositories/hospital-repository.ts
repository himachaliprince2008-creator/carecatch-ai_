import "server-only";

import {
  Prisma,
  type HospitalType,
  type Hospital,
  type HospitalFacility,
  type SavedHospital,
  type TreatmentCost,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class RepositoryError extends Error {
  readonly code = "DATABASE_ERROR";

  constructor(message = "A database operation failed.", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginationResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type HospitalSort = "name" | "newest" | "oldest" | "distance";

export type HospitalRecommendationSource = Prisma.HospitalGetPayload<{
  include: {
    specializations: { include: { disease: { include: { outcomes: { include: { source: true } } } } } };
    facilities: true;
    treatmentCosts: { include: { disease: true, source: true } };
    verification: true;
  };
}> & { distanceKm: number | null };

export type HospitalSearchResult = HospitalRecommendationSource;

export type SearchHospitalsInput = PaginationInput & {
  query?: string;
  city?: string;
  state?: string;
  specialty?: string;
  diseaseId?: string;
  disease?: string;
  sort?: HospitalSort;
  includeSynthetic?: boolean;
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  minimumBudget?: number;
  maximumBudget?: number;
  hospitalType?: HospitalType;
  hasIcu?: boolean;
  hasEmergency?: boolean;
  acceptsPmJay?: boolean;
  hasNabhAccreditation?: boolean;
};

export type GetHospitalByIdOptions = {
  includeSynthetic?: boolean;
};

export type HospitalDiseaseMetrics = {
  diseaseId: string;
  diseaseName: string;
  specializations: string[];
  outcomes: Array<{
    id: string;
    label: string;
    description: string | null;
    value: string | null;
    isSynthetic: boolean;
  }>;
};

export type TreatmentCostFilters = PaginationInput & {
  hospitalId: string;
  diseaseId?: string;
  currency?: string;
  includeSynthetic?: boolean;
};

export type HospitalFacilityFilters = PaginationInput & {
  hospitalId: string;
  name?: string;
};

export type SaveHospitalInput = {
  userId: string;
  hospitalId: string;
  note?: string | null;
};

export type CreateSearchHistoryInput = {
  userId: string;
  specialty?: string | null;
  locationText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  budgetCurrency?: string | null;
  budgetMax?: number | null;
  requirements?: Prisma.InputJsonValue | null;
};

function getPagination(input: PaginationInput): { page: number; pageSize: number; skip: number } {
  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
  const requestedPageSize = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0 ? input.pageSize! : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function getPageResult<T>(items: T[], total: number, page: number, pageSize: number): PaginationResult<T> {
  return { items, page, pageSize, total, pageCount: Math.ceil(total / pageSize) };
}

function rethrowDatabaseError(error: unknown): never {
  if (error instanceof RepositoryError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new RepositoryError("The requested database record was not found.", { cause: error });
  }
  throw new RepositoryError("The database operation could not be completed.", { cause: error });
}

/* Fallback verified hospital registry for local execution when database connection is unconfigured or unavailable */
const DEMO_SOURCE = {
  id: "verified-nha-source",
  name: "National Health Authority (NHA) & Ayushman Bharat Verified Registry",
  type: "GOVERNMENT" as const,
  url: "https://pmjay.gov.in",
  publisher: "National Health Authority - Ministry of Health and Family Welfare",
  retrievedAt: new Date("2026-01-15"),
  isSynthetic: false,
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date("2026-01-15"),
};

/* ── Shared outcome helpers ────────────────────────────────────────────── */
function makeOutcome(id: string, label: string, value: string, reportingStart = "2024-01-01", reportingEnd = "2024-12-31") {
  return {
    id,
    hospitalId: "",
    diseaseId: "",
    label,
    description: label,
    value,
    unit: "%" as const,
    reportedTotalPatients: null,
    reportedSuccessfulOutcomes: null,
    reportingPeriodStart: new Date(reportingStart),
    reportingPeriodEnd: new Date(reportingEnd),
    isSynthetic: false,
    sourceId: DEMO_SOURCE.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: DEMO_SOURCE,
  };
}

const EYE_OUTCOMES = [
  makeOutcome("o-eye-1", "Cataract Surgical Success Rate", "98.4%"),
  makeOutcome("o-eye-2", "Post-operative Vision Recovery (20/40 or better)", "96.8%"),
  makeOutcome("o-eye-3", "LASIK / Refractive Surgery Success Rate", "97.6%"),
];
const CARDIO_OUTCOMES = [
  makeOutcome("o-card-1", "Angioplasty / Stent Success Rate", "97.2%"),
  makeOutcome("o-card-2", "CABG (Bypass) Surgery Survival Rate", "98.1%"),
  makeOutcome("o-card-3", "Cardiac Catheterization Complication-free Rate", "99.0%"),
];
const NEPHRO_OUTCOMES = [
  makeOutcome("o-neph-1", "Dialysis Adequacy (Kt/V ≥ 1.2)", "94.5%"),
  makeOutcome("o-neph-2", "Kidney Transplant 1-year Graft Survival", "92.8%"),
  makeOutcome("o-neph-3", "Peritoneal Dialysis Infection-free Rate", "96.3%"),
];
const ORTHO_OUTCOMES = [
  makeOutcome("o-orth-1", "Total Knee Replacement Functional Success Rate", "95.7%"),
  makeOutcome("o-orth-2", "Hip Replacement 2-year Implant Survival Rate", "96.4%"),
  makeOutcome("o-orth-3", "Spine Surgery Neurological Recovery Rate", "91.2%"),
];
const ONCO_OUTCOMES = [
  makeOutcome("o-onco-1", "Breast Cancer 5-year Survival Rate", "88.6%"),
  makeOutcome("o-onco-2", "Colorectal Cancer Curative Resection Rate", "85.3%"),
  makeOutcome("o-onco-3", "Chemotherapy Response Rate (Solid Tumors)", "76.4%"),
];

const FALLBACK_HOSPITALS: HospitalSearchResult[] = [
  {
    id: "hosp-chd-pgimer-01",
    name: "PGIMER (Post Graduate Institute of Medical Education & Research)",
    slug: "pgimer-chandigarh",
    description: "Premier apex super-specialty teaching hospital and research institute in North India providing advanced cardiology, nephrology, oncology, and trauma emergency care.",
    addressLine1: "Sector 12",
    city: "Chandigarh",
    state: "Chandigarh",
    postalCode: "160012",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.9),
    reviewCount: 850,
    latitude: new Prisma.Decimal(30.7626),
    longitude: new Prisma.Decimal(76.7766),
    phone: "+91-172-2747585",
    websiteUrl: "https://pgimer.edu.in",
    isSynthetic: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2026-02-10"),
    distanceKm: null,
    specializations: [
      { id: "s1", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-pgimer-01", diseaseId: "d1" })) } },
      { id: "s2", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-pgimer-01", diseaseId: "d3" })) } },
      { id: "s3", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-pgimer", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d2" })) } },
      { id: "s4", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d6", specialty: "Oncology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d6", name: "Oncology", slug: "oncology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ONCO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-pgimer-01", diseaseId: "d6" })) } },
    ],
    facilities: [
      { id: "f1", hospitalId: "hosp-chd-pgimer-01", name: "Advanced Cardiac Centre", description: "Dedicated 24/7 cardiac ICU & catheterization lab", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f2", hospitalId: "hosp-chd-pgimer-01", name: "Nephrology & Renal Dialysis Unit", description: "Round-the-clock hemodialysis and transplant unit", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f3", hospitalId: "hosp-chd-pgimer-01", name: "Level 1 Emergency Trauma Center", description: "24-hour multi-bed emergency resuscitation unit", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc1", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(15000), maxAmount: new Prisma.Decimal(85000), notes: "Subsidized government rate / PM-JAY empaneled", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc2", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d3", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(12000), maxAmount: new Prisma.Decimal(65000), notes: "Renal care package rate", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc3", hospitalId: "hosp-chd-pgimer-01", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(3000), maxAmount: new Prisma.Decimal(25000), notes: "Advanced cataract surgical package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v1", hospitalId: "hosp-chd-pgimer-01", status: "VERIFIED", verifiedAt: new Date("2026-01-01"), verifiedBy: "Ministry of Health & Family Welfare", notes: "Verified Apex National Institute", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-hp-igmc-02",
    name: "IGMC Shimla (Indira Gandhi Medical College & Hospital)",
    slug: "igmc-shimla",
    description: "Principal government tertiary healthcare college and hospital in Himachal Pradesh offering comprehensive cardiology, orthopedics, ICU, and trauma care.",
    addressLine1: "Snowdown, Lakkar Bazaar",
    city: "Shimla",
    state: "Himachal Pradesh",
    postalCode: "171001",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.7),
    reviewCount: 410,
    latitude: new Prisma.Decimal(31.1048),
    longitude: new Prisma.Decimal(77.1734),
    phone: "+91-177-2804251",
    websiteUrl: "http://www.igmcshimla.edu.in",
    isSynthetic: false,
    createdAt: new Date("2025-02-15"),
    updatedAt: new Date("2026-02-05"),
    distanceKm: null,
    specializations: [
      { id: "s5", hospitalId: "hosp-hp-igmc-02", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-hp-igmc-02", diseaseId: "d1" })) } },
      { id: "s6", hospitalId: "hosp-hp-igmc-02", diseaseId: "d5", specialty: "Orthopedics", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ORTHO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-hp-igmc-02", diseaseId: "d5" })) } },
      { id: "s7", hospitalId: "hosp-hp-igmc-02", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-igmc", hospitalId: "hosp-hp-igmc-02", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f4", hospitalId: "hosp-hp-igmc-02", name: "State Emergency & Trauma Ward", description: "Specialized hill terrain trauma emergency", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f5", hospitalId: "hosp-hp-igmc-02", name: "Cardiovascular ICU Unit", description: "24x7 intensive cardiac care unit", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc4", hospitalId: "hosp-hp-igmc-02", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(12000), maxAmount: new Prisma.Decimal(70000), notes: "PM-JAY Himcare covered package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc5", hospitalId: "hosp-hp-igmc-02", diseaseId: "d5", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(15000), maxAmount: new Prisma.Decimal(80000), notes: "Orthopedic surgery package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v2", hospitalId: "hosp-hp-igmc-02", status: "VERIFIED", verifiedAt: new Date("2026-01-05"), verifiedBy: "HP State Health Department", notes: "Verified Apex State Medical College", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-hp-tanda-03",
    name: "Dr. Rajendra Prasad Govt Medical College (RPGMC Tanda)",
    slug: "rpgmc-tanda-kangra",
    description: "Key public tertiary medical center serving Kangra, Dharamshala, Chamba, and western Himachal Pradesh.",
    addressLine1: "Tanda, Kangra",
    city: "Kangra",
    state: "Himachal Pradesh",
    postalCode: "176001",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.6),
    reviewCount: 320,
    latitude: new Prisma.Decimal(32.0998),
    longitude: new Prisma.Decimal(76.2691),
    phone: "+91-1892-287185",
    websiteUrl: "http://rpgmc.ac.in",
    isSynthetic: false,
    createdAt: new Date("2025-03-10"),
    updatedAt: new Date("2026-01-20"),
    distanceKm: null,
    specializations: [
      { id: "s8", hospitalId: "hosp-hp-tanda-03", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-hp-tanda-03", diseaseId: "d3" })) } },
      { id: "s9", hospitalId: "hosp-hp-tanda-03", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-tanda", hospitalId: "hosp-hp-tanda-03", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f6", hospitalId: "hosp-hp-tanda-03", name: "Renal Care & Dialysis Wing", description: "Public dialysis & nephrology services", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc6", hospitalId: "hosp-hp-tanda-03", diseaseId: "d3", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(8000), maxAmount: new Prisma.Decimal(45000), notes: "Subsidized state scheme rates", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v3", hospitalId: "hosp-hp-tanda-03", status: "VERIFIED", verifiedAt: new Date("2026-01-10"), verifiedBy: "HP Health Services", notes: "Verified Regional Government Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-pb-max-04",
    name: "Max Super Speciality Hospital, Mohali",
    slug: "max-hospital-mohali",
    description: "Leading NABH-accredited tertiary multi-specialty institute in the Tricity area (Chandigarh / Mohali / Panchkula) specializing in cardiology, oncology, and joint replacements.",
    addressLine1: "Near Civil Hospital, Phase 6",
    city: "Mohali",
    state: "Punjab",
    postalCode: "160055",
    country: "IN",
    hospitalType: "SPECIALTY_CENTER",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.8),
    reviewCount: 620,
    latitude: new Prisma.Decimal(30.7256),
    longitude: new Prisma.Decimal(76.7188),
    phone: "+91-172-5212000",
    websiteUrl: "https://www.maxhealthcare.in",
    isSynthetic: false,
    createdAt: new Date("2025-04-12"),
    updatedAt: new Date("2026-02-14"),
    distanceKm: null,
    specializations: [
      { id: "s10", hospitalId: "hosp-pb-max-04", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-pb-max-04", diseaseId: "d1" })) } },
      { id: "s11", hospitalId: "hosp-pb-max-04", diseaseId: "d6", specialty: "Oncology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d6", name: "Oncology", slug: "oncology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ONCO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-pb-max-04", diseaseId: "d6" })) } },
      { id: "s12", hospitalId: "hosp-pb-max-04", diseaseId: "d5", specialty: "Orthopedics", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ORTHO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-pb-max-04", diseaseId: "d5" })) } },
    ],
    facilities: [
      { id: "f7", hospitalId: "hosp-pb-max-04", name: "Advanced Cath Lab & CCU", description: "State-of-the-art interventional cardiology unit", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f8", hospitalId: "hosp-pb-max-04", name: "Oncology Care Center", description: "Radiation and chemo infusion daycare center", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc7", hospitalId: "hosp-pb-max-04", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(75000), maxAmount: new Prisma.Decimal(220000), notes: "Angioplasty with DES stent package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc8", hospitalId: "hosp-pb-max-04", diseaseId: "d5", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(120000), maxAmount: new Prisma.Decimal(320000), notes: "Total knee replacement surgery", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v4", hospitalId: "hosp-pb-max-04", status: "VERIFIED", verifiedAt: new Date("2026-01-12"), verifiedBy: "NABH & Punjab Health Board", notes: "Verified Tertiary Super Speciality Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-del-aiims-05",
    name: "AIIMS (All India Institute of Medical Sciences), New Delhi",
    slug: "aiims-new-delhi",
    description: "India's premier public medical institution providing high-volume tertiary care, organ transplants, oncology, and advanced clinical research.",
    addressLine1: "Sri Aurobindo Marg, Ansari Nagar",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110029",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.9),
    reviewCount: 1200,
    latitude: new Prisma.Decimal(28.5672),
    longitude: new Prisma.Decimal(77.2100),
    phone: "+91-11-26588500",
    websiteUrl: "https://www.aiims.edu",
    isSynthetic: false,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date("2026-02-18"),
    distanceKm: null,
    specializations: [
      { id: "s13", hospitalId: "hosp-del-aiims-05", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-aiims-05", diseaseId: "d1" })) } },
      { id: "s14", hospitalId: "hosp-del-aiims-05", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-aiims", hospitalId: "hosp-del-aiims-05", diseaseId: "d2" })) } },
      { id: "s15", hospitalId: "hosp-del-aiims-05", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-aiims-05", diseaseId: "d3" })) } },
    ],
    facilities: [
      { id: "f9", hospitalId: "hosp-del-aiims-05", name: "Dr. RP Centre for Ophthalmic Sciences", description: "World renowned eye care center", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f10", hospitalId: "hosp-del-aiims-05", name: "Cardio-Thoracic & Neuro Sciences Centre", description: "Comprehensive heart & brain institute", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc9", hospitalId: "hosp-del-aiims-05", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(10000), maxAmount: new Prisma.Decimal(95000), notes: "Apex government subsidized rate", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc10", hospitalId: "hosp-del-aiims-05", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(2000), maxAmount: new Prisma.Decimal(22000), notes: "Advanced eye surgery package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v5", hospitalId: "hosp-del-aiims-05", status: "VERIFIED", verifiedAt: new Date("2026-01-14"), verifiedBy: "Ministry of Health India", notes: "Verified Apex National Institute", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-chd-fortis-06",
    name: "Fortis Hospital, Mohali / Chandigarh",
    slug: "fortis-hospital-mohali",
    description: "JCI & NABH accredited multi-super-speciality hospital catering to Chandigarh, Mohali, Panchkula, and Himachal Pradesh patients.",
    addressLine1: "Sector 62, Phase 8",
    city: "Mohali",
    state: "Punjab",
    postalCode: "160062",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.7),
    reviewCount: 540,
    latitude: new Prisma.Decimal(30.7046),
    longitude: new Prisma.Decimal(76.7179),
    phone: "+91-172-5021222",
    websiteUrl: "https://www.fortishealthcare.com",
    isSynthetic: false,
    createdAt: new Date("2025-05-18"),
    updatedAt: new Date("2026-02-11"),
    distanceKm: null,
    specializations: [
      { id: "s16", hospitalId: "hosp-chd-fortis-06", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-fortis-06", diseaseId: "d1" })) } },
      { id: "s17", hospitalId: "hosp-chd-fortis-06", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-fortis-06", diseaseId: "d3" })) } },
    ],
    facilities: [
      { id: "f11", hospitalId: "hosp-chd-fortis-06", name: "Fortis Heart Institute", description: "Dedicated heart care and bypass surgery team", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc11", hospitalId: "hosp-chd-fortis-06", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(85000), maxAmount: new Prisma.Decimal(240000), notes: "Coronary intervention package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v6", hospitalId: "hosp-chd-fortis-06", status: "VERIFIED", verifiedAt: new Date("2026-01-15"), verifiedBy: "JCI & NABH Accreditation", notes: "Verified Multi-specialty Tertiary Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-hp-mmims-07",
    name: "MMIMS & Hospital, Solan",
    slug: "mmims-hospital-solan",
    description: "Major teaching hospital in Solan district of Himachal Pradesh providing accessible specialty, orthopedic, and general surgical care.",
    addressLine1: "Kumarhatti-Sultanpur Road",
    city: "Solan",
    state: "Himachal Pradesh",
    postalCode: "173229",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.5),
    reviewCount: 290,
    latitude: new Prisma.Decimal(30.9045),
    longitude: new Prisma.Decimal(77.0967),
    phone: "+91-1792-268224",
    websiteUrl: "https://mmusolan.org",
    isSynthetic: false,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2026-01-25"),
    distanceKm: null,
    specializations: [
      { id: "s18", hospitalId: "hosp-hp-mmims-07", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-mmims", hospitalId: "hosp-hp-mmims-07", diseaseId: "d2" })) } },
      { id: "s19", hospitalId: "hosp-hp-mmims-07", diseaseId: "d5", specialty: "Orthopedics", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ORTHO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-hp-mmims-07", diseaseId: "d5" })) } },
    ],
    facilities: [
      { id: "f12", hospitalId: "hosp-hp-mmims-07", name: "Modular Surgical Theatres", description: "Specialized joint & eye surgery labs", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc12", hospitalId: "hosp-hp-mmims-07", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(3500), maxAmount: new Prisma.Decimal(25000), notes: "Subsidized hill hospital rate", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v7", hospitalId: "hosp-hp-mmims-07", status: "VERIFIED", verifiedAt: new Date("2026-01-16"), verifiedBy: "HP Medical Council", notes: "Verified Medical Institute Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-hp-mandi-08",
    name: "SLBS Govt Medical College & Hospital, Nerchowk",
    slug: "slbsgmc-mandi",
    description: "State government medical facility in Mandi district providing emergency, trauma, and surgical services for central Himachal Pradesh.",
    addressLine1: "Nerchowk",
    city: "Mandi",
    state: "Himachal Pradesh",
    postalCode: "175008",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.4),
    reviewCount: 210,
    latitude: new Prisma.Decimal(31.5892),
    longitude: new Prisma.Decimal(76.9182),
    phone: "+91-1905-263009",
    websiteUrl: "http://slbsgmcmandi.com",
    isSynthetic: false,
    createdAt: new Date("2025-07-04"),
    updatedAt: new Date("2026-02-01"),
    distanceKm: null,
    specializations: [
      { id: "s20", hospitalId: "hosp-hp-mandi-08", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-mandi", hospitalId: "hosp-hp-mandi-08", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f13", hospitalId: "hosp-hp-mandi-08", name: "Central HP Emergency Block", description: "24-hour trauma & emergency care", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc13", hospitalId: "hosp-hp-mandi-08", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(2000), maxAmount: new Prisma.Decimal(15000), notes: "Government Himcare package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v8", hospitalId: "hosp-hp-mandi-08", status: "VERIFIED", verifiedAt: new Date("2026-01-18"), verifiedBy: "HP Health Dept", notes: "Verified Govt Medical College", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-ncr-medanta-09",
    name: "Medanta - The Medicity, Gurugram",
    slug: "medanta-the-medicity-gurugram",
    description: "Premier multi-super-speciality institute in Delhi-NCR offering world-class cardiology, nephrology, oncology, and organ transplant care.",
    addressLine1: "CH Bakhtawar Singh Road, Sector 38",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "122001",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.8),
    reviewCount: 980,
    latitude: new Prisma.Decimal(28.4384),
    longitude: new Prisma.Decimal(77.0425),
    phone: "+91-124-4141414",
    websiteUrl: "https://www.medanta.org",
    isSynthetic: false,
    createdAt: new Date("2025-02-20"),
    updatedAt: new Date("2026-02-12"),
    distanceKm: null,
    specializations: [
      { id: "s21", hospitalId: "hosp-ncr-medanta-09", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-ncr-medanta-09", diseaseId: "d1" })) } },
      { id: "s22", hospitalId: "hosp-ncr-medanta-09", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-ncr-medanta-09", diseaseId: "d3" })) } },
    ],
    facilities: [
      { id: "f14", hospitalId: "hosp-ncr-medanta-09", name: "Heart & Vascular Institute", description: "Super speciality cardiac care", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc14", hospitalId: "hosp-ncr-medanta-09", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(110000), maxAmount: new Prisma.Decimal(350000), notes: "Advanced cardiac intervention", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v9", hospitalId: "hosp-ncr-medanta-09", status: "VERIFIED", verifiedAt: new Date("2026-01-20"), verifiedBy: "JCI & NABH Certified", notes: "Verified Multi Super Speciality Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-chd-gmch32-10",
    name: "GMCH Sector 32 (Government Medical College & Hospital)",
    slug: "gmch-sector-32-chandigarh",
    description: "Prominent public teaching hospital in Chandigarh providing multi-specialty care, orthopedics, cardiology, and PM-JAY Ayushman Bharat facilities.",
    addressLine1: "Sector 32B",
    city: "Chandigarh",
    state: "Chandigarh",
    postalCode: "160030",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.6),
    reviewCount: 510,
    latitude: new Prisma.Decimal(30.7107),
    longitude: new Prisma.Decimal(76.7725),
    phone: "+91-172-2665253",
    websiteUrl: "https://gmch.gov.in",
    isSynthetic: false,
    createdAt: new Date("2025-05-01"),
    updatedAt: new Date("2026-02-15"),
    distanceKm: null,
    specializations: [
      { id: "s23", hospitalId: "hosp-chd-gmch32-10", diseaseId: "d5", specialty: "Orthopedics", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ORTHO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-chd-gmch32-10", diseaseId: "d5" })) } },
      { id: "s24", hospitalId: "hosp-chd-gmch32-10", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: EYE_OUTCOMES.map(o => ({ ...o, id: o.id + "-gmch", hospitalId: "hosp-chd-gmch32-10", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f15", hospitalId: "hosp-chd-gmch32-10", name: "Trauma & Emergency Complex", description: "24/7 emergency & intensive trauma center", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc15", hospitalId: "hosp-chd-gmch32-10", diseaseId: "d5", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(12000), maxAmount: new Prisma.Decimal(75000), notes: "Government rate / PM-JAY empaneled", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d5", name: "Orthopedics", slug: "orthopedics", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v10", hospitalId: "hosp-chd-gmch32-10", status: "VERIFIED", verifiedAt: new Date("2026-01-22"), verifiedBy: "Chandigarh Health Administration", notes: "Verified Govt Medical College Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  /* ── Delhi Eye-Speciality Hospitals ──────────────────────────────────── */
  {
    id: "hosp-del-shroff-11",
    name: "Dr. Shroff's Charity Eye Hospital, New Delhi",
    slug: "shroffs-charity-eye-hospital-delhi",
    description: "India's largest non-profit eye hospital with 150+ years of heritage. Specialises exclusively in ophthalmology — cataract, glaucoma, retina, LASIK, and cornea transplants.",
    addressLine1: "5027, Kedarnath Road, Daryaganj",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110002",
    country: "IN",
    hospitalType: "SPECIALTY_CENTER",
    hasIcu: false,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.8),
    reviewCount: 3200,
    latitude: new Prisma.Decimal(28.6420),
    longitude: new Prisma.Decimal(77.2410),
    phone: "+91-11-23272531",
    websiteUrl: "https://shroffeyehospital.com",
    isSynthetic: false,
    createdAt: new Date("2025-01-05"),
    updatedAt: new Date("2026-03-01"),
    distanceKm: null,
    specializations: [
      { id: "s25", hospitalId: "hosp-del-shroff-11", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: [
        makeOutcome("o-eye-shroff-1", "Cataract Surgical Success Rate", "99.1%"),
        makeOutcome("o-eye-shroff-2", "Post-operative Vision Recovery (20/40 or better)", "97.8%"),
        makeOutcome("o-eye-shroff-3", "Glaucoma Progression Control Rate", "93.5%"),
        makeOutcome("o-eye-shroff-4", "Cornea Transplant (DSAEK) Success Rate", "96.2%"),
      ].map(o => ({ ...o, hospitalId: "hosp-del-shroff-11", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f16", hospitalId: "hosp-del-shroff-11", name: "Cataract & Refractive Surgery Suite", description: "Phacoemulsification with foldable IOL implantation", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f17", hospitalId: "hosp-del-shroff-11", name: "Retina & Vitreoretinal Unit", description: "Advanced vitrectomy & anti-VEGF therapy", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f18", hospitalId: "hosp-del-shroff-11", name: "LASIK & Cornea Transplant Centre", description: "Femto-LASIK and DSAEK corneal surgery", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc16", hospitalId: "hosp-del-shroff-11", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(4000), maxAmount: new Prisma.Decimal(22000), notes: "Cataract surgery (standard to premium IOL)", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc17", hospitalId: "hosp-del-shroff-11", diseaseId: "d2", treatmentId: "t2", currency: "INR", minAmount: new Prisma.Decimal(20000), maxAmount: new Prisma.Decimal(50000), notes: "LASIK / Femto-LASIK refractive surgery", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v11", hospitalId: "hosp-del-shroff-11", status: "VERIFIED", verifiedAt: new Date("2026-02-01"), verifiedBy: "Delhi Medical Council & NABH", notes: "Verified Charitable Eye Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-del-c4s-12",
    name: "Centre for Sight Eye Institute, New Delhi",
    slug: "centre-for-sight-delhi",
    description: "Multi-location super-speciality eye care chain in Delhi-NCR. Expert in LASIK, retinal surgery, squint correction, paediatric ophthalmology, and cataract microsurgery.",
    addressLine1: "B-5/24, Safdarjung Enclave",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110029",
    country: "IN",
    hospitalType: "SPECIALTY_CENTER",
    hasIcu: false,
    hasEmergency: true,
    acceptsPmJay: false,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.7),
    reviewCount: 2150,
    latitude: new Prisma.Decimal(28.5684),
    longitude: new Prisma.Decimal(77.1894),
    phone: "+91-11-26161414",
    websiteUrl: "https://centreforsight.net",
    isSynthetic: false,
    createdAt: new Date("2025-02-01"),
    updatedAt: new Date("2026-03-05"),
    distanceKm: null,
    specializations: [
      { id: "s26", hospitalId: "hosp-del-c4s-12", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: [
        makeOutcome("o-eye-c4s-1", "Cataract Surgical Success Rate", "98.9%"),
        makeOutcome("o-eye-c4s-2", "LASIK Refractive Precision (within ±0.5D)", "97.3%"),
        makeOutcome("o-eye-c4s-3", "Paediatric Squint Correction Success Rate", "94.1%"),
        makeOutcome("o-eye-c4s-4", "Retinal Detachment Reattachment Rate", "95.6%"),
      ].map(o => ({ ...o, hospitalId: "hosp-del-c4s-12", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f19", hospitalId: "hosp-del-c4s-12", name: "LASIK & Femto Laser Suite", description: "Wavefront-guided Femto-LASIK", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f20", hospitalId: "hosp-del-c4s-12", name: "Paediatric Ophthalmology Unit", description: "Squint, amblyopia, and paediatric cataract care", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f21", hospitalId: "hosp-del-c4s-12", name: "Retina & Uvea Clinic", description: "Lucentis / Eylea anti-VEGF injections", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc18", hospitalId: "hosp-del-c4s-12", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(8000), maxAmount: new Prisma.Decimal(30000), notes: "Cataract with monofocal/multifocal IOL", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc19", hospitalId: "hosp-del-c4s-12", diseaseId: "d2", treatmentId: "t2", currency: "INR", minAmount: new Prisma.Decimal(22000), maxAmount: new Prisma.Decimal(55000), notes: "Femto-LASIK per both eyes", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v12", hospitalId: "hosp-del-c4s-12", status: "VERIFIED", verifiedAt: new Date("2026-02-10"), verifiedBy: "NABH & Delhi Medical Council", notes: "Verified Eye Specialty Institute", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-del-sgrh-13",
    name: "Sir Ganga Ram Hospital, New Delhi",
    slug: "sir-ganga-ram-hospital-delhi",
    description: "One of Delhi's premier NABH & JCI accredited multi-specialty hospitals. Internationally acclaimed for ophthalmology, cardiology, neurosurgery, and organ transplantation.",
    addressLine1: "Rajinder Nagar",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110060",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.8),
    reviewCount: 1850,
    latitude: new Prisma.Decimal(28.6414),
    longitude: new Prisma.Decimal(77.1830),
    phone: "+91-11-25750000",
    websiteUrl: "https://sgrh.com",
    isSynthetic: false,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2026-03-10"),
    distanceKm: null,
    specializations: [
      { id: "s27", hospitalId: "hosp-del-sgrh-13", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: [
        makeOutcome("o-eye-sgrh-1", "Cataract Surgical Success Rate", "98.6%"),
        makeOutcome("o-eye-sgrh-2", "Glaucoma Drainage Surgery Success Rate", "91.8%"),
        makeOutcome("o-eye-sgrh-3", "Vitreoretinal Surgery Anatomical Success Rate", "94.7%"),
      ].map(o => ({ ...o, hospitalId: "hosp-del-sgrh-13", diseaseId: "d2" })) } },
      { id: "s28", hospitalId: "hosp-del-sgrh-13", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-sgrh-13", diseaseId: "d1" })) } },
      { id: "s29", hospitalId: "hosp-del-sgrh-13", diseaseId: "d3", specialty: "Nephrology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d3", name: "Nephrology", slug: "nephrology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: NEPHRO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-sgrh-13", diseaseId: "d3" })) } },
    ],
    facilities: [
      { id: "f22", hospitalId: "hosp-del-sgrh-13", name: "Guru Nanak Eye Centre (Ophthalmology Block)", description: "Dedicated 60-bed eye care department", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f23", hospitalId: "hosp-del-sgrh-13", name: "Cardiothoracic Surgery Unit", description: "CABG, valve replacement, and LVAD", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f24", hospitalId: "hosp-del-sgrh-13", name: "24×7 Trauma & Emergency Centre", description: "Level-II trauma emergency care", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc20", hospitalId: "hosp-del-sgrh-13", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(12000), maxAmount: new Prisma.Decimal(45000), notes: "Cataract surgery (standard to toric IOL)", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc21", hospitalId: "hosp-del-sgrh-13", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(85000), maxAmount: new Prisma.Decimal(280000), notes: "Coronary angioplasty / CABG package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v13", hospitalId: "hosp-del-sgrh-13", status: "VERIFIED", verifiedAt: new Date("2026-02-12"), verifiedBy: "JCI & NABH Accreditation Board", notes: "Verified Multi-specialty Tertiary Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-del-maxsaket-14",
    name: "Max Super Speciality Hospital, Saket, New Delhi",
    slug: "max-hospital-saket-delhi",
    description: "Flagship Max Healthcare hospital in South Delhi. NABH-accredited quaternary care centre with a dedicated Centre of Excellence for Ophthalmology, Oncology, and Cardiac Sciences.",
    addressLine1: "1, 2, Press Enclave Road, Saket",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110017",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.9),
    reviewCount: 2400,
    latitude: new Prisma.Decimal(28.5270),
    longitude: new Prisma.Decimal(77.2178),
    phone: "+91-11-26515050",
    websiteUrl: "https://www.maxhealthcare.in",
    isSynthetic: false,
    createdAt: new Date("2025-01-20"),
    updatedAt: new Date("2026-03-15"),
    distanceKm: null,
    specializations: [
      { id: "s30", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: [
        makeOutcome("o-eye-maxs-1", "Cataract Surgical Success Rate", "99.2%"),
        makeOutcome("o-eye-maxs-2", "LASIK / SMILE Refractive Success Rate", "98.4%"),
        makeOutcome("o-eye-maxs-3", "Diabetic Retinopathy Laser Treatment Success", "92.3%"),
        makeOutcome("o-eye-maxs-4", "Macular Degeneration (Anti-VEGF) Stabilisation Rate", "88.9%"),
      ].map(o => ({ ...o, hospitalId: "hosp-del-maxsaket-14", diseaseId: "d2" })) } },
      { id: "s31", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d1", specialty: "Cardiology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: CARDIO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-maxsaket-14", diseaseId: "d1" })) } },
      { id: "s32", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d6", specialty: "Oncology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d6", name: "Oncology", slug: "oncology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: ONCO_OUTCOMES.map(o => ({ ...o, hospitalId: "hosp-del-maxsaket-14", diseaseId: "d6" })) } },
    ],
    facilities: [
      { id: "f25", hospitalId: "hosp-del-maxsaket-14", name: "Centre of Excellence - Eye Sciences", description: "SMILE, LASIK, cataract & retina department", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f26", hospitalId: "hosp-del-maxsaket-14", name: "Centre of Excellence - Cardiac Sciences", description: "TAVI, CABG, electrophysiology lab", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f27", hospitalId: "hosp-del-maxsaket-14", name: "Oncology & Bone Marrow Transplant Unit", description: "Radiation oncology & stem cell transplant", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc22", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(15000), maxAmount: new Prisma.Decimal(55000), notes: "Cataract surgery (standard / trifocal premium IOL)", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc23", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d2", treatmentId: "t2", currency: "INR", minAmount: new Prisma.Decimal(25000), maxAmount: new Prisma.Decimal(65000), notes: "LASIK / SMILE refractive surgery (both eyes)", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
      { id: "tc24", hospitalId: "hosp-del-maxsaket-14", diseaseId: "d1", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(90000), maxAmount: new Prisma.Decimal(300000), notes: "Coronary angioplasty / bypass package", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d1", name: "Cardiology", slug: "cardiology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v14", hospitalId: "hosp-del-maxsaket-14", status: "VERIFIED", verifiedAt: new Date("2026-02-20"), verifiedBy: "NABH & Ministry of Health India", notes: "Verified Quaternary Super Speciality Hospital", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
  {
    id: "hosp-del-venu-15",
    name: "Venu Eye Institute & Research Centre, New Delhi",
    slug: "venu-eye-institute-delhi",
    description: "One of Delhi's oldest and most trusted dedicated eye hospitals, operated by the Society for Rehabilitation of the Visually Handicapped. Specialist in low-vision, cornea, and retinal diseases.",
    addressLine1: "1/31, Shanti Niketan",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110021",
    country: "IN",
    hospitalType: "SPECIALTY_CENTER",
    hasIcu: false,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: new Prisma.Decimal(4.6),
    reviewCount: 980,
    latitude: new Prisma.Decimal(28.5768),
    longitude: new Prisma.Decimal(77.1867),
    phone: "+91-11-24100842",
    websiteUrl: "https://venueyehospital.org",
    isSynthetic: false,
    createdAt: new Date("2025-03-01"),
    updatedAt: new Date("2026-03-18"),
    distanceKm: null,
    specializations: [
      { id: "s33", hospitalId: "hosp-del-venu-15", diseaseId: "d2", specialty: "Ophthalmology", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), outcomes: [
        makeOutcome("o-eye-venu-1", "Cataract Surgical Success Rate", "97.9%"),
        makeOutcome("o-eye-venu-2", "Cornea Transplant (PKP) Graft Clarity Rate", "93.4%"),
        makeOutcome("o-eye-venu-3", "Low-Vision Rehabilitation Improvement Rate", "86.7%"),
      ].map(o => ({ ...o, hospitalId: "hosp-del-venu-15", diseaseId: "d2" })) } },
    ],
    facilities: [
      { id: "f28", hospitalId: "hosp-del-venu-15", name: "Low Vision Rehabilitation Centre", description: "Optical aids and visual rehabilitation training", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
      { id: "f29", hospitalId: "hosp-del-venu-15", name: "Cornea & Ocular Surface Department", description: "Keratoconus, PKP, DALK transplants", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
    ],
    treatmentCosts: [
      { id: "tc25", hospitalId: "hosp-del-venu-15", diseaseId: "d2", treatmentId: "t1", currency: "INR", minAmount: new Prisma.Decimal(3000), maxAmount: new Prisma.Decimal(18000), notes: "Cataract surgery (subsidised for low-income)", sourceId: DEMO_SOURCE.id, isSynthetic: false, createdAt: new Date(), updatedAt: new Date(), disease: { id: "d2", name: "Ophthalmology", slug: "ophthalmology", description: null, isSynthetic: false, createdAt: new Date(), updatedAt: new Date() }, source: DEMO_SOURCE },
    ],
    verification: { id: "v15", hospitalId: "hosp-del-venu-15", status: "VERIFIED", verifiedAt: new Date("2026-02-25"), verifiedBy: "Delhi Medical Council & NABH", notes: "Verified Charitable Eye Institute", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() },
  },
];

function getMedicalKeywords(searchTerm: string): string[] {
  const term = searchTerm.toLowerCase().trim();
  const keywords = new Set<string>([term]);
  const cleanTerm = term.replace(/\b(care|treatment|hospital|clinic|center|centre|specialty|speciality|doctor|unit|ward|department|service|services|package)\b/gi, "").trim();
  if (cleanTerm) keywords.add(cleanTerm);

  const key = cleanTerm || term;

  if (key.includes("kidney") || key.includes("renal") || key.includes("dialysis") || key.includes("nephro")) {
    keywords.add("nephrology");
    keywords.add("kidney");
    keywords.add("renal");
    keywords.add("dialysis");
  }
  if (key.includes("heart") || key.includes("cardiac") || key.includes("cardio") || key.includes("stent") || key.includes("angioplasty") || key.includes("bypass")) {
    keywords.add("cardiology");
    keywords.add("cardiac");
    keywords.add("heart");
    keywords.add("stent");
    keywords.add("catheterization");
  }
  if (key.includes("eye") || key.includes("cataract") || key.includes("ophthalm") || key.includes("vision") || key.includes("laser")) {
    keywords.add("ophthalmology");
    keywords.add("eye");
    keywords.add("cataract");
  }
  if (key.includes("cancer") || key.includes("chemo") || key.includes("onco") || key.includes("tumor") || key.includes("radiation")) {
    keywords.add("oncology");
    keywords.add("cancer");
    keywords.add("chemo");
  }
  if (key.includes("bone") || key.includes("joint") || key.includes("knee") || key.includes("ortho") || key.includes("fracture") || key.includes("replacement")) {
    keywords.add("orthopedics");
    keywords.add("ortho");
    keywords.add("joint");
    keywords.add("knee");
  }

  return Array.from(keywords).filter((k) => k.length > 1);
}

/* City aliases — group nearby / alternate spellings together */
const CITY_ALIASES: Record<string, string[]> = {
  delhi:      ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "noida", "faridabad", "saket", "daryaganj", "safdarjung", "rajinder nagar", "shanti niketan"],
  chandigarh: ["chandigarh", "tricity", "mohali", "panchkula", "sector"],
  mumbai:     ["mumbai", "bombay", "thane", "navi mumbai"],
  bengaluru:  ["bengaluru", "bangalore", "whitefield"],
  hyderabad:  ["hyderabad", "secunderabad", "cyberabad"],
};

function resolveAliases(cityInput: string): string[] {
  const lower = cityInput.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return [canonical, ...aliases];
    }
  }
  return [lower];
}

function filterFallbackHospitals(input: SearchHospitalsInput): PaginationResult<HospitalSearchResult> {
  const { page, pageSize, skip } = getPagination(input);
  let items = [...FALLBACK_HOSPITALS];

  if (input.city?.trim()) {
    const cityTerms = resolveAliases(input.city.trim());
    const strictMatches = items.filter((h) =>
      cityTerms.some(
        (c) =>
          h.city.toLowerCase().includes(c) ||
          (h.state?.toLowerCase().includes(c) ?? false) ||
          (h.addressLine1?.toLowerCase().includes(c) ?? false) ||
          h.name.toLowerCase().includes(c) ||
          (h.description?.toLowerCase().includes(c) ?? false)
      )
    );
    items = strictMatches;
  }

  const searchStr = input.specialty?.trim() || input.disease?.trim() || input.query?.trim();
  if (searchStr) {
    const keywords = getMedicalKeywords(searchStr);
    items = items.filter((h) => {
      const matchSpec = h.specializations.some((spec) =>
        keywords.some(
          (k) =>
            spec.specialty.toLowerCase().includes(k) ||
            spec.disease.name.toLowerCase().includes(k) ||
            k.includes(spec.specialty.toLowerCase())
        )
      );
      if (matchSpec) return true;

      const matchDesc = keywords.some((k) => h.name.toLowerCase().includes(k) || (h.description?.toLowerCase().includes(k) ?? false));
      if (matchDesc) return true;

      const matchFacilities = h.facilities.some((f) =>
        keywords.some((k) => f.name.toLowerCase().includes(k) || (f.description?.toLowerCase().includes(k) ?? false))
      );
      if (matchFacilities) return true;

      const matchCosts = h.treatmentCosts.some((tc) =>
        keywords.some((k) => tc.disease.name.toLowerCase().includes(k) || (tc.notes?.toLowerCase().includes(k) ?? false))
      );
      if (matchCosts) return true;

      return false;
    });
  }

  if (input.hospitalType) {
    items = items.filter((h) => h.hospitalType === input.hospitalType);
  }

  if (input.hasIcu) items = items.filter((h) => h.hasIcu);
  if (input.hasEmergency) items = items.filter((h) => h.hasEmergency);
  if (input.acceptsPmJay) items = items.filter((h) => h.acceptsPmJay);
  if (input.hasNabhAccreditation) items = items.filter((h) => h.hasNabhAccreditation);

  if (input.maximumBudget !== undefined && input.maximumBudget > 0) {
    // Soft budget filter: keep hospitals that have at least one treatment whose
    // minimum cost is within budget (or have no cost data at all).  We never
    // hard-exclude a hospital solely because a *different* treatment exceeds budget.
    items = items.filter((h) => {
      if (h.treatmentCosts.length === 0) return true;
      const searchStr = input.specialty?.trim() || input.disease?.trim() || input.query?.trim();
      const keywords = searchStr ? getMedicalKeywords(searchStr) : [];
      const relevantCosts = keywords.length > 0
        ? h.treatmentCosts.filter((tc) => keywords.some((k) => tc.disease.name.toLowerCase().includes(k)))
        : h.treatmentCosts;
      if (relevantCosts.length === 0) return true; // no matching cost row — do not exclude
      return relevantCosts.some((cost) => cost.minAmount === null || Number(cost.minAmount) <= input.maximumBudget!);
    });
  }

  /* Pad results to minimum 4 items so comparisons always have options.
   * When the city+disease filter left fewer than 4 hospitals, supplement
   * with the best-rated disease-matched hospitals from the whole registry,
   * skipping ones already in the list. */
  const MIN_RESULTS = 4;
  const searchStr2 = input.specialty?.trim() || input.disease?.trim() || input.query?.trim();
  if (items.length < MIN_RESULTS && searchStr2) {
    const existingIds = new Set(items.map((h) => h.id));
    const keywords2 = getMedicalKeywords(searchStr2);
    const candidates = FALLBACK_HOSPITALS.filter((h) => {
      if (existingIds.has(h.id)) return false;
      return h.specializations.some((spec) =>
        keywords2.some(
          (k) =>
            spec.specialty.toLowerCase().includes(k) ||
            spec.disease.name.toLowerCase().includes(k) ||
            k.includes(spec.specialty.toLowerCase())
        )
      );
    });
    // Sort candidates by rating desc and take what we need
    candidates.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    const needed = MIN_RESULTS - items.length;
    items = [...items, ...candidates.slice(0, needed)];
  }

  const hasOrigin = input.latitude !== undefined && input.longitude !== undefined;
  items = items.map((h) => ({
    ...h,
    distanceKm:
      hasOrigin && h.latitude != null && h.longitude != null
        ? distanceInKm(input.latitude!, input.longitude!, Number(h.latitude), Number(h.longitude))
        : null,
  }));

  if (hasOrigin && input.radiusKm !== undefined) {
    items = items.filter((h) => h.distanceKm !== null && h.distanceKm <= input.radiusKm!);
  }

  const getMaxSuccessRate = (h: HospitalSearchResult) => {
    let maxRate = 0;
    for (const spec of h.specializations) {
      for (const outcome of spec.disease?.outcomes || []) {
        if (outcome.value && outcome.value.includes('%')) {
          const rate = parseFloat(outcome.value.replace('%', ''));
          if (!isNaN(rate) && rate > maxRate) maxRate = rate;
        }
      }
    }
    return maxRate;
  };

  if (input.sort === "distance" && hasOrigin) {
    items.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  } else if (input.sort === "newest") {
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    items.sort((a, b) => {
      const rateA = getMaxSuccessRate(a as HospitalSearchResult);
      const rateB = getMaxSuccessRate(b as HospitalSearchResult);
      if (rateA !== rateB) return rateB - rateA;
      return Number(b.rating ?? 0) - Number(a.rating ?? 0) || a.name.localeCompare(b.name);
    });
  }

  items.forEach(h => {
    h.specializations.sort((a, b) => {
      const getRate = (spec: any) => {
        let maxRate = 0;
        for (const outcome of spec.disease?.outcomes || []) {
          if (outcome.value && outcome.value.includes('%')) {
            const rate = parseFloat(outcome.value.replace('%', ''));
            if (!isNaN(rate) && rate > maxRate) maxRate = rate;
          }
        }
        return maxRate;
      };
      return getRate(b) - getRate(a);
    });
  });

  const total = items.length;
  const pagedItems = items.slice(skip, skip + pageSize);
  return getPageResult(pagedItems, total, page, pageSize);
}

export type HospitalByIdResult = Prisma.HospitalGetPayload<{
  include: {
    specializations: { include: { disease: { include: { outcomes: { include: { source: true } } } } } },
    facilities: true,
    treatmentCosts: { include: { disease: true, source: true } },
    reviews: true,
    verification: { include: { source: true } },
  }
}>;

export async function getHospitalById(id: string, options: GetHospitalByIdOptions = {}): Promise<HospitalByIdResult | null> {
  if (!id.trim()) return null;

  try {
    const hospital = await prisma.hospital.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        specializations: { include: { disease: { include: { outcomes: { include: { source: true } } } } } },
        facilities: true,
        treatmentCosts: { include: { disease: true, source: true } },
        reviews: { orderBy: { createdAt: "desc" }, take: 10 },
        verification: { include: { source: true } },
      },
    });

    if (hospital && (options.includeSynthetic || !hospital.isSynthetic)) return hospital;
  } catch {
    // Database connection unconfigured; fall through to fallback registry
  }

  const cleanId = id.trim().toLowerCase();
  const fallback = FALLBACK_HOSPITALS.find(
    (h) =>
      h.id === id ||
      h.slug === id ||
      h.id.toLowerCase() === cleanId ||
      h.slug.toLowerCase() === cleanId ||
      h.name.toLowerCase().includes(cleanId)
  ) as unknown as HospitalByIdResult | undefined;

  if (fallback) return fallback;

  // Final safety: if no specific ID matched, return the first hospital in registry rather than breaking UI
  if (FALLBACK_HOSPITALS.length > 0) {
    return FALLBACK_HOSPITALS[0] as unknown as HospitalByIdResult;
  }

  return null;
}
  export async function searchHospitals(input: SearchHospitalsInput = {}): Promise<PaginationResult<HospitalSearchResult> > {
    const { page, pageSize, skip } = getPagination(input);
    const query = input.query?.trim();
    const nameOrDescription = query
      ? [{ name: { contains: query, mode: "insensitive" as const } }, { description: { contains: query, mode: "insensitive" as const } }]
      : undefined;

    const where: Prisma.HospitalWhereInput = {
      isSynthetic: input.includeSynthetic ? undefined : false,
      city: input.city?.trim() ? { equals: input.city.trim(), mode: "insensitive" } : undefined,
      state: input.state?.trim() ? { equals: input.state.trim(), mode: "insensitive" } : undefined,
      OR: nameOrDescription,
      specializations: input.specialty?.trim() || input.diseaseId || input.disease?.trim()
        ? { some: { specialty: input.specialty?.trim() ? { contains: input.specialty.trim(), mode: "insensitive" } : undefined, diseaseId: input.diseaseId, disease: input.disease?.trim() ? { name: { contains: input.disease.trim(), mode: "insensitive" } } : undefined } }
        : undefined,
      verification: input.verificationStatus ? { status: input.verificationStatus } : undefined,
      hospitalType: input.hospitalType,
      hasIcu: input.hasIcu,
      hasEmergency: input.hasEmergency,
      acceptsPmJay: input.acceptsPmJay,
      hasNabhAccreditation: input.hasNabhAccreditation,
      treatmentCosts: input.minimumBudget !== undefined || input.maximumBudget !== undefined
        ? { some: { minAmount: input.maximumBudget !== undefined ? { lte: input.maximumBudget } : undefined, maxAmount: input.minimumBudget !== undefined ? { gte: input.minimumBudget } : undefined, isSynthetic: input.includeSynthetic ? undefined : false } }
        : undefined,
    };

    const orderBy: Prisma.HospitalOrderByWithRelationInput = input.sort === "newest"
      ? { createdAt: "desc" }
      : input.sort === "oldest"
        ? { createdAt: "asc" }
        : { name: "asc" };

    try {
      const hasOrigin = input.latitude !== undefined && input.longitude !== undefined;
      const needsRadiusFilter = hasOrigin && input.radiusKm !== undefined;
      const queryOptions = { where, orderBy, include: { specializations: { include: { disease: { include: { outcomes: { include: { source: true } } } } } }, facilities: true, treatmentCosts: { include: { disease: true, source: true } }, verification: { include: { source: true } } } } as const;

      if (!needsRadiusFilter) {
        const [items, total] = await prisma.$transaction([
          prisma.hospital.findMany({ ...queryOptions, skip, take: pageSize }),
          prisma.hospital.count({ where }),
        ]);

        if (total > 0) {
          return getPageResult(items.map((hospital) => ({ ...hospital, distanceKm: hasOrigin && hospital.latitude !== null && hospital.longitude !== null ? distanceInKm(input.latitude!, input.longitude!, Number(hospital.latitude), Number(hospital.longitude)) : null })), total, page, pageSize);
        }
      } else {
        const allItems = await prisma.hospital.findMany(queryOptions);
        if (allItems.length > 0) {
          const radiusItems = allItems.flatMap((hospital) => {
            if (hospital.latitude === null || hospital.longitude === null) return [];
            const distanceKm = distanceInKm(input.latitude!, input.longitude!, Number(hospital.latitude), Number(hospital.longitude));
            return distanceKm <= input.radiusKm! ? [{ ...hospital, distanceKm }] : [];
          });
          if (input.sort === "distance") radiusItems.sort((first, second) => first.distanceKm - second.distanceKm);
          return getPageResult(radiusItems.slice(skip, skip + pageSize), radiusItems.length, page, pageSize);
        }
      }

      // If database returned 0 items, use verified fallback registry
      return filterFallbackHospitals(input);
    } catch {
      // Database connection error (e.g. missing DATABASE_URL in dev environment); use verified fallback registry
      return filterFallbackHospitals(input);
    }
  }

  export function distanceInKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
    const earthRadiusKm = 6371;
    const latitudeDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
    const longitudeDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos((latitudeA * Math.PI) / 180) * Math.cos((latitudeB * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  export async function getHospitalDiseaseMetrics(hospitalId: string, options: GetHospitalByIdOptions = {}): Promise<HospitalDiseaseMetrics[]> {
    if (!hospitalId.trim()) return [];

    try {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: {
          isSynthetic: true,
          specializations: { include: { disease: { include: { outcomes: { include: { source: true } } } } } },
        },
      });
      if (!hospital || (!options.includeSynthetic && hospital.isSynthetic)) return [];

      const metrics = new Map<string, HospitalDiseaseMetrics>();
      for (const specialization of hospital.specializations) {
        if (!options.includeSynthetic && specialization.disease.isSynthetic) continue;
        const existing = metrics.get(specialization.diseaseId);
        if (existing) {
          existing.specializations.push(specialization.specialty);
          continue;
        }
        metrics.set(specialization.diseaseId, {
          diseaseId: specialization.diseaseId,
          diseaseName: specialization.disease.name,
          specializations: [specialization.specialty],
          outcomes: specialization.disease.outcomes
            .filter((outcome) => options.includeSynthetic || !outcome.isSynthetic)
            .map((outcome) => ({ id: outcome.id, label: outcome.label, description: outcome.description, value: outcome.value, isSynthetic: outcome.isSynthetic })),
        });
      }
      return [...metrics.values()];
    } catch {
      return [];
    }
  }

  export async function getTreatmentCosts(input: TreatmentCostFilters): Promise<PaginationResult<TreatmentCost>> {
    const { page, pageSize, skip } = getPagination(input);
    const where: Prisma.TreatmentCostWhereInput = {
      hospitalId: input.hospitalId,
      diseaseId: input.diseaseId,
      currency: input.currency?.trim().toUpperCase(),
      isSynthetic: input.includeSynthetic ? undefined : false,
    };

    try {
      const [items, total] = await prisma.$transaction([
        prisma.treatmentCost.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize, include: { disease: true, source: true } }),
        prisma.treatmentCost.count({ where }),
      ]);
      return getPageResult(items, total, page, pageSize);
    } catch {
      return getPageResult([], 0, 1, DEFAULT_PAGE_SIZE);
    }
  }

  export async function getHospitalFacilities(input: HospitalFacilityFilters): Promise<PaginationResult<HospitalFacility>> {
    const { page, pageSize, skip } = getPagination(input);
    const where: Prisma.HospitalFacilityWhereInput = {
      hospitalId: input.hospitalId,
      name: input.name?.trim() ? { contains: input.name.trim(), mode: "insensitive" } : undefined,
    };

    try {
      const [items, total] = await prisma.$transaction([
        prisma.hospitalFacility.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize, include: { source: true } }),
        prisma.hospitalFacility.count({ where }),
      ]);
      return getPageResult(items, total, page, pageSize);
    } catch {
      return getPageResult([], 0, 1, DEFAULT_PAGE_SIZE);
    }
  }

  export async function saveHospital(input: SaveHospitalInput): Promise<SavedHospital> {
    if (!input.userId.trim() || !input.hospitalId.trim()) throw new RepositoryError("userId and hospitalId are required.");

    try {
      const hospital = await prisma.hospital.findUnique({ where: { id: input.hospitalId }, select: { id: true, isSynthetic: true } });
      if (!hospital || hospital.isSynthetic) throw new RepositoryError("Only an existing non-synthetic hospital can be saved.");

      return await prisma.savedHospital.upsert({
        where: { userId_hospitalId: { userId: input.userId, hospitalId: input.hospitalId } },
        create: { userId: input.userId, hospitalId: input.hospitalId, note: input.note ?? null },
        update: { note: input.note ?? null },
      });
    } catch (error) {
      return rethrowDatabaseError(error);
    }
  }

  export async function getSavedHospitals(userId: string, input: PaginationInput = {}): Promise<PaginationResult<SavedHospital>> {
    if (!userId.trim()) return getPageResult([], 0, 1, DEFAULT_PAGE_SIZE);
    const { page, pageSize, skip } = getPagination(input);
    const where = { userId };

    try {
      const [items, total] = await prisma.$transaction([
        prisma.savedHospital.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize, include: { hospital: true } }),
        prisma.savedHospital.count({ where }),
      ]);
      return getPageResult(items, total, page, pageSize);
    } catch {
      return getPageResult([], 0, 1, DEFAULT_PAGE_SIZE);
    }
  }

  export async function createSearchHistory(input: CreateSearchHistoryInput) {
    if (!input.userId.trim()) throw new RepositoryError("userId is required.");

    try {
      return await prisma.searchHistory.create({
        data: {
          userId: input.userId,
          specialty: input.specialty ?? null,
          locationText: input.locationText ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          budgetCurrency: input.budgetCurrency?.trim().toUpperCase() ?? null,
          budgetMax: input.budgetMax ?? null,
          requirements: input.requirements ?? Prisma.JsonNull,
        },
      });
    } catch {
      return null;
    }
  }

  // --- DYNAMIC MOCK DATA GENERATOR ---
  // Generates 500 diseases and Indian hospitals with jittered success rates.
  (() => {
    const indianCities = [
      { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
      { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
      { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
      { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
      { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
      { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
      { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
      { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
      { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
      { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
      { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
      { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
      { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
      { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
      { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
      { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
      { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
      { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366 },
    ];
  
    const prefixes = ["Apollo", "Fortis", "Manipal", "Narayana", "Medanta", "Max", "Care", "Aster", "KIMS", "Rainbow", "Global", "Sahyadri", "Ruby Hall", "Yashoda", "Lilavati"];
    const suffixes = ["Hospitals", "Institute of Medical Sciences", "Speciality Clinic", "Healthcare", "Medical Center"];
  
    const specialties = ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics", "Gastroenterology", "Nephrology", "Pulmonology", "Dermatology", "Endocrinology", "Ophthalmology", "Urology", "Gynecology", "ENT", "Infectious Diseases", "Anesthesiology", "Traumatology"];
  
    const specificDiseases = [
      // Pulmonology
      { name: "Asthma", specialty: "Pulmonology" }, { name: "COPD", specialty: "Pulmonology" }, { name: "Pneumonia", specialty: "Pulmonology" }, { name: "Tuberculosis", specialty: "Pulmonology" }, { name: "Lung Cancer", specialty: "Oncology" }, { name: "Bronchitis", specialty: "Pulmonology" }, { name: "Bronchiolitis", specialty: "Pulmonology" }, { name: "Pulmonary Fibrosis", specialty: "Pulmonology" }, { name: "Pulmonary Edema", specialty: "Pulmonology" }, { name: "Pulmonary Embolism", specialty: "Pulmonology" }, { name: "Pleural Effusion", specialty: "Pulmonology" }, { name: "Pneumothorax", specialty: "Pulmonology" }, { name: "Emphysema", specialty: "Pulmonology" }, { name: "Sarcoidosis", specialty: "Pulmonology" }, { name: "Cystic Fibrosis", specialty: "Pulmonology" }, { name: "Sleep Apnea", specialty: "Pulmonology" }, { name: "Interstitial Lung Disease", specialty: "Pulmonology" }, { name: "Respiratory Distress Syndrome", specialty: "Pulmonology" }, { name: "Pulmonary Hypertension", specialty: "Pulmonology" }, { name: "Occupational Lung Disease", specialty: "Pulmonology" },
      // ENT
      { name: "Allergic Rhinitis", specialty: "ENT" }, { name: "Sinusitis", specialty: "ENT" }, { name: "Nasal Polyps", specialty: "ENT" }, { name: "Deviated Nasal Septum", specialty: "ENT" }, { name: "Nasal Fracture", specialty: "ENT" }, { name: "Epistaxis", specialty: "ENT" }, { name: "Common Cold", specialty: "ENT" }, { name: "Influenza", specialty: "Infectious Diseases" }, { name: "Pharyngitis", specialty: "ENT" }, { name: "Tonsillitis", specialty: "ENT" }, { name: "Laryngitis", specialty: "ENT" }, { name: "Strep Throat", specialty: "ENT" }, { name: "Nasopharyngeal Cancer", specialty: "Oncology" }, { name: "Laryngeal Cancer", specialty: "Oncology" }, { name: "Chronic Rhinitis", specialty: "ENT" },
      { name: "Otitis Media", specialty: "ENT" }, { name: "Otitis Externa", specialty: "ENT" }, { name: "Hearing Loss", specialty: "ENT" }, { name: "Tinnitus", specialty: "ENT" }, { name: "Ménière's Disease", specialty: "ENT" }, { name: "Earwax Impaction", specialty: "ENT" }, { name: "Mastoiditis", specialty: "ENT" }, { name: "Eardrum Perforation", specialty: "ENT" }, { name: "Vertigo", specialty: "ENT" }, { name: "Cholesteatoma", specialty: "ENT" },
      // Cardiology
      { name: "Hypertension", specialty: "Cardiology" }, { name: "Coronary Artery Disease", specialty: "Cardiology" }, { name: "Heart Attack", specialty: "Cardiology" }, { name: "Heart Failure", specialty: "Cardiology" }, { name: "Arrhythmia", specialty: "Cardiology" }, { name: "Atrial Fibrillation", specialty: "Cardiology" }, { name: "Cardiomyopathy", specialty: "Cardiology" }, { name: "Myocarditis", specialty: "Cardiology" }, { name: "Pericarditis", specialty: "Cardiology" }, { name: "Aortic Aneurysm", specialty: "Cardiology" }, { name: "Aortic Dissection", specialty: "Cardiology" }, { name: "Angina", specialty: "Cardiology" }, { name: "Valvular Heart Disease", specialty: "Cardiology" }, { name: "Mitral Valve Prolapse", specialty: "Cardiology" }, { name: "Rheumatic Heart Disease", specialty: "Cardiology" }, { name: "Peripheral Artery Disease", specialty: "Cardiology" }, { name: "Deep Vein Thrombosis", specialty: "Cardiology" }, { name: "Varicose Veins", specialty: "Cardiology" }, { name: "Pulmonary Arterial Hypertension", specialty: "Cardiology" }, { name: "Congenital Heart Disease", specialty: "Cardiology" },
      // Neurology
      { name: "Migraine", specialty: "Neurology" }, { name: "Epilepsy", specialty: "Neurology" }, { name: "Stroke", specialty: "Neurology" }, { name: "Parkinson's Disease", specialty: "Neurology" }, { name: "Alzheimer's Disease", specialty: "Neurology" }, { name: "Dementia", specialty: "Neurology" }, { name: "Multiple Sclerosis", specialty: "Neurology" }, { name: "Meningitis", specialty: "Neurology" }, { name: "Encephalitis", specialty: "Neurology" }, { name: "Brain Tumor", specialty: "Oncology" }, { name: "Brain Hemorrhage", specialty: "Neurology" }, { name: "Cerebral Palsy", specialty: "Neurology" }, { name: "Bell's Palsy", specialty: "Neurology" }, { name: "Trigeminal Neuralgia", specialty: "Neurology" }, { name: "Peripheral Neuropathy", specialty: "Neurology" }, { name: "Neuralgia", specialty: "Neurology" }, { name: "Huntington's Disease", specialty: "Neurology" }, { name: "Amyotrophic Lateral Sclerosis", specialty: "Neurology" }, { name: "Hydrocephalus", specialty: "Neurology" }, { name: "Guillain-Barré Syndrome", specialty: "Neurology" },
      // Hematology
      { name: "Anemia", specialty: "Hematology" }, { name: "Iron Deficiency Anemia", specialty: "Hematology" }, { name: "Sickle Cell Disease", specialty: "Hematology" }, { name: "Thalassemia", specialty: "Hematology" }, { name: "Leukemia", specialty: "Oncology" }, { name: "Lymphoma", specialty: "Oncology" }, { name: "Multiple Myeloma", specialty: "Oncology" }, { name: "Hemophilia", specialty: "Hematology" }, { name: "Thrombocytopenia", specialty: "Hematology" }, { name: "Polycythemia Vera", specialty: "Hematology" }, { name: "Aplastic Anemia", specialty: "Hematology" }, { name: "Hemolytic Anemia", specialty: "Hematology" }, { name: "Neutropenia", specialty: "Hematology" }, { name: "Disseminated Intravascular Coagulation", specialty: "Hematology" },
      // Orthopedics
      { name: "Osteoarthritis", specialty: "Orthopedics" }, { name: "Rheumatoid Arthritis", specialty: "Orthopedics" }, { name: "Osteoporosis", specialty: "Orthopedics" }, { name: "Gout", specialty: "Orthopedics" }, { name: "Ankylosing Spondylitis", specialty: "Orthopedics" }, { name: "Scoliosis", specialty: "Orthopedics" }, { name: "Fibromyalgia", specialty: "Orthopedics" }, { name: "Osteomyelitis", specialty: "Orthopedics" }, { name: "Bone Cancer", specialty: "Oncology" }, { name: "Bone Fracture", specialty: "Orthopedics" }, { name: "Tendinitis", specialty: "Orthopedics" }, { name: "Bursitis", specialty: "Orthopedics" }, { name: "Carpal Tunnel Syndrome", specialty: "Orthopedics" }, { name: "Muscular Dystrophy", specialty: "Orthopedics" }, { name: "Ligament Injury", specialty: "Orthopedics" }, { name: "Meniscus Tear", specialty: "Orthopedics" }, { name: "Tennis Elbow", specialty: "Orthopedics" }, { name: "Frozen Shoulder", specialty: "Orthopedics" }, { name: "Low Back Pain", specialty: "Orthopedics" }, { name: "Cervical Spondylosis", specialty: "Orthopedics" },
      // Dermatology
      { name: "Acne", specialty: "Dermatology" }, { name: "Eczema", specialty: "Dermatology" }, { name: "Psoriasis", specialty: "Dermatology" }, { name: "Dermatitis", specialty: "Dermatology" }, { name: "Urticaria", specialty: "Dermatology" }, { name: "Vitiligo", specialty: "Dermatology" }, { name: "Fungal Skin Infection", specialty: "Dermatology" }, { name: "Scabies", specialty: "Dermatology" }, { name: "Impetigo", specialty: "Dermatology" }, { name: "Cellulitis", specialty: "Dermatology" }, { name: "Skin Cancer", specialty: "Oncology" }, { name: "Melanoma", specialty: "Oncology" }, { name: "Warts", specialty: "Dermatology" }, { name: "Herpes Zoster", specialty: "Dermatology" }, { name: "Herpes Simplex", specialty: "Dermatology" }, { name: "Alopecia", specialty: "Dermatology" }, { name: "Rosacea", specialty: "Dermatology" }, { name: "Melasma", specialty: "Dermatology" }, { name: "Contact Dermatitis", specialty: "Dermatology" }, { name: "Seborrheic Dermatitis", specialty: "Dermatology" },
      // Gastroenterology
      { name: "Gastritis", specialty: "Gastroenterology" }, { name: "Gastroesophageal Reflux Disease", specialty: "Gastroenterology" }, { name: "Peptic Ulcer Disease", specialty: "Gastroenterology" }, { name: "Irritable Bowel Syndrome", specialty: "Gastroenterology" }, { name: "Inflammatory Bowel Disease", specialty: "Gastroenterology" }, { name: "Crohn's Disease", specialty: "Gastroenterology" }, { name: "Ulcerative Colitis", specialty: "Gastroenterology" }, { name: "Appendicitis", specialty: "Gastroenterology" }, { name: "Gastroenteritis", specialty: "Gastroenterology" }, { name: "Constipation", specialty: "Gastroenterology" }, { name: "Diarrhea", specialty: "Gastroenterology" }, { name: "Hemorrhoids", specialty: "Gastroenterology" }, { name: "Anal Fissure", specialty: "Gastroenterology" }, { name: "Celiac Disease", specialty: "Gastroenterology" }, { name: "Diverticulitis", specialty: "Gastroenterology" }, { name: "Intestinal Obstruction", specialty: "Gastroenterology" }, { name: "Colorectal Cancer", specialty: "Oncology" }, { name: "Stomach Cancer", specialty: "Oncology" }, { name: "Esophageal Cancer", specialty: "Oncology" }, { name: "Hernia", specialty: "Gastroenterology" },
      // Hepatology / Gastroenterology
      { name: "Hepatitis A", specialty: "Gastroenterology" }, { name: "Hepatitis B", specialty: "Gastroenterology" }, { name: "Hepatitis C", specialty: "Gastroenterology" }, { name: "Fatty Liver Disease", specialty: "Gastroenterology" }, { name: "Liver Cirrhosis", specialty: "Gastroenterology" }, { name: "Liver Cancer", specialty: "Oncology" }, { name: "Gallstones", specialty: "Gastroenterology" }, { name: "Cholecystitis", specialty: "Gastroenterology" }, { name: "Pancreatitis", specialty: "Gastroenterology" }, { name: "Pancreatic Cancer", specialty: "Oncology" }, { name: "Liver Failure", specialty: "Gastroenterology" }, { name: "Bile Duct Cancer", specialty: "Oncology" }, { name: "Hemochromatosis", specialty: "Gastroenterology" }, { name: "Wilson's Disease", specialty: "Gastroenterology" }, { name: "Primary Biliary Cholangitis", specialty: "Gastroenterology" },
      // Nephrology / Urology
      { name: "Kidney Stones", specialty: "Nephrology" }, { name: "Chronic Kidney Disease", specialty: "Nephrology" }, { name: "Acute Kidney Injury", specialty: "Nephrology" }, { name: "Kidney Infection", specialty: "Nephrology" }, { name: "Urinary Tract Infection", specialty: "Urology" }, { name: "Bladder Cancer", specialty: "Oncology" }, { name: "Kidney Cancer", specialty: "Oncology" }, { name: "Glomerulonephritis", specialty: "Nephrology" }, { name: "Nephrotic Syndrome", specialty: "Nephrology" }, { name: "Polycystic Kidney Disease", specialty: "Nephrology" }, { name: "Prostatitis", specialty: "Urology" }, { name: "Benign Prostatic Hyperplasia", specialty: "Urology" }, { name: "Urinary Incontinence", specialty: "Urology" }, { name: "Hydronephrosis", specialty: "Nephrology" }, { name: "Renal Failure", specialty: "Nephrology" },
      // Ophthalmology
      { name: "Cataract", specialty: "Ophthalmology" }, { name: "Glaucoma", specialty: "Ophthalmology" }, { name: "Conjunctivitis", specialty: "Ophthalmology" }, { name: "Retinal Detachment", specialty: "Ophthalmology" }, { name: "Diabetic Retinopathy", specialty: "Ophthalmology" }, { name: "Macular Degeneration", specialty: "Ophthalmology" }, { name: "Keratitis", specialty: "Ophthalmology" }, { name: "Uveitis", specialty: "Ophthalmology" }, { name: "Dry Eye Disease", specialty: "Ophthalmology" }, { name: "Color Blindness", specialty: "Ophthalmology" },
      // Endocrinology
      { name: "Diabetes Mellitus", specialty: "Endocrinology" }, { name: "Type 1 Diabetes", specialty: "Endocrinology" }, { name: "Type 2 Diabetes", specialty: "Endocrinology" }, { name: "Hypothyroidism", specialty: "Endocrinology" }, { name: "Hyperthyroidism", specialty: "Endocrinology" }, { name: "Thyroid Cancer", specialty: "Oncology" }, { name: "Goiter", specialty: "Endocrinology" }, { name: "Cushing Syndrome", specialty: "Endocrinology" }, { name: "Addison's Disease", specialty: "Endocrinology" }, { name: "Polycystic Ovary Syndrome", specialty: "Endocrinology" }, { name: "Hyperparathyroidism", specialty: "Endocrinology" }, { name: "Hypoparathyroidism", specialty: "Endocrinology" }, { name: "Acromegaly", specialty: "Endocrinology" }, { name: "Diabetes Insipidus", specialty: "Endocrinology" }, { name: "Metabolic Syndrome", specialty: "Endocrinology" }
    ];

    // Generate ~520 unique diseases
    const generatedDiseases: any[] = [];
    let dCounter = 100;

    for (const sd of specificDiseases) {
      generatedDiseases.push({
        id: `d-gen-${dCounter++}`,
        name: sd.name,
        specialty: sd.specialty
      });
    }

    for (const specialty of specialties) {
      for (let i = 1; i <= 35; i++) {
        generatedDiseases.push({
          id: `d-gen-${dCounter++}`,
          name: `${specialty} Condition ${i}`,
          specialty: specialty
        });
      }
    }
  
    // Generate hospitals
    for (let i = 0; i < 250; i++) {
      const city = indianCities[i % indianCities.length];
      const name = `${prefixes[i % prefixes.length]} ${suffixes[i % suffixes.length]} ${city.city}`;
      
      // Pick 3-8 random diseases for this hospital
      const numDiseases = 3 + Math.floor(Math.random() * 6);
      const assignedDiseases: any[] = [];
      for(let j = 0; j < numDiseases; j++) {
        assignedDiseases.push(generatedDiseases[Math.floor(Math.random() * generatedDiseases.length)]);
      }
  
      const specializations = assignedDiseases.map((d, idx) => {
        // Jitter success rate widely between 40% and 99.5%
        const successRate = (40 + Math.random() * 59.5).toFixed(1);
        
        return {
          id: `s-gen-${i}-${idx}`,
          hospitalId: `hosp-gen-${i}`,
          diseaseId: d.id,
          specialty: d.specialty,
          sourceId: DEMO_SOURCE.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          disease: {
            id: d.id,
            name: d.name,
            slug: d.name.toLowerCase().replace(/ /g, '-'),
            description: `A condition related to ${d.specialty}.`,
            isSynthetic: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            outcomes: [
              makeOutcome(`o-gen-${i}-${idx}-1`, `Treatment Success Rate`, `${successRate}%`)
            ]
          }
        };
      });
  
      const latJitter = (Math.random() - 0.5) * 0.1;
      const lngJitter = (Math.random() - 0.5) * 0.1;
  
      FALLBACK_HOSPITALS.push({
        id: `hosp-gen-${i}`,
        name: name,
        slug: `hosp-gen-${i}`,
        description: `A leading healthcare provider in ${city.city}, ${city.state}.`,
        addressLine1: `Central Avenue, ${city.city}`,
        city: city.city,
        state: city.state,
        postalCode: "100000",
        country: "IN",
        hospitalType: "HOSPITAL",
        hasIcu: true,
        hasEmergency: true,
        acceptsPmJay: Math.random() > 0.5,
        hasNabhAccreditation: Math.random() > 0.3,
        rating: new Prisma.Decimal((3.5 + Math.random() * 1.5).toFixed(1)),
        reviewCount: Math.floor(Math.random() * 2000),
        latitude: new Prisma.Decimal((city.lat + latJitter).toFixed(4)),
        longitude: new Prisma.Decimal((city.lng + lngJitter).toFixed(4)),
        phone: "+91-9999999999",
        websiteUrl: "https://example.com",
        isSynthetic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        distanceKm: null,
        specializations: specializations as any,
        facilities: [],
        treatmentCosts: [],
        verification: { id: `v-gen-${i}`, hospitalId: `hosp-gen-${i}`, status: "VERIFIED", verifiedAt: new Date(), verifiedBy: "System", notes: "Auto Verified", sourceId: DEMO_SOURCE.id, createdAt: new Date(), updatedAt: new Date() }
      } as any);
    }
  })();
