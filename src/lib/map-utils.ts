import type L from "leaflet";

export type BudgetStatus = "within" | "near" | "above" | "unknown";

export type HospitalLocationData = {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  hospitalType: string;
  rating?: number | string | null;
  reviewCount?: number;
  distanceKm?: number | null;
  verification?: { status: string; source?: { name: string } | null } | null;
  treatmentCosts?: Array<{
    currency: string;
    minAmount?: number | string | null;
    maxAmount?: number | string | null;
    disease?: { name: string };
  }>;
  specializations?: Array<{ specialty: string; disease?: { name: string } }>;
  facilities?: Array<{ name: string }>;
  hasIcu?: boolean;
  hasEmergency?: boolean;
  acceptsPmJay?: boolean;
  hasNabhAccreditation?: boolean;
};

/**
 * Calculates distance between two latitude/longitude points in kilometers using Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Evaluates budget compatibility status for a hospital given a target budget ceiling.
 * Green = within budget
 * Orange = near budget
 * Red = above budget
 * Unknown = no budget specified or no cost data available
 */
export function getBudgetCompatibility(
  costs?: HospitalLocationData["treatmentCosts"],
  budgetCeiling?: number | null,
): { status: BudgetStatus; formattedCost: string | null; summaryLabel: string } {
  if (!costs || costs.length === 0) {
    return { status: "unknown", formattedCost: null, summaryLabel: "Cost unlisted" };
  }

  // Extract min and max numerical values across available costs
  let globalMin: number | null = null;
  let globalMax: number | null = null;
  let currency = "INR";

  for (const c of costs) {
    if (c.currency) currency = c.currency;
    const minVal = c.minAmount != null ? Number(c.minAmount) : null;
    const maxVal = c.maxAmount != null ? Number(c.maxAmount) : null;

    if (minVal !== null && !isNaN(minVal)) {
      if (globalMin === null || minVal < globalMin) globalMin = minVal;
    }
    if (maxVal !== null && !isNaN(maxVal)) {
      if (globalMax === null || maxVal > globalMax) globalMax = maxVal;
    }
  }

  const currSymbol = currency === "INR" ? "₹" : `${currency} `;
  let formattedCost: string | null = null;
  if (globalMin !== null && globalMax !== null) {
    formattedCost = `${currSymbol}${globalMin.toLocaleString("en-IN")} - ${currSymbol}${globalMax.toLocaleString("en-IN")}`;
  } else if (globalMin !== null) {
    formattedCost = `${currSymbol}${globalMin.toLocaleString("en-IN")}+`;
  } else if (globalMax !== null) {
    formattedCost = `${currSymbol}${globalMax.toLocaleString("en-IN")}`;
  }

  if (budgetCeiling === undefined || budgetCeiling === null || isNaN(budgetCeiling) || budgetCeiling <= 0) {
    return { status: "unknown", formattedCost, summaryLabel: formattedCost ?? "Cost unlisted" };
  }

  const effectiveMin = globalMin ?? globalMax;
  if (effectiveMin === null) {
    return { status: "unknown", formattedCost, summaryLabel: "Cost unlisted" };
  }

  if (effectiveMin <= budgetCeiling) {
    if (globalMax === null || globalMax <= budgetCeiling) {
      return { status: "within", formattedCost, summaryLabel: "Within budget" };
    }
    return { status: "near", formattedCost, summaryLabel: "Near budget (Max extends above)" };
  }

  // If min is up to 25% over budget ceiling
  if (effectiveMin <= budgetCeiling * 1.25) {
    return { status: "near", formattedCost, summaryLabel: "Near budget" };
  }

  return { status: "above", formattedCost, summaryLabel: "Above budget" };
}

/**
 * Common city center fallbacks for centering map when searching by city name.
 */
export const CITY_COORDINATES_MAP: Record<string, { lat: number; lng: number }> = {
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  delhi: { lat: 28.6139, lng: 77.209 },
  "new delhi": { lat: 28.6139, lng: 77.209 },
  mohali: { lat: 30.7046, lng: 76.7179 },
  kangra: { lat: 32.0998, lng: 76.2691 },
  solan: { lat: 30.9045, lng: 77.0967 },
  mandi: { lat: 31.5892, lng: 76.9182 },
  dharamshala: { lat: 32.219, lng: 76.3234 },
  ludhiana: { lat: 30.901, lng: 75.8573 },
  panchkula: { lat: 30.6942, lng: 76.8606 },
  amritsar: { lat: 31.634, lng: 74.8723 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  noida: { lat: 28.5355, lng: 77.391 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  pune: { lat: 18.5204, lng: 73.8567 },
};

export const DEFAULT_MAP_CENTER = { lat: 30.7333, lng: 76.7794 }; // Chandigarh / North India Geographical Focus
export const DEFAULT_MAP_ZOOM = 7;

/**
 * Factory function for creating custom Leaflet divIcon pins with dynamic colors.
 * Lazy requires 'leaflet' on client execution to prevent SSR window errors.
 */
export function createCustomMarkerIcon(
  status: BudgetStatus,
  isSelected: boolean = false,
  hospitalType: string = "HOSPITAL",
): L.DivIcon {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Leaflet = typeof window !== "undefined" ? require("leaflet") : null;
  if (!Leaflet) return {} as L.DivIcon;

  let pinBg = "#113c39"; // default dark teal
  let pinBorder = "#ffffff";
  const badgeColor = "#ffffff";

  if (status === "within") {
    pinBg = "#2e7d32"; // Green (within budget)
  } else if (status === "near") {
    pinBg = "#e65100"; // Orange (near budget)
  } else if (status === "above") {
    pinBg = "#c62828"; // Red (above budget)
  }

  if (isSelected) {
    pinBorder = "#d9f6a2";
  }

  const size = isSelected ? 44 : 36;
  const anchorX = size / 2;
  const anchorY = size;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${isSelected ? `<div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background-color: ${pinBg};
        opacity: 0.35;
        animation: marker-pulse 2s infinite ease-in-out;
      "></div>` : ""}
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${pinBg};
        border: 3px solid ${pinBorder};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        <div style="
          transform: rotate(45deg);
          color: ${badgeColor};
          font-weight: bold;
          font-size: ${isSelected ? "14px" : "11px"};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${
            hospitalType === "CLINIC"
              ? "✚"
              : hospitalType === "SPECIALTY_CENTER"
                ? "★"
                : "🏥"
          }
        </div>
      </div>
    </div>
  `;

  return Leaflet.divIcon({
    html,
    className: "custom-leaflet-marker",
    iconSize: [size, size],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -size + 8],
  });
}
