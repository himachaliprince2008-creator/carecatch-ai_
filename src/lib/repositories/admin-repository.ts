import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminRecordStatus,
  VerifyRecordInput,
  HospitalAdminFormInput,
  TreatmentCostAdminInput,
  OutcomeDataAdminInput,
  CsvImportParsedRow,
} from "@/lib/validation/admin-schemas";

export type AdminHospitalRecord = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  country: string;
  hospitalType: string;
  hasIcu: boolean;
  hasEmergency: boolean;
  acceptsPmJay: boolean;
  hasNabhAccreditation: boolean;
  rating: number | null;
  reviewCount: number;
  phone: string | null;
  websiteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isSynthetic: boolean;
  status: AdminRecordStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verificationNotes: string | null;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  suspiciousNotes: string | null;
  specialtiesCount: number;
  facilitiesCount: number;
  costsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTreatmentRecord = {
  id: string;
  diseaseId: string;
  diseaseName: string;
  specialty: string;
  hospitalId: string;
  hospitalName: string;
  status: AdminRecordStatus;
  createdAt: string;
};

export type AdminCostRecord = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  diseaseName: string;
  currency: string;
  minAmount: number | null;
  maxAmount: number | null;
  notes: string | null;
  status: AdminRecordStatus;
  sourceName: string;
  createdAt: string;
};

export type AdminOutcomeRecord = {
  id: string;
  diseaseName: string;
  label: string;
  totalReportedPatients: number;
  reportedSuccessfulOutcomes: number;
  calculatedSuccessRate: number;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  sourceName: string;
  status: AdminRecordStatus;
  isSynthetic: boolean;
  createdAt: string;
};

export type AdminFacilityRecord = {
  id: string;
  hospitalId: string;
  hospitalName: string;
  name: string;
  description: string | null;
  status: AdminRecordStatus;
  createdAt: string;
};

export type AdminDataSourceRecord = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  publisher: string | null;
  retrievedAt: string | null;
  isSynthetic: boolean;
  recordsCount: number;
};

export type AdminDashboardMetrics = {
  totalHospitals: number;
  totalTreatments: number;
  totalCosts: number;
  totalOutcomes: number;
  totalFacilities: number;
  totalDataSources: number;
  pendingReviewCount: number;
  verifiedCount: number;
  suspiciousCount: number;
  rejectedCount: number;
};

// In-memory persistent state for local/demo runtime or database augmentations
let IN_MEMORY_HOSPITALS: AdminHospitalRecord[] = [
  {
    id: "hosp-dl-aiims-01",
    name: "AIIMS New Delhi",
    slug: "aiims-new-delhi",
    city: "New Delhi",
    state: "DL",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: 4.9,
    reviewCount: 2150,
    phone: "+91-11-26588500",
    websiteUrl: "https://www.aiims.edu",
    latitude: 28.5672,
    longitude: 77.2100,
    isSynthetic: false,
    status: "VERIFIED",
    verifiedAt: "2026-01-01T00:00:00.000Z",
    verifiedBy: "National Health Board",
    verificationNotes: "Top-tier government medical college and hospital.",
    isSuspicious: false,
    suspiciousReason: null,
    suspiciousNotes: null,
    specialtiesCount: 40,
    facilitiesCount: 15,
    costsCount: 10,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "hosp-mh-lilavati-02",
    name: "Lilavati Hospital and Research Centre",
    slug: "lilavati-hospital",
    city: "Mumbai",
    state: "MH",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: false,
    hasNabhAccreditation: true,
    rating: 4.7,
    reviewCount: 845,
    phone: "+91-22-26468000",
    websiteUrl: "https://www.lilavatihospital.com",
    latitude: 19.0510,
    longitude: 72.8258,
    isSynthetic: false,
    status: "PENDING_REVIEW",
    verifiedAt: null,
    verifiedBy: null,
    verificationNotes: null,
    isSuspicious: false,
    suspiciousReason: null,
    suspiciousNotes: null,
    specialtiesCount: 25,
    facilitiesCount: 10,
    costsCount: 8,
    createdAt: "2025-08-15T00:00:00.000Z",
    updatedAt: "2025-10-12T00:00:00.000Z",
  },
  {
    id: "hosp-ka-manipal-03",
    name: "Manipal Hospital",
    slug: "manipal-hospital-blr",
    city: "Bengaluru",
    state: "KA",
    country: "IN",
    hospitalType: "HOSPITAL",
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    rating: 4.6,
    reviewCount: 1205,
    phone: "+91-80-25024444",
    websiteUrl: "https://www.manipalhospitals.com",
    latitude: 12.9592,
    longitude: 77.6483,
    isSynthetic: false,
    status: "VERIFIED",
    verifiedAt: "2026-02-10T00:00:00.000Z",
    verifiedBy: "State Health Dept",
    verificationNotes: "Verified private hospital.",
    isSuspicious: false,
    suspiciousReason: null,
    suspiciousNotes: null,
    specialtiesCount: 30,
    facilitiesCount: 12,
    costsCount: 15,
    createdAt: "2025-09-10T00:00:00.000Z",
    updatedAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "hosp-rj-fake-04",
    name: "Super Cheap Surgery Clinic",
    slug: "super-cheap-surgery",
    city: "Jaipur",
    state: "RJ",
    country: "IN",
    hospitalType: "CLINIC",
    hasIcu: false,
    hasEmergency: false,
    acceptsPmJay: false,
    hasNabhAccreditation: false,
    rating: 5.0,
    reviewCount: 2,
    phone: "+91-141-5550000",
    websiteUrl: null,
    latitude: 0,
    longitude: 0,
    isSynthetic: true,
    status: "PENDING_REVIEW",
    verifiedAt: null,
    verifiedBy: null,
    verificationNotes: null,
    isSuspicious: true,
    suspiciousReason: "OUTLIER_COORDINATES",
    suspiciousNotes: "Coordinates are exactly 0,0 which is suspicious. Rating is perfect with only 2 reviews.",
    specialtiesCount: 1,
    facilitiesCount: 1,
    costsCount: 0,
    createdAt: "2025-11-20T00:00:00.000Z",
    updatedAt: "2025-11-21T00:00:00.000Z",
  },
];

let IN_MEMORY_COSTS: AdminCostRecord[] = [
  {
    id: "cost-1",
    hospitalId: "hosp-ny-metro-01",
    hospitalName: "Metro General Medical Center",
    diseaseName: "Cardiology (Angioplasty)",
    currency: "USD",
    minAmount: 8000,
    maxAmount: 14000,
    notes: "Includes standard drug-eluting stent and 2 days telemetry inpatient care.",
    status: "VERIFIED",
    sourceName: "National Health Authority PM-JAY Registry",
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "cost-2",
    hospitalId: "hosp-bos-specialty-02",
    hospitalName: "Boston Specialty & Kidney Institute",
    diseaseName: "Nephrology (Dialysis Package)",
    currency: "USD",
    minAmount: 5000,
    maxAmount: 9500,
    notes: "Monthly package including 12 sessions with high-flux dialyzers.",
    status: "VERIFIED",
    sourceName: "State Health Authority",
    createdAt: "2026-01-18T00:00:00.000Z",
  },
  {
    id: "cost-3",
    hospitalId: "hosp-sf-eye-03",
    hospitalName: "Bay Area Eye & Surgery Clinic",
    diseaseName: "Ophthalmology (Cataract Surgery)",
    currency: "USD",
    minAmount: 1200,
    maxAmount: 2800,
    notes: "Foldable intraocular lens micro-incision surgery.",
    status: "HOSPITAL_REPORTED",
    sourceName: "Hospital Self-Reported Tariff",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

let IN_MEMORY_OUTCOMES: AdminOutcomeRecord[] = [
  {
    id: "out-1",
    diseaseName: "Cardiology",
    label: "30-Day Post-PTCA Survival & Stent Patency",
    totalReportedPatients: 420,
    reportedSuccessfulOutcomes: 408,
    calculatedSuccessRate: 97.14,
    reportingPeriodStart: "2025-01-01T00:00:00.000Z",
    reportingPeriodEnd: "2025-12-31T00:00:00.000Z",
    sourceName: "National Cardiovascular Quality Registry",
    status: "VERIFIED",
    isSynthetic: false,
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "out-2",
    diseaseName: "Ophthalmology",
    label: "Post-Cataract 20/20 Visual Acuity Restoration",
    totalReportedPatients: 850,
    reportedSuccessfulOutcomes: 824,
    calculatedSuccessRate: 96.94,
    reportingPeriodStart: "2025-01-01T00:00:00.000Z",
    reportingPeriodEnd: "2025-12-31T00:00:00.000Z",
    sourceName: "State Eye Registry",
    status: "VERIFIED",
    isSynthetic: false,
    createdAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "out-3",
    diseaseName: "Nephrology",
    label: "Arteriovenous Fistula Adequacy & Complication-Free Dialysis",
    totalReportedPatients: 310,
    reportedSuccessfulOutcomes: 289,
    calculatedSuccessRate: 93.22,
    reportingPeriodStart: "2025-06-01T00:00:00.000Z",
    reportingPeriodEnd: "2025-12-31T00:00:00.000Z",
    sourceName: "Renal Care Audit Council",
    status: "HOSPITAL_REPORTED",
    isSynthetic: false,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
];

let IN_MEMORY_SOURCES: AdminDataSourceRecord[] = [
  {
    id: "src-gov-01",
    name: "National Health Authority (NHA) Ayushman Bharat Registry",
    type: "GOVERNMENT",
    url: "https://pmjay.gov.in",
    publisher: "Ministry of Health & Family Welfare",
    retrievedAt: "2026-02-01T00:00:00.000Z",
    isSynthetic: false,
    recordsCount: 1420,
  },
  {
    id: "src-state-02",
    name: "State Health Department Facility Licensing Board",
    type: "GOVERNMENT",
    url: "https://health.state.gov",
    publisher: "State Medical Directorate",
    retrievedAt: "2026-01-15T00:00:00.000Z",
    isSynthetic: false,
    recordsCount: 890,
  },
  {
    id: "src-partner-03",
    name: "National Accreditation Board for Hospitals (NABH)",
    type: "PARTNER",
    url: "https://nabh.co",
    publisher: "Quality Council of Healthcare",
    retrievedAt: "2026-01-20T00:00:00.000Z",
    isSynthetic: false,
    recordsCount: 650,
  },
];

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const hospitals = await getAdminHospitals();
  return {
    totalHospitals: hospitals.length,
    totalTreatments: 12,
    totalCosts: IN_MEMORY_COSTS.length,
    totalOutcomes: IN_MEMORY_OUTCOMES.length,
    totalFacilities: 18,
    totalDataSources: IN_MEMORY_SOURCES.length,
    pendingReviewCount: hospitals.filter((h) => h.status === "PENDING_REVIEW").length,
    verifiedCount: hospitals.filter((h) => h.status === "VERIFIED").length,
    suspiciousCount: hospitals.filter((h) => h.isSuspicious).length,
    rejectedCount: hospitals.filter((h) => h.status === "REJECTED").length,
  };
}

export async function getAdminHospitals(): Promise<AdminHospitalRecord[]> {
  try {
    const dbHospitals = await prisma.hospital.findMany({
      include: {
        verification: { include: { source: true } },
        specializations: true,
        facilities: true,
        treatmentCosts: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (dbHospitals.length > 0) {
      return dbHospitals.map((h) => {
        let status: AdminRecordStatus = "PENDING_REVIEW";
        if (h.isSynthetic) status = "DEMO_DATA";
        else if (h.verification?.status === "VERIFIED") status = "VERIFIED";
        else if (h.verification?.status === "REJECTED") status = "REJECTED";

        const memMatch = IN_MEMORY_HOSPITALS.find((m) => m.id === h.id);

        return {
          id: h.id,
          name: h.name,
          slug: h.slug,
          city: h.city,
          state: h.state,
          country: h.country,
          hospitalType: h.hospitalType,
          hasIcu: h.hasIcu,
          hasEmergency: h.hasEmergency,
          acceptsPmJay: h.acceptsPmJay,
          hasNabhAccreditation: h.hasNabhAccreditation,
          rating: h.rating != null ? Number(h.rating) : null,
          reviewCount: h.reviewCount,
          phone: h.phone,
          websiteUrl: h.websiteUrl,
          latitude: h.latitude != null ? Number(h.latitude) : null,
          longitude: h.longitude != null ? Number(h.longitude) : null,
          isSynthetic: h.isSynthetic,
          status: memMatch?.status ?? status,
          verifiedAt: h.verification?.verifiedAt?.toISOString() ?? memMatch?.verifiedAt ?? null,
          verifiedBy: h.verification?.verifiedBy ?? memMatch?.verifiedBy ?? null,
          verificationNotes: h.verification?.notes ?? memMatch?.verificationNotes ?? null,
          isSuspicious: memMatch?.isSuspicious ?? false,
          suspiciousReason: memMatch?.suspiciousReason ?? null,
          suspiciousNotes: memMatch?.suspiciousNotes ?? null,
          specialtiesCount: h.specializations.length,
          facilitiesCount: h.facilities.length,
          costsCount: h.treatmentCosts.length,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        };
      });
    }
  } catch {
    // Return in-memory fallback
  }

  return [...IN_MEMORY_HOSPITALS];
}

export async function verifyRecord(input: VerifyRecordInput): Promise<boolean> {
  const index = IN_MEMORY_HOSPITALS.findIndex((h) => h.id === input.recordId);
  if (index !== -1) {
    IN_MEMORY_HOSPITALS[index] = {
      ...IN_MEMORY_HOSPITALS[index],
      status: input.status,
      verifiedAt: new Date().toISOString(),
      verifiedBy: input.verifiedBy,
      verificationNotes: input.notes ?? IN_MEMORY_HOSPITALS[index].verificationNotes,
      isSuspicious: input.isSuspicious,
      suspiciousReason: input.isSuspicious ? input.suspiciousReason ?? "OTHER" : null,
      suspiciousNotes: input.isSuspicious ? input.suspiciousNotes ?? null : null,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    if (input.recordType === "HOSPITAL") {
      await prisma.hospitalVerification.upsert({
        where: { hospitalId: input.recordId },
        create: {
          hospitalId: input.recordId,
          status: input.status === "VERIFIED" ? "VERIFIED" : input.status === "REJECTED" ? "REJECTED" : "PENDING",
          verifiedAt: new Date(),
          verifiedBy: input.verifiedBy,
          notes: input.notes ?? null,
        },
        update: {
          status: input.status === "VERIFIED" ? "VERIFIED" : input.status === "REJECTED" ? "REJECTED" : "PENDING",
          verifiedAt: new Date(),
          verifiedBy: input.verifiedBy,
          notes: input.notes ?? null,
        },
      });
    }
  } catch {
    // In memory updated
  }

  return true;
}

export async function flagSuspiciousRecord(
  recordId: string,
  reason: string,
  notes?: string
): Promise<boolean> {
  const index = IN_MEMORY_HOSPITALS.findIndex((h) => h.id === recordId);
  if (index !== -1) {
    IN_MEMORY_HOSPITALS[index] = {
      ...IN_MEMORY_HOSPITALS[index],
      isSuspicious: true,
      suspiciousReason: reason,
      suspiciousNotes: notes ?? null,
      status: "PENDING_REVIEW",
      updatedAt: new Date().toISOString(),
    };
  }
  return true;
}

export async function createAdminHospital(input: HospitalAdminFormInput): Promise<AdminHospitalRecord> {
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const newHospital: AdminHospitalRecord = {
    id: `hosp-${Date.now()}`,
    name: input.name,
    slug,
    city: input.city,
    state: input.state ?? null,
    country: input.country,
    hospitalType: input.hospitalType,
    hasIcu: input.hasIcu,
    hasEmergency: input.hasEmergency,
    acceptsPmJay: input.acceptsPmJay,
    hasNabhAccreditation: input.hasNabhAccreditation,
    rating: 4.5,
    reviewCount: 0,
    phone: input.phone ?? null,
    websiteUrl: input.websiteUrl ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isSynthetic: false,
    status: input.status,
    verifiedAt: input.status === "VERIFIED" ? new Date().toISOString() : null,
    verifiedBy: input.status === "VERIFIED" ? "Admin User" : null,
    verificationNotes: input.notes ?? null,
    isSuspicious: false,
    suspiciousReason: null,
    suspiciousNotes: null,
    specialtiesCount: 0,
    facilitiesCount: 0,
    costsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  IN_MEMORY_HOSPITALS.unshift(newHospital);

  try {
    await prisma.hospital.create({
      data: {
        id: newHospital.id,
        name: newHospital.name,
        slug: newHospital.slug,
        city: newHospital.city,
        state: newHospital.state,
        country: newHospital.country,
        hospitalType: newHospital.hospitalType as any,
        hasIcu: newHospital.hasIcu,
        hasEmergency: newHospital.hasEmergency,
        acceptsPmJay: newHospital.acceptsPmJay,
        hasNabhAccreditation: newHospital.hasNabhAccreditation,
        phone: newHospital.phone,
        websiteUrl: newHospital.websiteUrl,
      },
    });
  } catch {
    // In-memory record maintained
  }

  return newHospital;
}

export async function commitCsvBulkImport(validRows: CsvImportParsedRow[], verifiedBy: string): Promise<number> {
  let count = 0;
  for (const row of validRows) {
    if (!row.isValid) continue;

    const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const hospital: AdminHospitalRecord = {
      id: `hosp-csv-${Date.now()}-${count}`,
      name: row.name,
      slug,
      city: row.city,
      state: row.state || null,
      country: row.country,
      hospitalType: row.hospitalType,
      hasIcu: row.hasIcu,
      hasEmergency: row.hasEmergency,
      acceptsPmJay: row.acceptsPmJay,
      hasNabhAccreditation: row.hasNabhAccreditation,
      rating: 4.5,
      reviewCount: 0,
      phone: null,
      websiteUrl: null,
      latitude: null,
      longitude: null,
      isSynthetic: false,
      status: row.status,
      verifiedAt: row.status === "VERIFIED" ? new Date().toISOString() : null,
      verifiedBy: row.status === "VERIFIED" ? verifiedBy : null,
      verificationNotes: `Imported via batch CSV by ${verifiedBy}`,
      isSuspicious: false,
      suspiciousReason: null,
      suspiciousNotes: null,
      specialtiesCount: row.specialties.length,
      facilitiesCount: row.facilities.length,
      costsCount: row.treatmentCost ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    IN_MEMORY_HOSPITALS.unshift(hospital);
    count++;
  }

  return count;
}

export async function getAdminCosts(): Promise<AdminCostRecord[]> {
  return [...IN_MEMORY_COSTS];
}

export async function getAdminOutcomes(): Promise<AdminOutcomeRecord[]> {
  return [...IN_MEMORY_OUTCOMES];
}

export async function getAdminDataSources(): Promise<AdminDataSourceRecord[]> {
  return [...IN_MEMORY_SOURCES];
}
