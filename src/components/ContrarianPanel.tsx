import React from 'react';
import { ContrarianCheck } from '../types.ts';
import { AlertTriangle, Flame, ShieldCheck } from 'lucide-react';

interface ContrarianPanelProps {
  contrarian?: ContrarianCheck;
  isLoading: boolean;
}

export const ContrarianPanel: React.FC<ContrarianPanelProps> = ({ contrarian, isLoading }) => {
  if (!contrarian && !isLoading) return null;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400/90 flex items-center gap-1.5 font-bold">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            6. Mandatory Invalidation Audit
          </span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            WHAT COULD MAKE THIS ANALYSIS WRONG?
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Devil's Advocate Protocol</span>
        </div>
      </div>

      <div className="bg-slate-950/80 border border-rose-950/80 rounded-xl p-4 sm:p-5">
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Quant analyst sejati tidak mencari pembenaran atas biasnya, melainkan aktif mencari titik di mana hipotesisnya akan gugur (falsification principle).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Failure Modes */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Skenario Kegagalan (Failure Modes):</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {contrarian?.failureModes?.map((mode, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded border border-rose-900/30">
                  <span className="text-rose-400 font-bold font-mono">[{idx + 1}]</span>
                  <span className="leading-relaxed">{mode}</span>
                </li>
              )) || (
                <li className="text-slate-500 italic text-xs">
                  {isLoading ? 'Mengevaluasi risiko kegagalan setup...' : 'Data belum dimuat.'}
                </li>
              )}
            </ul>
          </div>

          {/* Liquidity Traps & Fakeouts */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Jebakan Likuiditas & Fakeout (Stop Hunt):</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-amber-900/30 text-xs text-slate-300 leading-relaxed min-h-[100px] flex items-center">
              <p>
                {contrarian?.trapScenarios ||
                  (isLoading
                    ? 'Memeriksa level stop cluster yang rentan disapu...'
                    : 'Perhatikan equal highs/lows dan session open sweeps.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
