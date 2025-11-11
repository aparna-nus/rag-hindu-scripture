export type Chunk = {
  text: string;
  work?: string;
  collection?: string;
  translator?: string;
  source?: string;           // URL
  canonical_ref?: string;    // e.g., "BG 2.47"
  canon_id?: string;
  id?: string;
  shard?: string;            // set client-side
  _idx?: number;             // set client-side
  _score?: number;           // set client-side
};

export type Manifest = {
  dim: number;               // embedding dim (e.g., 384)
  combined_chunks: string;   // "chunks.jsonl" or similar
  embeddings_bin: string;    // "embeddings.f16.bin"
  count?: number;
};

export type ShardData = {
  name: string;
  records: Chunk[];
  emb: Float32Array;         // length = count * dim
  dim: number;
};
