import React from 'react';
import { RecordedDecision, LiveOpenPositionSituation, TradeOutcomeStatus, TradeCloseReason } from '../types.ts';
import { calculateLivePositionSituation } from '../utils/tradeJournal.ts';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Activity,
  Lock,
  XCircle,
} from 'lucide-react';

interface LiveOpenPositionSituationCardProps {
  trade: RecordedDecision;
  currentSpotPrice: number | string | undefined;
  onUpdateTradeStatus: (
    tradeId: string,
    status: TradeOutcomeStatus,
    reason?: TradeCloseReason,
    customExitPrice?: number,
    notes?: string
  ) => void;
  compact?: boolean;
}

export const LiveOpenPositionSituationCard: React.FC<LiveOpenPositionSituationCardProps> = ({
  trade,
  currentSpotPrice,
  onUpdateTradeStatus,
  compact = false,
}) => {
  const situation: LiveOpenPositionSituation | null = calculateLivePositionSituation(trade, currentSpotPrice);

  if (!situation) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Menghubungkan harga spot live untuk posisi terbuka...</span>
        </div>
        <span className="text-[11px] text-slate-500">Entry @ {trade.entryPriceFormatted}</span>
      </div>
    );
  }

  const isEur = trade.symbol === 'EURUSD';
  const isBuy = trade.direction === 'BUY';
  const {
    currentPriceFormatted,
    isTriggered,
    pipsUntilFill,
    priceMovementPips,
    priceDirection,
    priceDirectionText,
    floatingPips,
    floatingPipsFormatted,
    isFloatingProfit,
    isFloatingDrawdown,
    floatingPnlUsd,
    floatingPnlPercent,
    tp1RemainingPips,
    isTp1Reached,
    slBufferPips,
    isSlReached,
    gaugeProgressPct,
    entryGaugePct,
    isEligibleForBE,
  } = situation;

  // Handle instant close at live market spot price
  const handleMarketCloseNow = () => {
    const finalPips = floatingPips;
    const finalUsd = floatingPnlUsd;
    const finalPct = floatingPnlPercent;
    const isWin = finalPips > 0;
    const status: TradeOutcomeStatus = isWin ? 'WIN' : finalPips < 0 ? 'LOSS' : 'BREAK_EVEN';
    const reason: TradeCloseReason = 'MANUAL_CLOSE';
    const notes = `${trade.notes || ''} [Ditutup manual pada harga spot ${currentPriceFormatted} (${floatingPipsFormatted}, $${finalUsd})]`;

    onUpdateTradeStatus(trade.id, status, reason, situation.currentSpotPrice, notes);
  };

  // Handle moving SL to breakeven
  const handleMoveToBreakeven = () => {
    const notes = `${trade.notes || ''} [Stop Loss digeser ke Breakeven (BEP @ ${trade.entryPriceFormatted}) saat floating ${floatingPipsFormatted}]`;
    // We update status to OPEN but with BEP active
    onUpdateTradeStatus(trade.id, 'OPEN', 'PENDING', undefined, notes);
  };

  // USER MANDATE: JANGAN NGACO BUKA POSISI (OPEN) JIKA HARGA BELUM NYENTUH ENTRY!
  // Tampilkan tampilan khusus ORDER PENDING (Menunggu Sentuhan Entry):
  // Dilarang menampilkan floating profit/loss semu, tombol Tutup @ Spot, atau Hit TP/SL sebelum terjemput.
  if (!isTriggered) {
    const handleMarketEntryNow = () => {
      const updatedNotes = `${trade.notes || ''} [Dieksekusi Manual Langsung @ Spot ${currentPriceFormatted}]`;
      onUpdateTradeStatus(trade.id, 'OPEN', 'PENDING', situation.currentSpotPrice, updatedNotes);
    };

    const handleCancelPendingOrder = () => {
      const updatedNotes = `${trade.notes || ''} [Order Pending Dibatalkan Sebelum Terjemput]`;
      onUpdateTradeStatus(trade.id, 'CANCELLED', 'MANUAL_CLOSE', undefined, updatedNotes);
    };

    return (
      <div className={`rounded-xl border border-amber-600/50 bg-gradient-to-b from-amber-950/30 via-slate-950/90 to-slate-950 ${compact ? 'p-3' : 'p-4'} space-y-3.5 shadow-lg shadow-amber-950/20 font-mono`}>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-800/40 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/90 border border-amber-600/70 text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              ORDER PENDING (MENUNGGU HARGA TERJEMPUT)
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                isBuy
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {trade.orderType || (isBuy ? 'BUY LIMIT' : 'SELL LIMIT')}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${
                isEur ? 'bg-blue-950/60 text-blue-300 border-blue-700/50' : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
              }`}
            >
              {isEur ? <TrendingUp className="w-3 h-3 text-blue-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
              {trade.symbol}
            </span>

            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
              {trade.timeframe}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-900/50 text-amber-300 border border-amber-500/60">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Sisa Jarak ke Entry: {pipsUntilFill !== undefined ? `${pipsUntilFill} pips` : 'Menunggu sentuhan'}
            </span>
          </div>
        </div>

        {/* 2. Price Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Spot Saat Ini */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>HARGA SPOT BURSA SAAT INI</span>
            </div>
            <div className="text-base font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>{currentPriceFormatted}</span>
            </div>
            <div className="text-[10px] text-slate-400">Harga live bursa saat ini</div>
          </div>

          {/* Level Entry */}
          <div className="bg-slate-950/80 border border-amber-600/40 rounded-xl p-3 space-y-1">
            <div className="text-[10px] text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>TARGET LEVEL ENTRY</span>
            </div>
            <div className="text-base font-bold text-amber-300">
              {trade.entryPriceFormatted}
            </div>
            <div className="text-[10px] text-slate-400">Titik jemputan order antrian</div>
          </div>

          {/* Status Opening */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUS EKSEKUSI</div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>BELUM OPENING (PENDING)</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {pipsUntilFill !== undefined ? `Kurang ${pipsUntilFill} pips lagi ke entry` : 'Menunggu harga menyentuh entry'}
            </div>
          </div>
        </div>

        {/* 3. Penjelasan Anti-Ngaco */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-lg p-2.5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-amber-300">Posisi Belum Opening (Menunggu Harga Menyentuh Entry)</div>
            <p className="text-slate-400 text-[11px]">
              Harga pasar saat ini ({currentPriceFormatted}) belum menyentuh level entry ({trade.entryPriceFormatted}). Sistem tidak menghitung floating profit/drawdown atau mengeksekusi TP/SL pada order yang belum terjemput. Posisi akan otomatis AKTIF (OPEN) dan menghitung profit secara real-time saat harga bursa menyentuh titik entry.
            </p>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/60 text-xs">
          <button
            type="button"
            onClick={handleCancelPendingOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-600 transition-colors cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Batalkan Pending Order</span>
          </button>

          <button
            type="button"
            onClick={handleMarketEntryNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors font-bold ml-auto cursor-pointer"
            title="Langsung buka posisi sekarang di harga spot saat ini tanpa menunggu jemputan"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Masuk Sekarang @ Spot ({currentPriceFormatted})</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isFloatingProfit
          ? 'bg-gradient-to-b from-emerald-950/40 via-slate-950/80 to-slate-950 border-emerald-600/50 shadow-lg shadow-emerald-950/20'
          : isFloatingDrawdown
          ? 'bg-gradient-to-b from-rose-950/40 via-slate-950/80 to-slate-950 border-rose-600/50 shadow-lg shadow-rose-950/20'
          : 'bg-slate-950/80 border-slate-800'
      } ${compact ? 'p-3' : 'p-4'} space-y-3.5`}
    >
      {/* 1. Header Bar: Live Ticker Beacon & Nominal Movement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Beacon Pulse */}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isFloatingProfit ? 'bg-emerald-400 animate-ping' : isFloatingDrawdown ? 'bg-rose-400 animate-ping' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="text-slate-400">SPOT LIVE:</span>
            <strong className="text-white text-xs">{currentPriceFormatted}</strong>
          </span>

          {/* Direction Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
              isBuy
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trade.direction}
          </span>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
              isEur ? 'bg-blue-950/60 text-blue-300 border-blue-700/50' : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
            }`}
          >
            {isEur ? <TrendingUp className="w-3 h-3 text-blue-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
            {trade.symbol}
          </span>

          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
            {trade.timeframe}
          </span>

          {trade.isBreakEvenActive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-600/70">
              <Shield className="w-3 h-3 text-cyan-400" />
              SL DI BEP (BEBAS RISIKO)
            </span>
          )}
        </div>

        {/* Execution State */}
        <div className="flex items-center gap-2">
          {!isTriggered && pipsUntilFill !== undefined ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-600/60">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Menunggu Terjemput: Sisa {pipsUntilFill} pips
            </span>
          ) : isTp1Reached ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 animate-bounce">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              TARGET TP1 TERSENTUH!
            </span>
          ) : isSlReached ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              MENYENTUH LEVEL STOP LOSS!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-900 text-sky-300 border border-sky-800/60">
              <Activity className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              POSISI RUNNING (AKTIF)
            </span>
          )}
        </div>
      </div>

      {/* 2. Primary Situation Grid: Naik / Turun Berapa Pips & Floating PnL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
        {/* Kolom 1: Pergerakan Harga dari Titik Entry */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>PERGERAKAN HARGA DARI ENTRY</span>
            <span className="text-slate-500 text-[9px]">Entry: {trade.entryPriceFormatted}</span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            {priceDirection === 'UP' ? (
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : priceDirection === 'DOWN' ? (
              <TrendingDown className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <div>
              <div
                className={`text-base font-bold ${
                  priceDirection === 'UP'
                    ? 'text-emerald-400'
                    : priceDirection === 'DOWN'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {priceDirectionText}
              </div>
              <div className="text-[10px] text-slate-400">
                {priceMovementPips > 0
                  ? `Harga bergerak NAIK +${priceMovementPips} pips di atas entry`
                  : priceMovementPips < 0
                  ? `Harga bergerak TURUN ${priceMovementPips} pips di bawah entry`
                  : 'Harga tepat berada di level eksekusi entry'}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom 2: Status Floating Posisi (Keuntungan / Kerugian Posisi) */}
        <div
          className={`border rounded-xl p-3 space-y-1 ${
            isFloatingProfit
              ? 'bg-emerald-950/30 border-emerald-700/60'
              : isFloatingDrawdown
              ? 'bg-rose-950/30 border-rose-700/60'
              : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider flex items-center justify-between">
            <span className={isFloatingProfit ? 'text-emerald-300 font-bold' : isFloatingDrawdown ? 'text-rose-300 font-bold' : 'text-slate-400'}>
              SITUASI FLOATING POSISI ({trade.direction})
            </span>
            <span className="text-slate-400 text-[9px]">Lot: {trade.lotSize || 0.1}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div>
              <div
                className={`text-base font-bold ${
                  isFloatingProfit ? 'text-emerald-300' : isFloatingDrawdown ? 'text-rose-300' : 'text-slate-300'
                }`}
              >
                {floatingPipsFormatted}
                <span className="text-xs font-normal ml-2 opacity-90">
                  ({floatingPnlUsd >= 0 ? `+$${floatingPnlUsd}` : `-$${Math.abs(floatingPnlUsd)}`})
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {isFloatingProfit
                  ? `Posisi UNTUNG (Floating +${floatingPnlPercent}%)`
                  : isFloatingDrawdown
                  ? `Posisi DRAWDOWN (${floatingPnlPercent}%)`
                  : 'Posisi NETRAL di titik Breakeven'}
              </div>
            </div>

            {/* Quick Lock Button */}
            <button
              type="button"
              onClick={handleMarketCloseNow}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1 ${
                isFloatingProfit
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
              title="Tutup posisi sekarang pada harga live spot"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Tutup @ Spot</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Distance Metrics: Sisa Jarak ke TP1 & Jarak Aman ke SL */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {/* Distance to TP1 */}
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
          <div className="text-[10px] text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              SISA MENUJU TP1
            </span>
            <span className="text-slate-400">{trade.takeProfit1Formatted}</span>
          </div>
          <div className="text-sm font-bold text-emerald-300 mt-1">
            {isTp1Reached ? (
              <span className="text-emerald-400">TP1 TERCAPAI (+{floatingPips}p)</span>
            ) : (
              <span>{tp1RemainingPips} pips lagi</span>
            )}
          </div>
          <div className="text-[9px] text-slate-500">
            {isTp1Reached
              ? 'Target awal berhasil dicapai!'
              : `${(100 - (tp1RemainingPips / Math.max(1, Math.abs(trade.takeProfit1 - trade.entryPrice) * (isEur ? 10000 : 10))) * 100).toFixed(0)}% perjalanan menuju target TP1`}
          </div>
        </div>

        {/* Distance to SL */}
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
          <div className="text-[10px] text-rose-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-rose-400" />
              JARAK AMAN DARI SL
            </span>
            <span className="text-slate-400">{trade.isBreakEvenActive ? trade.entryPriceFormatted : trade.stopLossFormatted}</span>
          </div>
          <div className="text-sm font-bold text-rose-300 mt-1">
            {isSlReached ? (
              <span className="text-rose-400">SL TERSENTUH</span>
            ) : (
              <span>{slBufferPips} pips buffer pengaman</span>
            )}
          </div>
          <div className="text-[9px] text-slate-500">
            {trade.isBreakEvenActive
              ? 'SL di BEP: Tidak ada risiko kerugian modal'
              : `Batas invalidasi cut loss di ${trade.stopLossFormatted}`}
          </div>
        </div>
      </div>

      {/* 4. Visual Range Gauge (Stop Loss ─── Entry ─── Spot Price ─── Take Profit 1) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 space-y-2 font-mono">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="text-rose-400 font-bold flex items-center gap-1">
            <span>SL (0%):</span> {trade.stopLossFormatted}
            <span className="text-[9px] text-rose-500/80 font-normal">
              ({trade.direction === 'BUY' ? 'Bawah' : 'Atas'})
            </span>
          </span>
          <span className="text-slate-300 font-bold flex items-center gap-1">
            <span>ENTRY:</span> {trade.entryPriceFormatted}
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span>TP1 (100%):</span> {trade.takeProfit1Formatted}
            <span className="text-[9px] text-emerald-500/80 font-normal">
              ({trade.direction === 'BUY' ? 'Atas' : 'Bawah'})
            </span>
          </span>
        </div>

        {/* The Visual Bar */}
        <div className="relative w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex items-center">
          {/* Entry Line Indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
            style={{ left: `${entryGaugePct}%` }}
            title={`Entry: ${trade.entryPriceFormatted}`}
          />

          {/* Profit or Drawdown fill zone */}
          {gaugeProgressPct >= entryGaugePct ? (
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/40 z-0 transition-all duration-300"
              style={{
                left: `${entryGaugePct}%`,
                width: `${Math.max(0, gaugeProgressPct - entryGaugePct)}%`,
              }}
            />
          ) : (
            <div
              className="absolute top-0 bottom-0 bg-rose-500/40 z-0 transition-all duration-300"
              style={{
                left: `${gaugeProgressPct}%`,
                width: `${Math.max(0, entryGaugePct - gaugeProgressPct)}%`,
              }}
            />
          )}

          {/* Current Spot Needle Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full z-20 transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer"
            style={{
              left: `${Math.min(99, Math.max(1, gaugeProgressPct))}%`,
              backgroundColor: isFloatingProfit ? '#10b981' : isFloatingDrawdown ? '#f43f5e' : '#38bdf8',
            }}
            title={`Spot: ${currentPriceFormatted} (${floatingPipsFormatted})`}
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>

        {/* Live Spot Legend */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-rose-400/80">Batas Risiko (0% - Maks 20p)</span>
          <span className="text-sky-300 font-bold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            Posisi Spot: {currentPriceFormatted} ({floatingPipsFormatted})
          </span>
          <span className="text-emerald-400/80">Target Profit (100% - TP &gt; SL)</span>
        </div>
      </div>

      {/* 5. Quick Actions Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/60 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* BEP button */}
          {!trade.isBreakEvenActive && isEligibleForBE && (
            <button
              type="button"
              onClick={handleMoveToBreakeven}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/70 transition-colors font-bold cursor-pointer animate-pulse"
              title="Pindahkan Stop Loss ke harga entry agar posisi bebas risiko (BEP)"
            >
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>Geser SL ke BEP ({trade.entryPriceFormatted})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP1')}
            className="px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
          >
            Hit TP1
          </button>

          {trade.takeProfit2 && (
            <button
              type="button"
              onClick={() => onUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP2')}
              className="px-2 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
            >
              Hit TP2
            </button>
          )}

          <button
            type="button"
            onClick={() => onUpdateTradeStatus(trade.id, 'LOSS', 'HIT_SL')}
            className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
          >
            Hit SL
          </button>
        </div>

        <button
          type="button"
          onClick={handleMarketCloseNow}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors font-bold ml-auto cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Tutup Sekarang @ {currentPriceFormatted}</span>
        </button>
      </div>
    </div>
  );
};
