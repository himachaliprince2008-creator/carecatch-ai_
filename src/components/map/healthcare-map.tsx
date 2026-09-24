"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import type { HospitalLocationData } from "@/lib/map-utils";

type HealthcareMapProps = {
  hospitals: HospitalLocationData[];
  selectedHospital: HospitalLocationData | null;
  onSelectHospital: (hospital: HospitalLocationData) => void;
  center: { lat: number; lng: number };
  zoom: number;
  radiusKm?: number | null;
  userLocation?: { lat: number; lng: number } | null;
  budgetCeiling?: number | null;
};

const HealthcareMapInner = dynamic(
  () => import("./healthcare-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] border border-[#dce5e3] bg-[#f8fbf7] p-8 text-center shadow-[0_12px_35px_rgba(17,60,57,0.06)]">
        <Loader2 className="animate-spin text-[#113c39]" size={36} />
        <p className="mt-3 text-sm font-bold text-[#113c39]">Loading OpenStreetMap Canvas...</p>
        <p className="mt-1 text-xs text-[#718780] flex items-center gap-1">
          <MapPin size={13} /> Initializing Leaflet map markers and spatial indexes
        </p>
      </div>
    ),
  },
);

export function HealthcareMap(props: HealthcareMapProps) {
  return <HealthcareMapInner {...props} />;
}
