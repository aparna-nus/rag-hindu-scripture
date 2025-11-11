import type { Manifest, ShardData, Chunk } from "./types";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const url = (p: string) => `${BASE}/${p.replace(/^\/+/, "")}`;

async function fetchText(u: string) {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Fetch failed ${u}`);
  return await res.text();
}
async function fetchJSON<T>(u: string): Promise<T> {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Fetch failed ${u}`);
  return await res.json();
}
async function fetchBin(u: string): Promise<ArrayBuffer> {
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Fetch failed ${u}`);
  return await res.arrayBuffer();
}

export async function loadShard(name: string): Promise<ShardData> {
  // shard files live under public/data/<name>/
  const root = url(`data/${name}`);

  // manifest.json is in that folder
  const manifest = await fetchJSON<Manifest>(url(`data/${name}/manifest.json`));

  // these are relative filenames inside the same folder
  const chunksPath = url(`data/${name}/${manifest.combined_chunks}`);
  const embPath    = url(`data/${name}/${manifest.embeddings_bin}`);

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

  // load embeddings (float16) → float32
  const ab = await fetchBin(embPath);
  const f16 = new Uint16Array(ab);
  function halfToFloat(h: number): number {
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
