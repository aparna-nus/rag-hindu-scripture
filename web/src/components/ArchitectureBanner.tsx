import { Library, Search, Zap, Brain, MessageSquare, ArrowRight } from "lucide-react";

export default function ArchitectureBanner() {
  const nodeStyle =
    "flex flex-col items-center justify-center p-4 bg-white shadow-md rounded-xl border border-slate-200 w-44 transition-all hover:scale-105 hover:shadow-lg hover:-translate-y-1 hover:ring-2 hover:ring-sky-300/40";

  const arrowStyle =
    "text-slate-400 transition-all animate-pulseSlow";

  return (
    <div className="w-full flex flex-col items-center pt-6 pb-8 bg-slate-50">
      {/* Title */}
      <h2 className="text-xl font-semibold text-slate-700 mb-4">
       How does it work?
      </h2>

      {/* Flow Row */}
      <div className="flex items-center gap-4 flex-wrap justify-center">

        {/* Node 1 */}
        <div className={nodeStyle}>
          <Library className="h-8 w-8 text-sky-500 mb-2" />
          <div className="font-medium text-slate-700">Scripture Corpus</div>
          <div className="text-xs text-slate-500">
            Bhagavid Gita • Upanishads • Vedas
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className={`${arrowStyle} h-7 w-7`} />

        {/* Node 2 */}
        <div className={nodeStyle}>
          <Search className="h-8 w-8 text-sky-500 mb-2" />
          <div className="font-medium text-slate-700">Local Retrieval</div>
          <div className="text-xs text-slate-500">
            Embeddings + Hybrid Search
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className={`${arrowStyle} h-7 w-7`} />

        {/* Node 3 */}
        <div className={nodeStyle}>
          <Zap className="h-8 w-8 text-sky-500 mb-2" />
          <div className="font-medium text-slate-700">Cloudflare Worker</div>
          <div className="text-xs text-slate-500">
            Secure API Layer to call Groq secret key
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className={`${arrowStyle} h-7 w-7`} />

        {/* Node 4 */}
        <div className={nodeStyle}>
          <Brain className="h-8 w-8 text-sky-500 mb-2" />
          <div className="font-medium text-slate-700">Llama 3.3</div>
          <div className="text-xs text-slate-500">
            via Groq Fast Reasoning
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className={`${arrowStyle} h-7 w-7`} />

        {/* Node 5 */}
        <div className={nodeStyle}>
          <MessageSquare className="h-8 w-8 text-sky-500 mb-2" />
          <div className="font-medium text-slate-700">Chat UI</div>
          <div className="text-xs text-slate-500">
            React + GitHub Pages
          </div>
        </div>

      </div>
    </div>
  );
}
