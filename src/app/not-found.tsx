import Link from "next/link";
import { Compass, Home, Search, Stethoscope, ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl border border-[#dce5e3] bg-white p-8 text-center shadow-md">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#eaf4f0] text-[#1b6b50]">
          <Compass className="size-8" />
        </div>

        <span className="mt-4 inline-block rounded-full bg-[#f0f5f3] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#526f68]">
          404 — Page Not Found
        </span>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#113c39]">
          Looking for healthcare guidance?
        </h1>

        <p className="mt-2 text-xs text-[#526f68] leading-relaxed">
          The requested page or hospital record could not be found. It may have been updated, relocated, or temporarily unlisted for audit.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <Link
            href="/find-care"
            className="flex items-start gap-3 rounded-2xl border border-[#dce5e3] bg-[#fbfdfc] p-3.5 hover:bg-[#f2f7f5] transition-all"
          >
            <Search className="size-4 text-[#1b6b50] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-[#113c39] block">Find Hospitals</span>
              <span className="text-[11px] text-[#6e8580]">Search specialties & verified facilities</span>
            </div>
          </Link>

          <Link
            href="/cost"
            className="flex items-start gap-3 rounded-2xl border border-[#dce5e3] bg-[#fbfdfc] p-3.5 hover:bg-[#f2f7f5] transition-all"
          >
            <Stethoscope className="size-4 text-[#1b6b50] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-[#113c39]">Cost Simulator</span>
              <span className="text-[11px] text-[#6e8580]">Estimate procedure ranges & PM-JAY</span>
            </div>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-[#edf3f1]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b6b50] hover:underline"
          >
            <Home className="size-3.5" /> Return to CareMatch Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
