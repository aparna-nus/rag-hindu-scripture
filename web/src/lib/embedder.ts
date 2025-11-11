// Minimal stub: return a random-but-stable vector per query length to keep API free.
// Replace with a real embedder later (e.g., @xenova/transformers MiniLM).
export async function embedQueryStub(q: string, dim = 384): Promise<Float32Array> {
  // Simple hash → pseudo-random but consistent
  let h = 2166136261 >>> 0;
  for (let i = 0; i < q.length; i++) {
    h ^= q.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const v = new Float32Array(dim);
  let seed = h;
  for (let i = 0; i < dim; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    v[i] = ((seed & 0xffff) / 0xffff) * 2 - 1; // [-1, 1]
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}
