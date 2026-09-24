"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import Link from "next/link";
import { ExternalLink, MapPin, Navigation, ShieldCheck, Star, ArrowRight } from "lucide-react";
import {
  type HospitalLocationData,
  createCustomMarkerIcon,
  getBudgetCompatibility,
  calculateDistanceKm,
} from "@/lib/map-utils";

type HealthcareMapInnerProps = {
  hospitals: HospitalLocationData[];
  selectedHospital: HospitalLocationData | null;
  onSelectHospital: (hospital: HospitalLocationData) => void;
  center: { lat: number; lng: number };
  zoom: number;
  radiusKm?: number | null;
  userLocation?: { lat: number; lng: number } | null;
  budgetCeiling?: number | null;
};

function MapController({
  selectedHospital,
  center,
}: {
  selectedHospital: HospitalLocationData | null;
  center: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedHospital?.latitude != null &&
      selectedHospital?.longitude != null
    ) {
      const lat = Number(selectedHospital.latitude);
      const lng = Number(selectedHospital.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        map.flyTo([lat, lng], 14, { duration: 1.2 });
        return;
      }
    }

    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 1.0 });
    }
  }, [map, selectedHospital, center]);

  return null;
}

export default function HealthcareMapInner({
  hospitals,
  selectedHospital,
  onSelectHospital,
  center,
  zoom,
  radiusKm,
  userLocation,
  budgetCeiling,
}: HealthcareMapInnerProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] border border-[#dce5e3] shadow-[0_12px_35px_rgba(17,60,57,0.06)]">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selectedHospital={selectedHospital} center={center} />

        {/* User Location Marker */}
        {userLocation && !isNaN(userLocation.lat) && !isNaN(userLocation.lng) && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createCustomMarkerIcon("unknown", false, "USER")}
          >
            <Popup>
              <div className="p-3 text-xs">
                <p className="font-bold text-[#113c39] flex items-center gap-1">
                  <MapPin size={13} className="text-[#386b50]" /> Your Current Location
                </p>
                <p className="mt-1 text-[#718780]">
                  Used for approximate distance & radius search. Not stored on external servers.
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Radius Coverage Circle */}
        {radiusKm && radiusKm > 0 && center && !isNaN(center.lat) && !isNaN(center.lng) && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000} // Radius in meters
            pathOptions={{
              color: "#113c39",
              fillColor: "#7cac83",
              fillOpacity: 0.12,
              weight: 2,
              dashArray: "6, 6",
            }}
          />
        )}

        {/* Hospital Markers */}
        {hospitals.map((hospital) => {
          if (hospital.latitude == null || hospital.longitude == null) return null;
          const lat = Number(hospital.latitude);
          const lng = Number(hospital.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isSelected = selectedHospital?.id === hospital.id;
          const budgetEval = getBudgetCompatibility(hospital.treatmentCosts, budgetCeiling);
          const icon = createCustomMarkerIcon(budgetEval.status, isSelected, hospital.hospitalType);

          // Calculate distance from center or user location
          let distanceDisplay = hospital.distanceKm;
          if (distanceDisplay == null && userLocation) {
            distanceDisplay = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
          } else if (distanceDisplay == null && center) {
            distanceDisplay = calculateDistanceKm(center.lat, center.lng, lat, lng);
          }

          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
          const verified = hospital.verification?.status === "VERIFIED";

          return (
            <Marker
              key={hospital.id}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectHospital(hospital),
              }}
            >
              <Popup autoPan={true}>
                <div className="w-64 max-w-[280px] p-3 text-left">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#113c39] leading-tight">
                      {hospital.name}
                    </h4>
                    {verified && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-[#e8f4e8] px-1.5 py-0.5 text-[9px] font-bold text-[#47775b]">
                        <ShieldCheck size={10} /> Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-1 flex items-center gap-1 text-[11px] text-[#718780]">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{hospital.city}{hospital.state ? `, ${hospital.state}` : ""}</span>
                  </p>

                  {/* Rating & Distance */}
                  <div className="mt-2 flex items-center justify-between text-xs text-[#5f6f69] border-t border-[#e8efeb] pt-2">
                    <span className="flex items-center gap-1 font-semibold">
                      {hospital.rating != null ? (
                        <>
                          <Star size={12} className="fill-[#d89a47] text-[#d89a47]" />
                          {Number(hospital.rating).toFixed(1)}
                        </>
                      ) : (
                        "No rating"
                      )}
                    </span>

                    {distanceDisplay != null && (
                      <span className="font-semibold text-[#386b50]">
                        ~{distanceDisplay.toFixed(1)} km away
                      </span>
                    )}
                  </div>

                  {/* Budget Compatibility Indicator */}
                  <div className="mt-2.5 rounded-lg bg-[#f7faf8] border border-[#dce8e2] p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#80938b]">
                        Budget status
                      </span>
                      {budgetEval.status === "within" && (
                        <span className="inline-flex items-center rounded-md bg-[#e8f5e9] px-2 py-0.5 text-[10px] font-bold text-[#2e7d32]">
                          Within budget
                        </span>
                      )}
                      {budgetEval.status === "near" && (
                        <span className="inline-flex items-center rounded-md bg-[#fff3e0] px-2 py-0.5 text-[10px] font-bold text-[#e65100]">
                          Near budget
                        </span>
                      )}
                      {budgetEval.status === "above" && (
                        <span className="inline-flex items-center rounded-md bg-[#ffebee] px-2 py-0.5 text-[10px] font-bold text-[#c62828]">
                          Above budget
                        </span>
                      )}
                      {budgetEval.status === "unknown" && (
                        <span className="inline-flex items-center rounded-md bg-[#f0f6f1] px-2 py-0.5 text-[10px] font-bold text-[#627b72]">
                          Unspecified
                        </span>
                      )}
                    </div>
                    {budgetEval.formattedCost && (
                      <p className="mt-1 text-xs font-bold text-[#113c39]">
                        {budgetEval.formattedCost}
                      </p>
                    )}
                  </div>

                  {/* Required Disclaimer */}
                  <p className="mt-1.5 text-[9px] leading-3 text-[#80938b] italic">
                    Color represents budget compatibility only, not medical quality.
                  </p>

                  {/* Specializations summary */}
                  {hospital.specializations && hospital.specializations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {hospital.specializations.slice(0, 2).map((s, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-[#edf4ee] px-1.5 py-0.5 text-[10px] text-[#47775b]"
                        >
                          {s.specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf2ee] pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectHospital(hospital)}
                      className="rounded-lg bg-[#113c39] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1c514b]"
                    >
                      Select
                    </button>
                    <Link
                      href={`/hospitals/${hospital.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#386b50] hover:underline"
                    >
                      Details <ArrowRight size={11} />
                    </Link>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#dce8e2] px-2 py-1.5 text-[11px] font-semibold text-[#52766a] hover:bg-[#f4faf3]"
                      title="Get Directions on Google Maps"
                    >
                      <Navigation size={11} /> Directions <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
