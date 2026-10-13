import React from 'react';
import { TechnicalContext } from '../types.ts';
import { LineChart, Info, Compass, ShieldAlert } from 'lucide-react';

interface TechnicalPanelProps {
  technical?: TechnicalContext;
  isLoading: boolean;
}

export const TechnicalPanel: React.FC<TechnicalPanelProps> = ({ technical, isLoading }) => {
  if (!technical && !isLoading) return null;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">3. Price Action Assessment</span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <LineChart className="w-4 h-4 text-amber-400" />
            TECHNICAL CONTEXT & LIQUIDITY STRUCTURE
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400/90 bg-amber-950/30 border border-amber-800/30 px-2.5 py-1 rounded">
          <Info className="w-3.5 h-3.5" />
          <span>High-Level Desk Analysis (No Fake Charts)</span>
        </div>
      </div>

      {/* Honesty Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 mb-4 text-xs text-slate-300 flex items-start gap-2.5">
        <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Transparansi Analitis: </span>
          {technical?.notes ||
            'Level teknikal, support/resistance, dan zona likuiditas dievaluasi berdasarkan konsensus level pasar dan price action harian yang dilaporkan, tanpa membuat candlestick palsu.'}
        </div>
      </div>

      {/* Grid of Technical Elements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 mb-1">TREND & MOMENTUM</div>
          <div className="text-xs font-semibold text-slate-200 mb-1">{technical?.trend || '-'}</div>
          <p className="text-[11px] text-slate-400">{technical?.momentum || '-'}</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 mb-1">MARKET STRUCTURE</div>
          <div className="text-xs font-semibold text-slate-200 mb-1">{technical?.marketStructure || '-'}</div>
          <p className="text-[11px] text-slate-400">{technical?.breakoutRejection || '-'}</p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 mb-1">SUPPORT & RESISTANCE</div>
          <p className="text-xs text-amber-300 font-mono font-medium leading-relaxed">
            {technical?.supportResistance || '-'}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3">
          <div className="text-[11px] font-mono text-slate-400 mb-1">LIQUIDITY & ORDER BLOCKS</div>
          <div className="text-xs text-slate-300 mb-1">
            <span className="text-slate-400">Pools: </span>
            {technical?.liquidityZones || '-'}
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-slate-400">FVG/OB: </span>
            {technical?.fvg || technical?.orderBlock || 'Menyesuaikan range harga harian'}
          </div>
        </div>
      </div>
    </section>
  );
};
