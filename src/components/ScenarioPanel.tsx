import React from 'react';
import { ScenarioAnalysis } from '../types.ts';
import { Compass, ArrowUpRight, ArrowDownRight, Ban } from 'lucide-react';

interface ScenarioPanelProps {
  scenarios?: ScenarioAnalysis;
  isLoading: boolean;
}

export const ScenarioPanel: React.FC<ScenarioPanelProps> = ({ scenarios, isLoading }) => {
  if (!scenarios && !isLoading) return null;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="pb-3 mb-4 border-b border-slate-800/80">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">4. Probabilistic Planning</span>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          SCENARIO ANALYSIS (MAX 3 PATHWAYS)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Quant rule: Tidak pernah berasumsi pasar hanya 1 arah. Rencanakan trigger, konfirmasi, dan titik invalidasi sebelum entry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bullish Scenario */}
        <div className="bg-slate-950/70 border border-emerald-900/50 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-800">
              <div className="p-1.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  BULLISH SCENARIO
                </h3>
                <span className="text-[10px] text-slate-400">Kondisi validasi bias kenaikan</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] font-mono font-semibold text-emerald-400 block mb-0.5">TRIGGER:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bullishScenario?.trigger || (isLoading ? 'Menghitung trigger...' : '-')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-400 block mb-0.5">CONFIRMATION:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bullishScenario?.confirmation || '-'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-rose-400 block mb-0.5">INVALIDATION:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bullishScenario?.invalidation || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Risk Context: </span>
            {scenarios?.bullishScenario?.riskContext || '-'}
          </div>
        </div>

        {/* Bearish Scenario */}
        <div className="bg-slate-950/70 border border-rose-900/50 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-800">
              <div className="p-1.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800/60">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  BEARISH SCENARIO
                </h3>
                <span className="text-[10px] text-slate-400">Kondisi validasi bias penurunan</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] font-mono font-semibold text-rose-400 block mb-0.5">TRIGGER:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bearishScenario?.trigger || (isLoading ? 'Menghitung trigger...' : '-')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-400 block mb-0.5">CONFIRMATION:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bearishScenario?.confirmation || '-'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-emerald-400 block mb-0.5">INVALIDATION:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.bearishScenario?.invalidation || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Risk Context: </span>
            {scenarios?.bearishScenario?.riskContext || '-'}
          </div>
        </div>

        {/* No-Trade Scenario */}
        <div className="bg-slate-950/70 border border-amber-900/50 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-slate-800">
              <div className="p-1.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/60">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  NO-TRADE SCENARIO
                </h3>
                <span className="text-[10px] text-slate-400">Disiplin proteksi modal (Wait)</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] font-mono font-semibold text-amber-400 block mb-0.5">KONDISI STAY OUT:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.noTradeScenario?.trigger || (isLoading ? 'Mengevaluasi parameter no-trade...' : '-')}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-slate-400 block mb-0.5">RED FLAGS / TRAPS:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.noTradeScenario?.confirmation || '-'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold text-sky-400 block mb-0.5">KAPAN RE-EVALUASI:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {scenarios?.noTradeScenario?.invalidation || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Prinsip: </span>
            {scenarios?.noTradeScenario?.riskContext || 'Cash adalah posisi yang valid dalam quant trading.'}
          </div>
        </div>
      </div>
    </section>
  );
};
