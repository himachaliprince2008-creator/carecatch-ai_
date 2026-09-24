"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flag,
  Globe,
  HeartPulse,
  Info,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type {
  AdminHospitalRecord,
  AdminCostRecord,
  AdminOutcomeRecord,
  AdminDataSourceRecord,
  AdminDashboardMetrics,
} from "@/lib/repositories/admin-repository";
import type {
  AdminRecordStatus,
  CsvImportParsedRow,
  CsvRowValidationError,
  SuspiciousFlagReason,
} from "@/lib/validation/admin-schemas";
import { ADMIN_RECORD_STATUSES, SUSPICIOUS_FLAG_REASONS } from "@/lib/validation/admin-schemas";
import { DataImportPipeline } from "@/components/data-import-pipeline";

type AdminDashboardProps = {
  initialMetrics: AdminDashboardMetrics;
  initialHospitals: AdminHospitalRecord[];
  initialCosts: AdminCostRecord[];
  initialOutcomes: AdminOutcomeRecord[];
  initialSources: AdminDataSourceRecord[];
};

type ActiveTab = "hospitals" | "costs" | "outcomes" | "sources" | "csv-import" | "audit-queue";

const SAMPLE_CSV_TEMPLATE = `name,city,state,country,hospital_type,has_icu,has_emergency,pmjay,nabh,specialties,facilities,treatment_disease,min_cost,max_cost,currency,outcome_label,total_patients,successful_outcomes,status
"AIIMS Premier Medical Center","New Delhi","DL","IN","HOSPITAL","true","true","true","true","Cardiology;Nephrology","ICU 24/7;Trauma Center","Cardiology",65000,120000,"INR","30-Day Angioplasty Survival",400,392,"VERIFIED"
"Columbia Regional Heart Institute","New York","NY","US","SPECIALTY_CENTER","true","true","false","true","Cardiology;Trauma","Cardiac Catheterization Suite","Cardiology",7500,13500,"USD","Post-Stent Patency",250,244,"VERIFIED"
"Pacific Eye & Laser Clinic","San Francisco","CA","US","CLINIC","false","false","true","false","Ophthalmology","Laser Suite","Ophthalmology",1500,3000,"USD","Cataract Visual Recovery",180,175,"HOSPITAL_REPORTED"
"Unverified Test Clinic","Austin","TX","US","CLINIC","false","false","false","false","General Surgery","Outpatient Clinic","General Surgery",9000,4500,"USD","General Recovery",50,60,"PENDING_REVIEW"`;

export function AdminDashboard({
  initialMetrics,
  initialHospitals,
  initialCosts,
  initialOutcomes,
  initialSources,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hospitals");
  const [hospitals, setHospitals] = useState<AdminHospitalRecord[]>(initialHospitals);
  const [costs] = useState<AdminCostRecord[]>(initialCosts);
  const [outcomes] = useState<AdminOutcomeRecord[]>(initialOutcomes);
  const [sources] = useState<AdminDataSourceRecord[]>(initialSources);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>(initialMetrics);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);

  // Verification / Flagging Dialog State
  const [verifyModalHospital, setVerifyModalHospital] = useState<AdminHospitalRecord | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AdminRecordStatus>("VERIFIED");
  const [verifierName, setVerifierName] = useState("Authorized Admin");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSuspiciousFlag, setIsSuspiciousFlag] = useState(false);
  const [suspiciousReason, setSuspiciousReason] = useState<SuspiciousFlagReason>("OUTLIER_PRICING");
  const [suspiciousNotes, setSuspiciousNotes] = useState("");

  // New Hospital Dialog State
  const [showNewHospitalModal, setShowNewHospitalModal] = useState(false);
  const [newHospitalData, setNewHospitalData] = useState({
    name: "",
    city: "",
    state: "",
    country: "US",
    hospitalType: "HOSPITAL" as const,
    hasIcu: true,
    hasEmergency: true,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    phone: "",
    websiteUrl: "",
    status: "PENDING_REVIEW" as AdminRecordStatus,
    notes: "",
  });

  // CSV Ingestion State
  const [csvText, setCsvText] = useState(SAMPLE_CSV_TEMPLATE);
  const [csvParsedRows, setCsvParsedRows] = useState<CsvImportParsedRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<CsvRowValidationError[]>([]);
  const [csvValidated, setCsvValidated] = useState(false);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Filtered Hospital List
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      if (suspiciousOnly && !h.isSuspicious) return false;
      if (statusFilter !== "ALL" && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          (h.state && h.state.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [hospitals, statusFilter, searchQuery, suspiciousOnly]);

  const handleOpenVerifyModal = (h: AdminHospitalRecord) => {
    setVerifyModalHospital(h);
    setSelectedStatus(h.status);
    setVerificationNotes(h.verificationNotes || "");
    setIsSuspiciousFlag(h.isSuspicious);
    setSuspiciousReason((h.suspiciousReason as SuspiciousFlagReason) || "OUTLIER_PRICING");
    setSuspiciousNotes(h.suspiciousNotes || "");
  };

  const handleSaveVerification = async () => {
    if (!verifyModalHospital) return;

    startTransition(async () => {
      try {
        const payload = {
          recordId: verifyModalHospital.id,
          recordType: "HOSPITAL" as const,
          status: selectedStatus,
          verifiedBy: verifierName,
          notes: verificationNotes || undefined,
          isSuspicious: isSuspiciousFlag,
          suspiciousReason: isSuspiciousFlag ? suspiciousReason : undefined,
          suspiciousNotes: isSuspiciousFlag ? suspiciousNotes : undefined,
        };

        const res = await fetch("/api/admin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setHospitals((prev) =>
            prev.map((h) =>
              h.id === verifyModalHospital.id
                ? {
                    ...h,
                    status: selectedStatus,
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: verifierName,
                    verificationNotes,
                    isSuspicious: isSuspiciousFlag,
                    suspiciousReason: isSuspiciousFlag ? suspiciousReason : null,
                    suspiciousNotes: isSuspiciousFlag ? suspiciousNotes : null,
                  }
                : h
            )
          );
          setVerifyModalHospital(null);
        }
      } catch (err) {
        console.error("Verification failed", err);
      }
    });
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/hospitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newHospitalData),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.hospital) {
            setHospitals((prev) => [data.hospital, ...prev]);
            setShowNewHospitalModal(false);
            setNewHospitalData({
              name: "",
              city: "",
              state: "",
              country: "US",
              hospitalType: "HOSPITAL",
              hasIcu: true,
              hasEmergency: true,
              acceptsPmJay: true,
              hasNabhAccreditation: true,
              phone: "",
              websiteUrl: "",
              status: "PENDING_REVIEW",
              notes: "",
            });
          }
        }
      } catch (err) {
        console.error("Create hospital failed", err);
      }
    });
  };

  const handleValidateCsv = async () => {
    startTransition(async () => {
      setCsvImportMessage(null);
      try {
        const res = await fetch("/api/admin/import-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "VALIDATE", csvText }),
        });

        const data = await res.json();
        if (data.rows) {
          setCsvParsedRows(data.rows);
          setCsvErrors(data.errors || []);
          setCsvValidated(true);
        }
      } catch (err) {
        console.error("CSV Validation error", err);
      }
    });
  };

  const handleCommitCsv = async () => {
    const validRows = csvParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/import-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "COMMIT",
            validRows,
            verifiedBy: verifierName,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setCsvImportMessage(`✅ ${data.message}`);
          // Refresh hospitals
          const hospRes = await fetch("/api/admin/hospitals");
          if (hospRes.ok) {
            const list = await hospRes.json();
            setHospitals(list);
          }
        }
      } catch (err) {
        console.error("CSV Commit error", err);
      }
    });
  };

  const getStatusBadge = (status: AdminRecordStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-xs font-bold text-[#2e7d32]">
            <BadgeCheck className="size-3.5" /> VERIFIED
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-xs font-bold text-[#f57f17]">
            <ShieldQuestion className="size-3.5" /> PENDING REVIEW
          </span>
        );
      case "HOSPITAL_REPORTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-bold text-[#0369a1]">
            <Building2 className="size-3.5" /> HOSPITAL REPORTED
          </span>
        );
      case "ESTIMATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3e8ff] px-2.5 py-0.5 text-xs font-bold text-[#7e22ce]">
            <Sparkles className="size-3.5" /> ESTIMATED
          </span>
        );
      case "DEMO_DATA":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-bold text-[#475569]">
            🧪 DEMO DATA
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ffebee] px-2.5 py-0.5 text-xs font-bold text-[#c62828]">
            <XCircle className="size-3.5" /> REJECTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── CRITICAL HEALTHCARE INTEGRITY BANNER ─── */}
      <section className="rounded-3xl border-2 border-[#113c39] bg-linear-to-br from-[#113c39] to-[#1c5551] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-1 grid size-9 shrink-0 place-items-center rounded-2xl bg-[#d9f6a2] text-[#113c39]">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#d9f6a2]">
                  Healthcare Ground-Truth Policy
                </span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  Human Authorization Mandatory
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-white">
                Zero AI Auto-Mutation of Clinical Facts
              </h2>
              <p className="mt-1 text-xs text-[#b8d6cf] leading-relaxed max-w-3xl">
                Automatic AI modification of healthcare facts is strictly blocked. All hospital accreditations, outcome percentages, and treatment tariffs require explicit human administrator review, audit notes, and verified status confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs flex items-center gap-2">
              <UserCheck className="size-4 text-[#d9f6a2]" />
              Verifier: {verifierName}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Top Metrics Bar ─── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-3xl border border-[#dce5e3] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6e8580]">Hospitals</span>
            <Building2 className="size-4 text-[#1b6b50]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#113c39]">{hospitals.length}</p>
          <span className="text-[10px] text-[#6e8580]">Active in registry</span>
        </div>

        <div className="rounded-3xl border border-[#fef3c7] bg-[#fffbeb] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#b45309]">Pending Review</span>
            <ShieldQuestion className="size-4 text-[#d97706]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#b45309]">
            {hospitals.filter((h) => h.status === "PENDING_REVIEW").length}
          </p>
          <span className="text-[10px] text-[#92400e]">Requires audit</span>
        </div>

        <div className="rounded-3xl border border-[#dcfce7] bg-[#f0fdf4] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#15803d]">Verified</span>
            <BadgeCheck className="size-4 text-[#16a34a]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#15803d]">
            {hospitals.filter((h) => h.status === "VERIFIED").length}
          </p>
          <span className="text-[10px] text-[#166534]">Publicly certified</span>
        </div>

        <div className="rounded-3xl border border-[#fee2e2] bg-[#fef2f2] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#b91c1c]">Suspicious Flagged</span>
            <Flag className="size-4 text-[#dc2626]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#b91c1c]">
            {hospitals.filter((h) => h.isSuspicious).length}
          </p>
          <span className="text-[10px] text-[#991b1b]">Quarantined records</span>
        </div>

        <div className="rounded-3xl border border-[#dce5e3] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6e8580]">Cost Tariffs</span>
            <CircleDollarSign className="size-4 text-[#1b6b50]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#113c39]">{costs.length}</p>
          <span className="text-[10px] text-[#6e8580]">Benchmarked</span>
        </div>

        <div className="rounded-3xl border border-[#dce5e3] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6e8580]">Clinical Outcomes</span>
            <Activity className="size-4 text-[#1b6b50]" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#113c39]">{outcomes.length}</p>
          <span className="text-[10px] text-[#6e8580]">Evidence records</span>
        </div>
      </section>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce5e3] pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("hospitals")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "hospitals"
                ? "bg-[#113c39] text-[#d9f6a2] shadow-sm"
                : "bg-white text-[#41625b] hover:bg-[#f0f5f3]"
            }`}
          >
            <Building2 className="size-4" />
            <span>Hospital Registry ({hospitals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("costs")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "costs"
                ? "bg-[#113c39] text-[#d9f6a2] shadow-sm"
                : "bg-white text-[#41625b] hover:bg-[#f0f5f3]"
            }`}
          >
            <CircleDollarSign className="size-4" />
            <span>Treatment Costs ({costs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outcomes")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "outcomes"
                ? "bg-[#113c39] text-[#d9f6a2] shadow-sm"
                : "bg-white text-[#41625b] hover:bg-[#f0f5f3]"
            }`}
          >
            <Activity className="size-4" />
            <span>Clinical Outcomes ({outcomes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "sources"
                ? "bg-[#113c39] text-[#d9f6a2] shadow-sm"
                : "bg-white text-[#41625b] hover:bg-[#f0f5f3]"
            }`}
          >
            <Database className="size-4" />
            <span>Data Sources ({sources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csv-import")}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "csv-import"
                ? "bg-[#113c39] text-[#d9f6a2] shadow-sm"
                : "bg-white text-[#41625b] hover:bg-[#f0f5f3]"
            }`}
          >
            <Upload className="size-4" />
            <span>CSV Bulk Import</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNewHospitalModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-[#1b6b50] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14533e]"
        >
          <Plus className="size-4" />
          <span>New Hospital Record</span>
        </button>
      </div>

      {/* ─── TAB 1: HOSPITALS REGISTRY & VERIFICATION ─── */}
      {activeTab === "hospitals" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#dce5e3] bg-white p-4 shadow-xs">
            <div className="relative min-w-[280px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6e8580]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hospital name, city, or state..."
                className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] pl-10 pr-3.5 py-2 text-xs font-medium text-[#113c39] shadow-xs focus:border-[#1b6b50] focus:outline-hidden focus:ring-2 focus:ring-[#1b6b50]/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-semibold text-[#113c39] shadow-xs"
              >
                <option value="ALL">All Statuses ({hospitals.length})</option>
                {ADMIN_RECORD_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSuspiciousOnly(!suspiciousOnly)}
                className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                  suspiciousOnly
                    ? "bg-[#fee2e2] text-[#b91c1c] ring-2 ring-[#dc2626]/30"
                    : "border border-[#dce5e3] bg-white text-[#41625b] hover:bg-[#f0f5f3]"
                }`}
              >
                <Flag className="size-3.5" />
                <span>Flagged Suspicious ({hospitals.filter((h) => h.isSuspicious).length})</span>
              </button>
            </div>
          </div>

          {/* Hospitals Table */}
          <div className="overflow-hidden rounded-3xl border border-[#dce5e3] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#203c36]">
                <thead className="border-b border-[#e1ece9] bg-[#f6faf8] text-[11px] font-bold uppercase tracking-wider text-[#526f68]">
                  <tr>
                    <th className="px-5 py-3.5">Hospital / Facility</th>
                    <th className="px-4 py-3.5">Location</th>
                    <th className="px-4 py-3.5">Accreditations & Badges</th>
                    <th className="px-4 py-3.5">Verification Status</th>
                    <th className="px-4 py-3.5">Audit / Flag</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f1]">
                  {filteredHospitals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#6e8580]">
                        No hospital records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHospitals.map((h) => (
                      <tr key={h.id} className="transition-all hover:bg-[#f9fbfb]">
                        <td className="px-5 py-4 font-semibold text-[#113c39]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{h.name}</span>
                            <span className="rounded-md bg-[#edf5f2] px-1.5 py-0.5 text-[9px] font-bold text-[#35534c]">
                              {h.hospitalType}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6e8580] mt-0.5 font-normal">
                            ID: {h.id} • Rating: {h.rating ?? "—"} ★ ({h.reviewCount} reviews)
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-semibold text-[#113c39]">
                            {h.city}, {h.state || h.country}
                          </span>
                          <p className="text-[10px] text-[#6e8580]">Country: {h.country}</p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {h.hasNabhAccreditation && (
                              <span className="rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[9px] font-bold text-[#2e7d32]">
                                NABH
                              </span>
                            )}
                            {h.acceptsPmJay && (
                              <span className="rounded-full bg-[#e0f2fe] px-2 py-0.5 text-[9px] font-bold text-[#0369a1]">
                                PM-JAY
                              </span>
                            )}
                            {h.hasIcu && (
                              <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-bold text-[#334155]">
                                ICU
                              </span>
                            )}
                            {h.hasEmergency && (
                              <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[9px] font-bold text-[#dc2626]">
                                Emergency
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {getStatusBadge(h.status)}
                          {h.verifiedBy && (
                            <p className="text-[10px] text-[#6e8580] mt-1">
                              By {h.verifiedBy} ({new Date(h.verifiedAt || "").toLocaleDateString()})
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {h.isSuspicious ? (
                            <div className="flex items-start gap-1.5 text-[#b91c1c]">
                              <Flag className="size-3.5 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-[11px]">FLAGGED</span>
                                <p className="text-[10px] text-[#991b1b]">
                                  {h.suspiciousReason?.replace(/_/g, " ")}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#6e8580] flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-[#16a34a]" /> Clean Audit
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenVerifyModal(h)}
                              className="flex items-center gap-1 rounded-xl bg-[#113c39] px-3 py-1.5 text-xs font-bold text-[#d9f6a2] hover:bg-[#195551]"
                            >
                              <ClipboardCheck className="size-3.5" />
                              <span>Verify / Flag</span>
                            </button>
                            <Link
                              href={`/hospitals/${h.id}`}
                              target="_blank"
                              className="rounded-xl border border-[#dce5e3] bg-white p-1.5 text-[#113c39] hover:bg-[#f0f5f3]"
                              title="Public View"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TREATMENT COSTS ─── */}
      {activeTab === "costs" && (
        <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-5 text-[#1b6b50]" />
              <div>
                <h3 className="text-sm font-bold text-[#113c39]">Treatment Cost Catalog & Tariff Control</h3>
                <p className="text-xs text-[#6e8580]">Verified pricing benchmarks across hospitals</p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#203c36]">
              <thead className="border-b border-[#e1ece9] bg-[#f6faf8] text-[11px] font-bold uppercase tracking-wider text-[#526f68]">
                <tr>
                  <th className="px-4 py-3">Hospital</th>
                  <th className="px-4 py-3">Treatment / Disease</th>
                  <th className="px-4 py-3">Cost Range</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f1]">
                {costs.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f9fbfb]">
                    <td className="px-4 py-3.5 font-bold text-[#113c39]">{c.hospitalName}</td>
                    <td className="px-4 py-3.5 font-medium">{c.diseaseName}</td>
                    <td className="px-4 py-3.5 font-extrabold text-[#1b6b50]">
                      {c.currency} {c.minAmount?.toLocaleString()} – {c.maxAmount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3.5 text-[#526f68]">{c.sourceName}</td>
                    <td className="px-4 py-3.5 text-[11px] text-[#6e8580]">{c.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: CLINICAL OUTCOMES ─── */}
      {activeTab === "outcomes" && (
        <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-[#1b6b50]" />
              <div>
                <h3 className="text-sm font-bold text-[#113c39]">Disease-Specific Outcome Evidence</h3>
                <p className="text-xs text-[#6e8580]">Clinical audit metrics and reported patient counts</p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#203c36]">
              <thead className="border-b border-[#e1ece9] bg-[#f6faf8] text-[11px] font-bold uppercase tracking-wider text-[#526f68]">
                <tr>
                  <th className="px-4 py-3">Specialty</th>
                  <th className="px-4 py-3">Outcome Metric</th>
                  <th className="px-4 py-3">Reported Patients</th>
                  <th className="px-4 py-3">Successful Outcomes</th>
                  <th className="px-4 py-3">Calculated Rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f1]">
                {outcomes.map((o) => (
                  <tr key={o.id} className="hover:bg-[#f9fbfb]">
                    <td className="px-4 py-3.5 font-bold text-[#113c39]">{o.diseaseName}</td>
                    <td className="px-4 py-3.5 font-medium">{o.label}</td>
                    <td className="px-4 py-3.5 font-bold">{o.totalReportedPatients.toLocaleString()}</td>
                    <td className="px-4 py-3.5 font-bold text-[#15803d]">
                      {o.reportedSuccessfulOutcomes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-[#113c39]">
                      <span className="rounded-lg bg-[#e8f5e9] px-2 py-0.5 text-xs text-[#2e7d32]">
                        {o.calculatedSuccessRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(o.status)}</td>
                    <td className="px-4 py-3.5 text-[#526f68]">{o.sourceName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: DATA SOURCES ─── */}
      {activeTab === "sources" && (
        <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
            <div className="flex items-center gap-2">
              <Database className="size-5 text-[#1b6b50]" />
              <div>
                <h3 className="text-sm font-bold text-[#113c39]">Authorized Data Sources & Registries</h3>
                <p className="text-xs text-[#6e8580]">Government portals, licensing boards, and accreditation feeds</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {sources.map((s) => (
              <div key={s.id} className="rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#113c39] px-2 py-0.5 text-[9px] font-bold text-[#d9f6a2]">
                    {s.type}
                  </span>
                  <span className="text-[10px] text-[#6e8580]">
                    {new Date(s.retrievedAt || "").toLocaleDateString()}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-[#113c39]">{s.name}</h4>
                <p className="mt-1 text-xs text-[#526f68]">Publisher: {s.publisher}</p>
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#edf3f1]">
                  <span className="text-xs font-bold text-[#1b6b50]">{s.recordsCount} records synced</span>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#113c39] hover:underline flex items-center gap-1"
                    >
                      Visit <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: CSV BULK IMPORT & VALIDATION PIPELINE ─── */}
      {activeTab === "csv-import" && (
        <div className="space-y-6">
          <DataImportPipeline />
        </div>
      )}

      {/* ─── MODAL: VERIFY / FLAG RECORD ─── */}
      {verifyModalHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-2xl bg-[#113c39] text-[#d9f6a2]">
                  <ClipboardCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#113c39]">Verification & Audit Workflow</h3>
                  <p className="text-xs text-[#6e8580]">{verifyModalHospital.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalHospital(null)}
                className="rounded-xl p-1.5 text-[#6e8580] hover:bg-[#f0f5f3]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-[#203c36] mb-1.5">
                  Set Official Verification Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AdminRecordStatus)}
                  className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2.5 text-xs font-bold text-[#113c39] shadow-xs"
                >
                  {ADMIN_RECORD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verifier Identity */}
              <div>
                <label className="block text-xs font-bold text-[#203c36] mb-1.5">
                  Verifier Name / Department
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-medium text-[#113c39] shadow-xs"
                />
              </div>

              {/* Audit Rationale / Verification Notes */}
              <div>
                <label className="block text-xs font-bold text-[#203c36] mb-1.5">
                  Verification Audit Notes
                </label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Document source reference, licensing ID, or accreditation verification date..."
                  className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] p-3 text-xs text-[#113c39] shadow-xs"
                />
              </div>

              {/* Suspicious Flag Checkbox */}
              <div className="rounded-2xl border border-[#fed7d7] bg-[#fff5f5] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSuspiciousFlag}
                      onChange={(e) => setIsSuspiciousFlag(e.target.checked)}
                      className="size-4 rounded text-[#dc2626]"
                    />
                    <span className="text-xs font-bold text-[#9b2c2c] flex items-center gap-1.5">
                      <Flag className="size-4 text-[#dc2626]" /> Flag as Suspicious / Needs Deep Clinical Audit
                    </span>
                  </label>
                </div>

                {isSuspiciousFlag && (
                  <div className="space-y-3 pt-2 border-t border-[#fed7d7]">
                    <div>
                      <label className="block text-[11px] font-bold text-[#9b2c2c] mb-1">
                        Suspicious Flag Reason
                      </label>
                      <select
                        value={suspiciousReason}
                        onChange={(e) => setSuspiciousReason(e.target.value as SuspiciousFlagReason)}
                        className="w-full rounded-xl border border-[#feb2b2] bg-white px-3 py-1.5 text-xs font-bold text-[#9b2c2c]"
                      >
                        {SUSPICIOUS_FLAG_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#9b2c2c] mb-1">
                        Suspicious Flag Notes
                      </label>
                      <textarea
                        rows={2}
                        value={suspiciousNotes}
                        onChange={(e) => setSuspiciousNotes(e.target.value)}
                        placeholder="Explain anomaly (e.g. 5x cost deviation, unsubstantiated 100% cure claims)..."
                        className="w-full rounded-xl border border-[#feb2b2] bg-white p-2.5 text-xs text-[#9b2c2c]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setVerifyModalHospital(null)}
                className="rounded-2xl border border-[#dce5e3] px-4 py-2.5 text-xs font-bold text-[#526f68] hover:bg-[#f0f5f3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVerification}
                disabled={isPending}
                className="flex items-center gap-2 rounded-2xl bg-[#113c39] px-5 py-2.5 text-xs font-bold text-[#d9f6a2] hover:bg-[#195551]"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                <span>Save Official Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE NEW HOSPITAL RECORD ─── */}
      {showNewHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#edf3f1]">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-2xl bg-[#1b6b50] text-white">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#113c39]">Create New Hospital Record</h3>
                  <p className="text-xs text-[#6e8580]">Add an accredited facility to the registry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewHospitalModal(false)}
                className="rounded-xl p-1.5 text-[#6e8580] hover:bg-[#f0f5f3]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#203c36] mb-1">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newHospitalData.name}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, name: e.target.value })}
                    placeholder="e.g. St. Jude General Hospital"
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-medium text-[#113c39]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203c36] mb-1">
                    Facility Type
                  </label>
                  <select
                    value={newHospitalData.hospitalType}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, hospitalType: e.target.value as any })}
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-medium text-[#113c39]"
                  >
                    <option value="HOSPITAL">HOSPITAL</option>
                    <option value="CLINIC">CLINIC</option>
                    <option value="SPECIALTY_CENTER">SPECIALTY_CENTER</option>
                    <option value="AMBULATORY_CENTER">AMBULATORY_CENTER</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203c36] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newHospitalData.city}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, city: e.target.value })}
                    placeholder="e.g. New Delhi / Boston"
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-medium text-[#113c39]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203c36] mb-1">State / Province</label>
                  <input
                    type="text"
                    value={newHospitalData.state}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, state: e.target.value })}
                    placeholder="e.g. MA / DL"
                    className="w-full rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] px-3.5 py-2 text-xs font-medium text-[#113c39]"
                  />
                </div>
              </div>

              {/* Accreditations Toggles */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
                <label className="flex items-center gap-2 rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] p-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHospitalData.hasIcu}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, hasIcu: e.target.checked })}
                  />
                  <span>ICU Unit</span>
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] p-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHospitalData.hasEmergency}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, hasEmergency: e.target.checked })}
                  />
                  <span>Emergency</span>
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] p-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHospitalData.acceptsPmJay}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, acceptsPmJay: e.target.checked })}
                  />
                  <span>PM-JAY</span>
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] p-2.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHospitalData.hasNabhAccreditation}
                    onChange={(e) => setNewHospitalData({ ...newHospitalData, hasNabhAccreditation: e.target.checked })}
                  />
                  <span>NABH</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#edf3f1]">
                <button
                  type="button"
                  onClick={() => setShowNewHospitalModal(false)}
                  className="rounded-2xl border border-[#dce5e3] px-4 py-2.5 text-xs font-bold text-[#526f68]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-2xl bg-[#1b6b50] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14533e]"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  <span>Save Hospital Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
