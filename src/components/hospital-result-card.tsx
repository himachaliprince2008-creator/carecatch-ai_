"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bookmark, Check, ExternalLink, GitCompareArrows, MapPin, Navigation, ShieldCheck, Star } from "lucide-react";

export type HospitalCardData = {
  id: string;
  name: string;
  addressLine1?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  hospitalType: string;
  rating?: string | number | null;
  reviewCount: number;
  updatedAt?: string | null;
  distanceKm?: number | null;
  specializations?: Array<{ specialty: string; disease?: { name: string; outcomes?: OutcomeEvidence[] } }>;
  facilities?: Array<{ name: string }>;
  treatmentCosts?: Array<{ currency: string; minAmount: string | number | null; maxAmount: string | number | null; disease?: { name: string }; source?: { name: string } | null }>;
  verification?: { status: string; source?: { name: string } | null } | null;
  hasIcu?: boolean;
  hasEmergency?: boolean;
  acceptsPmJay?: boolean;
  hasNabhAccreditation?: boolean;
};

type OutcomeEvidence = {
  label: string;
  value?: string | null;
  reportingPeriodStart?: string | null;
  reportingPeriodEnd?: string | null;
  source?: { name: string } | null;
};

export type HospitalResultCardProps = {
  hospital: HospitalCardData;
  outcomeEvidence?: OutcomeEvidence[];
  travelEstimateMinutes?: number | null;
  matchScore?: number;
  matchReason?: string;
  onCompare?: (hospital: HospitalCardData) => void;
  onSave?: (hospital: HospitalCardData) => void;
};

function displayDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function addressFor(hospital: HospitalCardData) {
  return [hospital.addressLine1, hospital.city, hospital.state, hospital.postalCode].filter(Boolean).join(", ");
}

function formatCost(costs: HospitalCardData["treatmentCosts"]) {
  if (!costs?.length) return null;
  const ranges = costs.map((cost) => {
    const minimum = cost.minAmount === null ? null : Number(cost.minAmount);
    const maximum = cost.maxAmount === null ? null : Number(cost.maxAmount);
    if (minimum === null && maximum === null) return null;
    if (minimum === null) return `${cost.currency} ${maximum?.toLocaleString()}`;
    if (maximum === null) return `${cost.currency} ${minimum.toLocaleString()}+`;
    return `${cost.currency} ${minimum.toLocaleString()} - ${maximum.toLocaleString()}`;
  }).filter(Boolean);
  return ranges[0] ?? null;
}

export function HospitalResultCard({ hospital, outcomeEvidence = [], travelEstimateMinutes = null, matchScore, matchReason, onCompare, onSave }: HospitalResultCardProps) {
  const [saved, setSaved] = useState(false);
  const verified = hospital.verification?.status === "VERIFIED";
  const cost = formatCost(hospital.treatmentCosts);
  const coordinates = hospital.latitude != null && hospital.longitude != null ? `${hospital.latitude},${hospital.longitude}` : null;
  const directionsUrl = coordinates ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}` : null;
  const dataSource = hospital.verification?.source?.name ?? hospital.treatmentCosts?.find((item) => item.source)?.source?.name ?? null;
  const specialties = hospital.specializations?.map((item) => item.specialty).filter(Boolean).slice(0, 3) ?? [];
  const facilities = hospital.facilities?.map((item) => item.name).filter(Boolean).slice(0, 5) ?? [];

  function save() {
    if (!onSave) return;
    onSave(hospital);
    setSaved(true);
  }

  return <article className="overflow-hidden rounded-[1.35rem] border border-[#dce8e2] bg-white shadow-[0_10px_28px_rgba(17,60,57,0.05)] transition-shadow hover:shadow-[0_16px_36px_rgba(17,60,57,0.09)]"><div className="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-[#113c39]">{hospital.name}</h3>{verified && <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f4e8] px-2 py-1 text-[10px] font-bold text-[#47775b]"><ShieldCheck size={12} /> Verified</span>}</div><p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[#718780]"><MapPin className="mt-0.5 shrink-0" size={14} /> {addressFor(hospital) || "Address unavailable"}</p></div><div className="flex items-center gap-2"><span className="self-start rounded-lg bg-[#eff8e7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#47775b]">{hospital.hospitalType.replaceAll("_", " ")}</span>{matchScore !== undefined && <span className="self-start rounded-lg bg-[#113c39] px-2.5 py-1 text-[10px] font-bold text-[#c9ee9e]">{matchScore} match</span>}</div></div>
  <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Rating</p><p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#5f6f69]">{hospital.rating != null ? <><Star size={14} className="fill-[#d89a47] text-[#d89a47]" /> {Number(hospital.rating).toFixed(1)} <span className="font-normal text-[#8b9c96]">({hospital.reviewCount})</span></> : "Not available"}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Distance</p><p className="mt-1 text-sm font-bold text-[#5f6f69]">{hospital.distanceKm != null ? `${hospital.distanceKm.toFixed(1)} km` : "Not available"}{travelEstimateMinutes != null && <span className="ml-1 font-normal text-[#8b9c96]">· {travelEstimateMinutes} min</span>}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Treatment cost</p><p className="mt-1 text-sm font-bold text-[#5f6f69]">{cost ?? "Cost data unavailable"}</p></div></div>
  {specialties.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Specialization</p><div className="mt-2 flex flex-wrap gap-1.5">{specialties.map((specialty) => <span key={specialty} className="rounded-full bg-[#f0f6f1] px-2.5 py-1 text-xs font-semibold text-[#52766a]">{specialty}</span>)}</div></div>}
  {facilities.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Facilities</p><div className="mt-2 flex flex-wrap gap-1.5">{facilities.map((facility) => <span key={facility} className="rounded-full border border-[#dce8e2] px-2.5 py-1 text-xs text-[#627b72]">{facility}</span>)}</div></div>}
  {matchReason && <p className="mt-4 rounded-xl border border-[#dce8e2] bg-white p-3 text-xs leading-5 text-[#547269]">Why it matches: {matchReason}</p>}<div className="mt-4 rounded-xl bg-[#f8fbf7] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#91a39d]">Disease-specific outcome evidence</p>{outcomeEvidence.length === 0 ? <p className="mt-1 text-xs font-semibold text-[#7b8e87]">Outcome data unavailable</p> : <div className="mt-2 space-y-1.5">{outcomeEvidence.slice(0, 2).map((outcome) => <div key={`${outcome.label}-${outcome.source?.name ?? "source"}`} className="text-xs text-[#547269]"><p className="font-semibold">Reported outcome data available: {outcome.label}{outcome.value ? ` · ${outcome.value}` : ""}</p><p className="mt-0.5 text-[11px] text-[#80938b]">{outcome.source?.name ? `Source: ${outcome.source.name}` : "Source unavailable"}{outcome.reportingPeriodStart && outcome.reportingPeriodEnd ? ` · ${displayDate(outcome.reportingPeriodStart)} - ${displayDate(outcome.reportingPeriodEnd)}` : " · Reporting period unavailable"}</p></div>)}</div>}</div>
  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#80938b]"><span>{dataSource ? `Data source: ${dataSource}` : "Data source unavailable"}</span><span>{hospital.updatedAt ? `Updated ${displayDate(hospital.updatedAt) ?? "date unavailable"}` : "Last updated unavailable"}</span></div></div><div className="flex flex-wrap gap-2 border-t border-[#edf2ee] bg-[#fbfdfb] px-5 py-3"><Link href={`/hospitals/${hospital.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#113c39] px-3 py-2 text-xs font-bold text-white">View Details <ArrowRight size={14} /></Link><button type="button" onClick={() => onCompare?.(hospital)} disabled={!onCompare} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce8e2] px-3 py-2 text-xs font-bold text-[#52766a] disabled:cursor-not-allowed disabled:opacity-50"><GitCompareArrows size={14} /> Compare</button><button type="button" onClick={save} disabled={!onSave || saved} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce8e2] px-3 py-2 text-xs font-bold text-[#52766a] disabled:cursor-not-allowed disabled:opacity-50">{saved ? <Check size={14} /> : <Bookmark size={14} />} {saved ? "Saved" : "Save"}</button>{directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce8e2] px-3 py-2 text-xs font-bold text-[#52766a]"><Navigation size={14} /> Get Directions <ExternalLink size={12} /></a> : <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#edf2ee] px-3 py-2 text-xs text-[#9aa9a3]"><Navigation size={14} /> Directions unavailable</span>}</div></article>;
}
