import React, { useState } from 'react';
import {
  Layers,
  Flame,
  Activity,
  TrendingUp,
  TrendingDown,
  Compass,
  Eye,
  ShieldAlert,
  BarChart3,
  Anchor,
  Filter,
  Zap,
  Info,
  ChevronRight,
  Crosshair,
  Radio,
} from 'lucide-react';
import type {
  OrderFlowData,
  LiquidityTrackData,
  OrderBookData,
  VolumeBubbleItem,
  WhaleTrackingData,
  LiquidityHeatmapData,
  LiquidityHeatmapLevel,
  TimeframeType,
} from '../types';

interface InstitutionalFlowPanelProps {
  orderFlow?: OrderFlowData;
  liquidityTrack?: LiquidityTrackData;
  orderBook?: OrderBookData;
  volumeBubbles?: VolumeBubbleItem[];
  whaleTracking?: WhaleTrackingData;
  liquidityHeatmap?: LiquidityHeatmapData;
  timeframe: TimeframeType;
  spotPrice?: string;
  isLoading?: boolean;
}

type TabKey =
  | 'ALL'
  | 'LIQUIDITY_HEATMAP'
  | 'ORDER_FLOW'
  | 'LIQUIDITY_TRACK'
  | 'ORDER_BOOK'
  | 'VOLUME_BUBBLES'
  | 'WHALE_TRACK';

export const InstitutionalFlowPanel: React.FC<InstitutionalFlowPanelProps> = ({
  orderFlow,
  liquidityTrack,
  orderBook,
  volumeBubbles = [],
  whaleTracking,
  liquidityHeatmap,
  timeframe,
  spotPrice = '$4,350.00',
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [bubbleFilter, setBubbleFilter] = useState<'ALL' | 'OVER_100' | 'WHALE_ONLY'>('ALL');
  const [selectedBubble, setSelectedBubble] = useState<VolumeBubbleItem | null>(null);
  const [selectedHeatmapLevel, setSelectedHeatmapLevel] = useState<LiquidityHeatmapLevel | null>(null);

  const filteredBubbles = volumeBubbles.filter((b) => {
    if (bubbleFilter === 'OVER_100') return b.volumeLots >= 100;
    if (bubbleFilter === 'WHALE_ONLY') return b.volumeLots >= 250;
    return true;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                INSTITUTIONAL ORDER FLOW & LIQUIDITY TRACK
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                PRO L2 DATA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pelacakan Cumulative Volume Delta (CVD), Depth of Market (Order Book), Volume Bubbles, dan Whale Prints untuk XAUUSD {timeframe}.
            </p>
          </div>
        </div>

        {/* Live Spot Quick Badge */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Spot Live:</span>
            <span className="font-bold text-cyan-400">{spotPrice}</span>
          </div>
          {orderBook?.spreadPips && (
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-amber-400">
              Spread: {orderBook.spreadPips} pips
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
        {[
          { id: 'ALL', label: 'Ringkasan Eksekutif (All Pillars)', icon: Layers },
          { id: 'LIQUIDITY_HEATMAP', label: 'Liquidity Heatmap (Laser DOM)', icon: Flame },
          { id: 'ORDER_FLOW', label: 'Order Flow & CVD', icon: Activity },
          { id: 'LIQUIDITY_TRACK', label: 'Liquidity Track & Pools', icon: Crosshair },
          { id: 'ORDER_BOOK', label: 'Order Book L2 (DOM)', icon: BarChart3 },
          { id: 'VOLUME_BUBBLES', label: 'Volume Bubbles Matrix', icon: Compass },
          { id: 'WHALE_TRACK', label: 'Whale Tracking Radar', icon: Anchor },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-bold shadow-md shadow-cyan-950/40'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW (ALL PILLARS) TOP METRICS CARDS */}
      {(activeTab === 'ALL' || activeTab === 'ORDER_FLOW') && orderFlow && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* CVD Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Cumulative Volume Delta (CVD)</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-mono font-bold ${
                  orderFlow.cumulativeVolumeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {orderFlow.cumulativeVolumeDelta >= 0 ? '+' : ''}
                {orderFlow.cumulativeVolumeDelta.toLocaleString()} Lots
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-slate-400">Status Aliran:</span>
              <span
                className={`font-semibold ${
                  orderFlow.cvdTrend.includes('Bullish')
                    ? 'text-emerald-300'
                    : orderFlow.cvdTrend.includes('Bearish')
                    ? 'text-rose-300'
                    : 'text-amber-300'
                }`}
              >
                {orderFlow.cvdTrend}
              </span>
            </div>
          </div>

          {/* Aggressive Buy vs Sell Volume */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Taker Volume Ratio</span>
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-emerald-400 font-bold">Buy {orderFlow.buyVolumePercent}%</span>
              <span className="text-rose-400 font-bold">Sell {orderFlow.sellVolumePercent}%</span>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${orderFlow.buyVolumePercent}%` }}
              />
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${orderFlow.sellVolumePercent}%` }}
              />
            </div>
            <div className="mt-1.5 text-[10px] font-mono text-slate-400 truncate">
              {orderFlow.buyVolumeLots.toLocaleString()} vs {orderFlow.sellVolumeLots.toLocaleString()} Lots
            </div>
          </div>

          {/* DOM Depth Bias */}
          {orderBook && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Order Book L2 Depth</span>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-emerald-400 font-bold">Bids {orderBook.bidDepthPercent}%</span>
                <span className="text-rose-400 font-bold">Asks {orderBook.askDepthPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${orderBook.bidDepthPercent}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${orderBook.askDepthPercent}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10px] font-mono text-slate-400 truncate">
                Resting: {orderBook.bidDepthTotalLots} vs {orderBook.askDepthTotalLots} Lots
              </div>
            </div>
          )}

          {/* Liquidity Heatmap Magnet Bias */}
          {liquidityHeatmap && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Heatmap Magnet Skew</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-base font-mono font-bold truncate ${
                    liquidityHeatmap.dominantMagnetSide === 'BUY_SIDE_OVERHEAD'
                      ? 'text-emerald-400'
                      : liquidityHeatmap.dominantMagnetSide === 'SELL_SIDE_UNDERLYING'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {liquidityHeatmap.dominantMagnetSide === 'BUY_SIDE_OVERHEAD'
                    ? 'OVERHEAD BSL'
                    : liquidityHeatmap.dominantMagnetSide === 'SELL_SIDE_UNDERLYING'
                    ? 'UNDERLYING SSL'
                    : 'BALANCED'}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                Target: {liquidityHeatmap.topOverheadCluster.price} ({liquidityHeatmap.topOverheadCluster.distancePips}p)
              </div>
            </div>
          )}

          {/* Whale Institutional Sentiment */}
          {whaleTracking && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Whale Activity Index</span>
                <Anchor className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-cyan-300">
                  {whaleTracking.whaleActivityIndex}/100
                </span>
                <span className="text-[10px] font-mono text-slate-400">Index</span>
              </div>
              <div className="mt-1 text-[11px] font-mono truncate text-cyan-400/90 font-medium">
                {whaleTracking.whaleBias}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1B. LIQUIDITY HEATMAP & STOP CASCADE LADDER VIEW */}
      {(activeTab === 'ALL' || activeTab === 'LIQUIDITY_HEATMAP') && liquidityHeatmap && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Flame className="w-4 h-4 animate-pulse" />
                </div>
                <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  High-Resolution Liquidity Heatmap & Liquidation Depth
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Pemetaan konsentrasi likuidasi leverage 25x, 50x, 100x & resting stop loss clusters dengan gradasi intensitas termal.
              </p>
            </div>

            {/* Heatmap Depth Split Bar */}
            <div className="flex flex-col sm:items-end font-mono text-xs">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400 font-bold">
                  Overhead BSL: {liquidityHeatmap.totalOverheadLiquidityLots.toLocaleString()} Lots ({liquidityHeatmap.overheadLiquidityUsd})
                </span>
                <span className="text-slate-600">vs</span>
                <span className="text-rose-400 font-bold">
                  Underlying SSL: {liquidityHeatmap.totalUnderlyingLiquidityLots.toLocaleString()} Lots ({liquidityHeatmap.underlyingLiquidityUsd})
                </span>
              </div>
              <div className="w-full sm:w-64 h-2 rounded-full bg-slate-800 overflow-hidden flex mt-1">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (liquidityHeatmap.totalOverheadLiquidityLots /
                        (liquidityHeatmap.totalOverheadLiquidityLots + liquidityHeatmap.totalUnderlyingLiquidityLots)) *
                        100
                    )}%`,
                  }}
                />
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (liquidityHeatmap.totalUnderlyingLiquidityLots /
                        (liquidityHeatmap.totalOverheadLiquidityLots + liquidityHeatmap.totalUnderlyingLiquidityLots)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Magnet Dominance Callout */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block">
                  ANALISIS MAGNET LIKUIDITAS TERKUAT
                </span>
                <span className="text-[11px] text-slate-300 block leading-relaxed">
                  {liquidityHeatmap.magnetSummary}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold">
                TOP POOL: {liquidityHeatmap.topOverheadCluster.price} ({liquidityHeatmap.topOverheadCluster.volumeLots}L)
              </span>
            </div>
          </div>

          {/* 2D Thermal Liquidity Ladder */}
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider pb-1 px-2 border-b border-slate-800">
              <span className="w-24">Level Harga</span>
              <span className="hidden sm:inline-block flex-1 px-3">Karakter Pool Likuiditas</span>
              <span className="w-48 sm:w-64 text-center">Intensitas Termal (Depth)</span>
              <span className="w-24 text-right">Volume / Nilai</span>
              <span className="w-20 text-right">Sweep Prob</span>
            </div>

            {/* Render Heatmap Price Rows */}
            {liquidityHeatmap.levels.map((lvl, idx) => {
              const isSelected = selectedHeatmapLevel?.price === lvl.price;
              const isOverhead = lvl.isAbovePrice;

              // Check if we should insert the Current Spot Needle line before this level
              const nextLevel = liquidityHeatmap.levels[idx + 1];
              const isTransitionPoint =
                isOverhead && nextLevel && !nextLevel.isAbovePrice;

              return (
                <React.Fragment key={lvl.price}>
                  {/* Heatmap Row */}
                  <div
                    onClick={() => setSelectedHeatmapLevel(lvl)}
                    className={`group relative p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 select-none overflow-hidden ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/60'
                        : lvl.tier === 'EXTREME_CLUSTER'
                        ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-500 hover:bg-rose-950/30'
                        : lvl.tier === 'HIGH_DENSITY'
                        ? 'bg-amber-950/15 border-amber-900/50 hover:border-amber-500 hover:bg-amber-950/25'
                        : lvl.tier === 'MEDIUM_DENSITY'
                        ? 'bg-cyan-950/15 border-cyan-900/40 hover:border-cyan-500 hover:bg-cyan-950/25'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Background thermal heat shimmer bar */}
                    <div
                      className={`absolute inset-y-0 left-0 pointer-events-none opacity-25 transition-all group-hover:opacity-40 ${
                        lvl.tier === 'EXTREME_CLUSTER'
                          ? 'bg-gradient-to-r from-red-600 via-orange-500 to-transparent'
                          : lvl.tier === 'HIGH_DENSITY'
                          ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent'
                          : lvl.tier === 'MEDIUM_DENSITY'
                          ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-transparent'
                          : 'bg-gradient-to-r from-slate-600 to-transparent'
                      }`}
                      style={{ width: `${lvl.intensityPercent}%` }}
                    />

                    {/* Price & Badge */}
                    <div className="w-24 relative z-10 flex items-center gap-1.5 shrink-0">
                      <span
                        className={`font-bold text-xs ${
                          isOverhead ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {lvl.priceStr}
                      </span>
                      {lvl.tier === 'EXTREME_CLUSTER' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                      )}
                    </div>

                    {/* Cluster Label & Distance */}
                    <div className="hidden sm:flex flex-1 px-3 relative z-10 items-center justify-between overflow-hidden">
                      <span className="text-[11px] text-slate-300 truncate font-medium">
                        {lvl.clusterLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                        {lvl.distancePips} pips
                      </span>
                    </div>

                    {/* Visual Thermal Intensity Bar */}
                    <div className="w-48 sm:w-64 relative z-10 px-2 shrink-0">
                      <div className="w-full h-3 rounded-full bg-slate-950/80 border border-slate-800 p-0.5 flex items-center overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            lvl.tier === 'EXTREME_CLUSTER'
                              ? 'bg-gradient-to-r from-orange-600 via-red-500 to-amber-400'
                              : lvl.tier === 'HIGH_DENSITY'
                              ? 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-300'
                              : lvl.tier === 'MEDIUM_DENSITY'
                              ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-300'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${lvl.intensityPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Volume & USD */}
                    <div className="w-24 text-right relative z-10 shrink-0">
                      <span className="font-bold text-white text-[11px] block leading-tight">
                        {lvl.volumeLots} Lots
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        {lvl.valueUsdStr}
                      </span>
                    </div>

                    {/* Sweep Prob Badge */}
                    <div className="w-20 text-right relative z-10 shrink-0">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          lvl.sweepProbability >= 80
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : lvl.sweepProbability >= 50
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {lvl.sweepProbability}% Sweep
                      </span>
                    </div>
                  </div>

                  {/* SPOT PRICE EQUILIBRIUM NEEDLE DIVIDER */}
                  {isTransitionPoint && (
                    <div className="my-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-cyan-950/80 border-2 border-cyan-400/80 shadow-lg shadow-cyan-950/50 flex items-center justify-between font-mono animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                        <span className="font-bold text-white text-xs tracking-wider">
                          LIVE SPOT PRICE EQUILIBRIUM: {spotPrice}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                        ACTIVE MARKET LEVEL
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Selected Heatmap Level Inspector Popout */}
          {selectedHeatmapLevel && (
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/50 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                    {selectedHeatmapLevel.tier.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-white text-sm">
                    {selectedHeatmapLevel.priceStr} — {selectedHeatmapLevel.clusterLabel}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Estimasi likuiditas tertahan: <strong>{selectedHeatmapLevel.volumeLots} Lots</strong> (Nilai notional {selectedHeatmapLevel.valueUsdStr}). Jarak dari harga saat ini: <strong>{selectedHeatmapLevel.distancePips} pips</strong>. Probabilitas sapuan likuiditas:{' '}
                  <strong className="text-amber-400">{selectedHeatmapLevel.sweepProbability}%</strong>.
                </p>
                <span className="text-[10px] text-cyan-400 block">
                  Tip SMC/ICT: {selectedHeatmapLevel.isAbovePrice
                    ? 'Zona target take-profit untuk posisi Long atau area tunggu sweep & reject (CHoCH) sebelum re-entry Short.'
                    : 'Zona target take-profit untuk posisi Short atau area tunggu stop hunt sweep sebelum konfirmasi reversal Long.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHeatmapLevel(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs self-end md:self-auto cursor-pointer border border-slate-700"
              >
                Tutup Rincian
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ORDER FLOW DETAIL VIEW */}
      {(activeTab === 'ALL' || activeTab === 'ORDER_FLOW') && orderFlow && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Absorption & CVD Alert Banner */}
          <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Analisis Divergensi & Absorpsi Order Flow</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {orderFlow.absorptionAlert}
              </p>
              <div className="text-[11px] font-mono text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
                <strong>Stacked Imbalance:</strong> {orderFlow.stackedImbalanceZone}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-xs">
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">Delta Direction:</span>
                <span className="font-bold text-white text-[11px]">{orderFlow.deltaBias}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">CVD Momentum:</span>
                <span className="font-bold text-cyan-300 text-[11px]">{orderFlow.cvdTrend}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">Buy Lot Volume:</span>
                <span className="font-bold text-emerald-400 text-[11px]">
                  {orderFlow.buyVolumeLots.toLocaleString()}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60">
                <span className="text-[10px] text-slate-400 block">Sell Lot Volume:</span>
                <span className="font-bold text-rose-400 text-[11px]">
                  {orderFlow.sellVolumeLots.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Stacked Imbalances List */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Level Imbalance 3:1+</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Bid vs Ask</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {orderFlow.imbalances.map((imb, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border flex items-center justify-between ${
                    imb.imbalanceType === 'BUY_IMBALANCE'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : imb.imbalanceType === 'SELL_IMBALANCE'
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{imb.price}</span>
                    <span className="text-[10px] text-slate-400 block">{imb.ratio}</span>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-emerald-400">{imb.bidVol}b</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-rose-400">{imb.askVol}a</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        imb.imbalanceType === 'BUY_IMBALANCE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : imb.imbalanceType === 'SELL_IMBALANCE'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {imb.imbalanceType === 'BUY_IMBALANCE'
                        ? 'BUY IMBALANCE'
                        : imb.imbalanceType === 'SELL_IMBALANCE'
                        ? 'SELL IMBALANCE'
                        : 'ABSORPTION'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. LIQUIDITY TRACK & POOLS VIEW */}
      {(activeTab === 'ALL' || activeTab === 'LIQUIDITY_TRACK') && liquidityTrack && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Resting Liquidity Pools & Stop Cluster Map
              </h4>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Total Resting Buy Stops:</span>
              <span className="font-bold text-emerald-400">
                {liquidityTrack.totalRestingBuyStopsLots.toLocaleString()} Lots
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Sell Stops:</span>
              <span className="font-bold text-rose-400">
                {liquidityTrack.totalRestingSellStopsLots.toLocaleString()} Lots
              </span>
            </div>
          </div>

          {/* Nearest Magnet Pool Alert */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-cyan-300 block">
                  MAGNET LIKUIDITAS TERDEKAT: {liquidityTrack.nearestMagnetPool.price} (
                  {liquidityTrack.nearestMagnetPool.type})
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Jarak {liquidityTrack.nearestMagnetPool.distancePips} pips • Volume pool:{' '}
                  {liquidityTrack.nearestMagnetPool.volumeLots} Lots
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold">
              TARGET SWEEP
            </span>
          </div>

          {/* Resting Liquidity Bands Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-3">Tipe Pool</th>
                  <th className="py-2 px-3">Level Harga</th>
                  <th className="py-2 px-3">Estimasi Volume</th>
                  <th className="py-2 px-3">Jarak dari Spot</th>
                  <th className="py-2 px-3">Intensitas</th>
                  <th className="py-2 px-3">Karakter Likuiditas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {liquidityTrack.restingLiquidityBands.map((band, idx) => {
                  const isBuySide = band.type === 'BUY_SIDE_LIQUIDITY';
                  return (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                            isBuySide ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isBuySide ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{isBuySide ? 'BUY-SIDE (BSL)' : 'SELL-SIDE (SSL)'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white text-xs">{band.price}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-bold">
                        {band.volumeLots.toLocaleString()} Lots
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{band.distancePips} pips</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            band.intensity === 'Extreme'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                              : band.intensity === 'High'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {band.intensity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{band.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ORDER BOOK (LEVEL 2 DEPTH OF MARKET) VIEW */}
      {(activeTab === 'ALL' || activeTab === 'ORDER_BOOK') && orderBook && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Level 2 Order Book (Depth of Market - DOM)
              </h4>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-400">Spread:</span>
              <span className="text-amber-400 font-bold">${orderBook.spreadDollar} ({orderBook.spreadPips} pips)</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Best Bid:</span>
              <span className="text-emerald-400 font-bold">${orderBook.bestBid.toFixed(2)}</span>
              <span className="text-slate-400">Best Ask:</span>
              <span className="text-rose-400 font-bold">${orderBook.bestAsk.toFixed(2)}</span>
            </div>
          </div>

          {/* Wall Callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                🛡️ MAJOR BID WALL (SUPPORT TEMBOK BELI)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-white">{orderBook.topBidWall.price}</span>
                <span className="text-xs text-emerald-300 font-bold">({orderBook.topBidWall.lots} Lots)</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">{orderBook.topBidWall.note}</p>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">
                🧱 MAJOR ASK WALL (RESISTANCE TEMBOK JUAL)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-white">{orderBook.topAskWall.price}</span>
                <span className="text-xs text-rose-300 font-bold">({orderBook.topAskWall.lots} Lots)</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-1">{orderBook.topAskWall.note}</p>
            </div>
          </div>

          {/* 2-Column Depth Ladder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* ASKS (Sellers) - Listed inverted or standard */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-rose-400 font-bold flex items-center justify-between pb-1 border-b border-rose-900/40">
                <span>ASKS (SELLER OFFERS)</span>
                <span>LOTS / KEDALAMAN</span>
              </div>
              {orderBook.asks.slice(0, 5).map((ask, idx) => (
                <div
                  key={idx}
                  className="relative p-2 rounded bg-slate-900/70 border border-rose-950 flex items-center justify-between overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-rose-900/20 pointer-events-none transition-all"
                    style={{ width: `${ask.percent}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="font-bold text-rose-300">{ask.priceStr}</span>
                    <span className="text-[10px] text-slate-500">Ask #{idx + 1}</span>
                  </div>
                  <div className="relative z-10 text-right">
                    <span className="font-bold text-white">{ask.lots} Lots</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Kumulatif: {ask.cumulativeLots}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* BIDS (Buyers) */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-between pb-1 border-b border-emerald-900/40">
                <span>BIDS (BUYER ORDERS)</span>
                <span>LOTS / KEDALAMAN</span>
              </div>
              {orderBook.bids.slice(0, 5).map((bid, idx) => (
                <div
                  key={idx}
                  className="relative p-2 rounded bg-slate-900/70 border border-emerald-950 flex items-center justify-between overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-900/20 pointer-events-none transition-all"
                    style={{ width: `${bid.percent}%` }}
                  />
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="font-bold text-emerald-300">{bid.priceStr}</span>
                    <span className="text-[10px] text-slate-500">Bid #{idx + 1}</span>
                  </div>
                  <div className="relative z-10 text-right">
                    <span className="font-bold text-white">{bid.lots} Lots</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Kumulatif: {bid.cumulativeLots}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. VOLUME BUBBLES MATRIX VIEW */}
      {(activeTab === 'ALL' || activeTab === 'VOLUME_BUBBLES') && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  Volume Bubbles Trade Clustering Map
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Ukuran bubble proporsional dengan lot trade dieksekusi. Hijau = Taker Buyer Aggression, Merah = Taker Seller Aggression.
              </p>
            </div>

            {/* Bubble Filter Controls */}
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>Filter:</span>
              </span>
              {[
                { id: 'ALL', label: 'Semua Trade' },
                { id: 'OVER_100', label: '>100 Lots' },
                { id: 'WHALE_ONLY', label: 'Whale (>250 Lots)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBubbleFilter(f.id as any)}
                  className={`px-2 py-1 rounded-lg border transition-colors ${
                    bubbleFilter === f.id
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Volume Bubble Visual Stage */}
          <div className="relative w-full h-72 sm:h-80 bg-[#050810] border border-slate-800/80 rounded-xl overflow-hidden p-3 select-none">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
              <div className="border-b border-dashed border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-700 w-full" />
              <div className="border-b border-dashed border-slate-700 w-full" />
            </div>

            {/* Current Spot Price Reference Line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-cyan-400/40 border-dashed flex items-center justify-between px-3 pointer-events-none z-0">
              <span className="text-[10px] font-mono text-cyan-400 bg-slate-950/90 px-1.5 py-0.5 rounded border border-cyan-500/30">
                Spot Equilibrium: {spotPrice}
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80 bg-slate-950/90 px-1 rounded">
                Active Zone
              </span>
            </div>

            {/* Render Volume Bubbles */}
            {filteredBubbles.map((bubble) => {
              const isBuy = bubble.side === 'BUY';
              const sizePx =
                bubble.relativeSize === 5
                  ? 48
                  : bubble.relativeSize === 4
                  ? 38
                  : bubble.relativeSize === 3
                  ? 30
                  : bubble.relativeSize === 2
                  ? 24
                  : 18;

              const isSelected = selectedBubble?.id === bubble.id;

              return (
                <div
                  key={bubble.id}
                  onClick={() => setSelectedBubble(bubble)}
                  className={`absolute rounded-full flex items-center justify-center cursor-pointer transition-all transform hover:scale-125 z-10 ${
                    isBuy
                      ? 'bg-emerald-500/25 border-2 border-emerald-400 shadow-lg shadow-emerald-950/40 text-emerald-200'
                      : 'bg-rose-500/25 border-2 border-rose-400 shadow-lg shadow-rose-950/40 text-rose-200'
                  } ${isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-110 z-20' : ''}`}
                  style={{
                    left: `${bubble.xPercent}%`,
                    top: `${bubble.yPercent}%`,
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={`${bubble.priceStr} | ${bubble.volumeLots} Lots | ${bubble.classification}`}
                >
                  <span className="text-[9px] font-mono font-bold leading-none select-none">
                    {bubble.volumeLots}
                  </span>
                </div>
              );
            })}

            {/* Bubble Legend on stage */}
            <div className="absolute bottom-2 left-3 flex items-center gap-3 font-mono text-[10px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-none">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Buyer Aggression</span>
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Seller Aggression</span>
              </span>
              <span className="text-slate-500">Klik bubble untuk detail</span>
            </div>
          </div>

          {/* Selected Bubble Detail Popout */}
          {selectedBubble && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedBubble.side === 'BUY' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{selectedBubble.priceStr}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        selectedBubble.side === 'BUY'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      {selectedBubble.side} {selectedBubble.volumeLots} LOTS
                    </span>
                    <span className="text-slate-400 text-[11px]">{selectedBubble.timestamp}</span>
                  </div>
                  <span className="text-[11px] text-cyan-300 block mt-0.5">
                    Klasifikasi: <strong>{selectedBubble.classification}</strong> (Net Delta:{' '}
                    {selectedBubble.deltaLots >= 0 ? '+' : ''}
                    {selectedBubble.deltaLots} Lots)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBubble(null)}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] self-end sm:self-auto cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. WHALE TRACKING RADAR VIEW */}
      {(activeTab === 'ALL' || activeTab === 'WHALE_TRACK') && whaleTracking && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Whale Block Trades & Institutional Positioning
              </h4>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Whale Net Position:</span>
              <span
                className={`font-bold ${
                  whaleTracking.whaleNetLots >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {whaleTracking.whaleNetLots >= 0 ? '+' : ''}
                {whaleTracking.whaleNetLots.toLocaleString()} Lots
              </span>
            </div>
          </div>

          {/* Whale Key Insight Alert */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs font-mono flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-cyan-300 block uppercase">
                INSTITUTIONAL RADAR INTELLIGENCE
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {whaleTracking.keyInsight}
              </p>
            </div>
          </div>

          {/* Large Block Prints Table */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Recent Large Block Prints (&gt;300 Lots / Institutional Tickets)
            </span>
            <div className="space-y-2 font-mono text-xs">
              {whaleTracking.largePrints.map((print) => {
                const isBuy = print.type === 'BUY';
                return (
                  <div
                    key={print.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isBuy
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {isBuy ? 'BUY' : 'SELL'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{print.price}</span>
                          <span className="text-slate-400 text-[11px]">({print.time})</span>
                          <span className="text-cyan-400 font-bold text-xs">{print.valueUsd}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Tipe Eksekusi: <strong>{print.executionStyle}</strong> • Dampak Pasar: {print.impact}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-sm font-bold text-white">{print.lots} Lots</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          print.impact.includes('Bullish')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : print.impact.includes('Bearish')
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {print.impact}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
