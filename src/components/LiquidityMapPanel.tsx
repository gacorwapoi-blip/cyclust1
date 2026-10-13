import React from 'react';
import { LiquidityMap, TimeframeType } from '../types.ts';
import { Target, ArrowUpRight, ArrowDownRight, Layers, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LiquidityMapPanelProps {
  liquidityMap?: LiquidityMap;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const LiquidityMapPanel: React.FC<LiquidityMapPanelProps> = ({ liquidityMap, timeframe, isLoading }) => {
  if (!liquidityMap && !isLoading) return null;

  const lastEvent = liquidityMap?.lastLiquidityEvent;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-black/20">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">2. LIQUIDITY ENGINE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {timeframe} Liquidity Map
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            BUY-SIDE & SELL-SIDE POTENTIAL LIQUIDITY MAP
          </h2>
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Smart Money Concept (SMC) • Stop Run Mapping
        </div>
      </div>

      {/* Liquidity Grid: Buy-Side vs Sell-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Buy-Side Liquidity Pool */}
        <div className="bg-slate-950/85 border border-emerald-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-900/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                BUY-SIDE LIQUIDITY (BSL)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/80 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50">
              Short Stops & Breakout Buys
            </span>
          </div>

          <div className="space-y-2">
            {liquidityMap?.buySideLiquidity.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-xs font-mono transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-semibold">{item.label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-400 font-bold">{item.price}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {item.distancePips} pips
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      item.status === 'Swept'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                        : item.status === 'Nearest Target'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sell-Side Liquidity Pool */}
        <div className="bg-slate-950/85 border border-rose-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-900/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400"></div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
                SELL-SIDE LIQUIDITY (SSL)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400/80 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/50">
              Long Stops & Breakdown Sells
            </span>
          </div>

          <div className="space-y-2">
            {liquidityMap?.sellSideLiquidity.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-xs font-mono transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-slate-200 font-semibold">{item.label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-400 font-bold">{item.price}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {item.distancePips} pips
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      item.status === 'Swept'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                        : item.status === 'Nearest Target'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last Liquidity Event Detail */}
      {lastEvent && (
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 mb-2.5 border-b border-slate-800/70 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-amber-400">
                LAST DETECTED LIQUIDITY EVENT:
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                {lastEvent.eventType}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">Direction:</span>
              <span className="text-slate-200 font-semibold">{lastEvent.sweepDirection}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {lastEvent.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Re-entered Range:</span>
              <span className={lastEvent.reEnteredRange ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {lastEvent.reEnteredRange ? 'YES (Confirmed)' : 'NO'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Displacement:</span>
              <span className={lastEvent.displacement ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {lastEvent.displacement ? 'YES (Aggressive)' : 'NO'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">MSS Post-Sweep:</span>
              <span className={lastEvent.mssAfterSweep ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {lastEvent.mssAfterSweep ? 'CONFIRMED' : 'PENDING'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Swept Zone:</span>
              <span className="text-amber-300 truncate">{lastEvent.levelSwept}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
