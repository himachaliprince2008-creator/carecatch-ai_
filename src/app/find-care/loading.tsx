export default function FindCareLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Intro skeleton */}
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-3">
        <div className="h-4 w-32 rounded-full bg-[#edf3f1]" />
        <div className="h-8 w-72 rounded-xl bg-[#e1ece9]" />
        <div className="h-4 w-96 rounded-lg bg-[#edf3f1]" />
      </div>

      {/* Search filters bar skeleton */}
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-4 flex gap-3">
        <div className="h-10 flex-1 rounded-2xl bg-[#f0f5f3]" />
        <div className="h-10 w-36 rounded-2xl bg-[#f0f5f3]" />
        <div className="h-10 w-36 rounded-2xl bg-[#f0f5f3]" />
      </div>

      {/* Hospital cards skeleton list */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-6 w-60 rounded-xl bg-[#e1ece9]" />
                <div className="h-4 w-40 rounded-lg bg-[#edf3f1]" />
              </div>
              <div className="h-7 w-20 rounded-full bg-[#f0f5f3]" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-[#e8f5e9]" />
              <div className="h-5 w-20 rounded-full bg-[#e0f2fe]" />
              <div className="h-5 w-14 rounded-full bg-[#f1f5f9]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
