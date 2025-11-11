// Tiny BM25 (Okapi) in TS — good enough for our small corpora.

export type BM25Doc = { tokens: string[] };

export class BM25 {
  private docs: BM25Doc[];
  private df: Map<string, number>;
  private avgdl: number;
  private k1 = 1.2;
  private b = 0.75;

  constructor(texts: string[]) {
    this.docs = texts.map(t => ({ tokens: BM25.tokenize(t) }));
    this.df = new Map<string, number>();
    for (const d of this.docs) {
      const seen = new Set(d.tokens);
      for (const tok of seen) this.df.set(tok, (this.df.get(tok) ?? 0) + 1);
    }
    const totalLen = this.docs.reduce((s, d) => s + d.tokens.length, 0);
    this.avgdl = this.docs.length ? totalLen / this.docs.length : 0;
  }

  static tokenize(s: string): string[] {
    return s.toLowerCase().split(/\W+/).filter(Boolean);
  }

  score(query: string): number[] {
    const q = BM25.tokenize(query);
    const scores = new Array(this.docs.length).fill(0);
    const N = this.docs.length || 1;
    const idf = (t: string) => {
      const df = this.df.get(t) ?? 0;
      return Math.log(1 + (N - df + 0.5) / (df + 0.5));
    };
    for (let i = 0; i < this.docs.length; i++) {
      const d = this.docs[i];
      const tf = new Map<string, number>();
      for (const tok of d.tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
      const dl = d.tokens.length;
      for (const t of q) {
        const f = tf.get(t) ?? 0;
        if (!f) continue;
        const denom = f + this.k1 * (1 - this.b + this.b * (dl / (this.avgdl || 1)));
        scores[i] += idf(t) * ((f * (this.k1 + 1)) / (denom || 1));
      }
    }
    return scores;
  }
}
