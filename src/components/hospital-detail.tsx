"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Database,
  ExternalLink,
  FlaskConical,
  Globe,
  HeartPulse,
  Info,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Star,
  TestTube2,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ─── types ─── */

export type DataLabel = "verified" | "hospital-reported" | "estimated" | "demo";

export type HospitalDetailData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  addressLine1?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
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
  isSynthetic: boolean;
  createdAt: string;
  updatedAt: string;
  specializations: Array<{
    specialty: string;
    disease: {
      id: string;
      name: string;
      description?: string | null;
      outcomes: Array<{
        id: string;
        label: string;
        description?: string | null;
        value?: string | null;
        reportingPeriodStart?: string | null;
        reportingPeriodEnd?: string | null;
        isSynthetic: boolean;
        source?: { name: string; type: string; url?: string | null; publisher?: string | null; retrievedAt?: string | null; isSynthetic: boolean } | null;
      }>;
    };
  }>;
  facilities: Array<{ id: string; name: string; description?: string | null }>;
  treatmentCosts: Array<{
    id: string;
    currency: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    notes?: string | null;
    isSynthetic: boolean;
    disease: { name: string };
    source?: { name: string; type: string; isSynthetic: boolean } | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    title?: string | null;
    body?: string | null;
    isSynthetic: boolean;
    createdAt: string;
  }>;
  verification?: {
    status: string;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    notes?: string | null;
    source?: { name: string; type: string; url?: string | null; isSynthetic: boolean } | null;
  } | null;
};

/* ─── helpers ─── */

function fmt(date?: string | null) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function buildAddress(h: HospitalDetailData) {
  return [h.addressLine1, h.city, h.state, h.postalCode, h.country].filter(Boolean).join(", ");
}

function mapsUrl(h: HospitalDetailData) {
  if (h.latitude == null || h.longitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`;
}

function embedUrl(h: HospitalDetailData) {
  if (h.latitude == null || h.longitude == null) return null;
  const lon = Number(h.longitude);
  const lat = Number(h.latitude);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.012},${lat - 0.008},${lon + 0.012},${lat + 0.008}&layer=mapnik&marker=${lat},${lon}`;
}

type ParsedOutcome =
  | { success: number; total: number; pct: number }
  | { raw: number }
  | null;

function parseOutcomeNumbers(value?: string | null): ParsedOutcome {
  if (!value) return null;
  const parts = value.split("/").map((p) => p.trim());
  if (parts.length === 2) {
    const success = parseInt(parts[0], 10);
    const total = parseInt(parts[1], 10);
    if (!Number.isNaN(success) && !Number.isNaN(total) && total > 0) {
      return { success, total, pct: Math.round((success / total) * 100) };
    }
  }
  const n = parseInt(parts[0], 10);
  return !Number.isNaN(n) ? { raw: n } : null;
}

/* ─── data provenance ─── */

function inferDataLabel(isSynthetic: boolean, sourceType?: string): DataLabel {
  if (isSynthetic) return "demo";
  if (sourceType === "GOVERNMENT") return "verified";
  if (sourceType === "HOSPITAL") return "hospital-reported";
  return "estimated";
}

const LABEL_CONFIG: Record<DataLabel, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  verified:            { label: "Verified",           color: "#1a7a4a", bg: "#e6f7ee", border: "#a3d9b8", Icon: ShieldCheck },
  "hospital-reported": { label: "Hospital-reported",  color: "#5c5a00", bg: "#fdf9e0", border: "#e0db87", Icon: ClipboardList },
  estimated:           { label: "Estimated",          color: "#7b4a0a", bg: "#fff1e0", border: "#f0c87a", Icon: FlaskConical },
  demo:                { label: "Demo / Synthetic",   color: "#5a2d82", bg: "#f3e8fd", border: "#c89cf0", Icon: TestTube2 },
};

function DataBadge({ label, size = "sm" }: { label: DataLabel; size?: "sm" | "xs" }) {
  const cfg = LABEL_CONFIG[label];
  const Icon = cfg.Icon;
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${size === "xs" ? "text-[10px]" : "text-xs"}`}
    >
      <Icon size={size === "xs" ? 10 : 11} />
      {cfg.label}
    </span>
  );
}

function DataLegend() {
  return (
    <div className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#113c39]">
        <Info size={15} /> Data provenance legend
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.entries(LABEL_CONFIG) as [DataLabel, (typeof LABEL_CONFIG)[DataLabel]][]).map(([key, cfg]) => {
          const Icon = cfg.Icon;
          return (
            <div key={key} className="flex flex-col gap-1 rounded-xl p-3" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: cfg.color }}>
                <Icon size={12} /> {cfg.label}
              </span>
              <span className="text-[10px] leading-4" style={{ color: cfg.color, opacity: 0.8 }}>
                {key === "verified" && "Government or accredited source"}
                {key === "hospital-reported" && "Self-reported by facility"}
                {key === "estimated" && "Third-party or modeled data"}
                {key === "demo" && "Synthetic — not real patient data"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── section wrapper ─── */

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="grid size-8 place-items-center rounded-xl bg-[#113c39] text-[#d9f6a2]">
          <Icon size={15} strokeWidth={2.2} />
        </div>
        <h2 className="text-lg font-bold text-[#113c39]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ─── star row ─── */

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={n <= rating ? "fill-[#d89a47] text-[#d89a47]" : "fill-[#e2ddd7] text-[#e2ddd7]"} />
      ))}
    </span>
  );
}

/* ─── verification status badge ─── */

function VerificationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
    VERIFIED: { label: "Verified",      color: "#1a7a4a", bg: "#e6f7ee", Icon: ShieldCheck },
    PENDING:  { label: "Pending review",color: "#7b5800", bg: "#fff8e0", Icon: ShieldQuestion },
    REJECTED: { label: "Not verified",  color: "#8b1a1a", bg: "#fce8e8", Icon: ShieldAlert },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.Icon;
  return (
    <span style={{ color: cfg.color, background: cfg.bg }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold">
      <Icon size={16} /> {cfg.label}
    </span>
  );
}

/* ─── outcome evidence card ─── */

function OutcomeCard({ outcome, diseaseLabel }: {
  outcome: HospitalDetailData["specializations"][0]["disease"]["outcomes"][0] & { diseaseName: string };
  diseaseLabel: string;
}) {
  const parsed = parseOutcomeNumbers(outcome.value);
  const label = inferDataLabel(outcome.isSynthetic, outcome.source?.type);
  const parsedWithPct = parsed && "pct" in parsed ? parsed : null;
  const pctColor = parsedWithPct
    ? parsedWithPct.pct >= 90 ? "#2d9e6b" : parsedWithPct.pct >= 70 ? "#d89a47" : "#e05c5c"
    : "#2d9e6b";

  return (
    <div className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e9286]">{diseaseLabel}</p>
          <h4 className="mt-0.5 text-sm font-bold text-[#113c39]">{outcome.label}</h4>
        </div>
        <DataBadge label={label} />
      </div>

      {parsedWithPct && (
        <div className="mb-4">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#f8fbf7] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#91a39d]">Reported patients</p>
              <p className="mt-1 text-xl font-black text-[#113c39]">{parsedWithPct.total.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-[#f8fbf7] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#91a39d]">Successful outcomes</p>
              <p className="mt-1 text-xl font-black" style={{ color: pctColor }}>{parsedWithPct.success.toLocaleString()}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: `${pctColor}18` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#91a39d]">Outcome rate</p>
              <p className="mt-1 text-2xl font-black" style={{ color: pctColor }}>{parsedWithPct.pct}%</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-[#eaf2ec] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${parsedWithPct.pct}%`, background: pctColor }} />
          </div>
          <p className="mt-1.5 text-[10px] text-[#80938b]">
            Calculated reported outcome percentage · {parsedWithPct.success.toLocaleString()} of {parsedWithPct.total.toLocaleString()} reported patients
          </p>
        </div>
      )}

      {parsed && "raw" in parsed && (
        <div className="mb-3 rounded-xl bg-[#f8fbf7] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Reported value</p>
          <p className="mt-1 text-2xl font-black text-[#113c39]">{(parsed as { raw: number }).raw.toLocaleString()}</p>
        </div>
      )}

      {!parsed && outcome.value && (
        <div className="mb-3 rounded-xl bg-[#f8fbf7] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Reported outcome</p>
          <p className="mt-1 text-sm font-semibold text-[#113c39]">{outcome.value}</p>
        </div>
      )}

      {outcome.description && (
        <p className="mb-3 text-xs leading-5 text-[#5a7269]">{outcome.description}</p>
      )}

      <div className="mt-3 grid gap-1.5 rounded-xl bg-[#f8fbf7] p-3 text-[11px] text-[#7b8e87] sm:grid-cols-3 border border-[#edf2ee]">
        <div>
          <span className="block font-bold text-[#91a39d]">Reporting period</span>
          {outcome.reportingPeriodStart && outcome.reportingPeriodEnd
            ? `${fmt(outcome.reportingPeriodStart)} – ${fmt(outcome.reportingPeriodEnd)}`
            : "Not specified"}
        </div>
        <div>
          <span className="block font-bold text-[#91a39d]">Source</span>
          {outcome.source?.name ?? "Not specified"}
          {outcome.source?.publisher && ` · ${outcome.source.publisher}`}
        </div>
        <div>
          <span className="block font-bold text-[#91a39d]">Verification status</span>
          {label === "verified" ? "Government-verified"
            : label === "hospital-reported" ? "Hospital-reported"
            : label === "demo" ? "Synthetic / demo data"
            : "Third-party estimated"}
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─── */

export function HospitalDetail({ hospital }: { hospital: HospitalDetailData }) {
  const [saved, setSaved] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(false);

  const verified = hospital.verification?.status === "VERIFIED";
  const directionsUrl = mapsUrl(hospital);
  const mapEmbed = embedUrl(hospital);

  const allOutcomes = hospital.specializations.flatMap((s) =>
    s.disease.outcomes.map((o) => ({ ...o, diseaseName: s.disease.name })),
  );

  const displayedReviews = expandedReviews ? hospital.reviews : hospital.reviews.slice(0, 3);

  const sections = [
    { id: "overview",     label: "Overview" },
    { id: "location",     label: "Location & map" },
    { id: "contact",      label: "Contact" },
    { id: "facilities",   label: "Facilities" },
    { id: "specializations", label: "Specializations" },
    { id: "costs",        label: "Estimated costs" },
    { id: "outcomes",     label: "Outcome evidence" },
    { id: "reviews",      label: "Reviews" },
    { id: "verification", label: "Verification" },
    { id: "datasources",  label: "Data sources" },
  ];

  return (
    <div className="mx-auto max-w-7xl">

      {/* ── breadcrumb + header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/hospitals" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#52766a] hover:text-[#113c39]">
            <ArrowLeft size={14} /> All hospitals
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[#113c39] sm:text-4xl">{hospital.name}</h1>
            {verified && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f7ee] px-3 py-1.5 text-sm font-bold text-[#1a7a4a]">
                <ShieldCheck size={15} /> Verified
              </span>
            )}
            {hospital.isSynthetic && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3e8fd] px-3 py-1.5 text-sm font-bold text-[#5a2d82]">
                <TestTube2 size={15} /> Demo data
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-[#718780]">
            <MapPin size={14} /> {buildAddress(hospital)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${saved ? "border-[#2d9e6b] bg-[#e6f7ee] text-[#1a7a4a]" : "border-[#dce8e2] bg-white text-[#52766a] hover:bg-[#f0f8f2]"}`}
          >
            {saved ? <Check size={16} /> : <Bookmark size={16} />}
            {saved ? "Saved" : "Save"}
          </button>
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-4 py-2.5 text-sm font-bold text-[#52766a] hover:bg-[#f0f8f2]"
            >
              <Navigation size={16} /> Directions
            </a>
          )}
        </div>
      </div>

      {/* demo warning */}
      {hospital.isSynthetic && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#c89cf0] bg-[#f3e8fd] p-4 text-sm text-[#5a2d82]">
          <TestTube2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Demo / Synthetic data</p>
            <p className="mt-0.5 text-xs leading-5 opacity-80">
              This hospital record contains synthetic data generated for demonstration purposes. It does not represent a real facility or real patient outcomes.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">

        {/* ── sticky side nav ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[#dce8e2] bg-white p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#91a39d]">On this page</p>
            <nav className="space-y-0.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#637773] hover:bg-[#f0f8f2] hover:text-[#113c39] transition-colors"
                >
                  <span className="size-1.5 rounded-full bg-[#dce8e2]" />
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── main content ── */}
        <div className="space-y-10">

          <DataLegend />

          {/* OVERVIEW */}
          <Section id="overview" icon={Activity} title="Hospital overview">
            <div className="rounded-2xl border border-[#dce8e2] bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#eff8e7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#47775b]">
                  {hospital.hospitalType.replaceAll("_", " ")}
                </span>
                {hospital.hasIcu && <span className="rounded-lg bg-[#e8f0ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#2a55a3]">ICU</span>}
                {hospital.hasEmergency && <span className="rounded-lg bg-[#fce8e8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b1a1a]">Emergency</span>}
                {hospital.acceptsPmJay && <span className="rounded-lg bg-[#fff1e0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7b4a0a]">Accepts PM-JAY</span>}
                {hospital.hasNabhAccreditation && <span className="rounded-lg bg-[#e6f7ee] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#1a7a4a]">NABH Accredited</span>}
              </div>
              {hospital.description && <p className="mb-5 text-sm leading-6 text-[#5a7269]">{hospital.description}</p>}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f8fbf7] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Rating</p>
                  {hospital.rating != null ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <StarRow rating={Math.round(hospital.rating)} />
                      <span className="text-sm font-bold text-[#113c39]">{hospital.rating.toFixed(1)}</span>
                      <span className="text-xs text-[#8b9c96]">({hospital.reviewCount})</span>
                    </div>
                  ) : <p className="mt-1 text-sm text-[#8b9c96]">Not available</p>}
                </div>
                <div className="rounded-xl bg-[#f8fbf7] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Specializations</p>
                  <p className="mt-1 text-2xl font-black text-[#113c39]">{hospital.specializations.length}</p>
                </div>
                <div className="rounded-xl bg-[#f8fbf7] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Last updated</p>
                  <p className="mt-1 text-sm font-bold text-[#113c39]">{fmt(hospital.updatedAt) ?? "—"}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* LOCATION */}
          <Section id="location" icon={MapPin} title="Location & map">
            <div className="overflow-hidden rounded-2xl border border-[#dce8e2] bg-white shadow-sm">
              {mapEmbed ? (
                <iframe title={`Map for ${hospital.name}`} src={mapEmbed} className="h-64 w-full border-0" loading="lazy" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-[#f8fbf7] text-sm text-[#80938b]">
                  <MapPin size={18} className="mr-2" /> Map coordinates unavailable
                </div>
              )}
              <div className="p-5">
                <div className="flex flex-wrap gap-6 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Address</p>
                    <p className="mt-1 text-sm text-[#113c39]">{buildAddress(hospital)}</p>
                  </div>
                  {hospital.latitude != null && hospital.longitude != null && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Coordinates</p>
                      <p className="mt-1 font-mono text-xs text-[#113c39]">
                        {Number(hospital.latitude).toFixed(5)}, {Number(hospital.longitude).toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#113c39] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1a5c57]"
                  >
                    <Navigation size={15} /> Open in Google Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </Section>

          {/* CONTACT */}
          <Section id="contact" icon={Phone} title="Contact information">
            <div className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Phone</p>
                  {hospital.phone ? (
                    <a href={`tel:${hospital.phone}`} className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#113c39] hover:underline">
                      <Phone size={14} /> {hospital.phone}
                    </a>
                  ) : <p className="mt-1 text-sm text-[#8b9c96]">Not available</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Website</p>
                  {hospital.websiteUrl ? (
                    <a href={hospital.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2a55a3] hover:underline break-all">
                      <Globe size={14} /> {hospital.websiteUrl} <ExternalLink size={11} />
                    </a>
                  ) : <p className="mt-1 text-sm text-[#8b9c96]">Not available</p>}
                </div>
              </div>
            </div>
          </Section>

          {/* FACILITIES */}
          <Section id="facilities" icon={Zap} title="Facilities">
            {hospital.facilities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-white p-6 text-center text-sm text-[#8b9c96]">No facility data available</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hospital.facilities.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-[#dce8e2] bg-white p-4 shadow-sm">
                    <p className="text-sm font-bold text-[#113c39]">{f.name}</p>
                    {f.description && <p className="mt-1 text-xs leading-5 text-[#718780]">{f.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* SPECIALIZATIONS */}
          <Section id="specializations" icon={HeartPulse} title="Specializations">
            {hospital.specializations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-white p-6 text-center text-sm text-[#8b9c96]">No specialization data available</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {hospital.specializations.map((s, i) => (
                  <div key={`${s.specialty}-${i}`} className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e9286]">{s.disease.name}</p>
                        <p className="mt-0.5 text-base font-bold text-[#113c39]">{s.specialty}</p>
                      </div>
                      <span className="rounded-full bg-[#f0f6f1] px-2.5 py-1 text-[10px] font-semibold text-[#52766a]">
                        {s.disease.outcomes.length} outcome{s.disease.outcomes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {s.disease.description && <p className="mt-2 text-xs leading-5 text-[#718780]">{s.disease.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* COSTS */}
          <Section id="costs" icon={CircleDollarSign} title="Estimated costs">
            {hospital.treatmentCosts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-white p-6 text-center text-sm text-[#8b9c96]">No cost data available</div>
            ) : (
              <div className="space-y-3">
                {hospital.treatmentCosts.map((cost) => {
                  const lbl = inferDataLabel(cost.isSynthetic, cost.source?.type);
                  return (
                    <div key={cost.id} className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e9286]">{cost.disease.name}</p>
                          <p className="mt-1 text-xl font-black text-[#113c39]">
                            {cost.minAmount != null && cost.maxAmount != null
                              ? `${cost.currency} ${cost.minAmount.toLocaleString()} – ${cost.maxAmount.toLocaleString()}`
                              : cost.minAmount != null
                              ? `${cost.currency} ${cost.minAmount.toLocaleString()}+`
                              : cost.maxAmount != null
                              ? `Up to ${cost.currency} ${cost.maxAmount.toLocaleString()}`
                              : "Cost not specified"}
                          </p>
                        </div>
                        <DataBadge label={lbl} />
                      </div>
                      {cost.notes && <p className="mt-2 text-xs text-[#718780]">{cost.notes}</p>}
                      <p className="mt-2 text-[11px] text-[#80938b]">Source: {cost.source?.name ?? "Not specified"}</p>
                    </div>
                  );
                })}
                <p className="text-xs leading-5 text-[#80938b]">
                  * Costs are estimates and may vary. Consult the hospital directly for authoritative pricing.
                </p>
              </div>
            )}
          </Section>

          {/* OUTCOMES */}
          <Section id="outcomes" icon={TrendingUp} title="Disease-specific outcome evidence">
            {allOutcomes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-white p-8 text-center">
                <Activity size={24} className="mx-auto mb-3 text-[#91a39d]" />
                <p className="text-sm font-semibold text-[#8b9c96]">No outcome evidence on record</p>
                <p className="mt-1 text-xs text-[#a0b2ac]">Outcome data is reported by verified sources when available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allOutcomes.map((o) => (
                  <OutcomeCard key={o.id} outcome={o} diseaseLabel={o.diseaseName} />
                ))}
              </div>
            )}
          </Section>

          {/* REVIEWS */}
          <Section id="reviews" icon={Star} title="Patient reviews">
            {hospital.reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce8e2] bg-white p-6 text-center text-sm text-[#8b9c96]">No reviews on record</div>
            ) : (
              <div className="space-y-3">
                {displayedReviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-[#dce8e2] bg-white p-5 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StarRow rating={review.rating} />
                        {review.isSynthetic && <DataBadge label="demo" size="xs" />}
                      </div>
                      <span className="text-[11px] text-[#80938b]">{fmt(review.createdAt)}</span>
                    </div>
                    {review.title && <p className="text-sm font-bold text-[#113c39]">{review.title}</p>}
                    {review.body && <p className="mt-1 text-xs leading-5 text-[#5a7269]">{review.body}</p>}
                  </div>
                ))}
                {hospital.reviews.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setExpandedReviews(!expandedReviews)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce8e2] bg-white py-3 text-xs font-bold text-[#52766a] hover:bg-[#f0f8f2]"
                  >
                    {expandedReviews ? <><ChevronUp size={14} /> Show fewer</> : <><ChevronDown size={14} /> Show all {hospital.reviews.length} reviews</>}
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* VERIFICATION */}
          <Section id="verification" icon={ShieldCheck} title="Verification">
            <div className="rounded-2xl border border-[#dce8e2] bg-white p-6 shadow-sm">
              {hospital.verification ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <VerificationStatusBadge status={hospital.verification.status} />
                    {hospital.verification.verifiedAt && (
                      <span className="text-xs text-[#718780]">
                        <Clock size={13} className="mr-1 inline" />
                        Verified {fmt(hospital.verification.verifiedAt)}
                      </span>
                    )}
                    {hospital.verification.verifiedBy && (
                      <span className="text-xs text-[#718780]">
                        <BadgeCheck size={13} className="mr-1 inline" />
                        by {hospital.verification.verifiedBy}
                      </span>
                    )}
                  </div>
                  {hospital.verification.notes && (
                    <div className="rounded-xl bg-[#f8fbf7] p-4 text-sm text-[#5a7269]">{hospital.verification.notes}</div>
                  )}
                  {hospital.verification.source && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Verification source</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <DataBadge label={inferDataLabel(hospital.verification.source.isSynthetic, hospital.verification.source.type)} />
                        <span className="text-sm text-[#113c39]">{hospital.verification.source.name}</span>
                        {hospital.verification.source.url && (
                          <a href={hospital.verification.source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#2a55a3] hover:underline">
                            <ExternalLink size={11} /> View source
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-[#80938b]">
                  <ShieldQuestion size={20} /> No verification information available
                </div>
              )}
            </div>
          </Section>

          {/* DATA SOURCES */}
          <Section id="datasources" icon={Database} title="Data sources">
            <div className="overflow-hidden rounded-2xl border border-[#dce8e2] bg-white shadow-sm divide-y divide-[#edf2ee]">
              {(() => {
                const seen = new Set<string>();
                const sources: Array<{
                  name: string; type: string;
                  url?: string | null; publisher?: string | null;
                  retrievedAt?: string | null; isSynthetic: boolean;
                }> = [];

                const add = (s: typeof sources[0] | null | undefined) => {
                  if (s && !seen.has(s.name)) { seen.add(s.name); sources.push(s); }
                };

                hospital.treatmentCosts.forEach((c) => add(c.source));
                hospital.specializations.forEach((s) => s.disease.outcomes.forEach((o) => add(o.source)));
                if (hospital.verification?.source) add(hospital.verification.source);

                if (sources.length === 0) {
                  return <p className="p-5 text-sm text-[#80938b]">No data source information available</p>;
                }

                return sources.map((src) => (
                  <div key={src.name} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#113c39]">{src.name}</p>
                        {src.publisher && <p className="mt-0.5 text-xs text-[#718780]">{src.publisher}</p>}
                      </div>
                      <DataBadge label={inferDataLabel(src.isSynthetic, src.type)} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#80938b]">
                      <span className="font-bold uppercase tracking-wider text-[#91a39d]">{src.type}</span>
                      {src.retrievedAt && <span>Retrieved {fmt(src.retrievedAt)}</span>}
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#2a55a3] hover:underline">
                          <ExternalLink size={11} /> {src.url}
                        </a>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Section>

          {/* FOOTER META */}
          <div className="rounded-2xl border border-[#dce8e2] bg-[#f8fbf7] p-5">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#80938b]">
              <span><Clock size={12} className="mr-1 inline" />Record created: {fmt(hospital.createdAt) ?? "—"}</span>
              <span><Clock size={12} className="mr-1 inline" />Last updated: {fmt(hospital.updatedAt) ?? "—"}</span>
              <span><Database size={12} className="mr-1 inline" />Record ID: {hospital.id}</span>
              {hospital.isSynthetic && (
                <span className="flex items-center gap-1 font-semibold text-[#5a2d82]">
                  <AlertCircle size={12} /> Synthetic / demo record — not real clinical data
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
