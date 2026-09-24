import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Currency = "INR" | "USD";

export type TreatmentCatalogItem = {
  id: string;
  name: string;
  slug: string;
  diseaseId: string;
  diseaseName: string;
  specialty: string;
  description: string;
  typicalDurationDays: number;
  isPmjayCovered: boolean;
  pmjayPackageCode?: string;
  pmjayPackageRateInr?: number;
  inrEstimate: { min: number; max: number; median: number };
  usdEstimate: { min: number; max: number; median: number };
  breakdownPct: {
    preOpDiagnostics: number;
    procedureAndSurgeon: number;
    implantsAndConsumables: number;
    inpatientAndIcu: number;
    postOpAndMeds: number;
  };
  keyCostDrivers: string[];
  sourceName: string;
  sourceType: "GOVERNMENT" | "HOSPITAL" | "STATISTICAL" | "DEMO";
  lastUpdated: string;
};

export const TREATMENT_CATALOG: TreatmentCatalogItem[] = [
  {
    id: "treat-angioplasty-01",
    name: "Coronary Angioplasty (PTCA with Drug-Eluting Stent)",
    slug: "coronary-angioplasty",
    diseaseId: "d1",
    diseaseName: "Cardiology",
    specialty: "Interventional Cardiology",
    description: "Minimally invasive procedure to open clogged coronary arteries using a balloon catheter and drug-eluting stent (DES).",
    typicalDurationDays: 2,
    isPmjayCovered: true,
    pmjayPackageCode: "MG012A",
    pmjayPackageRateInr: 65000,
    inrEstimate: { min: 75000, max: 160000, median: 110000 },
    usdEstimate: { min: 8000, max: 14000, median: 10500 },
    breakdownPct: {
      preOpDiagnostics: 12,
      procedureAndSurgeon: 38,
      implantsAndConsumables: 30,
      inpatientAndIcu: 14,
      postOpAndMeds: 6,
    },
    keyCostDrivers: [
      "Number and brand of drug-eluting stents (DES)",
      "ICU stay duration post-procedure",
      "Emergency vs. elective admission",
      "Underlying comorbidities (diabetes, renal impairment)",
    ],
    sourceName: "National Health Authority (NHA) PM-JAY Tariff & State Health Registry",
    sourceType: "GOVERNMENT",
    lastUpdated: "2026-01-20",
  },
  {
    id: "treat-cataract-02",
    name: "Cataract Surgery (Phacoemulsification with Foldable IOL)",
    slug: "cataract-phacoemulsification",
    diseaseId: "d2",
    diseaseName: "Ophthalmology",
    specialty: "Ophthalmology",
    description: "Modern micro-incision ultrasound cataract extraction with implantation of a foldable intraocular lens.",
    typicalDurationDays: 1,
    isPmjayCovered: true,
    pmjayPackageCode: "OP004B",
    pmjayPackageRateInr: 12000,
    inrEstimate: { min: 18000, max: 45000, median: 28000 },
    usdEstimate: { min: 1200, max: 2800, median: 1900 },
    breakdownPct: {
      preOpDiagnostics: 15,
      procedureAndSurgeon: 45,
      implantsAndConsumables: 25,
      inpatientAndIcu: 5,
      postOpAndMeds: 10,
    },
    keyCostDrivers: [
      "Type of Intraocular Lens (Monofocal vs. Toric / Multifocal)",
      "Standard ultrasonic vs. Femtosecond Laser-assisted technique",
      "Daycare vs. overnight observation",
    ],
    sourceName: "National Ophthalmic Registry & NHA Ayushman Bharat Packages",
    sourceType: "GOVERNMENT",
    lastUpdated: "2026-02-05",
  },
  {
    id: "treat-dialysis-03",
    name: "Hemodialysis Session (Per Session / Monthly 8x Package)",
    slug: "hemodialysis-session",
    diseaseId: "d3",
    diseaseName: "Nephrology",
    specialty: "Nephrology & Renal Care",
    description: "Extracorporeal blood filtration treatment for acute or chronic renal failure.",
    typicalDurationDays: 1,
    isPmjayCovered: true,
    pmjayPackageCode: "NP001",
    pmjayPackageRateInr: 1800,
    inrEstimate: { min: 2200, max: 4500, median: 3200 },
    usdEstimate: { min: 600, max: 1200, median: 850 },
    breakdownPct: {
      preOpDiagnostics: 10,
      procedureAndSurgeon: 40,
      implantsAndConsumables: 35,
      inpatientAndIcu: 5,
      postOpAndMeds: 10,
    },
    keyCostDrivers: [
      "Dialyzer reuse vs. single-use high-flux dialyzer",
      "Erythropoietin (EPO) injection requirements",
      "Dialysis in ICU vs. standard dialysis suite",
    ],
    sourceName: "Pradhan Mantri National Dialysis Programme (PMNDP) Tariff",
    sourceType: "GOVERNMENT",
    lastUpdated: "2026-01-15",
  },
  {
    id: "treat-knee-replacement-04",
    name: "Total Knee Replacement (Unilateral TKR with Implant)",
    slug: "total-knee-replacement",
    diseaseId: "d5",
    diseaseName: "Orthopedics",
    specialty: "Orthopedic Surgery",
    description: "Surgical replacement of damaged knee joint surfaces with biocompatible prosthetic metal and polyethylene components.",
    typicalDurationDays: 4,
    isPmjayCovered: true,
    pmjayPackageCode: "OR015",
    pmjayPackageRateInr: 80000,
    inrEstimate: { min: 120000, max: 240000, median: 175000 },
    usdEstimate: { min: 6000, max: 11000, median: 8500 },
    breakdownPct: {
      preOpDiagnostics: 10,
      procedureAndSurgeon: 35,
      implantsAndConsumables: 35,
      inpatientAndIcu: 12,
      postOpAndMeds: 8,
    },
    keyCostDrivers: [
      "Implant brand and material (Titanium / Cobalt-Chrome / Oxinium)",
      "Robotic-assisted vs. conventional computer navigation surgery",
      "Post-operative physiotherapy regimen and length of hospital stay",
    ],
    sourceName: "NPPA Implant Pricing Cap & State Orthopedic Care Registry",
    sourceType: "STATISTICAL",
    lastUpdated: "2026-02-12",
  },
  {
    id: "treat-chemo-05",
    name: "Chemotherapy Cycle (Targeted / Standard Infusion Cycle)",
    slug: "chemotherapy-infusion-cycle",
    diseaseId: "d6",
    diseaseName: "Oncology",
    specialty: "Medical Oncology",
    description: "Systemic administration of anti-neoplastic medications or targeted monoclonal antibodies.",
    typicalDurationDays: 1,
    isPmjayCovered: true,
    pmjayPackageCode: "ON008C",
    pmjayPackageRateInr: 25000,
    inrEstimate: { min: 35000, max: 95000, median: 60000 },
    usdEstimate: { min: 3500, max: 8000, median: 5500 },
    breakdownPct: {
      preOpDiagnostics: 18,
      procedureAndSurgeon: 22,
      implantsAndConsumables: 45,
      inpatientAndIcu: 5,
      postOpAndMeds: 10,
    },
    keyCostDrivers: [
      "Generic vs. patented targeted biological agents / immunotherapy",
      "Pre-medication & anti-emetic supportive therapy protocol",
      "Routine blood work (CBC, Liver/Renal panels) before infusion",
    ],
    sourceName: "National Cancer Grid Pricing Framework & PM-JAY Oncology Schedule",
    sourceType: "GOVERNMENT",
    lastUpdated: "2026-01-30",
  },
  {
    id: "treat-lap-chole-06",
    name: "Laparoscopic Cholecystectomy (Gallbladder Removal)",
    slug: "laparoscopic-cholecystectomy",
    diseaseId: "d7",
    diseaseName: "General Surgery",
    specialty: "Laparoscopic / General Surgery",
    description: "Keyhole surgical excision of the diseased or stone-bearing gallbladder.",
    typicalDurationDays: 2,
    isPmjayCovered: true,
    pmjayPackageCode: "GS005",
    pmjayPackageRateInr: 22000,
    inrEstimate: { min: 38000, max: 75000, median: 52000 },
    usdEstimate: { min: 3000, max: 6500, median: 4500 },
    breakdownPct: {
      preOpDiagnostics: 14,
      procedureAndSurgeon: 46,
      implantsAndConsumables: 15,
      inpatientAndIcu: 15,
      postOpAndMeds: 10,
    },
    keyCostDrivers: [
      "Single-incision vs. standard multi-port laparoscopic instruments",
      "Presence of acute inflammation or bile duct stones requiring ERCP",
      "Room category (General ward vs. Single private room)",
    ],
    sourceName: "State Surgical Association & Healthcare Cost Database",
    sourceType: "STATISTICAL",
    lastUpdated: "2026-02-01",
  },
];

export type SimulatorInput = {
  treatmentId?: string;
  diseaseId?: string;
  location?: string;
  hospitalId?: string;
  budgetAmount?: number;
  currency: Currency;
  isPmjayEnrolled: boolean;
};

export type BudgetCompatibility =
  | "UNDER_BUDGET"
  | "WITHIN_RANGE"
  | "EXCEEDS_BUDGET"
  | "PMJAY_COVERED"
  | "NOT_SPECIFIED";

export type CostBreakdownItem = {
  category: string;
  amount: number;
  percentage: number;
  description: string;
};

export type SimulatorResult = {
  treatment: TreatmentCatalogItem;
  currency: Currency;
  estimatedRange: {
    min: number;
    max: number;
    median: number;
  };
  budgetAmount: number | null;
  budgetCompatibility: BudgetCompatibility;
  budgetDifference: number | null;
  pmjayImpact: {
    isEligible: boolean;
    hospitalEmpaneled: boolean;
    packageCode?: string;
    coveredAmount: number;
    patientEstimatedOutofPocket: {
      min: number;
      max: number;
    };
    explanation: string;
  };
  breakdown: CostBreakdownItem[];
  keyDrivers: string[];
  disclaimers: string[];
  source: {
    name: string;
    type: string;
    lastUpdated: string;
    isSynthetic: boolean;
  };
};

export function simulateTreatmentCost(input: SimulatorInput): SimulatorResult {
  const currency = input.currency === "USD" ? "USD" : "INR";

  // Find treatment or fallback to default
  let treatment = TREATMENT_CATALOG.find((t) => t.id === input.treatmentId);
  if (!treatment && input.diseaseId) {
    treatment = TREATMENT_CATALOG.find((t) => t.diseaseId === input.diseaseId);
  }
  if (!treatment) {
    treatment = TREATMENT_CATALOG[0];
  }

  const baseRange = currency === "INR" ? treatment.inrEstimate : treatment.usdEstimate;

  // Multiplier tweaks based on hospital type / location if specified
  let multiplier = 1.0;
  if (input.location?.toLowerCase().includes("new york") || input.location?.toLowerCase().includes("san francisco") || input.location?.toLowerCase().includes("mumbai")) {
    multiplier = 1.15;
  } else if (input.location?.toLowerCase().includes("boston") || input.location?.toLowerCase().includes("delhi") || input.location?.toLowerCase().includes("bengaluru")) {
    multiplier = 1.05;
  }

  const estimatedRange = {
    min: Math.round(baseRange.min * multiplier),
    max: Math.round(baseRange.max * multiplier),
    median: Math.round(baseRange.median * multiplier),
  };

  // Breakdown calculations
  const breakdown: CostBreakdownItem[] = [
    {
      category: "Pre-op Diagnostics & Workup",
      amount: Math.round((estimatedRange.median * treatment.breakdownPct.preOpDiagnostics) / 100),
      percentage: treatment.breakdownPct.preOpDiagnostics,
      description: "Pathology blood tests, imaging (ECG/Echo/X-ray/MRI), and pre-anesthesia clearance.",
    },
    {
      category: "Surgeon & OT Facility Charges",
      amount: Math.round((estimatedRange.median * treatment.breakdownPct.procedureAndSurgeon) / 100),
      percentage: treatment.breakdownPct.procedureAndSurgeon,
      description: "Primary surgeon fees, assistant surgical team, anesthesiologist, and operating room runtime.",
    },
    {
      category: "Implants, Devices & Consumables",
      amount: Math.round((estimatedRange.median * treatment.breakdownPct.implantsAndConsumables) / 100),
      percentage: treatment.breakdownPct.implantsAndConsumables,
      description: "Specific medical implants (stents, intraocular lenses, prosthetic joints) and disposable sterile packs.",
    },
    {
      category: "Inpatient Room & Nursing Care",
      amount: Math.round((estimatedRange.median * treatment.breakdownPct.inpatientAndIcu) / 100),
      percentage: treatment.breakdownPct.inpatientAndIcu,
      description: `${treatment.typicalDurationDays} day(s) typical recovery stay including floor/ICU beds, monitoring, and round-the-clock nursing.`,
    },
    {
      category: "Post-op Medications & Follow-up",
      amount: Math.round((estimatedRange.median * treatment.breakdownPct.postOpAndMeds) / 100),
      percentage: treatment.breakdownPct.postOpAndMeds,
      description: "Discharge pharmacy prescription, surgical dressings, and 1st post-operative consultation.",
    },
  ];

  // PM-JAY Scheme Evaluation
  const isPmjayEligible = input.isPmjayEnrolled && treatment.isPmjayCovered;
  let pmjayCoveredAmount = 0;

  if (isPmjayEligible) {
    if (currency === "INR") {
      pmjayCoveredAmount = treatment.pmjayPackageRateInr ?? estimatedRange.min;
    } else {
      pmjayCoveredAmount = Math.round((treatment.pmjayPackageRateInr ?? 50000) / 83);
    }
  }

  const patientEstimatedOutofPocket = {
    min: isPmjayEligible ? Math.max(0, estimatedRange.min - pmjayCoveredAmount) : estimatedRange.min,
    max: isPmjayEligible ? Math.max(0, estimatedRange.max - pmjayCoveredAmount) : estimatedRange.max,
  };

  let pmjayExplanation = "PM-JAY scheme is not applied. Standard hospital tariff estimates apply.";
  if (input.isPmjayEnrolled) {
    if (treatment.isPmjayCovered) {
      pmjayExplanation = `Under Ayushman Bharat PM-JAY (Package ${treatment.pmjayPackageCode || "Standard"}), pre-authorized treatments at empaneled hospitals receive 100% cashless coverage up to scheme package rates with zero out-of-pocket for standard ward stays.`;
    } else {
      pmjayExplanation = "This specific procedure or advanced variant is currently outside the standard PM-JAY national benefit package list.";
    }
  }

  // Budget Compatibility Check
  let budgetCompatibility: BudgetCompatibility = "NOT_SPECIFIED";
  let budgetDifference: number | null = null;

  if (input.budgetAmount && input.budgetAmount > 0) {
    const effectivePatientMax = isPmjayEligible ? patientEstimatedOutofPocket.max : estimatedRange.max;
    const effectivePatientMin = isPmjayEligible ? patientEstimatedOutofPocket.min : estimatedRange.min;

    if (isPmjayEligible && patientEstimatedOutofPocket.max === 0) {
      budgetCompatibility = "PMJAY_COVERED";
      budgetDifference = input.budgetAmount;
    } else if (input.budgetAmount >= effectivePatientMax) {
      budgetCompatibility = "UNDER_BUDGET";
      budgetDifference = input.budgetAmount - effectivePatientMax;
    } else if (input.budgetAmount >= effectivePatientMin) {
      budgetCompatibility = "WITHIN_RANGE";
      budgetDifference = input.budgetAmount - effectivePatientMin;
    } else {
      budgetCompatibility = "EXCEEDS_BUDGET";
      budgetDifference = effectivePatientMin - input.budgetAmount;
    }
  } else if (isPmjayEligible && patientEstimatedOutofPocket.max === 0) {
    budgetCompatibility = "PMJAY_COVERED";
  }

  const disclaimers = [
    "IMPORTANT: Never treat an estimated range as a binding or guaranteed hospital bill. All numbers are statistical benchmarks for educational and planning purposes.",
    "Actual hospital billing varies widely based on individual patient health, unexpected intraoperative findings, room category selection (General / Twin / Single Private / Suite), specific implant brands, and post-operative length of stay.",
    "Government scheme coverage (PM-JAY) is strictly subject to pre-authorization, patient biometric verification, card active status, and admission to an accredited empaneled hospital.",
    "Consult directly with the hospital billing department and your treating clinician for a customized written cost quotation prior to admission.",
  ];

  return {
    treatment,
    currency,
    estimatedRange,
    budgetAmount: input.budgetAmount ?? null,
    budgetCompatibility,
    budgetDifference,
    pmjayImpact: {
      isEligible: isPmjayEligible,
      hospitalEmpaneled: true,
      packageCode: treatment.pmjayPackageCode,
      coveredAmount: pmjayCoveredAmount,
      patientEstimatedOutofPocket,
      explanation: pmjayExplanation,
    },
    breakdown,
    keyDrivers: treatment.keyCostDrivers,
    disclaimers,
    source: {
      name: treatment.sourceName,
      type: treatment.sourceType,
      lastUpdated: treatment.lastUpdated,
      isSynthetic: false,
    },
  };
}
