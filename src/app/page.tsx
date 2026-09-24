import Link from "next/link";
import { ArrowRight, Building2, CircleDollarSign, Map, ShieldCheck, Sparkles } from "lucide-react";
import { DashboardSearch } from "@/components/dashboard-search";

const actions = [
  { href: "/find-care", label: "Find a Hospital", detail: "Search specialties, locations, and needs.", icon: Building2, tone: "bg-[#e8f4e8] text-[#47775b]" },
  { href: "/cost", label: "Cost Simulator", detail: "Organize budget and cost factors.", icon: CircleDollarSign, tone: "bg-[#fff1e8] text-[#c46e45]" },
  { href: "/map", label: "Healthcare Map", detail: "Explore care by location.", icon: Map, tone: "bg-[#e9f1f7] text-[#477394]" },
];

export default function Home() {
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#113c39] px-6 py-8 text-white shadow-[0_18px_45px_rgba(17,60,57,0.13)] sm:px-10 sm:py-10"><div className="absolute -right-20 -top-24 size-72 rounded-full border-[38px] border-[#5c9a7b]/25" /><div className="relative max-w-3xl"><p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b8e994]"><Sparkles size={14} /> Care navigation workspace</p><h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.055em] sm:text-6xl">Right care.<br /><span className="text-[#b8e994]">Right place.</span> Right cost.</h2><p className="mt-5 max-w-xl text-sm leading-6 text-[#d3e2dc]">Search connected hospital records, compare practical requirements, and keep your next care decision grounded in available data.</p></div></section>
    <DashboardSearch />
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e9286]">Quick actions</p><h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Move from question to next step</h3></div><Link href="/history" className="hidden items-center gap-1 text-xs font-bold text-[#47775b] sm:flex">View activity <ArrowRight size={14} /></Link></div><div className="grid gap-4 md:grid-cols-3">{actions.map((action) => { const Icon = action.icon; return <Link key={action.href} href={action.href} className="group rounded-[1.25rem] border border-[#dce5e3] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#9bc68e] hover:shadow-[0_12px_28px_rgba(17,60,57,0.07)]"><div className="flex items-center justify-between"><span className={`grid size-11 place-items-center rounded-2xl ${action.tone}`}><Icon size={21} /></span><ArrowRight size={17} className="text-[#a2b1ad] transition-transform group-hover:translate-x-1" /></div><h4 className="mt-5 font-semibold text-[#113c39]">{action.label}</h4><p className="mt-1 text-xs leading-5 text-[#83938f]">{action.detail}</p></Link>; })}</div></section>
    <section className="flex flex-col gap-4 rounded-[1.5rem] border border-dashed border-[#b9cfbf] bg-[#f8fbf7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#5f9271]" size={20} /><div><h3 className="text-sm font-bold">A trustworthy starting point</h3><p className="mt-1 text-xs leading-5 text-[#7a8d87]">CareMatch shows database-backed records only. Missing data stays visible rather than being guessed.</p></div></div><Link href="/hospitals" className="flex shrink-0 items-center gap-2 text-sm font-bold text-[#356d50]">Open hospital directory <ArrowRight size={16} /></Link></section>
  </div>;
}
