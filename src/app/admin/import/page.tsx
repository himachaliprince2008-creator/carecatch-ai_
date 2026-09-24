import type { Metadata } from "next";
import { PageIntro } from "@/components/dashboard-shell";
import { DataImportPipeline } from "@/components/data-import-pipeline";

export const metadata: Metadata = {
  title: "Data Import Pipeline | CareMatch AI Admin",
  description:
    "End-to-end healthcare data ingestion pipeline with multi-stage parsing, schema validation, duplicate detection, quality checks, and verified record protection.",
};

export const dynamic = "force-dynamic";

export default function AdminImportPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Administrative Ingestion Engine"
        title="Healthcare CSV Import Pipeline"
        description="Process, validate, deduplicate, and quality-audit bulk healthcare data before committing to the production database. Automatic overwrite of verified records is strictly blocked."
      />

      <DataImportPipeline />
    </div>
  );
}
