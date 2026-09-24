"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Compass,
  HeartPulse,
  LayoutDashboard,
  Map,
  Menu,
  Search,
  Settings,
  UserRound,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CareAssistant } from "@/components/care-assistant";

const navigation = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/find-care", label: "Find Care", icon: Search },
  { href: "/cost", label: "Cost Simulator", icon: CircleDollarSign },
  { href: "/map", label: "Healthcare Map", icon: Map },
  { href: "/compare", label: "Compare", icon: ClipboardList },
  { href: "/saved", label: "Saved Hospitals", icon: HeartPulse },
  { href: "/history", label: "Search History", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/admin", label: "Admin Console", icon: ShieldCheck },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-[#dce5e3] bg-[#f7faf8] px-5 py-6">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-2xl bg-[#113c39] text-[#d9f6a2] shadow-[0_10px_24px_rgba(17,60,57,0.18)]">
          <Stethoscope size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-[#113c39]">CareMatch</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7b908c]">Right care, right place</p>
        </div>
      </div>

      <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#91a29e]">Workspace</div>
      <nav className="mt-3 space-y-1.5">
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                active ? "bg-[#dff2d4] text-[#113c39]" : "text-[#637773] hover:bg-[#eaf2ed] hover:text-[#113c39]",
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
              {active && <ChevronRight className="ml-auto" size={15} />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1.5">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#637773] hover:bg-[#eaf2ed] hover:text-[#113c39]">
          <ShieldCheck size={18} /> Admin workspace
        </Link>
        <Link href="/profile" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#637773] hover:bg-[#eaf2ed] hover:text-[#113c39]">
          <Settings size={18} /> Preferences
        </Link>
        <div className="mt-5 flex items-center gap-3 border-t border-[#dce5e3] px-2 pt-5">
          <div className="grid size-9 place-items-center rounded-full bg-[#f1c6a8] text-sm font-bold text-[#74462e]">AK</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#113c39]">Alex Kumar</p>
            <p className="truncate text-xs text-[#81918e]">Care navigator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const current = navigation.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.label ?? "Overview";

  function submitGlobalSearch(event: FormEvent) {
    event.preventDefault();
    if (globalQuery.trim()) router.push(`/find-care?query=${encodeURIComponent(globalQuery.trim())}`);
  }

  return (
    <div className="min-h-screen bg-[#f4f8f5] text-[#113c39]">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 bg-[#113c39]/30" onClick={() => setMobileOpen(false)} />
          <div className="relative"><Sidebar onNavigate={() => setMobileOpen(false)} /><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-5 grid size-9 place-items-center rounded-full bg-white text-[#113c39]"><X size={18} /></button></div>
        </div>
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#dce5e3]/80 bg-[#f4f8f5]/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl border border-[#dce5e3] bg-white lg:hidden"><Menu size={20} /></button><div><p className="text-xs font-medium text-[#81918e]">Care navigation /</p><h1 className="text-xl font-semibold tracking-[-0.03em]">{current}</h1></div></div>
          <div className="flex items-center gap-3"><form onSubmit={submitGlobalSearch} className="hidden items-center gap-2 rounded-xl border border-[#dce5e3] bg-white px-3 py-2 md:flex"><Search size={16} className="text-[#8ca19a]" /><input aria-label="Global search" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search care, hospitals..." className="w-44 bg-transparent text-xs outline-none placeholder:text-[#9aaba5] lg:w-56" /></form><button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl border border-[#dce5e3] bg-white text-[#637773]"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e78b5d]" /></button><div className="hidden items-center gap-2 border-l border-[#dce5e3] pl-4 sm:flex"><div className="grid size-9 place-items-center rounded-full bg-[#f1c6a8] text-xs font-bold text-[#74462e]">AK</div><span className="text-sm font-semibold">Alex</span></div></div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-10">{children}</main>
        <CareAssistant />
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6e9286]"><Sparkles size={14} /> {eyebrow}</p><h2 className="text-3xl font-semibold tracking-[-0.045em] text-[#113c39] sm:text-4xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#71827e]">{description}</p></div>{action}</div>;
}
