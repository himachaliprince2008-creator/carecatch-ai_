import { MapWorkspace } from "@/components/map/map-workspace";

export const metadata = {
  title: "Healthcare Map | CareMatch AI",
  description: "Interactive healthcare map with Leaflet, OpenStreetMap, budget indicators, distance calculations, and radius visualization.",
};

export default function MapPage() {
  return <MapWorkspace />;
}
