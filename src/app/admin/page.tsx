import type { Metadata } from "next";
import { PageIntro } from "@/components/dashboard-shell";
import { AdminDashboard } from "@/components/admin-dashboard";
import {
  getAdminDashboardMetrics,
  getAdminHospitals,
  getAdminCosts,
  getAdminOutcomes,
  getAdminDataSources,
} from "@/lib/repositories/admin-repository";

export const metadata: Metadata = {
  title: "Admin Operations & Data Management | CareMatch AI",
  description:
    "Authorized administrative workspace for managing hospital registries, clinical outcome evidence, treatment tariffs, CSV bulk ingestion, and verification workflows.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [metrics, hospitals, costs, outcomes, sources] = await Promise.all([
    getAdminDashboardMetrics(),
    getAdminHospitals(),
    getAdminCosts(),
    getAdminOutcomes(),
    getAdminDataSources(),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Administrative Control & Quality Assurance"
        title="Healthcare Data Management Console"
        description="Review incoming hospital registrations, verify tariff benchmarks and clinical outcomes, quarantine suspicious records, and manage bulk CSV ingestion. Zero AI auto-mutation of healthcare facts permitted."
      />

      <AdminDashboard
        initialMetrics={metrics}
        initialHospitals={hospitals}
        initialCosts={costs}
        initialOutcomes={outcomes}
        initialSources={sources}
      />
    </div>
  );
}
