import React from 'react';
import { MarketStructureDetail, PriceActionEntryZones, TimeframeType } from '../types.ts';
import { GitBranch, Box, TrendingUp, TrendingDown, RefreshCw, BarChart, ArrowRight } from 'lucide-react';

interface MarketStructurePanelProps {
  structure?: MarketStructureDetail;
  priceActionZones?: PriceActionEntryZones;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const MarketStructurePanel: React.FC<MarketStructurePanelProps> = ({
  structure,
  priceActionZones,
  timeframe,
  isLoading,
}) => {
  if (!structure && !isLoading) return null;

  const getBiasBadge = (bias?: string) => {
    switch (bias) {
      case 'Bullish':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
      case 'Bearish':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getPhaseBadge = (phase?: string) => {
    switch (phase) {
      case 'Expansion':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40';
      case 'Reversal':
        return 'bg-purple-950/60 text-purple-300 border-purple-600/40';
      case 'Pullback':
        return 'bg-amber-950/60 text-amber-300 border-amber-600/40';
      default:
        return 'bg-sky-950/60 text-sky-300 border-sky-600/40';
    }
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-black/20">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">3. MARKET STRUCTURE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              HTF vs LTF ({timeframe})
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            HTF BIAS, STRUCTURE SHIFT (BOS/MSS/CHoCH) & PRICE ACTION ZONES
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${getPhaseBadge(structure?.phase)}`}>
            Phase: {structure?.phase || 'Assessing...'}
          </div>
        </div>
      </div>

      {/* HTF Bias vs LTF Alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400 mb-1">HTF BIAS (4H / DAILY)</div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getBiasBadge(structure?.htfBias)}`}>
              {structure?.htfBias || 'Assessing...'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Dominant Trend</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400 mb-1">LTF STRUCTURE ({timeframe})</div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getBiasBadge(structure?.ltfStructure)}`}>
              {structure?.ltfStructure || 'Assessing...'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Execution Flow</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400 mb-1">EQUILIBRIUM (50% RANGE)</div>
          <div className="text-sm font-bold font-mono text-amber-400">
            {priceActionZones?.equilibrium50 || '-'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Status: <strong className={priceActionZones?.premiumDiscount === 'Discount' ? 'text-emerald-400' : priceActionZones?.premiumDiscount === 'Premium' ? 'text-rose-400' : 'text-slate-300'}>
              {priceActionZones?.premiumDiscount || 'Equilibrium'}
            </strong>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400 mb-1">CHANGE OF CHARACTER (CHoCH)</div>
          <div className="text-xs font-mono font-semibold text-slate-200 truncate" title={structure?.choch}>
            {structure?.choch || '-'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Level pembalikan karakter awal</div>
        </div>
      </div>

      {/* Structural Levels Detail (BOS, MSS, Internal vs External) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>BREAK OF STRUCTURE (BOS) & SHIFT (MSS)</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-400">BOS Level: </span>
              <span>{structure?.bos || 'Belum terkonfirmasi'}</span>
            </div>
            <div>
              <span className="text-slate-400">MSS ({timeframe}): </span>
              <span>{structure?.mss || 'Sedang dievaluasi'}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>INTERNAL VS EXTERNAL STRUCTURE</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-400">Internal: </span>
              <span>{structure?.internalStructure || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">External: </span>
              <span>{structure?.externalStructure || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Action & Institutional Entry Zones */}
      {priceActionZones && (
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>INSTITUTIONAL PRICE ACTION ZONES ({timeframe})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">FAIR VALUE GAP (FVG)</span>
              <span className="text-amber-300 font-medium">{priceActionZones.fvg}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">ORDER BLOCK (OB)</span>
              <span className="text-emerald-300 font-medium">{priceActionZones.orderBlock}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">BREAKER / MITIGATION</span>
              <span className="text-purple-300 font-medium">{priceActionZones.breakerBlock}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-2 lg:col-span-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">REACTION SUMMARY</span>
              <span className="text-slate-200">{priceActionZones.recentCandleReaction}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
