"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalHtmlError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7faf8] text-[#113c39] font-sans min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[#dce5e3] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fee2e2] text-[#dc2626]">
            <AlertTriangle className="size-6" />
          </div>

          <h1 className="mt-4 text-lg font-bold text-[#113c39]">CareMatch AI System Notice</h1>
          <p className="mt-2 text-xs text-[#526f68] leading-relaxed">
            The application experienced an unexpected runtime fault. No personal or clinical data was compromised.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#113c39] px-6 py-2.5 text-xs font-bold text-[#d9f6a2]"
            >
              <RefreshCw className="size-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
