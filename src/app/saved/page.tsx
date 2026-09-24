import { SavedHospitalsWorkspace } from "@/components/saved-hospitals-workspace";

export const metadata = {
  title: "Saved Hospitals & Shortlist | CareMatch AI",
  description: "View and manage your shortlisted Indian hospitals, compare facilities, and simulate treatment costs.",
};

export default function SavedPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SavedHospitalsWorkspace />
    </main>
  );
}
