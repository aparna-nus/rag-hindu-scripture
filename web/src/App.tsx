import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { loadShard } from "./lib/loader";
import { buildCorpus, hybridRetrieve } from "./lib/retrieval";
import { embedQueryStub } from "./lib/embedder";
import type { ShardData, Chunk } from "./lib/types";
import { callLLM } from "./lib/workerClient";
import ArchitectureBanner from "./components/ArchitectureBanner";



/* ----------------------------- UI helpers ----------------------------- */

type SourceFilter = {
  shards: string[];
  works: string[];
  collections: string[];
};

const ALL_SHARDS = [
  { id: "gita_arnold", label: "Bhagavad Gita (Arnold)" },
  { id: "upanishads_sbe", label: "Upanishads (SBE)" },
  { id: "rigveda_griffith", label: "Rig Veda (Griffith)" },
];

const ALL_COLLECTIONS = [{ id: "Upanishads", label: "Upanishads (collection)" }];

const ALL_WORKS = [{ id: "Bhagavad Gita", label: "Bhagavad Gita" }];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
    </div>
  );
}

function ArchitectureCard() {
  return (
    <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.05 }}
          className="w-full lg:w-1/3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-semibold text-slate-800">Client (GitHub Pages)</div>
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li>• React + Vite + Tailwind</li>
            <li>• Local BM25 + cosine similarity</li>
            <li>• Loads embeddings from <code className="px-1 bg-slate-100 rounded">/data</code></li>
            <li>• Optional: send top-K passages → Worker</li>
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="hidden lg:block text-slate-400">
          <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
            <path d="M2 12 H52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M52 12 l-6 -6 M52 12 l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.1 }}
          className="w-full lg:w-1/3 rounded-xl border border-slate-200 bg-sky-50/60 p-4"
        >
          <div className="text-sm font-semibold text-slate-800">Cloudflare Worker (free)</div>
          <ul className="mt-2 text-xs text-slate-700 space-y-1">
            <li>• Holds Groq API key securely</li>
            <li>• <code className="px-1 bg-slate-100 rounded">POST /chat</code>: query + passages → LLM</li>
            <li>• Returns concise, cited answer</li>
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="hidden lg:block text-slate-400">
          <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
            <path d="M2 12 H52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M52 12 l-6 -6 M52 12 l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 20, delay: 0.15 }}
          className="w-full lg:w-1/3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="text-sm font-semibold text-slate-800">Answer + Citations</div>
          <ul className="mt-2 text-xs text-slate-600 space-y-1">
            <li>• Strictly grounded in retrieved text</li>
            <li>
              • Inline refs like <code className="px-1 bg-slate-100 rounded">BG 2.47</code>,{" "}
              <code className="px-1 bg-slate-100 rounded">Kena 1.3</code>,{" "}
              <code className="px-1 bg-slate-100 rounded">RV 1.1.1</code>
            </li>
            <li>• Expandable sources panel</li>
          </ul>
        </motion.div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill>Stack: React • Vite • Tailwind • Framer Motion</Pill>
        <Pill>Retrieval: BM25 + MiniLM cosine</Pill>
        <Pill>Model: Groq Llama (via Worker)</Pill>
        <Pill>Data: Public Domain translations</Pill>
      </div>
    </div>
  );
}

function SidebarFilters({
  filter,
  setFilter,
  loadingShards,
  selectedRef,
  passage,
  clearSelection,
}: {
  filter: SourceFilter;
  setFilter: (f: SourceFilter) => void;
  loadingShards: boolean;
  selectedRef: string | null;
  passage: { ref: string; work?: string; text: string; source?: string } | null;
  clearSelection: () => void;
}) {
  const onToggle = (id: string) => {
    setFilter({
      shards: filter.shards.includes(id)
        ? filter.shards.filter((x) => x !== id)
        : [...filter.shards, id],
      works: [],
      collections: [],
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Scriptures</h2>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={filter.shards.includes("gita_arnold")}
            onChange={() => onToggle("gita_arnold")}
          />
          Bhagavad Gita (Arnold)
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={filter.shards.includes("upanishads_sbe")}
            onChange={() => onToggle("upanishads_sbe")}
          />
          Upanishads (SBE)
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={filter.shards.includes("rigveda_griffith")}
            onChange={() => onToggle("rigveda_griffith")}
          />
          Rig Veda (Griffith)
        </label>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {loadingShards ? "Loading scripture…" : "Select one or many scriptures"}
      </div>

      {/* Full Passage panel */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Full Passage</h3>
          {selectedRef && (
            <button
              onClick={clearSelection}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {!selectedRef && (
          <div className="mt-2 text-xs text-slate-500">
            Click a source in the chat to read the full passage.
          </div>
        )}

        {selectedRef && (
          <div className="mt-2">
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">{passage?.ref}</span>{" "}
              {passage?.work ? <span className="text-slate-500">[{passage.work}]</span> : null}
              {passage?.source ? (
                <a
                  href={passage.source}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-sky-600 hover:underline"
                >
                  source
                </a>
              ) : null}
            </div>
            <div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {passage?.text || "Passage not found."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ChatBox({
  corpusReady,
  onAskQuery,
  onSelectSource,
}: {
  corpusReady: boolean;
  onAskQuery: (q: string) => Promise<{ content: string; sources: { ref: string; work?: string; snippet: string }[] }>;
  onSelectSource: (ref: string) => void;
})  {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; sources?: any[] }[]
  >([]);

  const onAsk = async () => {
    const q = query.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setQuery("");

    if (!corpusReady) {
      setMessages((m) => [...m, { role: "assistant", content: "Sources not loaded yet. Pick shards on the right and try again." }]);
      return;
    }

    const resp = await onAskQuery(q);
    setMessages((m) => [...m, { role: "assistant", content: resp.content, sources: resp.sources }]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Chat</div>
      </div>

      <div className="p-4 h-[420px] overflow-auto space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">
            Ask a question like: <span className="text-slate-700">“What is <i>nishkama karma</i>? or What is the meaning of life?”</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 ${
                m.role === "user" ? "bg-sky-600 text-white ring-sky-700" : "bg-white text-slate-800 ring-slate-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.sources && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-semibold text-slate-600">Sources</div>
                  {m.sources.map((s, j) => (
  <button
    key={j}
    onClick={() => onSelectSource(s.ref)}
    className="block text-left w-full text-xs text-slate-600 hover:bg-slate-100/70 rounded-md px-1 py-0.5"
    title="Show full passage"
  >
    • <span className="font-medium text-slate-700">{s.ref}</span>{" "}
    <span className="text-slate-500">[{s.work}]</span> — {s.snippet}
  </button>
))}

                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAsk()}
            placeholder="Ask about the Gita, Upanishads, Rig Veda…"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <button
            onClick={onAsk}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Main App ----------------------------- */
// --- simple Sanskrit/topic expansion for broad questions ---
const EXPAND = new Map<string, string[]>([
  ["meaning of life", ["purpose", "moksha", "puruṣārtha", "artha", "dharma", "kāma"]],
  ["self", ["ātman", "soul", "puruṣa"]],
  ["god", ["brahman", "īśvara", "deva", "paramātman"]],
  ["duty", ["dharma", "svadharma", "karma-yoga"]],
  ["desireless action", ["niṣkāma karma", "karma-yoga", "anāśritaḥ karma-phalam"]],
  ["liberation", ["moksha", "mukti", "nirvāṇa"]],
  ["knowledge", ["jñāna", "vidyā", "brahma-vidyā"]],
  ["devotion", ["bhakti", "śraddhā"]],
  ["action", ["karma", "karma-yoga"]],
]);

function expandQuery(q: string): string {
  const lower = q.toLowerCase();
  const added = new Set<string>();
  for (const [k, vals] of EXPAND.entries()) {
    if (lower.includes(k) || vals.some(v => lower.includes(v.toLowerCase()))) {
      vals.forEach(v => added.add(v));
    }
  }
  return added.size ? `${q} ${Array.from(added).join(" ")}` : q;
}

function extractChunksFromShard(s: any): any[] {
  // Try common shapes
  if (Array.isArray(s?.chunks)) return s.chunks;
  if (Array.isArray(s?.data?.chunks)) return s.data.chunks;
  if (Array.isArray(s?.passages)) return s.passages;
  if (Array.isArray(s?.documents)) return s.documents;
  if (Array.isArray(s?.items)) return s.items;
  return [];
}

function getRefField(c: any): string {
  return (
    (c?.canonical_ref ?? c?.canon_id ?? c?.id ?? "").toString().trim()
  );
}

function normalizeRef(ref: string): string {
  // make matching tolerant: collapse spaces, strip brackets, normalize punctuation
  return ref
    .replace(/\s+/g, " ")
    .replace(/\[.*?\]/g, "")    // drop any trailing [Bhagavad Gita]
    .replace(/[–—-]/g, "-")
    .trim();
}


export default function App() {
  const [filter, setFilter] = useState<SourceFilter>({
    shards: ["gita_arnold"],
    works: ["Bhagavad Gita"],
    collections: [],
  });

  const [loaded, setLoaded] = useState<Record<string, ShardData>>({});
  const [corpus, setCorpus] = useState<ReturnType<typeof buildCorpus> | null>(null);
  const [loadingShards, setLoadingShards] = useState(false);

  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  // keep a flat view of all loaded chunks for lookup
  const [allChunks, setAllChunks] = useState<Chunk[]>([]);

  const [lastRetrieved, setLastRetrieved] = useState<any[]>([]);


  useEffect(() => {
  console.debug("allChunks loaded:", allChunks.length, allChunks.slice(0,3).map(c => (c as any).canonical_ref || (c as any).canon_id || (c as any).id));
}, [allChunks]);




  // Load selected shards & build corpus
useEffect(() => {
  let cancelled = false;

  (async () => {
    setLoadingShards(true);
    const need = filter.shards.filter((id) => !loaded[id]);
    const newly: Record<string, ShardData> = {};

    for (const id of need) {
      try {
        const s = await loadShard(id);
        if (cancelled) return;
        newly[id] = s;
      } catch (e) {
        console.error("Failed to load shard", id, e);
      }
    }

    const merged = { ...loaded, ...newly };
    if (cancelled) return;

    setLoaded(merged);

    const picked = filter.shards.map((id) => merged[id]).filter(Boolean) as ShardData[];

    if (picked.length) {
      const built = buildCorpus(picked);
      setCorpus(built);

      // robust flatten
      const flat: Chunk[] = [];
      for (const s of picked) {
        const arr = extractChunksFromShard(s);
        if (Array.isArray(arr)) flat.push(...(arr as any[]));
      }
      setAllChunks(flat);

      console.log(
        "[RAG] allChunks:", flat.length,
        flat.slice(0, 5).map((c: any) => getRefField(c))
      );
    } else {
      setCorpus(null);
      setAllChunks([]);
      console.log("[RAG] allChunks: 0");
    }

    setLoadingShards(false);
  })();

  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filter.shards]);


  const corpusReady = !!corpus;

const onAskQuery = async (q: string) => {
  if (!corpus) {
    return { content: "Sources not loaded.", sources: [] as any[] };
  }

  // 1) first pass
  let top = await hybridRetrieve(
    q,
    (qq) => embedQueryStub(qq, corpus.dim),
    corpus,
    { kVec: 24, kBM: 24, topFinal: 8 } // broaden a bit
  );

  setLastRetrieved(top); // keep the raw retrieved items for the sidebar viewer

  // simple “coverage” heuristic: if we got <5 chunks, or many from same verse, try expansion
  const uniqueRefs = new Set(top.map(r => r.canonical_ref || r.canon_id || r.id));
  if (top.length < 5 || uniqueRefs.size < 3) {
    const q2 = expandQuery(q);
    if (q2 !== q) {
      const top2 = await hybridRetrieve(
        q2,
        (qq) => embedQueryStub(qq, corpus.dim),
        corpus,
        { kVec: 24, kBM: 24, topFinal: 8 }
      );
      // merge (dedupe by id) keeping best scores first
      const seen = new Set<string>();
      const merged: typeof top = [];
      for (const r of [...top, ...top2]) {
        const id = r.canonical_ref || r.canon_id || r.id || `${r.work}:${r.text?.slice(0,20)}`;
        if (!seen.has(id)) { seen.add(id); merged.push(r); }
      }
      top = merged.slice(0, 10);
    }
  }

  const formatted = top.map((r) => ({
    id: r.canonical_ref || r.canon_id || r.id || "?",
    text: r.text || "",
    work: r.work,
  }));

  const answer = await callLLM(
    "https://scripture-llm.aparnakrishna-work.workers.dev",
    q,
    formatted
  );

  return {
    content: answer,
    sources: formatted.map((r) => ({
      ref: r.id,
      work: r.work,
      snippet: r.text.slice(0, 150) + (r.text.length > 150 ? "…" : "")
    })),
  };
};


function getPassageFromLastRetrieved(
  ref: string,
  retrieved: any[]
): { ref: string; work?: string; text: string; source?: string } | null {
  if (!ref || !retrieved?.length) return null;

  const norm = (s: string) =>
    (s || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[–—-]/g, "-");

  // find by any common id field
  const match = retrieved.find((r) => {
    const rid =
      r.canonical_ref || r.canon_id || r.id || "";
    return (
      norm(rid) === norm(ref) ||
      norm(rid).startsWith(norm(ref)) ||
      norm(rid).includes(norm(ref))
    );
  });

  if (!match) return null;

  return {
    ref: match.canonical_ref || match.canon_id || match.id || ref,
    work: match.work,
    source: match.source,        // if present in your data
    text: match.text || "",      // <- exact passage text the chat showed
  };
}



  // build passage only once per render
const passage = selectedRef
  ? getPassageFromLastRetrieved(selectedRef, lastRetrieved)
  : null;



  return (
    

    <div className="min-h-dvh bg-slate-50">
      <div className="w-full flex flex-col items-center">
  <ArchitectureBanner />

</div>
<header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b border-slate-200">
  <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-center">
    <h2 className="text-xl font-semibold text-slate-700">
      Chat with Hindu Scriptures:
    </h2>
  </div>
</header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
  
  {/* Banner already above, so we start with Chat + Filters */}
  <div className="grid lg:grid-cols-3 gap-6">

    {/* CHAT (left, bigger) */}
    <div className="lg:col-span-2">
     <ChatBox
  corpusReady={corpusReady}
  onAskQuery={onAskQuery}
  onSelectSource={(ref) => setSelectedRef(ref)}
/>

    </div>

    {/* FILTERS (right) */}
    <div className="lg:col-span-1">

<SidebarFilters
  filter={filter}
  setFilter={setFilter}
  loadingShards={loadingShards}
  selectedRef={selectedRef}
  passage={passage}
  clearSelection={() => setSelectedRef(null)}
/>

    </div>

  </div>

</main>
    </div>
  );
}
