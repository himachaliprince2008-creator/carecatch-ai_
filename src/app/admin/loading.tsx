export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-3">
        <div className="h-4 w-32 rounded-full bg-[#edf3f1]" />
        <div className="h-8 w-64 rounded-xl bg-[#e1ece9]" />
        <div className="h-4 w-96 rounded-lg bg-[#edf3f1]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 rounded-3xl border border-[#dce5e3] bg-white p-4 space-y-2">
            <div className="h-3 w-16 rounded-md bg-[#edf3f1]" />
            <div className="h-6 w-12 rounded-lg bg-[#e1ece9]" />
          </div>
        ))}
      </div>

      <div className="h-96 rounded-3xl border border-[#dce5e3] bg-white p-6" />
    </div>
  );
}
