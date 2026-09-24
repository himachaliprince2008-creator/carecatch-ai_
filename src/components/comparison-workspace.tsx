"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Database,
  ExternalLink,
  FlaskConical,
  GitCompareArrows,
  Globe,
  HeartPulse,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Star,
  TestTube2,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from "lucide-react";

/* ─── types ─── */

type DataLabel = "verified" | "hospital-reported" | "estimated" | "demo";

type OutcomeSnippet = {
  label: string;
  value?: string | null;
  reportingPeriodStart?: string | null;
  reportingPeriodEnd?: string | null;
  isSynthetic: boolean;
  source?: { name: string; type: string; isSynthetic: boolean } | null;
};

export type ComparisonHospital = {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  hospitalType: string;
  hasIcu: boolean;
  hasEmergency: boolean;
  acceptsPmJay: boolean;
  hasNabhAccreditation: boolean;
  rating?: number | null;
  reviewCount: number;
  phone?: string | null;
  websiteUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  isSynthetic: boolean;
  updatedAt: string;
  specializations: Array<{ specialty: string; disease: { name: string } }>;
  facilities: Array<{ name: string }>;
  treatmentCosts: Array<{
    currency: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    isSynthetic: boolean;
    disease: { name: string };
    source?: { name: string; type: string; isSynthetic: boolean } | null;
  }>;
  outcomes: OutcomeSnippet[];
  verification?: {
    status: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    source?: { name: string; type: string; isSynthetic: boolean } | null;
  } | null;
};

/* ─── helpers ─── */

function fmt(date?: string | null) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function inferDataLabel(isSynthetic: boolean, sourceType?: string): DataLabel {
  if (isSynthetic) return "demo";
  if (sourceType === "GOVERNMENT") return "verified";
  if (sourceType === "HOSPITAL") return "hospital-reported";
  return "estimated";
}

const LABEL_CFG: Record<DataLabel, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  verified:            { label: "Verified",          color: "#1a7a4a", bg: "#e6f7ee", border: "#a3d9b8", Icon: ShieldCheck },
  "hospital-reported": { label: "Hospital-reported", color: "#5c5a00", bg: "#fdf9e0", border: "#e0db87", Icon: ClipboardList },
  estimated:           { label: "Estimated",         color: "#7b4a0a", bg: "#fff1e0", border: "#f0c87a", Icon: FlaskConical },
  demo:                { label: "Demo / Synthetic",  color: "#5a2d82", bg: "#f3e8fd", border: "#c89cf0", Icon: TestTube2 },
};

function DataBadge({ label, size = "xs" }: { label: DataLabel; size?: "xs" | "sm" }) {
  const cfg = LABEL_CFG[label];
  const Icon = cfg.Icon;
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold ${size === "xs" ? "text-[9px]" : "text-[10px]"}`}
    >
      <Icon size={8} />
      {cfg.label}
    </span>
  );
}

function formatCostRange(costs: ComparisonHospital["treatmentCosts"]) {
  if (!costs.length) return null;
  const valid = costs.filter((c) => c.minAmount != null || c.maxAmount != null);
  if (!valid.length) return null;
  const mins = valid.map((c) => c.minAmount ?? c.maxAmount!).filter((n) => n != null);
  const maxs = valid.map((c) => c.maxAmount ?? c.minAmount!).filter((n) => n != null);
  const currency = valid[0].currency;
  const lo = Math.min(...mins).toLocaleString();
  const hi = Math.max(...maxs).toLocaleString();
  return lo === hi ? `${currency} ${lo}` : `${currency} ${lo} – ${hi}`;
}

function parseOutcomePct(value?: string | null) {
  if (!value) return null;
  const parts = value.split("/").map((p) => p.trim());
  if (parts.length === 2) {
    const s = parseInt(parts[0], 10);
    const t = parseInt(parts[1], 10);
    if (!Number.isNaN(s) && !Number.isNaN(t) && t > 0) return Math.round((s / t) * 100);
  }
  return null;
}

/* ─── Boolean cell ─── */
function BoolCell({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a7a4a]">
      <CheckCircle2 size={14} /> {yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#80938b]">
      <XCircle size={14} /> {no}
    </span>
  );
}

/* ─── Missing cell ─── */
function Missing() {
  return <span className="text-xs text-[#a0b2ac] italic">No data</span>;
}

/* ─── Star row ─── */
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={11} className={n <= rating ? "fill-[#d89a47] text-[#d89a47]" : "fill-[#e2ddd7] text-[#e2ddd7]"} />
      ))}
    </span>
  );
}

/* ─── Verification badge ─── */
function VerifBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; Icon: React.ElementType; label: string }> = {
    VERIFIED: { color: "#1a7a4a", bg: "#e6f7ee", Icon: ShieldCheck, label: "Verified" },
    PENDING:  { color: "#7b5800", bg: "#fff8e0", Icon: ShieldQuestion, label: "Pending" },
    REJECTED: { color: "#8b1a1a", bg: "#fce8e8", Icon: ShieldAlert, label: "Not verified" },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.Icon;
  return (
    <span style={{ color: cfg.color, background: cfg.bg }} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

/* ─── Comparison table ─── */

const CATEGORY_COL_WIDTH = "w-[220px] min-w-[220px] max-w-[220px]";
const COLUMN_WIDTH = "w-[260px] min-w-[260px] max-w-[320px]";

function THead({ hospitals, onRemove }: { hospitals: ComparisonHospital[]; onRemove: (id: string) => void }) {
  return (
    <thead>
      <tr>
        {/* Row label column */}
        <th className={`sticky left-0 z-20 ${CATEGORY_COL_WIDTH} border-b border-r border-[#dce8e2] bg-[#f8fbf7] p-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[#91a39d] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
          Category
        </th>
        {hospitals.map((h) => (
          <th
            key={h.id}
            className={`${COLUMN_WIDTH} border-b border-r border-[#dce8e2] bg-white p-4 align-top last:border-r-0`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/hospitals/${h.id}`} className="text-sm font-bold text-[#113c39] hover:underline leading-tight block">
                  {h.name}
                </Link>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[#718780]">
                  <MapPin size={10} /> {[h.city, h.state].filter(Boolean).join(", ")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded bg-[#eff8e7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#47775b]">
                    {h.hospitalType.replaceAll("_", " ")}
                  </span>
                  {h.isSynthetic && <DataBadge label="demo" />}
                  {h.verification?.status === "VERIFIED" && <DataBadge label="verified" />}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(h.id)}
                aria-label={`Remove ${h.name}`}
                className="shrink-0 rounded-lg p-1 text-[#91a39d] hover:bg-[#fce8e8] hover:text-[#8b1a1a]"
              >
                <X size={14} />
              </button>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

type RowDef = {
  section?: string;
  label: string;
  icon: React.ElementType;
  render: (h: ComparisonHospital) => React.ReactNode;
};

function SectionDivider({ label, icon: Icon, colSpan }: { label: string; icon: React.ElementType; colSpan: number }) {
  return (
    <tr className="bg-[#f3f8f4]">
      <td
        colSpan={colSpan}
        className="border-b border-t border-[#dce8e2] bg-[#f3f8f4] px-4 py-2.5"
      >
        <span className="sticky left-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#52766a]">
          <Icon size={12} />
          {label}
        </span>
      </td>
    </tr>
  );
}

function ComparisonRow({ label, icon: Icon, hospitals, render }: { label: string; icon: React.ElementType; hospitals: ComparisonHospital[]; render: (h: ComparisonHospital) => React.ReactNode }) {
  return (
    <tr className="group hover:bg-[#f8fbf7]/60">
      <td className={`sticky left-0 z-10 ${CATEGORY_COL_WIDTH} border-b border-r border-[#edf2ee] bg-[#f8fbf7] p-4 align-top group-hover:bg-[#f2f8f4] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#52766a]">
          <Icon size={13} className="text-[#7cac93] shrink-0" />
          {label}
        </span>
      </td>
      {hospitals.map((h) => (
        <td key={h.id} className={`${COLUMN_WIDTH} border-b border-r border-[#edf2ee] p-4 align-top text-sm text-[#113c39] last:border-r-0`}>
          {render(h)}
        </td>
      ))}
    </tr>
  );
}

const ROWS: RowDef[] = [
  /* ─ Overview ─ */
  {
    section: "Overview",
    label: "Rating",
    icon: Star,
    render: (h) =>
      h.rating != null ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <StarRow rating={Math.round(h.rating)} />
            <span className="text-sm font-bold text-[#113c39]">{h.rating.toFixed(1)}</span>
          </div>
          <span className="text-[11px] text-[#80938b]">{h.reviewCount} review{h.reviewCount !== 1 ? "s" : ""}</span>
        </div>
      ) : (
        <Missing />
      ),
  },
  {
    label: "Review count",
    icon: Activity,
    render: (h) =>
      h.reviewCount > 0 ? (
        <span className="text-sm font-bold text-[#113c39]">{h.reviewCount.toLocaleString()}</span>
      ) : (
        <Missing />
      ),
  },
  {
    label: "Distance",
    icon: Navigation,
    render: (h) =>
      h.distanceKm != null ? (
        <span className="text-sm font-bold text-[#113c39]">{h.distanceKm.toFixed(1)} km</span>
      ) : (
        <Missing />
      ),
  },

  /* ─ Care capabilities ─ */
  {
    section: "Care capabilities",
    label: "ICU",
    icon: Zap,
    render: (h) => <BoolCell value={h.hasIcu} yes="Available" no="Not available" />,
  },
  {
    label: "Emergency",
    icon: AlertCircle,
    render: (h) => <BoolCell value={h.hasEmergency} yes="Available" no="Not available" />,
  },
  {
    label: "PM-JAY accepted",
    icon: Shield,
    render: (h) => <BoolCell value={h.acceptsPmJay} yes="Accepted" no="Not accepted" />,
  },
  {
    label: "NABH accreditation",
    icon: BadgeCheck,
    render: (h) => <BoolCell value={h.hasNabhAccreditation} yes="Accredited" no="Not accredited" />,
  },

  /* ─ Specializations ─ */
  {
    section: "Specializations & treatments",
    label: "Specializations",
    icon: HeartPulse,
    render: (h) =>
      h.specializations.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {h.specializations.slice(0, 6).map((s, i) => (
            <span key={`${s.specialty}-${i}`} className="rounded-full bg-[#f0f6f1] px-2 py-0.5 text-[10px] font-semibold text-[#52766a]">
              {s.specialty}
            </span>
          ))}
          {h.specializations.length > 6 && (
            <span className="text-[10px] text-[#80938b]">+{h.specializations.length - 6} more</span>
          )}
        </div>
      ) : (
        <Missing />
      ),
  },
  {
    label: "Treatment availability",
    icon: ClipboardList,
    render: (h) => {
      const diseases = [...new Set(h.specializations.map((s) => s.disease.name))];
      return diseases.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {diseases.slice(0, 5).map((d) => (
            <span key={d} className="rounded-full border border-[#dce8e2] px-2 py-0.5 text-[10px] text-[#627b72]">
              {d}
            </span>
          ))}
          {diseases.length > 5 && <span className="text-[10px] text-[#80938b]">+{diseases.length - 5}</span>}
        </div>
      ) : (
        <Missing />
      );
    },
  },

  /* ─ Facilities ─ */
  {
    section: "Facilities",
    label: "Facilities",
    icon: Building2,
    render: (h) =>
      h.facilities.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {h.facilities.slice(0, 5).map((f) => (
            <span key={f.name} className="rounded-full border border-[#dce8e2] px-2 py-0.5 text-[10px] text-[#627b72]">
              {f.name}
            </span>
          ))}
          {h.facilities.length > 5 && <span className="text-[10px] text-[#80938b]">+{h.facilities.length - 5}</span>}
        </div>
      ) : (
        <Missing />
      ),
  },

  /* ─ Costs ─ */
  {
    section: "Estimated costs",
    label: "Cost range",
    icon: CircleDollarSign,
    render: (h) => {
      const range = formatCostRange(h.treatmentCosts);
      const label = h.treatmentCosts.length
        ? inferDataLabel(h.treatmentCosts.some((c) => c.isSynthetic), h.treatmentCosts.find((c) => c.source)?.source?.type)
        : null;
      return range ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-black text-[#113c39]">{range}</span>
          {label && <DataBadge label={label} />}
        </div>
      ) : (
        <Missing />
      );
    },
  },
  {
    label: "Cost breakdown by disease",
    icon: CircleDollarSign,
    render: (h) =>
      h.treatmentCosts.length > 0 ? (
        <div className="space-y-1.5">
          {h.treatmentCosts.slice(0, 3).map((c, i) => {
            const range =
              c.minAmount != null && c.maxAmount != null
                ? `${c.currency} ${c.minAmount.toLocaleString()}–${c.maxAmount.toLocaleString()}`
                : c.minAmount != null
                ? `${c.currency} ${c.minAmount.toLocaleString()}+`
                : `Up to ${c.currency} ${c.maxAmount?.toLocaleString() ?? "—"}`;
            const lbl = inferDataLabel(c.isSynthetic, c.source?.type);
            return (
              <div key={i} className="rounded-lg bg-[#f8fbf7] px-2 py-1.5">
                <p className="text-[10px] text-[#6e9286] font-semibold">{c.disease.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-[#113c39]">{range}</span>
                  <DataBadge label={lbl} />
                </div>
              </div>
            );
          })}
          {h.treatmentCosts.length > 3 && (
            <p className="text-[10px] text-[#80938b]">+{h.treatmentCosts.length - 3} more</p>
          )}
        </div>
      ) : (
        <Missing />
      ),
  },

  /* ─ Outcomes ─ */
  {
    section: "Disease-specific outcome evidence",
    label: "Outcome evidence",
    icon: TrendingUp,
    render: (h) =>
      h.outcomes.length > 0 ? (
        <div className="space-y-2">
          {h.outcomes.slice(0, 3).map((o, i) => {
            const pct = parseOutcomePct(o.value);
            const lbl = inferDataLabel(o.isSynthetic, o.source?.type);
            const pctColor = pct != null ? (pct >= 90 ? "#2d9e6b" : pct >= 70 ? "#d89a47" : "#e05c5c") : null;
            return (
              <div key={i} className="rounded-lg border border-[#edf2ee] bg-white p-2.5">
                <p className="text-[10px] font-semibold text-[#6e9286]">{o.label}</p>
                {pct != null ? (
                  <div className="mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#eaf2ec] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pctColor ?? "#2d9e6b" }} />
                      </div>
                      <span className="text-xs font-black shrink-0" style={{ color: pctColor ?? "#2d9e6b" }}>{pct}%</span>
                    </div>
                    <p className="mt-0.5 text-[9px] text-[#80938b]">{o.value}</p>
                  </div>
                ) : o.value ? (
                  <p className="mt-0.5 text-xs font-semibold text-[#113c39]">{o.value}</p>
                ) : null}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <DataBadge label={lbl} />
                  {o.source?.name && <span className="text-[9px] text-[#80938b] truncate">{o.source.name}</span>}
                </div>
              </div>
            );
          })}
          {h.outcomes.length > 3 && (
            <p className="text-[10px] text-[#80938b]">+{h.outcomes.length - 3} more outcome{h.outcomes.length - 3 !== 1 ? "s" : ""}</p>
          )}
        </div>
      ) : (
        <Missing />
      ),
  },

  /* ─ Verification ─ */
  {
    section: "Verification & data",
    label: "Verification status",
    icon: ShieldCheck,
    render: (h) =>
      h.verification ? (
        <div className="space-y-1.5">
          <VerifBadge status={h.verification.status} />
          {h.verification.verifiedAt && (
            <p className="text-[10px] text-[#80938b]">Verified {fmt(h.verification.verifiedAt)}</p>
          )}
          {h.verification.verifiedBy && (
            <p className="text-[10px] text-[#80938b]">by {h.verification.verifiedBy}</p>
          )}
        </div>
      ) : (
        <Missing />
      ),
  },
  {
    label: "Data source",
    icon: Database,
    render: (h) => {
      const sources: string[] = [];
      if (h.verification?.source?.name) sources.push(h.verification.source.name);
      h.treatmentCosts.forEach((c) => { if (c.source?.name && !sources.includes(c.source.name)) sources.push(c.source.name); });
      h.outcomes.forEach((o) => { if (o.source?.name && !sources.includes(o.source.name)) sources.push(o.source.name); });
      return sources.length > 0 ? (
        <div className="space-y-1">
          {sources.slice(0, 2).map((s) => (
            <p key={s} className="text-xs text-[#52766a]">{s}</p>
          ))}
          {sources.length > 2 && <p className="text-[10px] text-[#80938b]">+{sources.length - 2} more</p>}
        </div>
      ) : (
        <Missing />
      );
    },
  },
  {
    label: "Last updated",
    icon: Activity,
    render: (h) =>
      h.updatedAt ? (
        <span className="text-xs text-[#52766a]">{fmt(h.updatedAt)}</span>
      ) : (
        <Missing />
      ),
  },

  /* ─ Contact ─ */
  {
    section: "Contact",
    label: "Phone",
    icon: Phone,
    render: (h) =>
      h.phone ? (
        <a href={`tel:${h.phone}`} className="flex items-center gap-1 text-xs font-semibold text-[#113c39] hover:underline">
          <Phone size={11} /> {h.phone}
        </a>
      ) : (
        <Missing />
      ),
  },
  {
    label: "Website",
    icon: Globe,
    render: (h) =>
      h.websiteUrl ? (
        <a href={h.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#2a55a3] hover:underline break-all">
          <Globe size={11} /> {h.websiteUrl} <ExternalLink size={9} />
        </a>
      ) : (
        <Missing />
      ),
  },
];

/* ─── Hospital search picker ─── */

type SearchResult = { id: string; name: string; city: string; state?: string | null; hospitalType: string; isSynthetic: boolean };

function HospitalPicker({ selectedIds, onAdd }: { selectedIds: string[]; onAdd: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ query: q, pageSize: "8" });
      const res = await fetch(`/api/hospitals?${params}`);
      const json = await res.json();
      setResults((json.data ?? []).slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-3 py-3 focus-within:border-[#7cac83] focus-within:ring-2 focus-within:ring-[#7cac83]/20">
        <Search size={16} className="shrink-0 text-[#91a39d]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search hospitals to add…"
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-[#9aaba5]"
          aria-label="Search hospitals"
          id="hospital-picker-input"
        />
        {loading && <Loader2 size={14} className="animate-spin text-[#91a39d]" />}
        {query && (
          <button type="button" onClick={() => { setQuery(""); setResults([]); }} className="text-[#91a39d] hover:text-[#52766a]">
            <X size={14} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-[#dce8e2] bg-white shadow-[0_12px_30px_rgba(17,60,57,0.12)] overflow-hidden">
          {results.map((r) => {
            const already = selectedIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                disabled={already}
                onClick={() => { onAdd(r.id); setQuery(""); setResults([]); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${already ? "opacity-50 cursor-not-allowed bg-[#f8fbf7]" : "hover:bg-[#f0f8f2]"}`}
              >
                <div>
                  <p className="font-semibold text-[#113c39]">{r.name}</p>
                  <p className="text-[11px] text-[#718780]">{[r.city, r.state].filter(Boolean).join(", ")} · {r.hospitalType.replaceAll("_", " ")}</p>
                </div>
                {already ? <span className="text-[10px] text-[#80938b]">Added</span> : <Plus size={15} className="text-[#52766a]" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full border-t border-[#edf2ee] py-2 text-center text-[11px] text-[#80938b] hover:bg-[#f8fbf7]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main workspace component ─── */

export function ComparisonWorkspace({ initialHospitals }: { initialHospitals: ComparisonHospital[] }) {
  const [hospitals, setHospitals] = useState<ComparisonHospital[]>(initialHospitals);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const MAX_HOSPITALS = 4;

  async function addHospital(id: string) {
    if (hospitals.some((h) => h.id === id)) return;
    if (hospitals.length >= MAX_HOSPITALS) {
      setError(`You can compare up to ${MAX_HOSPITALS} hospitals at a time.`);
      return;
    }
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/${id}`);
      if (!res.ok) throw new Error("Could not load hospital data.");
      const payload = await res.json();
      const json = payload.data ?? payload;
      const h: ComparisonHospital = {
        id: json.id,
        name: json.name,
        city: json.city,
        state: json.state,
        hospitalType: json.hospitalType,
        hasIcu: json.hasIcu,
        hasEmergency: json.hasEmergency,
        acceptsPmJay: json.acceptsPmJay,
        hasNabhAccreditation: json.hasNabhAccreditation,
        rating: json.rating != null ? Number(json.rating) : null,
        reviewCount: json.reviewCount,
        phone: json.phone ?? null,
        websiteUrl: json.websiteUrl ?? null,
        latitude: json.latitude != null ? Number(json.latitude) : null,
        longitude: json.longitude != null ? Number(json.longitude) : null,
        distanceKm: json.distanceKm ?? null,
        isSynthetic: json.isSynthetic,
        updatedAt: json.updatedAt,
        specializations: json.specializations ?? [],
        facilities: json.facilities ?? [],
        treatmentCosts: (json.treatmentCosts ?? []).map((c: Record<string, unknown>) => ({
          currency: c.currency,
          minAmount: c.minAmount != null ? Number(c.minAmount) : null,
          maxAmount: c.maxAmount != null ? Number(c.maxAmount) : null,
          isSynthetic: c.isSynthetic,
          disease: c.disease,
          source: c.source ?? null,
        })),
        outcomes: (json.specializations ?? []).flatMap((s: Record<string, unknown>) =>
          ((s.disease as Record<string, unknown>)?.outcomes as OutcomeSnippet[] ?? [])
        ),
        verification: json.verification ?? null,
      };
      startTransition(() => setHospitals((prev) => [...prev, h]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hospital.");
    } finally {
      setLoadingId(null);
    }
  }

  function removeHospital(id: string) {
    setHospitals((prev) => prev.filter((h) => h.id !== id));
  }

  function clearAll() {
    setHospitals([]);
  }

  const colSpan = hospitals.length + 1;

  /* Group rows into sections */
  type RowGroup = { section: string; icon: React.ElementType; rows: RowDef[] };
  const groups: RowGroup[] = [];
  let currentGroup: RowGroup | null = null;
  for (const row of ROWS) {
    if (row.section) {
      currentGroup = { section: row.section, icon: row.icon, rows: [row] };
      groups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.rows.push(row);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── controls bar ── */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-[260px] max-w-md">
          <HospitalPicker
            selectedIds={hospitals.map((h) => h.id)}
            onAdd={addHospital}
          />
        </div>
        <div className="flex items-center gap-2">
          {loadingId && (
            <span className="flex items-center gap-2 text-xs text-[#52766a]">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </span>
          )}
          {hospitals.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce8e2] bg-white px-3 py-2.5 text-xs font-bold text-[#52766a] hover:bg-[#fce8e8] hover:text-[#8b1a1a] hover:border-[#f5b8b8]"
            >
              <Trash2 size={13} /> Clear all
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-[#f0c8b7] bg-[#fff4ef] p-3 text-sm text-[#9b5335]">
          <AlertCircle size={16} className="shrink-0" /> {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── empty state ── */}
      {hospitals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#b9cfbf] bg-[#f8fbf7] py-20 text-center">
          <GitCompareArrows size={40} className="mb-4 text-[#91a39d]" />
          <p className="text-lg font-bold text-[#52766a]">Nothing to compare yet</p>
          <p className="mt-1 max-w-sm text-sm text-[#80938b]">
            Use the search above to add up to {MAX_HOSPITALS} hospitals and compare them side by side.
          </p>
          <p className="mt-4 text-xs text-[#91a39d]">
            No hospitals will be ranked — you see the evidence and decide.
          </p>
        </div>
      )}

      {/* ── 1-hospital state ── */}
      {hospitals.length === 1 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#dce8e2] bg-[#f8fbf7] p-4 text-sm text-[#52766a]">
          <Info size={16} className="shrink-0" />
          Add at least one more hospital to start comparing.
        </div>
      )}

      {/* ── comparison table ── */}
      {hospitals.length >= 2 && (
        <>
          {/* Data legend */}
          <div className="rounded-2xl border border-[#dce8e2] bg-white p-4">
            <p className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#91a39d]">
              <Info size={11} /> Data provenance
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(LABEL_CFG) as [DataLabel, (typeof LABEL_CFG)[DataLabel]][]).map(([key, cfg]) => {
                const Icon = cfg.Icon;
                return (
                  <span key={key} style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold">
                    <Icon size={10} /> {cfg.label}
                  </span>
                );
              })}
              <span className="text-[10px] text-[#80938b] self-center pl-1">· "No data" = not available in records</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce8e2] bg-white shadow-sm">
            <table className="w-full border-collapse table-fixed">
              <THead hospitals={hospitals} onRemove={removeHospital} />
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.section}>
                    <SectionDivider label={group.section} icon={group.icon} colSpan={colSpan} />
                    {group.rows.map((row) => (
                      <ComparisonRow
                        key={row.label}
                        label={row.label}
                        icon={row.icon}
                        hospitals={hospitals}
                        render={row.render}
                      />
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* disclaimer */}
          <p className="text-[11px] leading-5 text-[#80938b]">
            <span className="font-bold">Note:</span> CareMatch AI does not rank hospitals or make clinical recommendations. Costs are estimates from available sources. Outcome data is sourced from reporting facilities and third parties — verify independently before making care decisions.
          </p>
        </>
      )}

    </div>
  );
}
