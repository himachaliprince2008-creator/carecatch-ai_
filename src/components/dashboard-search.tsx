"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Building2, Check, IndianRupee, LocateFixed, Loader2, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { HospitalResultCard, type HospitalCardData } from "@/components/hospital-result-card";

type SearchState = { data: HospitalCardData[]; meta: { total: number }; };

const radiusOptions = ["1", "5", "10", "25", "50"];

export function DashboardSearch() {
  const [disease, setDisease] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState("25");
  const [budget, setBudget] = useState("");
  const [hospitalType, setHospitalType] = useState("");
  const [sort, setSort] = useState("name");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [filters, setFilters] = useState({ icu: false, emergency: false, pmJay: false, nabh: false });
  const [result, setResult] = useState<SearchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (disease.trim()) params.set("specialty", disease.trim());
    if (location.trim()) params.set("city", location.trim());
    if (budget.trim()) params.set("maximumBudget", budget.trim());
    if (hospitalType) params.set("hospitalType", hospitalType);
    if (filters.icu) params.set("icu", "true");
    if (filters.emergency) params.set("emergency", "true");
    if (filters.pmJay) params.set("pmJay", "true");
    if (filters.nabh) params.set("nabh", "true");
    params.set("sort", sort);
    if (coordinates && radius) {
      params.set("latitude", String(coordinates.latitude));
      params.set("longitude", String(coordinates.longitude));
      params.set("radius", radius);
    }
    if (sort === "distance" && !coordinates) {
      setError("Distance sorting needs your location. Use the location button first.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/hospitals?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Search could not be completed.");
      setResult(payload as SearchState);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search could not be completed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
        setError(null);
      },
      () => {
        setLocating(false);
        setError("Location permission was not granted. You can still search by city.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return <section className="rounded-[1.5rem] border border-[#dce5e3] bg-white p-5 shadow-[0_12px_35px_rgba(17,60,57,0.05)] sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6e9286]"><Search size={14} /> Find care</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Start with what matters to you</h3><p className="mt-1 text-sm text-[#7b8d88]">Search the connected hospital records using practical filters.</p></div><button type="button" className="inline-flex items-center gap-2 self-start rounded-xl border border-[#dce5e3] px-3 py-2 text-xs font-bold text-[#52766a] hover:bg-[#f5faf5]"><SlidersHorizontal size={15} /> Save search</button></div>
    <form onSubmit={search} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-[#547269]">Disease or treatment</span><div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 focus-within:border-[#7cac83]"><Search size={17} className="text-[#86a098]" /><input value={disease} onChange={(event) => setDisease(event.target.value)} placeholder="e.g. Ophthalmology, kidney care" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]" /></div></label><label><span className="mb-1.5 block text-xs font-bold text-[#547269]">Location</span><div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 focus-within:border-[#7cac83]"><MapPin size={17} className="text-[#86a098]" /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]" /><button type="button" onClick={useMyLocation} title="Use my location" aria-label="Use my location" className="grid size-7 shrink-0 place-items-center rounded-lg text-[#4f8964] hover:bg-[#e8f4e8]">{locating ? <Loader2 className="animate-spin" size={15} /> : <LocateFixed size={15} />}</button></div></label><label><span className="mb-1.5 block text-xs font-bold text-[#547269]">Budget ceiling (₹ INR)</span><div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 focus-within:border-[#7cac83]"><IndianRupee size={17} className="text-[#86a098]" /><input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Target max (₹ INR)" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]" /></div></label><label><span className="mb-1.5 block text-xs font-bold text-[#547269]">Radius</span><select value={radius} onChange={(event) => setRadius(event.target.value)} className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none"><option value="">Any distance</option>{radiusOptions.map((value) => <option key={value} value={value}>{value} km</option>)}</select></label><label><span className="mb-1.5 block text-xs font-bold text-[#547269]">Hospital type</span><select value={hospitalType} onChange={(event) => setHospitalType(event.target.value)} className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none"><option value="">Any type</option><option value="HOSPITAL">Hospital</option><option value="CLINIC">Clinic</option><option value="SPECIALTY_CENTER">Specialty center</option><option value="AMBULATORY_CENTER">Ambulatory center</option></select></label><label><span className="mb-1.5 block text-xs font-bold text-[#547269]">Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-3 text-sm outline-none"><option value="name">Name</option><option value="newest">Newest</option><option value="distance">Distance</option></select></label><div className="flex items-end"><button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#113c39] px-4 py-3 text-sm font-bold text-white hover:bg-[#1c514b] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />} Search hospitals</button></div></form>
    <div className="mt-5 flex flex-wrap gap-2">{Object.entries({ icu: "ICU", emergency: "Emergency", pmJay: "PM-JAY", nabh: "NABH" }).map(([key, label]) => <button type="button" key={key} onClick={() => setFilters((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${filters[key as keyof typeof filters] ? "border-[#83aa7a] bg-[#e8f4e8] text-[#386b50]" : "border-[#d8e5df] bg-white text-[#70857d] hover:bg-[#f4faf3]"}`}>{filters[key as keyof typeof filters] && <Check size={13} />}{label}</button>)}</div>
    {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-[#f0c8b7] bg-[#fff4ef] p-4 text-sm text-[#9b5335]"><AlertCircle className="mt-0.5 shrink-0" size={18} /><span>{error}</span></div>}
    {result && <div className="mt-7 border-t border-[#e8efeb] pt-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6e9286]">Search results</p><p className="mt-1 text-sm text-[#71827e]">{result.meta.total} database records matched</p></div><Link href="/hospitals" className="inline-flex items-center gap-1 text-xs font-bold text-[#47775b]">Open directory <ArrowRight size={14} /></Link></div>{result.data.length === 0 ? <div className="rounded-xl border border-dashed border-[#b9cfbf] bg-[#f8fbf7] p-6 text-center"><Building2 className="mx-auto text-[#78a286]" size={24} /><p className="mt-2 text-sm font-bold text-[#42665a]">No matching hospitals found</p><p className="mt-1 text-xs text-[#81948d]">Try broadening the filters. No records were invented for this search.</p></div> : <div className="space-y-4">{result.data.slice(0, 6).map((hospital) => <HospitalResultCard key={hospital.id} hospital={hospital} outcomeEvidence={hospital.specializations?.flatMap((specialization) => specialization.disease?.outcomes ?? [])} />)}</div>}</div>}
  </section>;
}
