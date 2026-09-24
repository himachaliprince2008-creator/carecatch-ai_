"use client";

import Link from "next/link";
import { Building2, RefreshCw, Search } from "lucide-react";

export default function HospitalDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#dce5e3] bg-white p-8 text-center shadow-sm my-8">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fee2e2] text-[#dc2626]">
        <Building2 className="size-6" />
      </div>

      <h2 className="mt-3 text-base font-bold text-[#113c39]">
        Unable to load facility details
      </h2>
      <p className="mt-1 text-xs text-[#526f68] max-w-md mx-auto">
        We could not load the full clinical record for this hospital. Please retry or browse other accredited facilities.
      </p>

      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-1.5 rounded-2xl bg-[#113c39] px-4 py-2.5 text-xs font-bold text-[#d9f6a2]"
        >
          <RefreshCw className="size-3.5" />
          <span>Reload Details</span>
        </button>
        <Link
          href="/find-care"
          className="flex items-center gap-1.5 rounded-2xl border border-[#dce5e3] px-4 py-2.5 text-xs font-bold text-[#113c39] hover:bg-[#f7faf8]"
        >
          <Search className="size-3.5" />
          <span>Browse Hospitals</span>
        </Link>
      </div>
    </div>
  );
}
