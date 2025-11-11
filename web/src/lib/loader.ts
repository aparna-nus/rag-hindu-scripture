import type { Manifest, ShardData, Chunk } from "./types";

const BASE = "/data"; // served from web/public/data via sync script

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}`);
  return await res.text();
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}`);
  return await res.json();
}

async function fetchBin(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}`);
  return await res.arrayBuffer();
}

export async function loadShard(name: string): Promise<ShardData> {
  const root = `${BASE}/${name}`;
  const manifest = await fetchJSON<Manifest>(`${root}/manifest.json`);
  const chunksPath = `${root}/${manifest.combined_chunks}`;
  const embPath    = `${root}/${manifest.embeddings_bin}`;

  // load records
  const raw = await fetchText(chunksPath);
  const records: Chunk[] = [];
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    const obj = JSON.parse(s) as Chunk;
    obj.shard = name;
    records.push(obj);
  }

  // load embeddings (float16) and view as float32
  const ab = await fetchBin(embPath);
  const f16 = new Uint16Array(ab); // raw half floats
  // convert f16 -> f32 (approx; faster than full IEEE half parse)
  // We assume embeddings were L2-normalized already; “good enough” for cosine via dot.
  // Simple table-based converter could be added; here use a tiny float16->float32 helper:
  function halfToFloat(h: number): number {
    // reference https://stackoverflow.com/a/56728174
    const s = (h & 0x8000) >> 15;
    const e = (h & 0x7C00) >> 10;
    const f = h & 0x03FF;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -24) * f;
    if (e === 0x1F) return f ? NaN : ((s ? -1 : 1) * Infinity);
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
  }
  const embF32 = new Float32Array(f16.length);
  for (let i = 0; i < f16.length; i++) embF32[i] = halfToFloat(f16[i]);

  return { name, records, emb: embF32, dim: manifest.dim };
}
