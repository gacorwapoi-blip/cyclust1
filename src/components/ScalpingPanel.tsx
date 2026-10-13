import React from 'react';
import { ScalpingDetail, TimeframeType } from '../types.ts';
import { Zap, AlertTriangle, ShieldCheck, Crosshair, ArrowRight, Gauge, CheckSquare } from 'lucide-react';

interface ScalpingPanelProps {
  scalpingDetail?: ScalpingDetail;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const ScalpingPanel: React.FC<ScalpingPanelProps> = ({
  scalpingDetail,
  timeframe,
  isLoading,
}) => {
  if (!scalpingDetail && !isLoading) return null;

  const bias = scalpingDetail?.scalpBias || 'STAND ASIDE';

  const getBiasStyle = (b: string) => {
    switch (b) {
      case 'SCALP LONG':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50';
      case 'SCALP SHORT':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/50';
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-950/50';
    }
  };

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-xl shadow-amber-500/5">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
              <Zap className="w-3 h-3 fill-slate-950" />
              SPECIALIZED SCALPING MODULE
            </span>
            <span className="text-[11px] font-mono text-amber-400/90">
              {timeframe} Micro-Structure & Momentum
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            1M / 5M / 15M FAST EXECUTION SCALPING ENGINE
          </h2>
        </div>

        {/* Scalp Bias Badge */}
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-extrabold tracking-wider shadow-md ${getBiasStyle(bias)}`}>
          SCALP BIAS: {bias}
        </div>
      </div>

      {/* Main Execution Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Micro Trigger */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>MICRO TRIGGER</span>
          </div>
          <div className="text-xs font-mono font-medium text-slate-200">
            {scalpingDetail?.microTrigger || 'Menunggu konfirmasi liquidity sweep...'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Triggers on 5M candle close
          </div>
        </div>

        {/* Micro Entry Zone */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 mb-1">MICRO ENTRY ZONE</div>
          <div className="text-sm font-mono font-bold text-amber-400">
            {scalpingDetail?.microEntryZone || 'Area belum terbentuk'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Gunakan limit order untuk hindari slippage
          </div>
        </div>

        {/* Tight Invalidation */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 mb-1">TIGHT INVALIDATION (SL)</div>
          <div className="text-sm font-mono font-bold text-rose-400">
            {scalpingDetail?.tightInvalidation || 'N/A'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Cut immediately if invalidation touched
          </div>
        </div>

        {/* Quick Target & RR */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span>TARGET & R:R ENGINE</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                scalpingDetail?.isDefensiveRR
                  ? 'text-amber-300 bg-amber-950 border-amber-500/40'
                  : 'text-emerald-400 bg-emerald-950 border-emerald-500/30'
              }`}
            >
              {scalpingDetail?.isDefensiveRR ? 'RR 1:1 DEFENSIVE' : 'MIN 1:2.0'}
            </span>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {scalpingDetail?.quickTarget || 'N/A'}
          </div>
          <div className="text-[10px] font-mono text-slate-300 mt-2 flex items-center justify-between">
            <span>Validated R:R:</span>
            <strong
              className={`font-extrabold px-1.5 py-0.5 rounded border ${
                scalpingDetail?.isDefensiveRR
                  ? 'text-amber-400 bg-amber-950 border-amber-500/40'
                  : 'text-emerald-400 bg-emerald-950 border-emerald-500/40'
              }`}
            >
              {scalpingDetail?.tp1RR || scalpingDetail?.estimatedRR || '1:1.0'}
            </strong>
          </div>
        </div>
      </div>

      {/* Scalp Risk & Broker Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-200/90 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-amber-300 mb-0.5">SPREAD & VOLATILITY WARNING</span>
            <span>{scalpingDetail?.volatilityWarning || 'Pantau spread broker Anda sebelum eksekusi.'}</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200 mb-0.5">DISCIPLINE TIP</span>
            <span>{scalpingDetail?.executionTip || 'Jangan hold posisi scalping melewati rilis news high impact.'}</span>
          </div>
        </div>
      </div>

      {/* Professional Scalper Checklist */}
      <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/80">
        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
          GOLD SCALPER PRE-FLIGHT CHECKLIST (DO NOT ENTER IF ANY FAILS):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Broker Spread ≤ 2.0 Pips</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>No Red-Folder News in 15 Min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Liquidity Sweep + Reclaim Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Pre-defined SL with Max 1% Risk</span>
          </div>
        </div>
      </div>
    </section>
  );
};
