"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Mic, Search, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Suggest {
  products: Array<{ slug: string; name: string; image: string; brand: string }>;
  brands: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

/** Full-screen search overlay (PRD S08): recent, trending, autocomplete after 2 chars, voice search. */
export function SearchOverlay({ open, onClose, initialQuery = "" }: { open: boolean; onClose: () => void; initialQuery?: string }) {
  if (!open) return null;
  return <SearchPanel onClose={onClose} initialQuery={initialQuery} />;
}

function SearchPanel({ onClose, initialQuery }: { onClose: () => void; initialQuery: string }) {
  const router = useRouter();
  const open = true;
  const [q, setQ] = React.useState(initialQuery);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [trending, setTrending] = React.useState<string[]>([]);
  const [suggest, setSuggest] = React.useState<Suggest | null>(null);
  const [listening, setListening] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/search/recent")
      .then((r) => (r.ok ? r.json() : { recent: [], trending: [] }))
      .then((d) => {
        setRecent(d.recent ?? []);
        setTrending(d.trending ?? []);
      })
      .catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const shownSuggest = q.trim().length >= 2 ? suggest : null;
  React.useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setSuggest(d))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = (term: string) => {
    const value = term.trim();
    if (!value) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  const removeRecent = async (term: string) => {
    setRecent((r) => r.filter((x) => x !== term));
    await fetch(`/api/search/recent?q=${encodeURIComponent(term)}`, { method: "DELETE" }).catch(() => {});
  };
  const clearRecent = async () => {
    setRecent([]);
    await fetch(`/api/search/recent`, { method: "DELETE" }).catch(() => {});
  };

  const startVoice = () => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setQ(transcript);
      if (transcript) submit(transcript);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };
  const voiceSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Search">
      <form
        className="flex items-center gap-2 border-b border-border px-2 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <button type="button" onClick={onClose} aria-label="Back" className="rounded-full p-2 hover:bg-surface">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-pill bg-surface px-3 h-11">
          <Search className="h-4 w-4 text-text-tertiary" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands, concerns"
            className="flex-1 min-w-0 bg-transparent text-base outline-none"
            aria-label="Search"
            autoComplete="off"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear" className="p-1 min-h-0">
              <X className="h-4 w-4 text-text-tertiary" aria-hidden />
            </button>
          )}
          {voiceSupported && (
            <button type="button" onClick={startVoice} aria-label="Voice search" className={cn("p-1 min-h-0", listening && "text-primary animate-pulse")}>
              <Mic className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {shownSuggest ? (
          <div className="flex flex-col gap-5 animate-fade-up">
            {shownSuggest.categories.length > 0 && (
              <Section title="Categories">
                {shownSuggest.categories.map((c) => (
                  <Link key={c.slug} href={`/c/${c.slug}`} onClick={onClose} className="rounded-pill border border-border px-3 py-1.5 text-sm">
                    {c.name}
                  </Link>
                ))}
              </Section>
            )}
            {shownSuggest.brands.length > 0 && (
              <Section title="Brands">
                {shownSuggest.brands.map((b) => (
                  <Link key={b.slug} href={`/b/${b.slug}`} onClick={onClose} className="rounded-pill border border-border px-3 py-1.5 text-sm">
                    {b.name}
                  </Link>
                ))}
              </Section>
            )}
            {shownSuggest.products.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">Products</h3>
                <ul className="divide-y divide-border">
                  {shownSuggest.products.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/p/${p.slug}`} onClick={onClose} className="flex items-center gap-3 py-2">
                        <Image src={p.image} alt="" width={44} height={44} className="h-11 w-11 rounded-card object-cover bg-surface" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block text-xs text-text-tertiary">{p.brand}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => submit(q)} className="text-left text-sm font-semibold text-primary">
              See all results for “{q}”
            </button>
            {shownSuggest.products.length + shownSuggest.brands.length + shownSuggest.categories.length === 0 && (
              <p className="text-sm text-text-tertiary">No suggestions. Press enter to search anyway.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {recent.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Recent searches</h3>
                  <button onClick={clearRecent} className="text-xs font-semibold text-primary min-h-0">
                    Clear all
                  </button>
                </div>
                <ul className="divide-y divide-border">
                  {recent.map((r) => (
                    <li key={r} className="flex items-center gap-2">
                      <button onClick={() => submit(r)} className="flex flex-1 items-center gap-3 py-2 text-left text-sm">
                        <Clock className="h-4 w-4 text-text-tertiary" aria-hidden />
                        {r}
                      </button>
                      <button onClick={() => removeRecent(r)} aria-label={`Remove ${r}`} className="p-2 min-h-0 text-text-tertiary">
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {trending.length > 0 && (
              <Section title="Trending searches">
                {trending.map((t) => (
                  <button key={t} onClick={() => submit(t)} className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-sm min-h-0">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {t}
                  </button>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
