"use client";

import Link from "next/link";
import { ClipboardList, RefreshCw, Search } from "lucide-react";

export default function ComparePageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#dce5e3] bg-white p-8 text-center shadow-sm my-8">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eaf4f0] text-[#1b6b50]">
        <ClipboardList className="size-6" />
      </div>

      <h2 className="mt-3 text-base font-bold text-[#113c39]">
        Comparison workspace error
      </h2>
      <p className="mt-1 text-xs text-[#526f68] max-w-md mx-auto">
        Unable to assemble the side-by-side hospital matrix. Check that the hospital identifiers are valid.
      </p>

      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-1.5 rounded-2xl bg-[#113c39] px-4 py-2.5 text-xs font-bold text-[#d9f6a2]"
        >
          <RefreshCw className="size-3.5" />
          <span>Retry Compare</span>
        </button>
        <Link
          href="/find-care"
          className="flex items-center gap-1.5 rounded-2xl border border-[#dce5e3] px-4 py-2.5 text-xs font-bold text-[#113c39] hover:bg-[#f7faf8]"
        >
          <Search className="size-3.5" />
          <span>Select Hospitals</span>
        </Link>
      </div>
    </div>
  );
}
