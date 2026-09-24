"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  IndianRupee,
  Compass,
  Filter,
  Info,
  Layers,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { HealthcareMap } from "@/components/map/healthcare-map";
import {
  type HospitalLocationData,
  type BudgetStatus,
  CITY_COORDINATES_MAP,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getBudgetCompatibility,
  calculateDistanceKm,
} from "@/lib/map-utils";

type SearchState = {
  data: HospitalLocationData[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
};

const radiusOptions = [
  { label: "Any distance", value: "" },
  { label: "5 km radius", value: "5" },
  { label: "10 km radius", value: "10" },
  { label: "25 km radius", value: "25" },
  { label: "50 km radius", value: "50" },
  { label: "100 km radius", value: "100" },
];

export function MapWorkspace() {
  // Filter state
  const [disease, setDisease] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [radius, setRadius] = useState("25");
  const [hospitalType, setHospitalType] = useState("");
  const [sort, setSort] = useState("name");
  const [filters, setFilters] = useState({
    icu: false,
    emergency: false,
    pmJay: false,
    nabh: false,
  });

  // Geolocation state (Privacy-first)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Selection & UI view state
  const [hospitals, setHospitals] = useState<HospitalLocationData[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalLocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "list">("map"); // Mobile layout toggle
  const [showFilterPanel, setShowFilterPanel] = useState(true);

  // Map center state
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);

  const budgetCeiling = budget.trim() ? Number(budget.trim()) : null;

  async function fetchHospitals(customParams?: Record<string, string>) {
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
    if (sort) params.set("sort", sort);

    if (userLocation && radius) {
      params.set("latitude", String(userLocation.lat));
      params.set("longitude", String(userLocation.lng));
      params.set("radius", radius);
    }

    if (customParams) {
      Object.entries(customParams).forEach(([k, v]) => params.set(k, v));
    }

    try {
      const res = await fetch(`/api/hospitals?${params.toString()}`);
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error?.message ?? "Failed to fetch map hospital records.");
      }

      const items: HospitalLocationData[] = payload.data || [];
      setHospitals(items);

      // Adjust map center based on results or location
      if (userLocation) {
        setMapCenter(userLocation);
        setMapZoom(11);
      } else if (location.trim() && CITY_COORDINATES_MAP[location.trim().toLowerCase()]) {
        setMapCenter(CITY_COORDINATES_MAP[location.trim().toLowerCase()]);
        setMapZoom(11);
      } else if (items.length > 0) {
        const validCoords = items.filter((h) => h.latitude != null && h.longitude != null);
        if (validCoords.length > 0) {
          const avgLat =
            validCoords.reduce((acc, h) => acc + Number(h.latitude), 0) / validCoords.length;
          const avgLng =
            validCoords.reduce((acc, h) => acc + Number(h.longitude), 0) / validCoords.length;
          setMapCenter({ lat: avgLat, lng: avgLng });
          setMapZoom(validCoords.length === 1 ? 13 : 9);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading hospitals.");
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchHospitals();
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    fetchHospitals();
  }

  // Request browser location on user action
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationStatus(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setLocating(false);
        setLocationStatus("Location updated successfully.");
        setMapCenter(coords);
        setMapZoom(12);

        // Fetch hospitals with updated location
        const params = new URLSearchParams();
        if (disease.trim()) params.set("specialty", disease.trim());
        if (budget.trim()) params.set("maximumBudget", budget.trim());
        params.set("latitude", String(coords.lat));
        params.set("longitude", String(coords.lng));
        if (radius) params.set("radius", radius);

        fetchHospitals({
          latitude: String(coords.lat),
          longitude: String(coords.lng),
        });
      },
      (err) => {
        setLocating(false);
        setLocationStatus("Permission denied or location unavailable.");
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function handleClearLocation() {
    setUserLocation(null);
    setLocationStatus(null);
    fetchHospitals();
  }

  const radiusKmNumber = radius ? Number(radius) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner & Filter Form */}
      <div className="rounded-[1.5rem] border border-[#dce5e3] bg-white p-5 shadow-[0_12px_35px_rgba(17,60,57,0.05)] sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6e9286]">
              <MapIcon size={15} /> Dynamic Healthcare Map
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#113c39] sm:text-3xl">
              Explore Healthcare Facilities Nearby
            </h2>
            <p className="mt-1 text-sm text-[#71827e]">
              Search hospitals on OpenStreetMap with budget compatibility badges, approximate distance, and radius boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dce5e3] bg-[#f8fbf7] px-3.5 py-2.5 text-xs font-bold text-[#52766a] hover:bg-[#eaf4eb]"
            >
              <SlidersHorizontal size={15} />
              {showFilterPanel ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Filter Controls Form */}
        {showFilterPanel && (
          <form onSubmit={handleSearchSubmit} className="mt-6 border-t border-[#edf2ee] pt-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Specialty */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Specialty / Disease
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 focus-within:border-[#7cac83]">
                  <Search size={16} className="text-[#86a098]" />
                  <input
                    value={disease}
                    onChange={(e) => setDisease(e.target.value)}
                    placeholder="e.g. Ophthalmology, Kidney"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]"
                  />
                </div>
              </label>

              {/* City Location */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  City Location
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 focus-within:border-[#7cac83]">
                  <MapPin size={16} className="text-[#86a098]" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. New York, Boston"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]"
                  />
                </div>
              </label>

              {/* Budget Ceiling */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Max Budget Ceiling (₹ INR)
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 focus-within:border-[#7cac83]">
                  <IndianRupee size={16} className="text-[#86a098]" />
                  <input
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Target max (₹ INR)"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a1b0aa]"
                  />
                </div>
              </label>

              {/* Radius Select */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Distance Radius
                </span>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none"
                >
                  {radiusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Hospital Type */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Facility Type
                </span>
                <select
                  value={hospitalType}
                  onChange={(e) => setHospitalType(e.target.value)}
                  className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">Any Facility Type</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="SPECIALTY_CENTER">Specialty Center</option>
                  <option value="AMBULATORY_CENTER">Ambulatory Center</option>
                </select>
              </label>

              {/* Sort By */}
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Sort Results
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full rounded-xl border border-[#d8e5df] bg-[#fbfdfb] px-3 py-2.5 text-sm outline-none"
                >
                  <option value="name">Name (A - Z)</option>
                  <option value="distance">Distance</option>
                  <option value="newest">Newest Added</option>
                </select>
              </label>

              {/* Geolocation Button */}
              <div>
                <span className="mb-1.5 block text-xs font-bold text-[#547269]">
                  Location Privacy
                </span>
                {userLocation ? (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f0c8b7] bg-[#fff4ef] px-3 py-2.5 text-xs font-bold text-[#9b5335] hover:bg-[#ffece4]"
                  >
                    <X size={15} /> Clear My Location
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#b8dec4] bg-[#eaf6ec] px-3 py-2.5 text-xs font-bold text-[#2e6243] hover:bg-[#d8edd9] disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="animate-spin" size={15} /> : <LocateFixed size={15} />}
                    Use My Location
                  </button>
                )}
              </div>

              {/* Submit Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#113c39] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1c514b] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  Update Map
                </button>
              </div>
            </div>

            {/* Checkbox Feature Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ee] pt-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries({
                  icu: "ICU Available",
                  emergency: "Emergency Care",
                  pmJay: "PM-JAY Scheme",
                  nabh: "NABH Accredited",
                }).map(([key, label]) => {
                  const isActive = filters[key as keyof typeof filters];
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof prev],
                        }))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isActive
                          ? "border-[#83aa7a] bg-[#e8f4e8] text-[#386b50]"
                          : "border-[#d8e5df] bg-white text-[#70857d] hover:bg-[#f4faf3]"
                      }`}
                    >
                      {isActive && <Check size={13} />}
                      {label}
                    </button>
                  );
                })}
              </div>

              {locationStatus && (
                <span className="text-xs text-[#52766a] font-medium italic flex items-center gap-1">
                  <Info size={13} /> {locationStatus}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Mandatory Budget Disclaimer Banner & Legend */}
      <div className="rounded-[1.2rem] border border-[#bfe0c6] bg-[#f0f8f2] p-4 text-xs text-[#2d5742]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 shrink-0 text-[#2e7d32]" size={18} />
            <div>
              <p className="font-bold text-[#113c39] text-sm">
                Budget Compatibility Indicators
              </p>
              <p className="mt-0.5 text-[#406853]">
                Color coding reflects financial budget compatibility with your maximum target cost.
                <strong className="font-semibold text-[#113c39] ml-1">
                  These color indicators represent budget compatibility only and do NOT represent medical quality or care outcome standards.
                </strong>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-[#c4e3cb] bg-white px-3.5 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#2e7d32]" />
              <span className="font-semibold text-[#113c39]">Within budget</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#e65100]" />
              <span className="font-semibold text-[#113c39]">Near budget</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#c62828]" />
              <span className="font-semibold text-[#113c39]">Above budget</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab View Controls */}
      <div className="flex items-center justify-between rounded-xl border border-[#dce5e3] bg-white p-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors ${
            activeTab === "map"
              ? "bg-[#113c39] text-white shadow-sm"
              : "text-[#627b72] hover:bg-[#f4faf3]"
          }`}
        >
          <MapIcon size={16} /> Map View ({hospitals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors ${
            activeTab === "list"
              ? "bg-[#113c39] text-white shadow-sm"
              : "text-[#627b72] hover:bg-[#f4faf3]"
          }`}
        >
          <Building2 size={16} /> Hospital List ({hospitals.length})
        </button>
      </div>

      {/* Main Workspace split layout */}
      <div className="grid gap-6 lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Hospital List & Selected Hospital Drawer (5 cols on Desktop) */}
        <div
          className={`lg:col-span-5 flex flex-col gap-4 ${
            activeTab === "map" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Selected Hospital Drawer (when active) */}
          {selectedHospital && (
            <div className="rounded-[1.35rem] border-2 border-[#7cac83] bg-white p-5 shadow-[0_12px_32px_rgba(17,60,57,0.12)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded-md bg-[#e8f4e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#47775b]">
                    Selected Facility
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-[#113c39]">
                    {selectedHospital.name}
                  </h3>
                  <p className="flex items-center gap-1 text-xs text-[#718780] mt-0.5">
                    <MapPin size={13} className="shrink-0" />
                    {selectedHospital.city}
                    {selectedHospital.state ? `, ${selectedHospital.state}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHospital(null)}
                  className="grid size-7 place-items-center rounded-full bg-[#f4f8f5] text-[#718780] hover:bg-[#e8efeb]"
                  title="Close Selection"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Selected stats summary */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-[#f8fbf7] p-3 rounded-xl border border-[#dce8e2]">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#80938b]">Rating</p>
                  <p className="mt-0.5 font-bold text-[#113c39] flex items-center gap-1">
                    {selectedHospital.rating != null ? (
                      <>
                        <Star size={13} className="fill-[#d89a47] text-[#d89a47]" />
                        {Number(selectedHospital.rating).toFixed(1)} ({selectedHospital.reviewCount ?? 0})
                      </>
                    ) : (
                      "Not rated"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[#80938b]">Distance</p>
                  <p className="mt-0.5 font-bold text-[#386b50]">
                    {selectedHospital.distanceKm != null
                      ? `~${selectedHospital.distanceKm.toFixed(1)} km away`
                      : userLocation && selectedHospital.latitude != null && selectedHospital.longitude != null
                        ? `~${calculateDistanceKm(
                            userLocation.lat,
                            userLocation.lng,
                            Number(selectedHospital.latitude),
                            Number(selectedHospital.longitude),
                          )} km away`
                        : "Distance unavailable"}
                  </p>
                </div>
              </div>

              {/* Budget compatibility box */}
              {(() => {
                const evalResult = getBudgetCompatibility(selectedHospital.treatmentCosts, budgetCeiling);
                return (
                  <div className="mt-3 rounded-xl border border-[#dce5e3] p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#547269]">Budget Compatibility:</span>
                      {evalResult.status === "within" && (
                        <span className="rounded-md bg-[#e8f5e9] px-2 py-0.5 text-xs font-bold text-[#2e7d32]">
                          Within budget
                        </span>
                      )}
                      {evalResult.status === "near" && (
                        <span className="rounded-md bg-[#fff3e0] px-2 py-0.5 text-xs font-bold text-[#e65100]">
                          Near budget
                        </span>
                      )}
                      {evalResult.status === "above" && (
                        <span className="rounded-md bg-[#ffebee] px-2 py-0.5 text-xs font-bold text-[#c62828]">
                          Above budget
                        </span>
                      )}
                      {evalResult.status === "unknown" && (
                        <span className="rounded-md bg-[#f0f6f1] px-2 py-0.5 text-xs font-bold text-[#627b72]">
                          Unspecified
                        </span>
                      )}
                    </div>
                    {evalResult.formattedCost && (
                      <p className="mt-1 text-xs font-semibold text-[#113c39]">
                        Cost range: {evalResult.formattedCost}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#edf2ee] pt-3">
                <Link
                  href={`/hospitals/${selectedHospital.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#113c39] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1c514b]"
                >
                  View Details <ArrowRight size={14} />
                </Link>
                {selectedHospital.latitude != null && selectedHospital.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHospital.latitude},${selectedHospital.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce8e2] px-3 py-2.5 text-xs font-bold text-[#52766a] hover:bg-[#f4faf3]"
                  >
                    <Navigation size={14} /> Directions
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Hospital Cards List */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6e9286]">
                Matched Facilities ({hospitals.length})
              </span>
              <span className="text-xs text-[#80938b]">
                Click card to focus on map
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#dce5e3] bg-white p-12 text-center">
                <Loader2 className="animate-spin text-[#113c39]" size={28} />
                <p className="mt-2 text-xs font-semibold text-[#547269]">Loading map data...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[#f0c8b7] bg-[#fff4ef] p-4 text-xs text-[#9b5335]">
                {error}
              </div>
            ) : hospitals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#b9cfbf] bg-white p-8 text-center">
                <Building2 className="mx-auto text-[#78a286]" size={28} />
                <p className="mt-2 text-sm font-bold text-[#113c39]">No hospitals found</p>
                <p className="mt-1 text-xs text-[#80938b]">
                  Try adjusting radius, city name, or specialty filters.
                </p>
              </div>
            ) : (
              hospitals.map((hospital) => {
                const isSelected = selectedHospital?.id === hospital.id;
                const evalResult = getBudgetCompatibility(hospital.treatmentCosts, budgetCeiling);
                let dist = hospital.distanceKm;
                if (dist == null && userLocation && hospital.latitude != null && hospital.longitude != null) {
                  dist = calculateDistanceKm(
                    userLocation.lat,
                    userLocation.lng,
                    Number(hospital.latitude),
                    Number(hospital.longitude),
                  );
                }

                return (
                  <div
                    key={hospital.id}
                    onClick={() => {
                      setSelectedHospital(hospital);
                      if (hospital.latitude != null && hospital.longitude != null) {
                        setMapCenter({
                          lat: Number(hospital.latitude),
                          lng: Number(hospital.longitude),
                        });
                        setMapZoom(14);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-[#7cac83] bg-[#f2f8f3] shadow-md ring-2 ring-[#7cac83]/30"
                        : "border-[#dce5e3] bg-white hover:border-[#b8dec4] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#113c39]">{hospital.name}</h4>
                        <p className="mt-0.5 text-xs text-[#718780] flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" />
                          {hospital.city}
                          {hospital.state ? `, ${hospital.state}` : ""}
                        </p>
                      </div>

                      {/* Budget Badge */}
                      {evalResult.status === "within" && (
                        <span className="shrink-0 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-bold text-[#2e7d32]">
                          Within budget
                        </span>
                      )}
                      {evalResult.status === "near" && (
                        <span className="shrink-0 rounded-full bg-[#fff3e0] px-2 py-0.5 text-[10px] font-bold text-[#e65100]">
                          Near budget
                        </span>
                      )}
                      {evalResult.status === "above" && (
                        <span className="shrink-0 rounded-full bg-[#ffebee] px-2 py-0.5 text-[10px] font-bold text-[#c62828]">
                          Above budget
                        </span>
                      )}
                      {evalResult.status === "unknown" && (
                        <span className="shrink-0 rounded-full bg-[#f0f6f1] px-2 py-0.5 text-[10px] font-bold text-[#627b72]">
                          Unlisted
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-[#627b72] border-t border-[#edf2ee] pt-2">
                      <span className="flex items-center gap-1 font-semibold">
                        {hospital.rating != null ? (
                          <>
                            <Star size={13} className="fill-[#d89a47] text-[#d89a47]" />
                            {Number(hospital.rating).toFixed(1)}
                          </>
                        ) : (
                          "Unrated"
                        )}
                      </span>

                      {dist != null && (
                        <span className="font-semibold text-[#386b50]">
                          ~{dist.toFixed(1)} km
                        </span>
                      )}

                      <span className="text-[11px] text-[#80938b]">
                        {hospital.hospitalType.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Map (7 cols on Desktop) */}
        <div
          className={`lg:col-span-7 h-[640px] ${
            activeTab === "list" ? "hidden lg:block" : "block"
          }`}
        >
          <HealthcareMap
            hospitals={hospitals}
            selectedHospital={selectedHospital}
            onSelectHospital={(hospital) => {
              setSelectedHospital(hospital);
              if (hospital.latitude != null && hospital.longitude != null) {
                setMapCenter({
                  lat: Number(hospital.latitude),
                  lng: Number(hospital.longitude),
                });
              }
            }}
            center={mapCenter}
            zoom={mapZoom}
            radiusKm={radiusKmNumber}
            userLocation={userLocation}
            budgetCeiling={budgetCeiling}
          />
        </div>
      </div>
    </div>
  );
}
