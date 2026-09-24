"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Building2,
  CheckCircle2,
  ExternalLink,
  GitCompareArrows,
  IndianRupee,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";

export type SavedHospitalItem = {
  id: string;
  name: string;
  slug: string;
  addressLine1?: string | null;
  city: string;
  state?: string | null;
  hospitalType: string;
  rating?: number | string | null;
  reviewCount: number;
  acceptsPmJay?: boolean;
  hasNabhAccreditation?: boolean;
  specialities: string[];
  facilities: string[];
  costRange: string;
  notes: string;
  savedAt: string;
};

const INITIAL_SAVED_HOSPITALS: SavedHospitalItem[] = [
  {
    id: "hosp-chd-pgimer-01",
    name: "PGIMER (Post Graduate Institute of Medical Education & Research)",
    slug: "pgimer-chandigarh",
    addressLine1: "Sector 12",
    city: "Chandigarh",
    state: "Chandigarh",
    hospitalType: "HOSPITAL",
    rating: 4.9,
    reviewCount: 850,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    specialities: ["Cardiology", "Nephrology", "Ophthalmology", "Oncology"],
    facilities: ["Advanced Cardiac Centre", "Nephrology & Renal Dialysis Unit", "Level 1 Emergency Trauma Center"],
    costRange: "₹12,000 - ₹85,000",
    notes: "Top recommendation for Cardiology & Renal Dialysis. Empaneled under PM-JAY.",
    savedAt: "2026-02-15",
  },
  {
    id: "hosp-del-aiims-05",
    name: "AIIMS (All India Institute of Medical Sciences), New Delhi",
    slug: "aiims-new-delhi",
    addressLine1: "Sri Aurobindo Marg, Ansari Nagar",
    city: "Delhi",
    state: "Delhi",
    hospitalType: "HOSPITAL",
    rating: 4.9,
    reviewCount: 1200,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    specialities: ["Cardiology", "Ophthalmology", "Nephrology"],
    facilities: ["Dr. RP Centre for Ophthalmic Sciences", "Cardio-Thoracic & Neuro Sciences Centre"],
    costRange: "₹2,000 - ₹95,000",
    notes: "Government apex institute. High volume tertiary care and subsidized packages.",
    savedAt: "2026-02-18",
  },
  {
    id: "hosp-chd-fortis-06",
    name: "Fortis Hospital, Mohali / Chandigarh",
    slug: "fortis-hospital-mohali",
    addressLine1: "Sector 62, Phase 8",
    city: "Mohali",
    state: "Punjab",
    hospitalType: "HOSPITAL",
    rating: 4.7,
    reviewCount: 540,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    specialities: ["Cardiology", "Nephrology"],
    facilities: ["Fortis Heart Institute", "Cath Lab"],
    costRange: "₹85,000 - ₹2,40,000",
    notes: "NABH & JCI Accredited multi-specialty institute. Excellent cardiac surgery department.",
    savedAt: "2026-02-20",
  },
  {
    id: "hosp-hp-igmc-02",
    name: "IGMC Shimla (Indira Gandhi Medical College & Hospital)",
    slug: "igmc-shimla",
    addressLine1: "Snowdown, Lakkar Bazaar",
    city: "Shimla",
    state: "Himachal Pradesh",
    hospitalType: "HOSPITAL",
    rating: 4.7,
    reviewCount: 410,
    acceptsPmJay: true,
    hasNabhAccreditation: true,
    specialities: ["Cardiology", "Orthopedics", "Ophthalmology"],
    facilities: ["State Emergency & Trauma Ward", "Cardiovascular ICU Unit"],
    costRange: "₹12,000 - ₹80,000",
    notes: "Primary government medical college in Himachal Pradesh. Himcare / PM-JAY accepted.",
    savedAt: "2026-02-22",
  },
];

export function SavedHospitalsWorkspace() {
  const [items, setItems] = useState<SavedHospitalItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("carematch_saved_hospitals");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_SAVED_HOSPITALS;
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("carematch_saved_hospitals", JSON.stringify(items));
    }
  }, [items]);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartEditNote = (item: SavedHospitalItem) => {
    setEditingNoteId(item.id);
    setTempNote(item.notes);
  };

  const handleSaveNote = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: tempNote.trim() } : item))
    );
    setEditingNoteId(null);
  };

  const filteredItems = items.filter((item) => {
    if (cityFilter !== "ALL" && item.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.specialities.some((s) => s.toLowerCase().includes(q)) ||
        item.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueCities = Array.from(new Set(items.map((i) => i.city)));

  const compareUrl = `/compare?ids=${items.map((i) => i.id).join(",")}`;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="rounded-[1.75rem] border border-[#dce8e2] bg-gradient-to-br from-[#113c39] to-[#1e524d] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c9ee9e]/20 px-3 py-1 text-xs font-bold tracking-wider text-[#c9ee9e] uppercase">
              <Bookmark size={14} /> My Saved Shortlist
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Saved Hospitals & Care Options
            </h1>
            <p className="mt-2 text-sm text-[#b2d5cb] max-w-2xl">
              Compare shortlisted hospitals across Chandigarh, Delhi NCR, Punjab, and Himachal Pradesh. Keep private notes, check PM-JAY eligibility, and simulate out-of-pocket costs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={items.length > 0 ? compareUrl : "/find-care"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c9ee9e] px-4 py-3 text-xs font-bold text-[#113c39] hover:bg-[#b8e388] transition-colors shadow-sm"
            >
              <GitCompareArrows size={16} />
              Compare All ({items.length})
            </Link>
            <Link
              href="/find-care"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              <Plus size={16} />
              Find More Care
            </Link>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-medium text-[#b2d5cb]">Saved Facilities</p>
            <p className="text-xl font-bold mt-1 text-white">{items.length}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-medium text-[#b2d5cb]">PM-JAY Empaneled</p>
            <p className="text-xl font-bold mt-1 text-white">
              {items.filter((i) => i.acceptsPmJay).length} Hospitals
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-medium text-[#b2d5cb]">NABH Accredited</p>
            <p className="text-xl font-bold mt-1 text-white">
              {items.filter((i) => i.hasNabhAccreditation).length} Hospitals
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] font-medium text-[#b2d5cb]">Cities Covered</p>
            <p className="text-xl font-bold mt-1 text-white">{uniqueCities.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#dce8e2] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 focus-within:border-[#7cac83]">
          <Search size={16} className="text-[#86a098]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved hospitals by name, city, or specialty..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]"
          />
        </div>

        {uniqueCities.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#547269]">City:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 text-xs font-bold text-[#355248] outline-none"
            >
              <option value="ALL">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Hospital Shortlist Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#b9cfbf] bg-[#f8fbf7] p-10 text-center">
          <Building2 className="mx-auto text-[#78a286]" size={36} />
          <h3 className="mt-3 text-lg font-bold text-[#2b4d42]">No Saved Hospitals Found</h3>
          <p className="mt-1 text-sm text-[#6c827b] max-w-md mx-auto">
            {searchQuery || cityFilter !== "ALL"
              ? "No hospitals match your search filters. Try clearing the search query or city filter."
              : "Your saved shortlist is currently empty. Explore the directory to save hospitals."}
          </p>
          <Link
            href="/find-care"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#113c39] px-5 py-3 text-xs font-bold text-white hover:bg-[#1a4f4b] transition-colors"
          >
            <Search size={16} /> Explore Hospitals Directory
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredItems.map((hospital) => (
            <article
              key={hospital.id}
              className="flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-[#dce8e2] bg-white shadow-[0_8px_24px_rgba(17,60,57,0.05)] transition-all hover:shadow-[0_14px_32px_rgba(17,60,57,0.09)]"
            >
              <div className="p-5">
                {/* Header Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#113c39] leading-snug">
                      {hospital.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6e857e]">
                      <MapPin size={14} className="shrink-0 text-[#86a098]" />
                      {[hospital.addressLine1, hospital.city, hospital.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(hospital.id)}
                    title="Remove from saved"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#f0d5d0] bg-[#fff5f3] text-[#c45347] hover:bg-[#fdeae7] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Rating & Feature Pills */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {hospital.rating && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#fff8eb] px-2.5 py-1 font-bold text-[#b57c2a]">
                      <Star size={13} className="fill-[#d89a47] text-[#d89a47]" />
                      {Number(hospital.rating).toFixed(1)}{" "}
                      <span className="font-normal text-[#8c9c94]">({hospital.reviewCount})</span>
                    </span>
                  )}
                  {hospital.acceptsPmJay && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#e8f4e8] px-2.5 py-1 font-bold text-[#3d7051]">
                      <CheckCircle2 size={13} /> PM-JAY Empaneled
                    </span>
                  )}
                  {hospital.hasNabhAccreditation && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#edf5fc] px-2.5 py-1 font-bold text-[#2a628f]">
                      <ShieldCheck size={13} /> NABH
                    </span>
                  )}
                  <span className="rounded-lg bg-[#f2f7f4] px-2.5 py-1 font-semibold text-[#547269]">
                    {hospital.hospitalType.replace("_", " ")}
                  </span>
                </div>

                {/* Specialties */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8da099]">
                    Specialities & Key Care
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {hospital.specialities.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full bg-[#f0f6f3] px-2.5 py-0.5 text-xs font-medium text-[#46665c]"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Cost range badge */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f8fbf9] p-3 border border-[#e8f0ec]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8da099]">
                      Estimated Cost Range
                    </p>
                    <p className="text-sm font-bold text-[#113c39] mt-0.5 flex items-center gap-1">
                      <IndianRupee size={14} className="text-[#47775b]" />
                      {hospital.costRange}
                    </p>
                  </div>
                  <Link
                    href={`/cost?hospitalId=${hospital.id}`}
                    className="text-xs font-bold text-[#356149] hover:underline"
                  >
                    Simulate Costs →
                  </Link>
                </div>

                {/* Notes Section */}
                <div className="mt-4 rounded-xl border border-[#e4eee8] bg-[#fcfdfe] p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#637d74]">
                      <MessageSquare size={13} /> My Personal Notes
                    </p>
                    {editingNoteId !== hospital.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEditNote(hospital)}
                        className="text-xs font-bold text-[#3d6e55] hover:underline"
                      >
                        Edit Note
                      </button>
                    )}
                  </div>

                  {editingNoteId === hospital.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        placeholder="Add personal notes (e.g. Doctor recommendation, insurance query...)"
                        rows={2}
                        className="w-full rounded-lg border border-[#c7dbc7] p-2 text-xs text-[#2a453f] outline-none focus:border-[#7cac83]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg px-2.5 py-1 text-xs text-[#718780] hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(hospital.id)}
                          className="rounded-lg bg-[#113c39] px-3 py-1 text-xs font-bold text-white hover:bg-[#1a4f4b]"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-[#4c665d] italic">
                      {hospital.notes || "No notes added yet. Click edit to add a note."}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Bar Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf2ee] bg-[#fbfdfb] px-5 py-3">
                <Link
                  href={`/hospitals/${hospital.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#113c39] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1b524e] transition-colors"
                >
                  View Details <ArrowRight size={14} />
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/compare?ids=${hospital.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs font-bold text-[#52766a] hover:bg-[#f4f9f5] transition-colors"
                  >
                    <GitCompareArrows size={14} /> Compare
                  </Link>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${hospital.name} ${hospital.city}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs font-bold text-[#52766a] hover:bg-[#f4f9f5] transition-colors"
                  >
                    <Navigation size={14} /> <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
