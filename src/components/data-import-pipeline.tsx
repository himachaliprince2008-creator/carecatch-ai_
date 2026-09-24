"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  BadgeAlert,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flag,
  Globe,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Percent,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import type {
  ProcessedPipelineRow,
  PipelineSummary,
  PipelineProcessResult,
  PipelineRowResolution,
} from "@/lib/data-pipeline/csv-import-pipeline";

const PRESET_BATCHES = [
  {
    name: "National Cardiology Batch (Clean)",
    description: "Standard verified cardiac surgery and angioplasty tariffs",
    csv: `name,city,state,country,hospital_type,has_icu,has_emergency,pmjay,nabh,specialties,facilities,treatment_disease,min_cost,max_cost,currency,outcome_label,total_patients,successful_outcomes,status
"AIIMS New Delhi","New Delhi","DL","IN","HOSPITAL","true","true","true","true","Cardiology;Cardiothoracic","Cath Lab 24/7;ICU","Cardiology",70000,135000,"INR","Post-Angioplasty Patency",350,342,"VERIFIED"
"Lilavati Hospital and Research Centre","Mumbai","MH","IN","HOSPITAL","true","true","false","true","Cardiology;Nephrology","Cardiac ICU;Dialysis Suite","Cardiology",85000,160000,"INR","30-Day Survival Rate",280,274,"VERIFIED"
"Manipal Hospital","Bengaluru","KA","IN","HOSPITAL","true","true","true","true","Cardiology","Advanced Cath Suite","Cardiology",95000,150000,"INR","DES Stent Patency Rate",190,186,"VERIFIED"`,
  },
  {
    name: "Mixed Real-World Stress Test (With Duplicates & Errors)",
    description: "Contains negative cost, duplicate batch row, and outcome > total errors",
    csv: `name,city,state,country,hospital_type,has_icu,has_emergency,pmjay,nabh,specialties,facilities,treatment_disease,min_cost,max_cost,currency,outcome_label,total_patients,successful_outcomes,status
"AIIMS New Delhi","New Delhi","DL","IN","HOSPITAL","true","true","true","true","Cardiology","ICU;Emergency","Cardiology",80000,140000,"INR","Post-PTCA Survival",420,408,"VERIFIED"
"Invalid Pricing Clinic","Jaipur","RJ","IN","CLINIC","false","false","false","false","General Surgery","Clinic Suite","General Surgery",150000,50000,"INR","Recovery Rate",50,48,"PENDING_REVIEW"
"Unrealistic Outcomes Center","Chennai","TN","IN","CLINIC","false","false","false","false","Oncology","Infusion Suite","Oncology",40000,80000,"INR","Chemo Remission",40,65,"PENDING_REVIEW"
"AIIMS New Delhi","New Delhi","DL","IN","HOSPITAL","true","true","true","true","Cardiology","ICU","Cardiology",80000,140000,"INR","Post-PTCA Survival",420,408,"VERIFIED"`,
  },
  {
    name: "Verified Conflict Batch",
    description: "Matches existing verified hospital in database to test protection workflow",
    csv: `name,city,state,country,hospital_type,has_icu,has_emergency,pmjay,nabh,specialties,facilities,treatment_disease,min_cost,max_cost,currency,outcome_label,total_patients,successful_outcomes,status
"AIIMS New Delhi","New Delhi","DL","IN","HOSPITAL","true","true","true","true","Cardiology;Oncology","Level 1 Trauma;ICU","Cardiology",60000,110000,"INR","Stent Patency",500,490,"VERIFIED"
"Lilavati Hospital and Research Centre","Mumbai","MH","IN","HOSPITAL","true","true","false","true","Nephrology;Kidney","Renal Dialysis","Nephrology",45000,80000,"INR","Dialysis Adequacy",300,290,"VERIFIED"`,
  },
];

export function DataImportPipeline() {
  const [csvText, setCsvText] = useState(PRESET_BATCHES[1].csv);
  const [pipelineResult, setPipelineResult] = useState<PipelineProcessResult | null>(null);
  const [rows, setRows] = useState<ProcessedPipelineRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "VALID" | "INVALID" | "DUPLICATES" | "WARNINGS" | "VERIFIED_CONFLICTS">("ALL");
  const [verifierName, setVerifierName] = useState("Lead Healthcare Administrator");
  const [sourceName, setSourceName] = useState("National Healthcare Ingestion Feed");
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [isProcessing, startTransition] = useTransition();

  const handleRunPipeline = async () => {
    startTransition(async () => {
      setCommitMessage(null);
      try {
        const res = await fetch("/api/admin/pipeline/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText }),
        });

        const data: PipelineProcessResult = await res.json();
        if (data.rows && data.summary) {
          setPipelineResult(data);
          setRows(data.rows);
        }
      } catch (err) {
        console.error("Pipeline process failed", err);
      }
    });
  };

  const handleUpdateRowAction = (rowNumber: number, action: PipelineRowResolution) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowNumber === rowNumber) {
          return {
            ...r,
            resolution: {
              ...r.resolution,
              action,
              isAccepted: action !== "SKIP" && r.validation.isValid,
            },
          };
        }
        return r;
      })
    );
  };

  const handleToggleVerifiedOverwrite = (rowNumber: number, confirmed: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowNumber === rowNumber) {
          return {
            ...r,
            resolution: {
              ...r.resolution,
              adminConfirmedVerifiedOverwrite: confirmed,
              action: confirmed ? "UPDATE_EXISTING" : "SKIP",
              isAccepted: confirmed && r.validation.isValid,
            },
          };
        }
        return r;
      })
    );
  };

  const handleCommitPipeline = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/pipeline/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows,
            verifiedBy: verifierName,
            sourceName,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setCommitMessage(data.message);
        }
      } catch (err) {
        console.error("Commit failed", err);
      }
    });
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (activeFilter === "VALID") return r.validation.isValid;
      if (activeFilter === "INVALID") return !r.validation.isValid;
      if (activeFilter === "DUPLICATES") return r.duplicateCheck.isDuplicate;
      if (activeFilter === "WARNINGS") return r.qualityCheck.hasWarnings;
      if (activeFilter === "VERIFIED_CONFLICTS") return r.duplicateCheck.isExistingVerified;
      return true;
    });
  }, [rows, activeFilter]);

  const summary: PipelineSummary | undefined = useMemo(() => {
    if (!pipelineResult) return undefined;
    const acceptedCount = rows.filter((r) => r.resolution.isAccepted).length;
    return {
      ...pipelineResult.summary,
      acceptedRows: acceptedCount,
    };
  }, [pipelineResult, rows]);

  return (
    <div className="space-y-8">
      {/* ─── Pipeline Stepper Header ─── */}
      <section className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#edf3f1]">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#113c39] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d9f6a2]">
                Phase 18 Pipeline
              </span>
              <span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2e7d32]">
                Automated Validation & Overwrite Protection
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-[#113c39]">
              Healthcare CSV Import & Verification Pipeline
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-[#f0f5f3] px-3 py-1.5 text-xs font-semibold text-[#113c39]">
              Verified Overwrite Guard: <strong className="text-[#1b6b50]">STRICT LOCK</strong>
            </span>
          </div>
        </div>

        {/* Visual Pipeline Stages */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 text-center">
          {[
            { step: "1. CSV Input", desc: "Raw Text / Upload" },
            { step: "2. Parse", desc: "Tokenize & Clean" },
            { step: "3. Validate", desc: "Schema Sanity" },
            { step: "4. Normalize", desc: "Standardize Slugs" },
            { step: "5. Deduplicate", desc: "Registry Match" },
            { step: "6. Quality Check", desc: "Heuristics & Audits" },
            { step: "7. Admin Commit", desc: "Database Storage" },
          ].map((s, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#e1ece9] bg-[#f8faf9] p-3 text-xs"
            >
              <span className="font-bold text-[#113c39] block">{s.step}</span>
              <span className="text-[10px] text-[#6e8580]">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Preset Batch Selectors ─── */}
      <section className="rounded-3xl border border-[#dce5e3] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#edf3f1]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#35534c]">
            Load Preconfigured Test Scenarios
          </span>
          <span className="text-xs text-[#6e8580]">Instant clinical batches for pipeline testing</span>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {PRESET_BATCHES.map((batch, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCsvText(batch.csv);
                setPipelineResult(null);
                setRows([]);
                setCommitMessage(null);
              }}
              className="flex items-center gap-2 rounded-2xl border border-[#dce5e3] bg-[#fcfdfc] px-3.5 py-2 text-xs font-semibold text-[#203c36] hover:bg-[#eef5f2] transition-all"
            >
              <FileSpreadsheet className="size-3.5 text-[#1b6b50]" />
              <span>{batch.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── CSV Raw Editor & Pipeline Trigger ─── */}
      <section className="rounded-3xl border border-[#dce5e3] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#edf3f1]">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-[#1b6b50]" />
            <h2 className="text-sm font-bold text-[#113c39]">CSV Ingestion Buffer</h2>
          </div>
          <span className="text-xs text-[#6e8580]">
            {csvText.split("\n").filter(Boolean).length} lines in buffer
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <textarea
            rows={7}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPipelineResult(null);
              setRows([]);
            }}
            className="w-full font-mono text-xs rounded-2xl border border-[#c9d8d4] bg-[#fbfdfc] p-4 text-[#113c39] shadow-xs focus:border-[#1b6b50] focus:ring-2 focus:ring-[#1b6b50]/20"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunPipeline}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-2xl bg-[#113c39] px-6 py-3 text-xs font-bold text-[#d9f6a2] shadow-md hover:bg-[#18524e]"
              >
                {isProcessing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                <span>Execute Ingestion Pipeline</span>
              </button>
            </div>

            <div className="text-xs text-[#6e8580]">
              Automated validation against clinical sanity constraints
            </div>
          </div>
        </div>
      </section>

      {/* ─── Summary Scorecard ─── */}
      {summary && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#113c39] uppercase tracking-wider">
              Pipeline Execution Scorecard
            </h2>
            <span className="text-xs text-[#6e8580]">Timestamp: {pipelineResult?.timestamp}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <button
              type="button"
              onClick={() => setActiveFilter("ALL")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "ALL" ? "border-[#113c39] bg-[#f2f7f5] ring-2 ring-[#113c39]/20" : "border-[#dce5e3] bg-white hover:bg-[#fcfdfc]"
              }`}
            >
              <span className="text-xs font-bold text-[#6e8580]">Total Rows</span>
              <p className="mt-1 text-2xl font-extrabold text-[#113c39]">{summary.totalRows}</p>
              <span className="text-[10px] text-[#6e8580]">Processed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("VALID")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "VALID" ? "border-[#16a34a] bg-[#f0fdf4] ring-2 ring-[#16a34a]/20" : "border-[#bbf7d0] bg-[#f7fef9] hover:bg-[#f0fdf4]"
              }`}
            >
              <span className="text-xs font-bold text-[#15803d]">Valid Rows</span>
              <p className="mt-1 text-2xl font-extrabold text-[#15803d]">{summary.validRows}</p>
              <span className="text-[10px] text-[#166534]">Passed schema check</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("INVALID")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "INVALID" ? "border-[#dc2626] bg-[#fef2f2] ring-2 ring-[#dc2626]/20" : "border-[#fecaca] bg-[#fffbfb] hover:bg-[#fef2f2]"
              }`}
            >
              <span className="text-xs font-bold text-[#b91c1c]">Invalid Rows</span>
              <p className="mt-1 text-2xl font-extrabold text-[#b91c1c]">{summary.invalidRows}</p>
              <span className="text-[10px] text-[#991b1b]">Errors found</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("DUPLICATES")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "DUPLICATES" ? "border-[#d97706] bg-[#fffbeb] ring-2 ring-[#d97706]/20" : "border-[#fde68a] bg-[#fffdf5] hover:bg-[#fffbeb]"
              }`}
            >
              <span className="text-xs font-bold text-[#b45309]">Duplicates</span>
              <p className="mt-1 text-2xl font-extrabold text-[#b45309]">{summary.duplicates}</p>
              <span className="text-[10px] text-[#92400e]">Batch & registry matches</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("WARNINGS")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "WARNINGS" ? "border-[#7e22ce] bg-[#faf5ff] ring-2 ring-[#7e22ce]/20" : "border-[#e9d5ff] bg-[#fdfcff] hover:bg-[#faf5ff]"
              }`}
            >
              <span className="text-xs font-bold text-[#6b21a8]">Quality Warnings</span>
              <p className="mt-1 text-2xl font-extrabold text-[#6b21a8]">{summary.warnings}</p>
              <span className="text-[10px] text-[#581c87]">Heuristics triggered</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter("VERIFIED_CONFLICTS")}
              className={`rounded-3xl border p-4 text-left shadow-xs transition-all ${
                activeFilter === "VERIFIED_CONFLICTS" ? "border-[#dc2626] bg-[#fee2e2] ring-2 ring-[#dc2626]/30" : "border-[#fca5a5] bg-[#fff5f5] hover:bg-[#fee2e2]"
              }`}
            >
              <span className="text-xs font-bold text-[#991b1b]">Verified Conflicts</span>
              <p className="mt-1 text-2xl font-extrabold text-[#991b1b]">{summary.existingVerifiedConflicts}</p>
              <span className="text-[10px] text-[#7f1d1d]">Overwrite locked</span>
            </button>
          </div>
        </section>
      )}

      {/* ─── Interactive Row-by-Row Review & Resolution ─── */}
      {rows.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-[#1b6b50]" />
              <h3 className="text-base font-bold text-[#113c39]">
                Interactive Admin Review & Resolution ({filteredRows.length} of {rows.length})
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#1b6b50]">
                {rows.filter((r) => r.resolution.isAccepted).length} of {rows.length} rows accepted for commit
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {filteredRows.map((row) => (
              <div
                key={row.rowNumber}
                className={`rounded-3xl border p-5 transition-all shadow-xs ${
                  !row.validation.isValid
                    ? "border-[#fca5a5] bg-[#fffafa]"
                    : row.duplicateCheck.isExistingVerified
                    ? "border-[#fed7aa] bg-[#fffdfa]"
                    : "border-[#dce5e3] bg-white"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#edf3f1]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-[#edf5f2] px-2 py-0.5 text-xs font-bold text-[#113c39]">
                        Row {row.rowNumber}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#113c39]">
                        {row.normalized.name || "Untitled"}
                      </h4>
                      <span className="text-xs text-[#6e8580]">
                        • {row.normalized.city}, {row.normalized.state || row.normalized.country}
                      </span>
                      <span className="rounded-md bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-bold text-[#475569]">
                        {row.normalized.hospitalType}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6e8580] mt-1 font-mono">
                      Slug: {row.normalized.slug}
                    </p>
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {row.validation.isValid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-[11px] font-bold text-[#2e7d32]">
                        <CheckCircle2 className="size-3" /> Valid Schema
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ffebee] px-2.5 py-0.5 text-[11px] font-bold text-[#c62828]">
                        <XCircle className="size-3" /> Schema Error
                      </span>
                    )}

                    {row.duplicateCheck.duplicateSource === "EXISTING_REGISTRY" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-bold text-[#0369a1]">
                        <Building2 className="size-3" /> Matches Registry
                      </span>
                    )}

                    {row.duplicateCheck.duplicateSource === "BATCH" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-[11px] font-bold text-[#b45309]">
                        <Layers className="size-3" /> Batch Duplicate
                      </span>
                    )}

                    {row.duplicateCheck.isExistingVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[11px] font-bold text-[#b91c1c]">
                        <ShieldAlert className="size-3" /> Matches Verified Record
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Errors If Any */}
                {row.validation.errors.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-[#fee2e2] p-3 text-xs text-[#991b1b] space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="size-3.5" /> Validation Errors:
                    </span>
                    {row.validation.errors.map((e, idx) => (
                      <p key={idx} className="ml-4">
                        • {e.field}: {e.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Quality Warnings If Any */}
                {row.qualityCheck.warnings.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-[#fffbeb] p-3 text-xs text-[#92400e] space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[#b45309]">
                      <AlertTriangle className="size-3.5" /> Quality & Heuristic Warnings:
                    </span>
                    {row.qualityCheck.warnings.map((w, idx) => (
                      <p key={idx} className="ml-4">
                        • {w.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Normalized Treatment & Outcome Data Preview */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#35534c] bg-[#f8faf9] rounded-2xl p-3">
                  <div>
                    <span className="font-bold text-[#113c39] block mb-0.5">Treatment & Cost:</span>
                    {row.normalized.treatmentCost ? (
                      <p>
                        {row.normalized.treatmentCost.diseaseName}:{" "}
                        <strong className="text-[#1b6b50]">
                          {row.normalized.treatmentCost.currency}{" "}
                          {row.normalized.treatmentCost.minAmount.toLocaleString()} –{" "}
                          {row.normalized.treatmentCost.maxAmount.toLocaleString()}
                        </strong>
                      </p>
                    ) : (
                      <span className="text-[#6e8580]">No treatment cost attached</span>
                    )}
                  </div>

                  <div>
                    <span className="font-bold text-[#113c39] block mb-0.5">Clinical Outcome:</span>
                    {row.normalized.outcome ? (
                      <p>
                        {row.normalized.outcome.label}:{" "}
                        <strong>
                          {row.normalized.outcome.successfulOutcomes} / {row.normalized.outcome.totalPatients} (
                          {row.normalized.outcome.calculatedPercentage.toFixed(1)}%)
                        </strong>
                      </p>
                    ) : (
                      <span className="text-[#6e8580]">No outcome metric attached</span>
                    )}
                  </div>
                </div>

                {/* Verified Overwrite Protection Warning & Checkbox */}
                {row.duplicateCheck.isExistingVerified && (
                  <div className="mt-3 rounded-2xl border-2 border-[#fca5a5] bg-[#fff5f5] p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Lock className="size-4 text-[#b91c1c] shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[#991b1b]">
                          Verified Record Protection: Automatic overwrite is blocked.
                        </p>
                        <p className="text-[11px] text-[#b91c1c] leading-relaxed">
                          This entry matches the verified record <strong>"{row.duplicateCheck.existingRecordName}"</strong> in the ground-truth registry.
                        </p>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.resolution.adminConfirmedVerifiedOverwrite}
                            onChange={(e) =>
                              handleToggleVerifiedOverwrite(row.rowNumber, e.target.checked)
                            }
                            className="size-4 rounded text-[#dc2626]"
                          />
                          <span className="text-xs font-bold text-[#7f1d1d]">
                            Confirm Overwrite of Verified Record (Admin Explicit Authorization)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row Resolution Action Control */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#edf3f1]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#526f68]">Admin Action:</span>
                    <select
                      value={row.resolution.action}
                      disabled={!row.validation.isValid}
                      onChange={(e) =>
                        handleUpdateRowAction(row.rowNumber, e.target.value as PipelineRowResolution)
                      }
                      className="rounded-xl border border-[#c9d8d4] bg-white px-3 py-1 text-xs font-bold text-[#113c39] shadow-xs"
                    >
                      <option value="IMPORT_NEW">IMPORT AS NEW RECORD</option>
                      <option value="UPDATE_EXISTING">UPDATE EXISTING RECORD</option>
                      <option value="FLAG_FOR_AUDIT">FLAG FOR CLINICAL AUDIT</option>
                      <option value="SKIP">SKIP / DISCARD</option>
                    </select>
                  </div>

                  <div>
                    {row.resolution.isAccepted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#15803d]">
                        <CheckCircle2 className="size-4" /> Ready for Database Commit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6e8580]">
                        <XCircle className="size-4" /> Skipped / Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Final Commit Section ─── */}
          <div className="mt-8 rounded-3xl border-2 border-[#113c39] bg-[#f7faf8] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#113c39]">
                  Commit Approved Rows to Production Database
                </h3>
                <p className="text-xs text-[#526f68]">
                  {rows.filter((r) => r.resolution.isAccepted).length} approved records will be persisted with audit trails.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  placeholder="Verifier credentials"
                  className="rounded-xl border border-[#c9d8d4] bg-white px-3.5 py-2 text-xs font-semibold text-[#113c39]"
                />
                <button
                  type="button"
                  onClick={handleCommitPipeline}
                  disabled={isProcessing || rows.filter((r) => r.resolution.isAccepted).length === 0}
                  className="flex items-center gap-2 rounded-2xl bg-[#113c39] px-6 py-2.5 text-xs font-bold text-[#d9f6a2] shadow-md hover:bg-[#18524e]"
                >
                  {isProcessing && <Loader2 className="size-4 animate-spin" />}
                  <span>Commit to Database</span>
                </button>
              </div>
            </div>

            {commitMessage && (
              <div className="mt-4 rounded-2xl bg-[#f0fdf4] p-4 text-xs font-bold text-[#15803d] border border-[#bbf7d0]">
                {commitMessage}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
