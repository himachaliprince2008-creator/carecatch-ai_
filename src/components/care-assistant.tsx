"use client";

import { FormEvent, useState } from "react";
import { Bot, ChevronDown, Loader2, Mic, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { HospitalResultCard, type HospitalCardData } from "@/components/hospital-result-card";

const suggestions = [
  "Find Asthma specialist near me",
  "Hospital for Lung Cancer with PM-JAY",
  "Nearby hospital for Typhoid Fever",
  "Dengue Fever treatment under ₹50,000",
  "Best hospital for Major Trauma",
];

type HospitalResult = {
  hospital: HospitalCardData;
  matchScore: number;
  matchReasons: string[];
  matchedRequirements: string[];
  unmatchedRequirements: string[];
  dataAvailability: {
    cost: boolean;
    outcome: boolean;
    distance: boolean;
    facilities: boolean;
    verification: boolean;
    rating: boolean;
  };
  dataVerificationStatus: string;
};

type AssistantResponse =
  | { type: "clarification"; question: string; parsedRequirements: Record<string, unknown> }
  | { type: "results"; parsedRequirements: Record<string, unknown>; items: HospitalResult[] };

export function CareAssistant() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setQuery(speechResult);
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  async function submitQuery(event?: FormEvent) {
    event?.preventDefault();
    const value = query.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value }),
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error?.message ?? "The assistant could not complete this search.");
      setResponse(payload.data as AssistantResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant could not complete this search.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    {open && <section aria-label="CareMatch AI assistant" className="fixed bottom-24 right-4 z-50 flex max-h-[min(720px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem] border border-[#d5e3dd] bg-[#f9fcfa] shadow-[0_24px_70px_rgba(17,60,57,0.22)] sm:right-6">
      <header className="flex items-center justify-between bg-[#113c39] px-5 py-4 text-white"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#c9ee9e] text-[#113c39]"><Bot size={21} /></div><div><h2 className="text-sm font-bold">CareMatch AI</h2><p className="mt-0.5 text-[11px] text-[#c6ddd2]">Your care navigation assistant</p></div></div><button aria-label="Close assistant" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-[#c6ddd2] hover:bg-white/10"><X size={18} /></button></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4"><div className="rounded-2xl bg-[#e8f4e8] p-4"><p className="text-sm font-semibold text-[#245646]">Tell me what kind of care you are looking for.</p><p className="mt-1 text-xs leading-5 text-[#668176]">I will translate your request into search filters, then show only database-backed records.</p></div>
        <div><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#7a9089]"><Sparkles size={13} /> Try a search</p><div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setQuery(suggestion)} className="rounded-full border border-[#cfe0d7] bg-white px-3 py-2 text-left text-xs font-medium text-[#416b5d] hover:border-[#7eae83] hover:bg-[#f0f8ed]">{suggestion}</button>)}</div></div>
        {loading && <div className="flex items-center gap-3 rounded-2xl border border-[#dce8e2] bg-white p-4 text-sm text-[#5d7770]"><Loader2 className="animate-spin text-[#4f8964]" size={18} /> Understanding your request and checking available records...</div>}
        {error && <div role="alert" className="rounded-2xl border border-[#f0c8b7] bg-[#fff4ef] p-4 text-sm text-[#9b5335]"><p className="font-bold">Search unavailable</p><p className="mt-1 text-xs leading-5">{error}</p></div>}
        {response?.type === "clarification" && <div className="rounded-2xl border border-[#ecdba9] bg-[#fff9e9] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#997c31]">One detail needed</p><p className="mt-2 text-sm font-semibold text-[#67531f]">{response.question}</p></div>}
        {response?.type === "results" && <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718a82]">Database-backed matches</p><span className="rounded-full bg-[#e8f4e8] px-2.5 py-1 text-[10px] font-bold text-[#47775b]">{response.items.length} found</span></div>{response.items.length === 0 ? <div className="rounded-2xl border border-dashed border-[#bcd1c4] bg-white p-5 text-center"><p className="text-sm font-semibold text-[#42665a]">No matching records found</p><p className="mt-1 text-xs leading-5 text-[#81948d]">Try a broader location, specialty, or budget. No hospitals were invented for this search.</p></div> : response.items.map((item) => <HospitalResultCard key={item.hospital.id} hospital={item.hospital} matchScore={item.matchScore} matchReason={item.matchReasons[0]} outcomeEvidence={item.hospital.specializations?.flatMap((specialization) => specialization.disease?.outcomes ?? [])} />)}</div>}
      </div>
      <form onSubmit={submitQuery} className="border-t border-[#dce8e2] bg-white p-3"><div className="flex items-center gap-2 rounded-xl border border-[#cfe0d7] bg-[#f9fcfa] px-3 py-2 focus-within:border-[#79a881]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Describe the care you need..." className="min-w-0 flex-1 bg-transparent text-sm text-[#113c39] outline-none placeholder:text-[#9aaba5]" /><button type="button" title="Start voice search" aria-label="Start voice search" onClick={startVoiceSearch} className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-[#8b9e98] hover:bg-[#edf5ef]'}`}><Mic size={17} /></button><button type="submit" aria-label="Send search" disabled={!query.trim() || loading} className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#113c39] text-[#c9ee9e] disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /></button></div><p className="mt-2 px-1 text-[10px] text-[#96a7a1]">AI understands requirements; hospitals and facts come from verified database records.</p></form>
    </section>}
    <button aria-label={open ? "Close CareMatch AI" : "Open CareMatch AI"} onClick={() => setOpen((value) => !value)} className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-[#113c39] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(17,60,57,0.28)] transition-transform hover:-translate-y-0.5 sm:right-6"><span className="grid size-8 place-items-center rounded-full bg-[#c9ee9e] text-[#113c39]">{open ? <ChevronDown size={18} /> : <Bot size={18} />}</span><span className="hidden sm:inline">CareMatch AI</span></button>
  </>;
}

