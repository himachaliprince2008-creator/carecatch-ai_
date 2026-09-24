export default function HospitalDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-8 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-full bg-[#edf3f1]" />
            <div className="h-8 w-80 rounded-xl bg-[#e1ece9]" />
            <div className="h-4 w-60 rounded-lg bg-[#edf3f1]" />
          </div>
          <div className="h-10 w-32 rounded-2xl bg-[#edf3f1]" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-20 rounded-full bg-[#e8f5e9]" />
          <div className="h-6 w-24 rounded-full bg-[#e0f2fe]" />
          <div className="h-6 w-16 rounded-full bg-[#f1f5f9]" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="h-64 rounded-3xl border border-[#dce5e3] bg-white p-6" />
          <div className="h-72 rounded-3xl border border-[#dce5e3] bg-white p-6" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-3xl border border-[#dce5e3] bg-white p-6" />
          <div className="h-56 rounded-3xl border border-[#dce5e3] bg-white p-6" />
        </div>
      </div>
    </div>
  );
}
