"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Search, ShieldAlert } from "lucide-react";

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely on client console without leaking secrets
    console.error("CareMatch Application Error:", error.message);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-[#fed7d7] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff5f5] text-[#e53e3e]">
          <AlertTriangle className="size-8" />
        </div>

        <span className="mt-4 inline-block rounded-full bg-[#fee2e2] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#991b1b]">
          Application Safeguard Triggered
        </span>

        <h2 className="mt-3 text-xl font-bold tracking-tight text-[#113c39]">
          Something went wrong
        </h2>

        <p className="mt-2 text-xs text-[#526f68] leading-relaxed">
          We encountered an unexpected issue while loading this page. Our team has been notified, and verified hospital records remain safe.
        </p>

        {error.digest && (
          <p className="mt-2 text-[10px] text-[#8c9f9a] font-mono">
            Incident Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#113c39] py-3 text-xs font-bold text-[#d9f6a2] hover:bg-[#18524e] transition-all shadow-sm"
          >
            <RefreshCw className="size-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#dce5e3] bg-white py-3 text-xs font-bold text-[#203c36] hover:bg-[#f7faf8] transition-all"
          >
            <Home className="size-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
