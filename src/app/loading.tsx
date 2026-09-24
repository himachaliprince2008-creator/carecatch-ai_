export default function GlobalLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      {/* Header skeleton */}
      <div className="rounded-3xl border border-[#e1ece9] bg-white p-6 space-y-3">
        <div className="h-4 w-28 rounded-full bg-[#edf3f1]" />
        <div className="h-8 w-64 rounded-xl bg-[#e1ece9]" />
        <div className="h-4 w-96 rounded-lg bg-[#edf3f1]" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-3xl border border-[#e1ece9] bg-white p-5 space-y-3">
            <div className="h-5 w-32 rounded-lg bg-[#edf3f1]" />
            <div className="h-4 w-full rounded-md bg-[#f0f5f3]" />
            <div className="h-4 w-2/3 rounded-md bg-[#f0f5f3]" />
          </div>
        ))}
      </div>
    </div>
  );
}
