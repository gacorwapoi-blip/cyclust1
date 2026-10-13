import React from 'react';
import { WebSource } from '../types.ts';
import { ExternalLink, Search, ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';

interface SourcesPanelProps {
  sources?: WebSource[];
  searchQueries?: string[];
  factualVsInterpretationNote?: string;
  isLoading: boolean;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  searchQueries,
  factualVsInterpretationNote,
  isLoading,
}) => {
  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">9. Grounding Citations</span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            GOOGLE SEARCH CITATIONS & METHODOLOGY
          </h2>
        </div>
        <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
          Live Grounding Verified
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Web Grounding Links */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Sumber Web yang Dikutip ({sources?.length || 0}):</span>
          </div>

          {sources && sources.length > 0 ? (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {sources.map((src, idx) => (
                <li key={idx} className="text-xs">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-2 p-2 rounded bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors group"
                  >
                    <span className="truncate flex-1 font-medium">{src.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic p-2">
              {isLoading ? 'Mengumpulkan sitasi web grounding...' : 'Belum ada sumber yang dimuat.'}
            </p>
          )}

          {searchQueries && searchQueries.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">PENCARIAN GROUNDING AKTIF:</span>
              <div className="flex flex-wrap gap-1.5">
                {searchQueries.map((q, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                  >
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Factual vs Interpretation Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Diferensiasi: Fakta vs Interpretasi AI</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
              {factualVsInterpretationNote ||
                'Data faktual meliputi harga pasar terkini, rilis data ekonomi (CPI, NFP), dan pidato resmi The Fed. Interpretasi AI adalah model konfluensi kuantitatif probabilitas bersyarat, yang tidak bebas dari ketidakpastian pasar.'}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-amber-400/90">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Disclaimer: Aplikasi ini adalah instrumen decision-support kuantitatif edukatif. Tidak ada jaminan keuntungan dan bukan rekomendasi finansial.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
