export default function CostPageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-[#dce5e3] bg-white p-6 space-y-3">
        <div className="h-4 w-32 rounded-full bg-[#edf3f1]" />
        <div className="h-8 w-64 rounded-xl bg-[#e1ece9]" />
        <div className="h-4 w-96 rounded-lg bg-[#edf3f1]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 h-96 rounded-3xl border border-[#dce5e3] bg-white p-6" />
        <div className="lg:col-span-7 space-y-6">
          <div className="h-60 rounded-3xl border border-[#dce5e3] bg-white p-6" />
          <div className="h-64 rounded-3xl border border-[#dce5e3] bg-white p-6" />
        </div>
      </div>
    </div>
  );
}
