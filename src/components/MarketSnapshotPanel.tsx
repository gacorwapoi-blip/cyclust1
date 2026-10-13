import React from 'react';
import { MarketSnapshot, TimeframeType } from '../types.ts';
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Scale, DollarSign, BarChart2, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MarketSnapshotPanelProps {
  snapshot?: MarketSnapshot;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const MarketSnapshotPanel: React.FC<MarketSnapshotPanelProps> = ({ snapshot, timeframe, isLoading }) => {
  const symbol = snapshot?.symbol || 'XAUUSD';
  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '-';
    return isEur
      ? p.toFixed(5)
      : isBtc
      ? `$${p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
      : `$${p.toFixed(2)}`;
  };

  if (!snapshot && !isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <p className="text-sm">Klik tombol <span className="text-amber-400 font-semibold">"ANALYZE MARKET"</span> di atas untuk mengambil snapshot data {symbol} terkini menggunakan analisis kuantitatif multi-timeframe.</p>
      </div>
    );
  }

  const getRegimeColor = (regime?: string) => {
    switch (regime) {
      case 'TRENDING BULLISH':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
      case 'TRENDING BEARISH':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/30';
      case 'HIGH VOLATILITY':
        return 'bg-purple-950/60 text-purple-400 border-purple-500/30';
      case 'RANGE':
        return 'bg-sky-950/60 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700';
    }
  };

  const getVolatilityBadge = (vol?: string) => {
    switch (vol) {
      case 'High':
        return 'bg-rose-950/60 text-rose-400 border-rose-600/30';
      case 'Medium':
        return 'bg-amber-950/60 text-amber-400 border-amber-600/30';
      case 'Low':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-600/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const stats = snapshot?.priceStats;
  const isPositive = stats ? stats.change24hDollar >= 0 : true;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-lg shadow-black/20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">1. QUANTITATIVE SNAPSHOT</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              TF: {timeframe}
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            MARKET SNAPSHOT & ACCURATE PRICE METRICS
          </h2>
        </div>

        {/* Status Badges */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium border bg-slate-950/60 border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Sesi: {snapshot?.session || (isLoading ? 'Memeriksa...' : 'DATA UNAVAILABLE')}</span>
          </div>

          <div
            className={`px-3 py-1 rounded-md text-xs font-mono font-semibold border uppercase ${getRegimeColor(
              snapshot?.marketRegime
            )}`}
          >
            Regime: {snapshot?.marketRegime || (isLoading ? 'Calculating...' : 'DATA UNAVAILABLE')}
          </div>

          <div
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium border ${getVolatilityBadge(
              snapshot?.volatility
            )}`}
          >
            Volatilitas: {snapshot?.volatility || (isLoading ? '...' : 'DATA UNAVAILABLE')}
          </div>
        </div>
      </div>

      {/* High-Accuracy Price Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Exact Spot Price & 24h % */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>{symbol} SPOT PRICE</span>
            <span className="text-emerald-400 text-[10px] font-mono">LIVE FEED</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight">
            {snapshot?.price || (isLoading ? 'Fetching live...' : 'DATA UNAVAILABLE')}
          </div>
          {stats ? (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-flex items-center text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  isPositive ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {isPositive ? '+' : ''}
                {isEur ? stats.change24hDollar.toFixed(5) : isBtc ? `$${Math.abs(stats.change24hDollar).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}` : `$${Math.abs(stats.change24hDollar).toFixed(2)}`} ({isPositive ? '+' : ''}
                {stats.change24hPercent.toFixed(2)}%)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                vs Prev Close {formatPrice(stats.prevClose)}
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 mt-1">Data harga aktual terverifikasi</div>
          )}
        </div>

        {/* Day Range & Pip Spread */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>DAY RANGE & PIP EXPANSION</span>
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {stats ? `${formatPrice(stats.dayLow)} - ${formatPrice(stats.dayHigh)}` : 'Memeriksa rentang...'}
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1.5">
            <span>Rentang: <strong className="text-amber-300 font-bold">{stats ? formatPrice(stats.dayRangeDollars) : '-'}</strong></span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
              {stats ? `${stats.dayRangePips.toFixed(1)} Pips` : '-'}
            </span>
          </div>
        </div>

        {/* Session Dynamics */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>SESSION DELTA & SPREAD</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white flex items-center gap-1.5">
            <span>Open: {stats ? formatPrice(stats.sessionOpenPrice) : '-'}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-1.5">
            <span>
              Session: <strong className={stats && stats.sessionChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {stats ? `${stats.sessionChangePercent >= 0 ? '+' : ''}${stats.sessionChangePercent.toFixed(2)}%` : '-'}
              </strong>
            </span>
            <span className="text-slate-400 text-[11px]">
              Est. Spread: ~{stats ? stats.spreadEstimatePips : (isEur ? 0.6 : isBtc ? 1.2 : 1.5)} pips
            </span>
          </div>
        </div>

        {/* Risk Sentiment */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400 mb-1">MARKET SENTIMENT</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>{snapshot?.riskSentiment || (isLoading ? 'Assessing...' : 'DATA UNAVAILABLE')}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {snapshot?.riskSentiment === 'Risk-Off'
              ? (isBtc ? 'Arus likuiditas beralih ke stablecoin/risk-off defensif' : 'Arus pelarian modal safe-haven ke emas meningkat')
              : snapshot?.riskSentiment === 'Risk-On'
              ? (isBtc ? 'Risk-on kuat mendorong akumulasi agresif pada aset crypto' : 'Selera risiko tinggi pada ekuitas menekan demand emas')
              : 'Sentimen berimbang menjelang katalis baru'}
          </div>
        </div>
      </div>

      {/* Narrative Context Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
          <div className="text-[11px] font-mono font-semibold text-amber-400/90 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            USD & DXY CONTEXT
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {snapshot?.dxyContext || (isLoading ? 'Searching live market feeds...' : 'DATA UNAVAILABLE')}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
          <div className="text-[11px] font-mono font-semibold text-amber-400/90 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            TREASURY YIELDS & FED
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {snapshot?.yieldsContext || (isLoading ? 'Analyzing rates & Fed posture...' : 'DATA UNAVAILABLE')}
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3">
          <div className="text-[11px] font-mono font-semibold text-amber-400/90 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            MACRO & GEOPOLITICS
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {snapshot?.geopoliticsContext || (isLoading ? 'Gathering geopolitical flows...' : 'DATA UNAVAILABLE')}
          </p>
        </div>
      </div>
    </section>
  );
};
