import React, { useState } from 'react';
import {
  RecordedDecision,
  DayTradeSummary,
  TradeOutcomeStatus,
  TradeCloseReason,
  AssetSymbol,
} from '../types.ts';
import { formatTradeTimestamp, formatTradeDuration } from '../utils/tradeJournal.ts';
import { LiveOpenPositionSituationCard } from './LiveOpenPositionSituationCard.tsx';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Trash2,
  Edit3,
  TrendingUp,
  Coins,
  Bitcoin,
} from 'lucide-react';

interface TradeCalendarPanelProps {
  trades: RecordedDecision[];
  daySummaries: Map<string, DayTradeSummary>;
  onUpdateTradeStatus: (
    tradeId: string,
    status: TradeOutcomeStatus,
    reason?: TradeCloseReason,
    customExitPrice?: number,
    notes?: string
  ) => void;
  onDeleteTrade: (tradeId: string) => void;
  selectedSymbolFilter?: AssetSymbol | 'ALL';
  currentSpotPrice?: number | string;
  getSpotPriceForTrade?: (trade: RecordedDecision) => number | string | undefined;
}

export const TradeCalendarPanel: React.FC<TradeCalendarPanelProps> = ({
  trades,
  daySummaries,
  onUpdateTradeStatus,
  onDeleteTrade,
  selectedSymbolFilter = 'ALL',
  currentSpotPrice,
  getSpotPriceForTrade,
}) => {
  // Calendar month state: Default to current year & month (e.g. September 2026)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Check if there are trades, pick date of latest trade or now
    if (trades.length > 0) {
      const latest = new Date(trades[0].timestamp);
      if (!isNaN(latest.getTime())) return latest;
    }
    return new Date();
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    if (trades.length > 0) {
      return trades[0].dateKey;
    }
    return new Date().toISOString().split('T')[0];
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Auto-sync selected date and calendar view when trades change
  React.useEffect(() => {
    if (trades.length > 0) {
      const hasCurrent = daySummaries.has(selectedDateKey);
      if (!hasCurrent) {
        setSelectedDateKey(trades[0].dateKey);
        const d = new Date(trades[0].timestamp);
        if (!isNaN(d.getTime())) {
          setCurrentDate(d);
        }
      }
    }
  }, [trades, daySummaries, selectedDateKey]);

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filter day summaries if symbol filter is set
  const getDayFilteredSummary = (dateKey: string): DayTradeSummary | undefined => {
    const raw = daySummaries.get(dateKey);
    if (!raw) return undefined;
    if (selectedSymbolFilter === 'ALL') return raw;

    const filteredTrades = raw.trades.filter((t) => t.symbol === selectedSymbolFilter);
    if (filteredTrades.length === 0) return undefined;

    let wins = 0;
    let losses = 0;
    let breakEvens = 0;
    let openTrades = 0;
    let netPnlUsd = 0;
    let netPnlPercent = 0;
    let netPips = 0;

    filteredTrades.forEach((t) => {
      if (t.status === 'WIN') wins++;
      else if (t.status === 'LOSS') losses++;
      else if (t.status === 'BREAK_EVEN') breakEvens++;
      else if (t.status === 'OPEN') openTrades++;

      netPnlUsd += t.pnlUsd || 0;
      netPnlPercent += t.pnlPercent || 0;
      netPips += t.pipsGained || 0;
    });

    const decisive = wins + losses;
    return {
      dateKey,
      totalTrades: filteredTrades.length,
      wins,
      losses,
      breakEvens,
      openTrades,
      netPnlUsd: Number(netPnlUsd.toFixed(2)),
      netPnlPercent: Number(netPnlPercent.toFixed(1)),
      netPips,
      winRate: decisive > 0 ? Number(((wins / decisive) * 100).toFixed(1)) : 0,
      trades: filteredTrades,
    };
  };

  // Selected day details
  const selectedDaySummary = getDayFilteredSummary(selectedDateKey);

  // Month stats
  let monthWins = 0;
  let monthLosses = 0;
  let monthNetPnl = 0;
  let monthTotalTrades = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(month + 1).padStart(2, '0');
    const dKey = `${year}-${mStr}-${dStr}`;
    const dSummary = getDayFilteredSummary(dKey);
    if (dSummary) {
      monthWins += dSummary.wins;
      monthLosses += dSummary.losses;
      monthNetPnl += dSummary.netPnlUsd;
      monthTotalTrades += dSummary.totalTrades;
    }
  }

  const monthDecisive = monthWins + monthLosses;
  const monthWinRate = monthDecisive > 0 ? Number(((monthWins / monthDecisive) * 100).toFixed(1)) : 0;

  return (
    <div className="space-y-4">
      {/* Calendar Header Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-500/20 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
              <span>{monthNames[month]} {year}</span>
              <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Trading Calendar
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Hasil harian, evaluasi untung/rugi, dan log keputusan trading per tanggal.
            </p>
          </div>
        </div>

        {/* Month Navigation & Monthly Quick Aggregates */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono">
            <span className="text-slate-400">Bulan Ini:</span>
            <span className={monthNetPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {monthNetPnl >= 0 ? '+' : ''}${monthNetPnl.toLocaleString()}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400 font-bold">{monthWinRate}% WR</span>
            <span className="text-slate-400 text-[10px]">({monthWins}W / {monthLosses}L)</span>
          </div>

          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 sm:p-4 shadow-xl shadow-black/20">
        {/* Day of Week Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-mono font-bold text-slate-400">
          <div className="py-1">SEN (MON)</div>
          <div className="py-1">SEL (TUE)</div>
          <div className="py-1">RAB (WED)</div>
          <div className="py-1">KAM (THU)</div>
          <div className="py-1">JUM (FRI)</div>
          <div className="py-1 text-slate-500">SAB (SAT)</div>
          <div className="py-1 text-slate-500">MIN (SUN)</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty cells before 1st of month */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-16 sm:h-20 rounded-lg bg-slate-900/20 border border-slate-800/30 opacity-25"
            />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dStr = String(dayNum).padStart(2, '0');
            const mStr = String(month + 1).padStart(2, '0');
            const dateKey = `${year}-${mStr}-${dStr}`;
            const summary = getDayFilteredSummary(dateKey);
            const isSelected = selectedDateKey === dateKey;

            // Day style based on results
            let cellStyle = 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300';
            let badgeStyle = '';

            if (summary) {
              if (summary.openTrades > 0 && summary.wins === 0 && summary.losses === 0) {
                // Only open
                cellStyle = 'bg-amber-950/20 border-amber-500/40 text-amber-200';
                badgeStyle = 'bg-amber-900/40 text-amber-300 border-amber-700/50';
              } else if (summary.netPnlUsd > 0) {
                cellStyle = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200';
                badgeStyle = 'bg-emerald-900/50 text-emerald-300 border-emerald-600/50';
              } else if (summary.netPnlUsd < 0) {
                cellStyle = 'bg-rose-950/30 border-rose-500/40 text-rose-200';
                badgeStyle = 'bg-rose-900/50 text-rose-300 border-rose-600/50';
              } else {
                cellStyle = 'bg-slate-800/50 border-slate-700 text-slate-200';
                badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
              }
            }

            if (isSelected) {
              cellStyle += ' ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950';
            }

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={`h-16 sm:h-20 rounded-lg p-1.5 sm:p-2 border flex flex-col justify-between transition-all text-left relative cursor-pointer group ${cellStyle}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-mono font-bold ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {summary && summary.openTrades > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" title="Trade Masih Terbuka" />
                  )}
                </div>

                {summary ? (
                  <div className="mt-0.5 space-y-0.5">
                    {/* Net PnL USD */}
                    <div className="text-[10px] sm:text-xs font-mono font-bold tracking-tight">
                      {summary.netPnlUsd > 0 && <span className="text-emerald-400">+${summary.netPnlUsd}</span>}
                      {summary.netPnlUsd < 0 && <span className="text-rose-400">-${Math.abs(summary.netPnlUsd)}</span>}
                      {summary.netPnlUsd === 0 && (
                        <span className="text-slate-400">
                          {summary.openTrades > 0 ? 'OPEN' : 'BE (0)'}
                        </span>
                      )}
                    </div>

                    {/* Trade outcome counts badge */}
                    <div className="flex items-center gap-1 text-[9px] font-mono">
                      <span className={`px-1 py-0.2 rounded border font-semibold ${badgeStyle}`}>
                        {summary.wins}W / {summary.losses}L
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono text-slate-600 self-center">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Trade Ledger Drilldown */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>DETAIL TRANSAKSI: {selectedDateKey}</span>
                {selectedDaySummary && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      selectedDaySummary.netPnlUsd > 0
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-700/50'
                        : selectedDaySummary.netPnlUsd < 0
                        ? 'bg-rose-950/70 text-rose-400 border border-rose-700/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Net: {selectedDaySummary.netPnlUsd >= 0 ? '+' : ''}${selectedDaySummary.netPnlUsd} ({selectedDaySummary.netPnlPercent >= 0 ? '+' : ''}{selectedDaySummary.netPnlPercent}%)
                  </span>
                )}
              </h5>
              <p className="text-[11px] text-slate-400">
                {selectedDaySummary
                  ? `${selectedDaySummary.totalTrades} keputusan tercatat (${selectedDaySummary.wins} Menang, ${selectedDaySummary.losses} Kalah, ${selectedDaySummary.breakEvens} Break Even, ${selectedDaySummary.openTrades} Berjalan)`
                  : 'Tidak ada riwayat keputusan trading yang tercatat pada tanggal ini.'}
              </p>
            </div>
          </div>

          {selectedDaySummary && selectedDaySummary.totalTrades > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Day Winrate:</span>
              <span className="text-amber-400 font-bold text-sm">{selectedDaySummary.winRate}%</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Net Pips:</span>
              <span className={selectedDaySummary.netPips >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {selectedDaySummary.netPips >= 0 ? '+' : ''}{selectedDaySummary.netPips} pips
              </span>
            </div>
          )}
        </div>

        {/* List of Trades on this date */}
        {selectedDaySummary && selectedDaySummary.trades.length > 0 ? (
          <div className="space-y-3 pt-1">
            {selectedDaySummary.trades.map((trade) => {
              const isEur = trade.symbol === 'EURUSD';
              const isBtc = trade.symbol === 'BTCUSD';
              const isWin = trade.status === 'WIN';
              const isLoss = trade.status === 'LOSS';
              const isPending = trade.status === 'PENDING' || (trade.status === 'OPEN' && !trade.entryTriggered);
              const isOpen = trade.status === 'OPEN' && trade.entryTriggered === true;
              const isBE = trade.status === 'BREAK_EVEN';
              const isCancelled = trade.status === 'CANCELLED';

              return (
                <div
                  key={trade.id}
                  className={`rounded-xl border p-3.5 sm:p-4 transition-all ${
                    isWin
                      ? 'bg-emerald-950/20 border-emerald-800/50'
                      : isLoss
                      ? 'bg-rose-950/20 border-rose-800/50'
                      : isOpen
                      ? 'bg-sky-950/20 border-sky-600/40'
                      : isPending
                      ? 'bg-amber-950/20 border-amber-600/40'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Symbol Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          isEur
                            ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                            : isBtc
                            ? 'bg-orange-950/60 text-orange-300 border-orange-700/50'
                            : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                        }`}
                      >
                        {isEur ? <TrendingUp className="w-3 h-3 text-blue-400" /> : isBtc ? <Bitcoin className="w-3 h-3 text-orange-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
                        {trade.symbol}
                      </span>

                      {/* Direction Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          trade.direction === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {trade.direction === 'BUY' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {trade.direction}
                      </span>

                      {/* Timeframe */}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
                        {trade.timeframe}
                      </span>

                      {/* Plan Title */}
                      <span className="text-xs font-bold text-slate-200">
                        {trade.planTitle}
                      </span>
                    </div>

                    {/* Result Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                          isWin
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-600/60'
                            : isLoss
                            ? 'bg-rose-950 text-rose-400 border-rose-600/60'
                            : isOpen
                            ? 'bg-sky-950 text-sky-300 border-sky-600/60'
                            : isPending
                            ? 'bg-amber-950 text-amber-300 border-amber-600/60 animate-pulse'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isWin && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isLoss && <XCircle className="w-3.5 h-3.5" />}
                        {isOpen && <Clock className="w-3.5 h-3.5" />}
                        {isPending && <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                        <span>
                          {isWin && `WIN (${trade.outcomeReason || 'TP'}): +$${trade.pnlUsd} (+${trade.pnlPercent}%)`}
                          {isLoss && `LOSS (${trade.outcomeReason || 'SL'}): -$${Math.abs(trade.pnlUsd)} (${trade.pnlPercent}%)`}
                          {isPending && 'ORDER PENDING (MENUNGGU JEMPUTAN)'}
                          {isOpen && 'POSISI AKTIF RUNNING'}
                          {isBE && 'BREAK EVEN (0%)'}
                          {isCancelled && 'ORDER DIBATALKAN'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onDeleteTrade(trade.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 transition-colors"
                        title="Hapus Rekaman Trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Anti-Bias Detailed Timestamps Section */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 mb-2.5 text-xs font-mono space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-slate-400">Waktu Keputusan (Entry):</span>
                        <strong className="text-slate-100 font-semibold">
                          {trade.timestampFormatted || formatTradeTimestamp(trade.timestamp)}
                        </strong>
                      </div>
                      {isOpen && (
                        <span className="inline-flex items-center gap-1.5 text-sky-400 text-[11px] font-medium">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                          Posisi Aktif: {trade.durationFormatted || formatTradeDuration(trade.timestamp)}
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 text-[11px] font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Menunggu Jemputan Harga
                        </span>
                      )}
                    </div>

                    {!isOpen && !isPending && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-400">Waktu Selesai (Closed):</span>
                          <strong className="text-slate-100 font-semibold">
                            {trade.closedTimestampFormatted || (trade.closedTimestamp ? formatTradeTimestamp(trade.closedTimestamp) : '—')}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Total Durasi: <strong className="text-slate-200">{trade.durationFormatted || formatTradeDuration(trade.timestamp, trade.closedTimestamp)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Open Position Situation Card (For OPEN trades) OR Pricing/Levels Grid (For CLOSED trades) */}
                  {isOpen ? (
                    <div className="mb-2.5">
                      <LiveOpenPositionSituationCard
                        trade={trade}
                        currentSpotPrice={getSpotPriceForTrade ? getSpotPriceForTrade(trade) : currentSpotPrice}
                        onUpdateTradeStatus={onUpdateTradeStatus}
                        compact={true}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Pricing and Levels Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-2.5">
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                          <div className="text-[10px] text-slate-400">ENTRY PRICE</div>
                          <div className="font-bold text-slate-200 mt-0.5">{trade.entryPriceFormatted}</div>
                          <div className="text-[9px] text-slate-500">{trade.orderType}</div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                          <div className="text-[10px] text-rose-400">STOP LOSS</div>
                          <div className="font-bold text-rose-300 mt-0.5">{trade.stopLossFormatted}</div>
                          <div className="text-[9px] text-slate-500">Risk: 1.0%</div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                          <div className="text-[10px] text-emerald-400">TARGET (TP1 / TP2)</div>
                          <div className="font-bold text-emerald-300 mt-0.5">
                            {trade.takeProfit1Formatted}
                            {trade.takeProfit2Formatted && <span className="text-slate-400 text-[10px]"> / {trade.takeProfit2Formatted}</span>}
                          </div>
                          <div className="text-[9px] text-slate-500">RR {trade.projectedRR}</div>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2">
                          <div className="text-[10px] text-amber-400">HASIL / PIPS</div>
                          <div className={`font-bold mt-0.5 ${trade.pipsGained > 0 ? 'text-emerald-400' : trade.pipsGained < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {trade.pipsGained >= 0 ? `+${trade.pipsGained}` : trade.pipsGained} pips
                          </div>
                          <div className="text-[9px] text-slate-400">
                            {trade.exitPriceFormatted ? `Exit @ ${trade.exitPriceFormatted}` : 'Menunggu target'}
                          </div>
                        </div>
                      </div>

                      {/* Trade notes / explanation */}
                      {trade.notes && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1.5 border border-slate-800/50 mb-2.5 flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{trade.notes}</span>
                        </div>
                      )}

                      {/* Interactive Status Update Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/40 text-[10px] font-mono">
                        <span className="text-slate-500 mr-1">Tandai Hasil:</span>

                        <button
                          type="button"
                          onClick={() => onUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP1')}
                          className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-colors"
                        >
                          Hit TP1 (+2.0%)
                        </button>

                        {trade.takeProfit2 && (
                          <button
                            type="button"
                            onClick={() => onUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP2')}
                            className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-colors"
                          >
                            Hit TP2 (+3.0%)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onUpdateTradeStatus(trade.id, 'LOSS', 'HIT_SL')}
                          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 transition-colors"
                        >
                          Hit SL (-1.0%)
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateTradeStatus(trade.id, 'BREAK_EVEN', 'BREAK_EVEN')}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                        >
                          Break Even (0%)
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateTradeStatus(trade.id, 'OPEN', 'PENDING')}
                          className="px-2 py-1 rounded bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors ml-auto"
                        >
                          Kembalikan ke Open
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs font-mono bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
            Tidak ada keputusan atau trade pada tanggal {selectedDateKey}. Pilih tanggal lain yang memiliki tanda angka di kalender.
          </div>
        )}
      </div>
    </div>
  );
};
