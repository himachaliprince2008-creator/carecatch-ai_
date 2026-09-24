import { DashboardSearch } from "@/components/dashboard-search";
import { PageIntro } from "@/components/dashboard-shell";

export default function FindCarePage() {
	return <div><PageIntro eyebrow="Care discovery" title="Find care that fits your needs" description="Search connected hospital records by specialty, location, budget, and practical facility requirements." /><DashboardSearch /></div>;
}
