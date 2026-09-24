export default function CompareLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-3">
        <div className="h-4 w-32 rounded-full bg-[#edf3f1]" />
        <div className="h-8 w-64 rounded-xl bg-[#e1ece9]" />
        <div className="h-4 w-96 rounded-lg bg-[#edf3f1]" />
      </div>

      <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-4">
        <div className="h-12 w-full rounded-2xl bg-[#f0f5f3]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-[#e1ece9] bg-[#fafcfb] p-4 space-y-3">
              <div className="h-6 w-40 rounded-lg bg-[#e1ece9]" />
              <div className="h-4 w-28 rounded-md bg-[#edf3f1]" />
              <div className="h-20 w-full rounded-xl bg-[#edf3f1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
