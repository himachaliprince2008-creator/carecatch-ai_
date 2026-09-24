"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  BadgeDollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Coins,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  Percent,
  PieChart,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import {
  TREATMENT_CATALOG,
  simulateTreatmentCost,
  type Currency,
  type SimulatorResult,
  type TreatmentCatalogItem,
} from "@/lib/services/cost-simulator-service";
import type { HospitalSearchResult } from "@/lib/repositories/hospital-repository";

type CostSimulatorProps = {
  initialSimulation: SimulatorResult;
  availableHospitals: HospitalSearchResult[];
};

const LOCATIONS = [
  "All Locations",
  "New York, NY",
  "Boston, MA",
  "San Francisco, CA",
  "Chicago, IL",
  "Los Angeles, CA",
  "New Delhi",
  "Mumbai",
  "Bengaluru",
];

const PRESETS = [
  {
    id: "treat-angioplasty-01",
    label: "Angioplasty (PM-JAY)",
    icon: Activity,
    pmjay: true,
    currency: "INR" as Currency,
    budget: 150000,
  },
  {
    id: "treat-cataract-02",
    label: "Cataract Surgery",
    icon: Stethoscope,
    pmjay: false,
    currency: "INR" as Currency,
    budget: 35000,
  },
  {
    id: "treat-knee-replacement-04",
    label: "Total Knee Replacement",
    icon: Layers,
    pmjay: true,
    currency: "INR" as Currency,
    budget: 200000,
  },
  {
    id: "treat-dialysis-03",
    label: "Hemodialysis (Per Session)",
    icon: RefreshCw,
    pmjay: true,
    currency: "INR" as Currency,
    budget: 3000,
  },
  {
    id: "treat-chemo-05",
    label: "Chemotherapy Cycle",
    icon: Sparkles,
    pmjay: false,
    currency: "INR" as Currency,
    budget: 45000,
  },
  {
    id: "treat-lap-chole-06",
    label: "Gallbladder Removal",
    icon: Zap,
    pmjay: false,
    currency: "INR" as Currency,
    budget: 60000,
  },
];

export function TreatmentCostSimulator({ initialSimulation, availableHospitals }: CostSimulatorProps) {
  const [treatmentId, setTreatmentId] = useState<string>(initialSimulation.treatment.id);
  const [location, setLocation] = useState<string>("All Locations");
  const [currency, setCurrency] = useState<Currency>(initialSimulation.currency);
  const [budgetAmount, setBudgetAmount] = useState<number | "">(initialSimulation.budgetAmount ?? 100000);
  const [isPmjayEnrolled, setIsPmjayEnrolled] = useState<boolean>(initialSimulation.pmjayImpact.isEligible);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("ALL");
  const [showDriverModal, setShowDriverModal] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Selected treatment object
  const currentTreatment = useMemo(
    () => TREATMENT_CATALOG.find((t) => t.id === treatmentId) || TREATMENT_CATALOG[0],
    [treatmentId]
  );

  // Live simulation calculation
  const simulation: SimulatorResult = useMemo(() => {
    return simulateTreatmentCost({
      treatmentId,
      location: location === "All Locations" ? undefined : location,
      hospitalId: selectedHospitalId === "ALL" ? undefined : selectedHospitalId,
      budgetAmount: typeof budgetAmount === "number" && budgetAmount > 0 ? budgetAmount : undefined,
      currency,
      isPmjayEnrolled,
    });
  }, [treatmentId, location, selectedHospitalId, budgetAmount, currency, isPmjayEnrolled]);

  const formatCurrency = (amt: number | null | undefined, curr: Currency = currency) => {
    if (amt == null || isNaN(amt)) return "—";
    const symbol = curr === "INR" ? "₹" : "$";
    return `${symbol}${amt.toLocaleString("en-US")}`;
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    startTransition(() => {
      setTreatmentId(preset.id);
      setCurrency(preset.currency);
      setBudgetAmount(preset.budget);
      setIsPmjayEnrolled(preset.pmjay);
    });
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filter matching hospitals based on location or PM-JAY preference
  const filteredHospitals = useMemo(() => {
    return availableHospitals.filter((h) => {
      if (isPmjayEnrolled && !h.acceptsPmJay) return false;
      if (location !== "All Locations") {
        const cityName = location.split(",")[0].trim().toLowerCase();
        if (!h.city.toLowerCase().includes(cityName)) return false;
      }
      return true;
    });
  }, [availableHospitals, isPmjayEnrolled, location]);

  return (
    <div className="space-y-8 print:space-y-4">
      {/* ─── Top Presets Bar ─── */}
      <section className="rounded-3xl border border-[#dce5e3] bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#edf3f1]">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#1b6b50]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#35534c]">
              Quick Procedure Scenarios
            </span>
          </div>
          <span className="text-xs text-[#6e8580]">
            Click any procedure to auto-populate official baseline tariffs
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = treatmentId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#113c39] text-[#d9f6a2] shadow-sm ring-2 ring-[#113c39]/20"
                    : "bg-[#f2f7f5] text-[#2c4741] hover:bg-[#e4edea]"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{preset.label}</span>
                {preset.pmjay && (
                  <span className="rounded-full bg-[#e8f5e9] px-1.5 py-0.5 text-[9px] font-bold text-[#2e7d32]">
                    PM-JAY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Main Two-Column Simulator Layout ─── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 print:block">
        {/* ─── Left Column: Simulation Controls (5 cols) ─── */}
        <div className="space-y-6 lg:col-span-5 print:hidden">
          <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-xl bg-[#eaf4f0] text-[#1b6b50]">
                  <CircleDollarSign className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#113c39]">Simulator Parameters</h2>
                  <p className="text-xs text-[#6e8580]">Adjust clinical and financial inputs</p>
                </div>
              </div>

              {/* Currency Toggle */}
              <div className="flex rounded-xl bg-[#f0f5f3] p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrency("INR")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    currency === "INR" ? "bg-white text-[#113c39] shadow-xs" : "text-[#6e8580] hover:text-[#113c39]"
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    currency === "USD" ? "bg-white text-[#113c39] shadow-xs" : "text-[#6e8580] hover:text-[#113c39]"
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {/* Treatment / Procedure Selector */}
              <div>
                <label className="block text-xs font-bold text-[#2a453f] mb-1.5">
                  Treatment / Clinical Procedure
                </label>
                <select
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                  className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2.5 text-xs font-medium text-[#113c39] shadow-xs focus:border-[#1b6b50] focus:outline-hidden focus:ring-2 focus:ring-[#1b6b50]/20"
                >
                  {TREATMENT_CATALOG.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.diseaseName})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#6e8580] leading-relaxed">
                  {currentTreatment.description}
                </p>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-bold text-[#2a453f] mb-1.5">
                  Location / Metro Region
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-[#6e8580]" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] pl-9 pr-3.5 py-2.5 text-xs font-medium text-[#113c39] shadow-xs focus:border-[#1b6b50] focus:outline-hidden focus:ring-2 focus:ring-[#1b6b50]/20"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget Input & Range */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#2a453f]">
                    Your Target Budget
                  </label>
                  <span className="text-xs font-semibold text-[#1b6b50]">
                    {formatCurrency(typeof budgetAmount === "number" ? budgetAmount : 0)}
                  </span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6e8580]">
                    {currency === "INR" ? "₹" : "$"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={currency === "INR" ? "5000" : "100"}
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter maximum target budget"
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] pl-8 pr-3.5 py-2.5 text-xs font-bold text-[#113c39] shadow-xs focus:border-[#1b6b50] focus:outline-hidden focus:ring-2 focus:ring-[#1b6b50]/20"
                  />
                </div>
              </div>

              {/* Government Scheme / PM-JAY Toggle */}
              <div className="rounded-2xl border border-[#bce0d3] bg-[#f3faf7] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#1b6b50] text-white">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0c3530]">
                        Ayushman Bharat PM-JAY Scheme
                      </span>
                      <p className="mt-0.5 text-[11px] text-[#366359] leading-tight">
                        Cashless coverage up to ₹5,00,000 / year at empaneled hospitals.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isPmjayEnrolled}
                      onChange={(e) => setIsPmjayEnrolled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-[#ccdcd7] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1b6b50] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

                {isPmjayEnrolled && (
                  <div className="mt-3 border-t border-[#d5ebe2] pt-2.5 text-[11px] text-[#2c534b]">
                    {currentTreatment.isPmjayCovered ? (
                      <div className="flex items-center gap-1.5 text-[#1b6b50] font-semibold">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Eligible: Package code {currentTreatment.pmjayPackageCode}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#a35200]">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>Procedure not covered under default PM-JAY package tariff.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#dce5e3] bg-white py-2.5 text-xs font-semibold text-[#294640] shadow-xs hover:bg-[#f5faf8]"
              >
                <Printer className="size-3.5" />
                <span>Print Estimate</span>
              </button>
              <Link
                href={`/find-care?specialty=${encodeURIComponent(currentTreatment.specialty)}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#113c39] py-2.5 text-xs font-semibold text-[#d9f6a2] shadow-xs hover:bg-[#174e4a]"
              >
                <Search className="size-3.5" />
                <span>Find Hospitals</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Simulation Output & Breakdown (7 cols) ─── */}
        <div className="space-y-6 lg:col-span-7">
          {/* ─── Hero Estimated Cost Range Card ─── */}
          <div className="rounded-3xl border border-[#d2e0dc] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#edf3f1]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#f2f7f5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#35534c]">
                    {currentTreatment.specialty}
                  </span>
                  <span className="rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9c5400]">
                    Statistical Estimate
                  </span>
                </div>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-[#113c39]">
                  {currentTreatment.name}
                </h1>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-medium text-[#6e8580] flex items-center gap-1 justify-end">
                  <Clock className="size-3" />
                  Est. Inpatient Stay
                </span>
                <p className="text-sm font-bold text-[#113c39]">
                  {currentTreatment.typicalDurationDays} Day{currentTreatment.typicalDurationDays > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Price Range Display */}
            <div className="mt-6 rounded-2xl bg-linear-to-br from-[#f8faf9] to-[#edf5f2] p-5 border border-[#d8e6e2]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#516b65]">
                Estimated Treatment Cost Range
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-extrabold tracking-tight text-[#113c39]">
                  {formatCurrency(simulation.estimatedRange.min)} – {formatCurrency(simulation.estimatedRange.max)}
                </span>
                <span className="rounded-xl bg-[#e1efe9] px-2.5 py-1 text-xs font-bold text-[#1b6b50]">
                  Median: {formatCurrency(simulation.estimatedRange.median)}
                </span>
              </div>

              {/* PM-JAY Patient Out-of-pocket Impact */}
              {simulation.pmjayImpact.isEligible && (
                <div className="mt-4 rounded-xl bg-[#e8f5e9] p-3.5 border border-[#c8e6c9]">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="size-5 text-[#2e7d32] shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1b5e20]">
                          PM-JAY Scheme Benefit Applied
                        </span>
                        <span className="rounded-full bg-[#2e7d32] px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                          100% Cashless Eligible
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#2e7d32] leading-relaxed">
                        Estimated Patient Out-of-Pocket:{" "}
                        <strong className="text-sm font-extrabold">
                          {formatCurrency(simulation.pmjayImpact.patientEstimatedOutofPocket.min)} –{" "}
                          {formatCurrency(simulation.pmjayImpact.patientEstimatedOutofPocket.max)}
                        </strong>{" "}
                        at empaneled hospitals for standard package entitlements.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Budget Compatibility Meter ─── */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2a453f] uppercase tracking-wider">
                  Budget Compatibility Analysis
                </span>
                {simulation.budgetCompatibility === "UNDER_BUDGET" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-xs font-bold text-[#2e7d32]">
                    <CheckCircle2 className="size-3.5" /> Comfortably Under Budget
                  </span>
                )}
                {simulation.budgetCompatibility === "WITHIN_RANGE" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-xs font-bold text-[#f57f17]">
                    <AlertCircle className="size-3.5" /> Within Estimated Range
                  </span>
                )}
                {simulation.budgetCompatibility === "EXCEEDS_BUDGET" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ffebee] px-2.5 py-0.5 text-xs font-bold text-[#c62828]">
                    <XCircle className="size-3.5" /> Exceeds Target Budget
                  </span>
                )}
                {simulation.budgetCompatibility === "PMJAY_COVERED" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-xs font-bold text-[#2e7d32]">
                    <ShieldCheck className="size-3.5" /> PM-JAY Subsidized (Zero Out-of-Pocket)
                  </span>
                )}
              </div>

              {/* Progress bar visual meter */}
              <div className="relative pt-2 pb-5">
                <div className="h-3 w-full rounded-full bg-[#edf3f1] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      simulation.budgetCompatibility === "UNDER_BUDGET" || simulation.budgetCompatibility === "PMJAY_COVERED"
                        ? "bg-[#2e7d32]"
                        : simulation.budgetCompatibility === "WITHIN_RANGE"
                        ? "bg-[#fbc02d]"
                        : "bg-[#d32f2f]"
                    }`}
                    style={{
                      width: `${
                        simulation.budgetAmount && simulation.estimatedRange.max > 0
                          ? Math.min(100, Math.max(15, (simulation.budgetAmount / (simulation.estimatedRange.max * 1.25)) * 100))
                          : 50
                      }%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-medium text-[#6e8580]">
                  <span>Min: {formatCurrency(simulation.estimatedRange.min)}</span>
                  <span>Median: {formatCurrency(simulation.estimatedRange.median)}</span>
                  <span>Max: {formatCurrency(simulation.estimatedRange.max)}</span>
                </div>
              </div>

              {/* Budget Explanation Text */}
              <div className="rounded-2xl bg-[#f7faf8] p-3.5 text-xs text-[#2a453f] border border-[#dce5e3]">
                {simulation.budgetCompatibility === "UNDER_BUDGET" && (
                  <p>
                    Your target budget of <strong>{formatCurrency(simulation.budgetAmount)}</strong> provides a safe contingency buffer of approximately <strong>{formatCurrency(simulation.budgetDifference)}</strong> above the typical upper estimate.
                  </p>
                )}
                {simulation.budgetCompatibility === "WITHIN_RANGE" && (
                  <p>
                    Your target budget of <strong>{formatCurrency(simulation.budgetAmount)}</strong> falls within the typical estimated bracket. We recommend setting aside a 10–15% contingency reserve for variable items like room category upgrades or non-standard consumables.
                  </p>
                )}
                {simulation.budgetCompatibility === "EXCEEDS_BUDGET" && (
                  <p>
                    The lowest typical baseline starts around <strong>{formatCurrency(simulation.estimatedRange.min)}</strong>, which is <strong>{formatCurrency(simulation.budgetDifference)}</strong> higher than your target budget. Consider checking PM-JAY scheme eligibility, state insurance subsidies, or charitable trust hospitals.
                  </p>
                )}
                {simulation.budgetCompatibility === "PMJAY_COVERED" && (
                  <p>
                    Under PM-JAY Ayushman Bharat, eligible cardholders receive full cashless treatment packages up to ₹5,00,000 per family/year at any empaneled hospital.
                  </p>
                )}
                {simulation.budgetCompatibility === "NOT_SPECIFIED" && (
                  <p>
                    Enter a target budget in the simulator controls to see real-time compatibility and buffer recommendations.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Cost Breakdown by Component ─── */}
          <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
              <div className="flex items-center gap-2">
                <PieChart className="size-4 text-[#1b6b50]" />
                <h3 className="text-sm font-bold text-[#113c39]">
                  Cost Component Distribution (Estimated)
                </h3>
              </div>
              <span className="text-xs text-[#6e8580]">Based on standard clinical pathways</span>
            </div>

            <div className="mt-5 space-y-4">
              {simulation.breakdown.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#203c36]">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#57726b]">{item.percentage}%</span>
                      <span className="font-bold text-[#113c39]">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#edf3f1] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1b6b50]"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#6e8580]">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Key Cost Drivers Accordion / Section */}
            <div className="mt-6 rounded-2xl bg-[#f7faf8] p-4 border border-[#e1ece9]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1b6b50] mb-2">
                <Activity className="size-4" />
                <span>Key Factors Influencing Your Final Bill</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#36524c]">
                {simulation.keyDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-[#1b6b50] shrink-0" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ─── Matching Hospitals Offering This Treatment ─── */}
          <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-[#1b6b50]" />
                <h3 className="text-sm font-bold text-[#113c39]">
                  Matching Regional Facilities & Specific Pricing
                </h3>
              </div>
              <Link
                href="/find-care"
                className="text-xs font-bold text-[#1b6b50] hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="size-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {filteredHospitals.length === 0 ? (
                <p className="text-xs text-[#6e8580] py-4 text-center">
                  No hospitals in this area matched all filters. Try broadening your location or scheme filter.
                </p>
              ) : (
                filteredHospitals.slice(0, 3).map((h) => {
                  const matchingCost = h.treatmentCosts.find(
                    (c) => c.disease.name.toLowerCase() === currentTreatment.diseaseName.toLowerCase()
                  );

                  return (
                    <div
                      key={h.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#e4edea] bg-[#fbfdfc] p-4 transition-all hover:border-[#1b6b50]/30 hover:bg-white"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/hospitals/${h.id}`}
                            className="text-xs font-bold text-[#113c39] hover:underline hover:text-[#1b6b50]"
                          >
                            {h.name}
                          </Link>
                          {h.hasNabhAccreditation && (
                            <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[9px] font-bold text-[#2e7d32]">
                              NABH
                            </span>
                          )}
                          {h.acceptsPmJay && (
                            <span className="rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[9px] font-bold text-[#0369a1]">
                              PM-JAY Empaneled
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[#6e8580]">
                          {h.city}, {h.state} • Rating: {h.rating != null ? Number(h.rating).toFixed(1) : "—"} ★ ({h.reviewCount} reviews)
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:text-right">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6e8580]">
                            Facility Estimate
                          </span>
                          <p className="text-xs font-extrabold text-[#113c39]">
                            {matchingCost && matchingCost.minAmount != null
                              ? `${matchingCost.currency} ${Number(matchingCost.minAmount).toLocaleString()} – ${Number(matchingCost.maxAmount).toLocaleString()}`
                              : `${formatCurrency(simulation.estimatedRange.min)} – ${formatCurrency(simulation.estimatedRange.max)}`}
                          </p>
                        </div>
                        <Link
                          href={`/hospitals/${h.id}`}
                          className="rounded-xl border border-[#dce5e3] bg-white p-2 text-[#113c39] hover:bg-[#f0f6f4] shrink-0"
                          title="View Details"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Provenance & Source Metadata ─── */}
          <div className="rounded-3xl border border-[#dce5e3] bg-[#f8faf9] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#526f68]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-[#1b6b50]" />
                <span>
                  Primary Benchmark: <strong>{simulation.source.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-[#1b6b50] border border-[#dce5e3]">
                  {simulation.source.type} SOURCE
                </span>
                <span className="flex items-center gap-1 text-[#6e8580]">
                  <Calendar className="size-3" /> Updated {simulation.source.lastUpdated}
                </span>
              </div>
            </div>
          </div>

          {/* ─── CRITICAL DISCLAIMER CALLOUT BANNER ─── */}
          <div className="rounded-3xl border-2 border-[#f0c88b] bg-[#fffbf2] p-5 text-xs text-[#704204]">
            <div className="flex items-start gap-3">
              <BadgeAlert className="size-5 text-[#c46e00] shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-extrabold text-[#874900] text-sm tracking-tight">
                  Mandatory Notice: Estimates Are Not Binding Quotations
                </p>
                <p className="leading-relaxed font-medium">
                  <strong>Never represent an estimated range as a guaranteed hospital bill.</strong> Medical treatment costs vary significantly according to individual clinical presentation, surgeon expertise, complication management, consumable choice, and room category selection.
                </p>
                <p className="text-[11px] text-[#8e5c1a]">
                  Always request a written clinical estimate directly from the hospital billing desk prior to admission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
