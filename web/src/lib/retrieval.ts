import type { ShardData, Chunk } from "./types";
import { BM25 } from "./bm25";

export type Corpus = {
  records: Chunk[];       // all loaded records
  emb: Float32Array;      // stacked (N * dim)
  dim: number;
  bm25: BM25;
};

// Build a single “corpus” from N shards (only for the selected ones)
export function buildCorpus(shards: ShardData[]): Corpus {
  const records = shards.flatMap(s => s.records);
  if (records.length === 0) throw new Error("No records in corpus");
  const dim = shards[0].dim;
  const totalLen = shards.reduce((acc, s) => acc + s.emb.length, 0);
  const emb = new Float32Array(totalLen);
  // stack embeddings by shard
  let offset = 0;
  for (const s of shards) {
    emb.set(s.emb, offset);
    offset += s.emb.length;
  }
  const bm25 = new BM25(records.map(r => r.text || ""));
  return { records, emb, dim, bm25 };
}

// --- simple Sanskrit/topic expansion ---
const EXPAND = new Map<string, string[]>([
  ["meaning of life", ["purpose", "telos", "moksha", "puruṣārtha", "artha", "dharma", "kāma"]],
  ["self", ["ātman", "self", "soul", "puruṣa"]],
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
  // also split on spaces and add near-synonyms directly matched
  return added.size ? `${q} ${Array.from(added).join(" ")}` : q;
}


// Cosine via dot, assuming query emb normalized and doc embs near-normalized
function cosineTopK(q: Float32Array, docEmb: Float32Array, dim: number, k: number): Array<[number, number]> {
  const N = docEmb.length / dim;
  const scores = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    const base = i * dim;
    for (let j = 0; j < dim; j++) s += q[j] * docEmb[base + j];
    scores[i] = s;
  }
  // select top-k
  const idx = Array.from({ length: N }, (_, i) => i);
  idx.sort((a, b) => (scores[b] - scores[a]));
  return idx.slice(0, k).map(i => [i, scores[i]]);
}

export function hybridRetrieve(
  query: string,
  queryEmbed: (q: string) => Promise<Float32Array>,
  corpus: Corpus,
  opts = { kVec: 12, kBM: 12, topFinal: 8 }
): Promise<Chunk[]> {
  return (async () => {
    const { records, emb, dim, bm25 } = corpus;
    const qv = await queryEmbed(query);
    const vec = cosineTopK(qv, emb, dim, Math.min(opts.kVec, records.length));
    const bm  = bm25.score(query)
      .map((s, i) => [i, s] as [number, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(opts.kBM, records.length));

    const combined = new Map<number, number>();
    for (const [i, s] of vec) combined.set(i, Math.max(combined.get(i) ?? -1e9, s));
    if (bm.length) {
      const maxBM = bm[0][1] || 1;
      for (const [i, s] of bm) {
        combined.set(i, Math.max(combined.get(i) ?? -1e9, (s / maxBM) * 0.9));
      }
    }

    const final = Array.from(combined.entries()).sort((a, b) => b[1] - a[1]).slice(0, opts.topFinal);
    return final.map(([i, sc]) => {
      const r = { ...records[i] };
      (r as any)._idx = i;
      (r as any)._score = sc;
      return r;
    });
  })();
}
