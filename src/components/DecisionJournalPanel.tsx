import React, { useState, useMemo, useEffect } from 'react';
import {
  RecordedDecision,
  QuantAnalysisResult,
  TradeOutcomeStatus,
  TradeCloseReason,
  AssetSymbol,
  TimeframeType,
} from '../types.ts';
import {
  calculateWinrateStats,
  getDayTradeSummaries,
  recordDecisionFromAnalysis,
  updateTradeStatus,
  deleteTrade,
  getStoredTrades,
  clearAllJournalTrades,
  purgeDummyTrades,
  isDummyBenchmarkTrade,
  evaluateOpenTradesAgainstSpotPrice,
  isAutoRecordEnabled,
  setAutoRecordEnabled,
  syncTradesWithCandleHistoryApi,
  syncTradesWithServerStorage,
  formatTradeTimestamp,
  formatTradeDuration,
  parseNumericPrice,
} from '../utils/tradeJournal.ts';
import { TradeCalendarPanel } from './TradeCalendarPanel.tsx';
import { LiveOpenPositionSituationCard } from './LiveOpenPositionSituationCard.tsx';
import {
  getAccountSettings,
  getCurrentCompoundingTier,
  AccountSettings,
} from '../utils/accountSettings.ts';
import {
  Award,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  Percent,
  BarChart3,
  ListOrdered,
  PlusCircle,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Zap,
  Filter,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Trash2,
  HelpCircle,
  Activity,
  Bitcoin,
} from 'lucide-react';

interface DecisionJournalPanelProps {
  currentAnalysis?: QuantAnalysisResult | null;
  currentSpotPrice?: string;
  selectedSymbol: AssetSymbol;
}

export const DecisionJournalPanel: React.FC<DecisionJournalPanelProps> = ({
  currentAnalysis,
  currentSpotPrice,
  selectedSymbol,
}) => {
  // Trades state initialized from clean getStoredTrades() (purging legacy mock seed data)
  const [trades, setTrades] = useState<RecordedDecision[]>(() => getStoredTrades());

  // Active sub-tab: 'CALENDAR' | 'LIST' | 'STATS'
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'LIST' | 'STATS'>('CALENDAR');

  // Filter state
  const [symbolFilter, setSymbolFilter] = useState<AssetSymbol | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TradeOutcomeStatus | 'ALL'>('ALL');
  const [autoRecord, setAutoRecord] = useState<boolean>(() => isAutoRecordEnabled());
  const [isSyncingCandles, setIsSyncingCandles] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ time: string; count: number } | null>(null);

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live quotes state for real-time open trade situation evaluation
  const [liveQuotes, setLiveQuotes] = useState<{ XAUUSD: number; EURUSD: number; BTCUSD: number }>({
    XAUUSD: parseNumericPrice(currentSpotPrice) || 0,
    EURUSD: 1.0850,
    BTCUSD: 88000.0,
  });

  // Polling /api/quotes every 4 seconds to maintain real-time open trade pips & movement
  useEffect(() => {
    let isMounted = true;
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.quotes) {
            setLiveQuotes((prev) => ({
              XAUUSD: data.quotes.goldPrice || prev.XAUUSD,
              EURUSD: data.quotes.eurPrice || data.quotes.eurUsdPrice || prev.EURUSD,
              BTCUSD: data.quotes.btcPrice || prev.BTCUSD,
            }));
          }
        }
      } catch {
        // quiet fallback
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update live quotes whenever spot price prop changes from parent
  useEffect(() => {
    const num = parseNumericPrice(currentSpotPrice);
    if (num && num > 0) {
      setLiveQuotes((prev) => ({
        ...prev,
        [selectedSymbol]: num,
      }));
    }
  }, [currentSpotPrice, selectedSymbol]);

  // Helper to obtain accurate live spot price for any specific trade
  const getSpotPriceForTrade = (trade: RecordedDecision): number | string | undefined => {
    if (trade.symbol === 'EURUSD' && liveQuotes.EURUSD > 0) {
      return liveQuotes.EURUSD;
    }
    if (trade.symbol === 'BTCUSD' && liveQuotes.BTCUSD > 0) {
      return liveQuotes.BTCUSD;
    }
    if (trade.symbol === 'XAUUSD') {
      if (liveQuotes.XAUUSD > 0) return liveQuotes.XAUUSD;
      if (currentSpotPrice && selectedSymbol === 'XAUUSD') return currentSpotPrice;
    }
    if (currentSpotPrice && selectedSymbol === trade.symbol) return currentSpotPrice;
    return trade.symbol === 'EURUSD' ? 1.0850 : trade.symbol === 'BTCUSD' ? 88000.00 : 4330.00;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Auto-Sync Historical Candle Backfill
  // Evaluates mature OPEN trades against actual high/low spot candles formed while offline
  const handleSyncCandleHistory = async (isManual = false) => {
    const openTrades = trades.filter((t) => t.status === 'OPEN');
    if (openTrades.length === 0) {
      if (isManual) {
        showToast('Tidak ada posisi OPEN saat ini. Semua transaksi sudah diselesaikan.');
      }
      return;
    }

    const nowMs = Date.now();
    const matureTrades = openTrades.filter(
      (t) => nowMs - new Date(t.timestamp).getTime() > 2 * 60 * 1000
    );

    if (matureTrades.length === 0 && !isManual) {
      // Trades were opened less than 2 minutes ago; do not prematurely evaluate against historical candles
      return;
    }

    setIsSyncingCandles(true);
    try {
      const res = await syncTradesWithCandleHistoryApi();
      if (res && res.resolvedCount > 0) {
        setTrades([...res.updatedTrades]);
        setLastSyncResult({
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          count: res.resolvedCount,
        });
        showToast(
          `⚡ Auto-Sync Berhasil: ${res.resolvedCount} posisi terdeteksi mencapai TP/SL di bursa saat laptop offline!`
        );
      } else if (isManual) {
        showToast('Riwayat candle bursa dicek: Belum ada harga candle yang menyentuh target TP atau SL.');
      }
    } catch (err) {
      console.error('Sync candle error:', err);
      if (isManual) {
        showToast('Gagal menyinkronkan data candle bursa.');
      }
    } finally {
      setIsSyncingCandles(false);
    }
  };

  // Auto-sync on mount and when user returns to the tab/wakes up laptop
  useEffect(() => {
    // Initial sync from local storage and persistent server
    setTrades(getStoredTrades());
    syncTradesWithServerStorage().then((synced) => {
      if (Array.isArray(synced)) {
        setTrades(synced);
      }
    });
    handleSyncCandleHistory(false);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncTradesWithServerStorage().then((synced) => {
          if (Array.isArray(synced)) {
            setTrades(synced);
          }
        });
        handleSyncCandleHistory(false);
      }
    };

    const handleJournalSyncEvent = () => {
      setTrades(getStoredTrades());
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('journal-updated', handleJournalSyncEvent);
    window.addEventListener('storage', handleJournalSyncEvent);

    return () => {
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('journal-updated', handleJournalSyncEvent);
      window.removeEventListener('storage', handleJournalSyncEvent);
    };
  }, []);

  // Ensure trades are synced if localStorage changes
  const refreshTrades = () => {
    setTrades(getStoredTrades());
  };

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateWinrateStats(trades);
  }, [trades]);

  // Calculate calendar summaries
  const daySummaries = useMemo(() => {
    return getDayTradeSummaries(trades);
  }, [trades]);

  // Handle Manual "Record Current AI Decision"
  const handleRecordCurrentAnalysis = () => {
    if (!currentAnalysis || !currentAnalysis.tradeSetup) {
      showToast('Belum ada data analisis pasar aktif. Klik "ANALYZE MARKET" terlebih dahulu.');
      return;
    }

    const newTrade = recordDecisionFromAnalysis(currentAnalysis, undefined, false);
    if (newTrade) {
      refreshTrades();
      showToast(`Keputusan berhasil dicatat: ${newTrade.symbol} ${newTrade.direction} (${newTrade.planTitle})`);
    } else {
      showToast('Keputusan untuk setup ini sudah tercatat baru-baru ini.');
    }
  };

  // Handle Status Update
  const handleUpdateTradeStatus = (
    tradeId: string,
    status: TradeOutcomeStatus,
    reason?: TradeCloseReason,
    customExitPrice?: number,
    notes?: string
  ) => {
    const updated = updateTradeStatus(tradeId, status, reason, customExitPrice, notes);
    setTrades([...updated]);
    showToast(`Status trade berhasil diperbarui: ${status} ${reason ? `(${reason})` : ''}`);
  };

  // Handle Delete Trade
  const handleDeleteTrade = (tradeId: string) => {
    const updated = deleteTrade(tradeId);
    setTrades([...updated]);
    showToast('Rekaman trade berhasil dihapus.');
  };

  // Handle Clear All Data (Mulai jurnal kosong murni dari 0)
  const handleClearAllData = () => {
    if (window.confirm('Kosongkan seluruh riwayat jurnal agar pengujian strategi murni dimulai dari 0 trade?')) {
      const cleared = clearAllJournalTrades();
      setTrades([...cleared]);
      showToast('Jurnal berhasil dikosongkan. Pengujian strategi dimulai murni dari real-time.');
    }
  };

  // Handle Purge Dummy Data (Hapus semua data dummy/benchmark seketika)
  const handlePurgeDummyData = () => {
    const cleared = purgeDummyTrades();
    setTrades([...cleared]);
    showToast('Data dummy berhasil dibersihkan total. Jurnal sekarang 100% murni.');
  };

  // Handle Spot Price Auto Evaluation
  const handleEvaluateLivePrice = () => {
    if (!currentSpotPrice || currentSpotPrice === 'DATA UNAVAILABLE') {
      showToast('Data spot price belum tersedia untuk verifikasi.');
      return;
    }

    const priceNum = parseNumericPrice(currentSpotPrice);
    if (!priceNum || priceNum <= 0) {
      showToast('Format spot price tidak valid.');
      return;
    }

    const { updatedTrades, changedCount } = evaluateOpenTradesAgainstSpotPrice(
      trades,
      priceNum,
      selectedSymbol
    );

    if (changedCount > 0) {
      setTrades([...updatedTrades]);
      showToast(`${changedCount} posisi open berhasil diperbarui berdasarkan harga spot live!`);
    } else {
      showToast(`Harga spot live (${currentSpotPrice}) belum menyentuh TP atau SL pada posisi yang masih terbuka.`);
    }
  };

  const handleToggleAutoRecord = () => {
    const next = !autoRecord;
    setAutoRecord(next);
    setAutoRecordEnabled(next);
    showToast(`Auto-record keputusan: ${next ? 'AKTIF' : 'DINONAKTIFKAN'}`);
  };

  // Filtered trades for list view
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchSymbol = symbolFilter === 'ALL' || t.symbol === symbolFilter;
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PENDING'
          ? t.status === 'PENDING' || (t.status === 'OPEN' && !t.entryTriggered)
          : statusFilter === 'OPEN'
          ? t.status === 'OPEN' && t.entryTriggered === true
          : t.status === statusFilter;
      return matchSymbol && matchStatus;
    });
  }, [trades, symbolFilter, statusFilter]);

  // Active open trades & pending limit orders
  const activeOpenTradesList = useMemo(() => trades.filter((t) => t.status === 'OPEN' && t.entryTriggered === true), [trades]);
  const pendingTradesList = useMemo(() => trades.filter((t) => t.status === 'PENDING' || (t.status === 'OPEN' && !t.entryTriggered)), [trades]);
  const allActiveOrPendingTrades = useMemo(() => [...activeOpenTradesList, ...pendingTradesList], [activeOpenTradesList, pendingTradesList]);

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-6 space-y-5 relative overflow-hidden shadow-2xl shadow-black/30">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-amber-500/60 text-amber-300 px-4 py-3 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              AI DECISION JOURNAL, WINRATE & TRADE CALENDAR
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
              AUDITED PERFORMANCE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              PERSISTENT STORAGE
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
            Rekam Keputusan AI, Kalender Hasil Trade & Evaluasi Winrate
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl mt-0.5 leading-relaxed">
            Mencatat setiap saran dan keputusan trading yang diambil oleh AI (Entry, Stop Loss, Target TP1/TP2, R:R). Hasilnya dicatat dalam kalender trade harian dengan kalkulasi untung/rugi, persentase return, dan statistik winrate menyeluruh.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-lg px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {trades.length === 0
                  ? 'Jurnal Siap: 0 trade aktif. Riwayat hasil trade tersimpan permanen di server & browser.'
                  : `Tersimpan Permanen: ${trades.length} data trade tercatat (tidak akan ter-reset saat web dibuka kembali).`}
              </span>
            </div>
            {(() => {
              const acct = getAccountSettings();
              const tier = getCurrentCompoundingTier(acct.balance);
              return (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded-lg px-2.5 py-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Modal Real: <strong>${acct.balance.toLocaleString()}</strong> &bull; Auto Compounding: <strong>Tier {tier.tierNumber} ({tier.lotSize} Lot)</strong>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Record Current Button */}
          <button
            type="button"
            onClick={handleRecordCurrentAnalysis}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            title="Rekam saran trading yang sedang tampil di layar ke dalam jurnal"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Catat Keputusan Saat Ini</span>
          </button>

          {/* Evaluate Live Spot Button */}
          <button
            type="button"
            onClick={handleEvaluateLivePrice}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors"
            title="Uji otomatis trade berstatus OPEN terhadap harga spot terkini"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Verifikasi Live Spot</span>
          </button>

          {/* Auto-record toggle */}
          <button
            type="button"
            onClick={handleToggleAutoRecord}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${
              autoRecord
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
            title="Otomatis merekam setiap kali analisis baru selesai"
          >
            <span className={`w-2 h-2 rounded-full ${autoRecord ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>Auto-Record: {autoRecord ? 'ON' : 'OFF'}</span>
          </button>

          {/* Historical Candle Sync button (for offline recovery when reopening laptop) */}
          <button
            type="button"
            onClick={() => handleSyncCandleHistory(true)}
            disabled={isSyncingCandles}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono bg-cyan-950/50 border border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/50 transition-colors disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-950"
            title="Periksa riwayat High/Low candle bursa jika laptop baru saja dinyalakan kembali setelah offline"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncingCandles ? 'animate-spin' : ''}`} />
            <span>{isSyncingCandles ? 'Memeriksa Candle...' : 'Sync Riwayat Candle (Offline)'}</span>
          </button>

          {/* Purge Dummy Data button (only appears if any old dummy records exist) */}
          {trades.some(isDummyBenchmarkTrade) && (
            <button
              type="button"
              onClick={handlePurgeDummyData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold text-rose-300 hover:text-white bg-rose-950/80 border border-rose-600 hover:bg-rose-900 transition-colors shadow-sm cursor-pointer"
              title="Bersihkan seluruh data dummy/benchmark dari jurnal"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Bersihkan Data Dummy</span>
            </button>
          )}

          {/* Clear Journal button */}
          <button
            type="button"
            onClick={handleClearAllData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono text-rose-300 hover:text-rose-200 bg-slate-950 border border-rose-900/50 hover:border-rose-700/70 hover:bg-rose-950/30 transition-colors"
            title="Kosongkan seluruh riwayat jurnal untuk reset ke 0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Kosongkan Jurnal</span>
          </button>
        </div>
      </div>

      {/* Offline Recovery Notification Banner if trades resolved */}
      {lastSyncResult && lastSyncResult.count > 0 && (
        <div className="bg-emerald-950/80 border border-emerald-600/70 rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-xs font-mono text-emerald-200 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Auto-Sync Berhasil ({lastSyncResult.time}):</strong> {lastSyncResult.count} posisi transaksi berhasil dievaluasi dan diselesaikan otomatis berdasarkan riwayat candle High/Low bursa saat Anda offline/laptop dimatikan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastSyncResult(null)}
            className="text-emerald-300 hover:text-white px-2.5 py-1 text-[11px] font-bold border border-emerald-700/60 rounded bg-emerald-900/60 cursor-pointer ml-3 shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* High-Impact Winrate & Metrics Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Metric 1: Overall Winrate */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>WINRATE RESMI</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {stats.winRatePercent}%
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {stats.wins} Menang / {stats.losses} Kalah ({stats.breakEvens} BE)
          </div>
        </div>

        {/* Metric 2: Net Profit USD */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>NET PROFIT (USD)</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stats.netPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.netPnlUsd >= 0 ? '+' : ''}${stats.netPnlUsd.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Akumulasi keuntungan tertutup
          </div>
        </div>

        {/* Metric 3: Net Return % */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>PERSENTASE RETURN</span>
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stats.netPnlPercent >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            {stats.netPnlPercent >= 0 ? '+' : ''}{stats.netPnlPercent}%
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Net Pips: <strong className="text-amber-300">{stats.netPips >= 0 ? `+${stats.netPips}` : stats.netPips}</strong>
          </div>
        </div>

        {/* Metric 4: Profit Factor */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>PROFIT FACTOR</span>
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300 tracking-tight">
            {stats.profitFactor}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Rata-rata RR: <strong className="text-slate-200">{stats.averageRR}</strong>
          </div>
        </div>

        {/* Metric 5: Total Decisions */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>TOTAL KEPUTUSAN</span>
            <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
            {stats.totalTrades}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {stats.closedTrades} Selesai | {stats.openTrades} Open
          </div>
        </div>

        {/* Metric 6: Win Streak */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>STREAK TERBAIK</span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-yellow-300 tracking-tight">
            {stats.bestWinStreak}W
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Saat ini: {stats.currentStreak.count} {stats.currentStreak.type}
          </div>
        </div>
      </div>

      {/* 🚀 REAL-TIME RADAR: MONITOR POSISI TERBUKA & ORDER PENDING */}
      {allActiveOrPendingTrades.length > 0 && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-950/20 space-y-3.5 ring-1 ring-amber-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2 flex-wrap">
                <span>MONITOR POSISI & ORDER REAL-TIME</span>
                {activeOpenTradesList.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold">
                    {activeOpenTradesList.length} POSISI AKTIF RUNNING
                  </span>
                )}
                {pendingTradesList.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600 font-bold">
                    {pendingTradesList.length} ORDER PENDING (MENUNGGU JEMPUTAN)
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sky-300">
                <Activity className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                <span>Radar Live (4s)</span>
              </span>
              <button
                type="button"
                onClick={handleEvaluateLivePrice}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors font-bold flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Periksa Spot</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-mono leading-relaxed">
            Menampilkan pergerakan harga pasar secara langsung dari titik entry (naik atau turun berapa pips), status jemputan order pending, floating profit / drawdown posisi terbuka, dan sisa jarak ke target TP1 / SL.
          </p>

          <div className="space-y-3 pt-1">
            {allActiveOrPendingTrades.map((activeTrade) => (
              <LiveOpenPositionSituationCard
                key={activeTrade.id}
                trade={activeTrade}
                currentSpotPrice={getSpotPriceForTrade(activeTrade)}
                onUpdateTradeStatus={handleUpdateTradeStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('CALENDAR')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CALENDAR'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>KALENDER TRADE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>LOG KEPUTUSAN ({trades.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'STATS'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>BREAKDOWN WINRATE</span>
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          {/* Symbol Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono">
            <span className="text-slate-500 mr-1.5 text-[10px]">ASET:</span>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value as any)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-950">Semua Aset</option>
              <option value="XAUUSD" className="bg-slate-950">XAU/USD (Gold)</option>
              <option value="EURUSD" className="bg-slate-950">EUR/USD (Forex)</option>
              <option value="BTCUSD" className="bg-slate-950">BTC/USD (Crypto)</option>
            </select>
          </div>

          {/* Status Filter (for list view) */}
          {activeTab === 'LIST' && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono">
              <span className="text-slate-500 mr-1.5 text-[10px]">STATUS:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-slate-950">Semua Status</option>
                <option value="PENDING" className="bg-slate-950">Pending (Menunggu Jemputan)</option>
                <option value="OPEN" className="bg-slate-950">Open Running (Aktif)</option>
                <option value="WIN" className="bg-slate-950">Win</option>
                <option value="LOSS" className="bg-slate-950">Loss</option>
                <option value="BREAK_EVEN" className="bg-slate-950">Break Even</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Interactive Trade Calendar */}
      {activeTab === 'CALENDAR' && (
        <TradeCalendarPanel
          trades={trades}
          daySummaries={daySummaries}
          onUpdateTradeStatus={handleUpdateTradeStatus}
          onDeleteTrade={handleDeleteTrade}
          selectedSymbolFilter={symbolFilter}
          currentSpotPrice={currentSpotPrice}
          getSpotPriceForTrade={getSpotPriceForTrade}
        />
      )}

      {/* Tab 2: Chronological Trade Decision Log List */}
      {activeTab === 'LIST' && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>MENAMPILKAN {filteredTrades.length} DARI {trades.length} REKAM KEPUTUSAN</span>
            <span className="text-[11px] text-slate-500">Urutan kronologis terbaru di atas</span>
          </div>

          {filteredTrades.length === 0 ? (
            <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold font-mono text-slate-200">
                  {trades.length === 0 ? 'Jurnal Trading Bersih (0 Data Dummy)' : 'Tidak Ada Catatan yang Cocok'}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {trades.length === 0
                    ? 'Sistem menjamin 100% data riil tanpa manipulasi atau data dummy. Klik "Rekam ke Jurnal" pada tiket Setup Eksekusi atau aktifkan Auto-Record untuk mulai mencatat keputusan trade Anda.'
                    : 'Tidak ada keputusan transaksi yang sesuai dengan kriteria filter saat ini. Ubah filter untuk melihat catatan lainnya.'}
                </p>
                {trades.length === 0 && currentAnalysis && (
                  <div className="pt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecordCurrentAnalysis}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-600/80 hover:bg-cyan-900 transition-colors shadow-md cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-cyan-400" />
                      <span>Rekam Plan dari Analisis Terkini</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => {
              const isEur = trade.symbol === 'EURUSD';
              const isWin = trade.status === 'WIN';
              const isLoss = trade.status === 'LOSS';
              const isPending = trade.status === 'PENDING' || (trade.status === 'OPEN' && !trade.entryTriggered);
              const isOpen = trade.status === 'OPEN' && trade.entryTriggered === true;
              const isBE = trade.status === 'BREAK_EVEN';
              const isCancelled = trade.status === 'CANCELLED';

              const entryTimeFormatted = trade.timestampFormatted || formatTradeTimestamp(trade.timestamp);
              const closedTimeFormatted = trade.closedTimestampFormatted || (trade.closedTimestamp ? formatTradeTimestamp(trade.closedTimestamp) : null);
              const durationText = trade.durationFormatted || formatTradeDuration(trade.timestamp, trade.closedTimestamp);

              return (
                <div
                  key={trade.id}
                  className={`bg-slate-950/90 border rounded-xl p-3.5 sm:p-4 transition-all shadow-sm ${
                    isWin
                      ? 'border-emerald-800/50 hover:border-emerald-600/60'
                      : isLoss
                      ? 'border-rose-800/50 hover:border-rose-600/60'
                      : isOpen
                      ? 'border-sky-500/50 hover:border-sky-400/60 ring-1 ring-sky-500/20'
                      : isPending
                      ? 'border-amber-500/50 hover:border-amber-400/60 ring-1 ring-amber-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Direction, Symbol, Timeframe, Plan & Outcome */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold ${
                          trade.direction === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {trade.direction === 'BUY' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {trade.direction}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          isEur
                            ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                            : 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                        }`}
                      >
                        {isEur ? <TrendingUp className="w-3 h-3 text-blue-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
                        {trade.symbol}
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800">
                        {trade.timeframe}
                      </span>

                      <span className="text-xs font-semibold text-slate-200">
                        {trade.planTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                          isWin
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : isLoss
                            ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                            : isOpen
                            ? 'bg-sky-950 text-sky-300 border-sky-600/70'
                            : isPending
                            ? 'bg-amber-950 text-amber-300 border-amber-600/70 animate-pulse'
                            : isBE
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-600/70'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isWin && `WIN (${trade.outcomeReason || 'TP'}): +$${trade.pnlUsd} (+${trade.pnlPercent}%)`}
                        {isLoss && `LOSS (${trade.outcomeReason || 'SL'}): -$${Math.abs(trade.pnlUsd)} (${trade.pnlPercent}%)`}
                        {isPending && 'ORDER PENDING (MENUNGGU JEMPUTAN)'}
                        {isOpen && (trade.isBreakEvenActive ? 'POSISI AKTIF (SL DI BEP)' : 'POSISI AKTIF RUNNING')}
                        {isBE && `BREAKEVEN: $0.00 (${trade.outcomeReason || 'BEP'})`}
                        {isCancelled && 'ORDER DIBATALKAN'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Rekaman Keputusan"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Anti-Bias Detailed Timestamps Section */}
                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-2.5 mb-2.5 text-xs font-mono space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-slate-400">Waktu Keputusan (Entry):</span>
                        <strong className="text-slate-100 font-semibold">{entryTimeFormatted}</strong>
                      </div>
                      {isOpen && (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 text-[11px] font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          Aktif berjalan: {durationText}
                        </span>
                      )}
                    </div>

                    {!isOpen && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-400">Waktu Selesai (Closed):</span>
                          <strong className="text-slate-100 font-semibold">
                            {closedTimeFormatted || '—'}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Total Durasi: <strong className="text-slate-200">{durationText}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Open Position Situation Card (For OPEN trades) OR Pricing/Levels Grid (For CLOSED trades) */}
                  {isOpen ? (
                    <div className="mt-2.5">
                      <LiveOpenPositionSituationCard
                        trade={trade}
                        currentSpotPrice={getSpotPriceForTrade(trade)}
                        onUpdateTradeStatus={handleUpdateTradeStatus}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Pricing and Levels Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2">
                          <div className="text-[10px] text-slate-400">ENTRY PRICE</div>
                          <div className="font-bold text-slate-100 mt-0.5">{trade.entryPriceFormatted}</div>
                          <div className="text-[9px] text-slate-500">{trade.orderType}</div>
                        </div>
                        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2">
                          <div className="text-[10px] text-rose-400 flex items-center justify-between">
                            <span>STOP LOSS</span>
                            {trade.isBreakEvenActive && (
                              <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/90 px-1 rounded border border-cyan-700/60">
                                BEP
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-rose-300 mt-0.5">
                            {trade.isBreakEvenActive ? (
                              <span className="text-cyan-300">{trade.entryPriceFormatted}</span>
                            ) : (
                              trade.stopLossFormatted
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {trade.isBreakEvenActive ? 'Bebas Risiko (0)' : 'Risiko: 1.0%'}
                          </div>
                        </div>
                        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2">
                          <div className="text-[10px] text-emerald-400">TAKE PROFIT 1 / 2</div>
                          <div className="font-bold text-emerald-300 mt-0.5">
                            {trade.takeProfit1Formatted}
                            {trade.takeProfit2Formatted && <span className="text-slate-400 text-[10px]"> / {trade.takeProfit2Formatted}</span>}
                          </div>
                          <div className="text-[9px] text-slate-500">RR {trade.projectedRR}</div>
                        </div>
                        <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2">
                          <div className="text-[10px] text-amber-400">HASIL (PIPS & PNL)</div>
                          <div className={`font-bold mt-0.5 ${trade.pipsGained >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.pipsGained >= 0 ? `+${trade.pipsGained}` : trade.pipsGained} pips
                          </div>
                          <div className="text-[9px] text-slate-400">
                            {trade.exitPriceFormatted ? `Exit: ${trade.exitPriceFormatted}` : 'Menunggu target'}
                          </div>
                        </div>
                      </div>

                      {/* Audit Note / Execution Detail */}
                      {trade.notes && (
                        <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/50 rounded-lg px-2.5 py-1.5 border border-slate-800/60 flex items-start gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="font-mono">{trade.notes}</span>
                        </div>
                      )}

                      {/* Quick outcome changer */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-2 border-t border-slate-800/50 text-[10px] font-mono">
                        <span className="text-slate-500 mr-1">Ubah Status Manual:</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP1')}
                          className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
                        >
                          Hit TP1
                        </button>
                        {trade.takeProfit2 && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTradeStatus(trade.id, 'WIN', 'HIT_TP2')}
                            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
                          >
                            Hit TP2
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateTradeStatus(trade.id, 'LOSS', 'HIT_SL')}
                          className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                        >
                          Hit SL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTradeStatus(trade.id, 'BREAK_EVEN', 'BREAK_EVEN')}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                        >
                          BE
                        </button>
                        {isPending && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateTradeStatus(trade.id, 'OPEN', 'PENDING', getSpotPriceForTrade(trade) as number | undefined)}
                              className="px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition-colors font-semibold"
                            >
                              Eksekusi Sekarang (Set Open)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTradeStatus(trade.id, 'CANCELLED', 'MANUAL_CLOSE')}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                            >
                              Batalkan
                            </button>
                          </div>
                        )}
                        {!isOpen && !isPending && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTradeStatus(trade.id, 'OPEN', 'PENDING')}
                            className="px-2 py-0.5 rounded bg-sky-950/50 hover:bg-sky-900 text-sky-300 border border-sky-800 ml-auto transition-colors"
                          >
                            Buka Kembali (Set Open)
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Tab 3: Detailed Winrate Distribution & Quantitative Breakdown */}
      {activeTab === 'STATS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Breakdown by Symbol */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                WINRATE BERDASARKAN ASET
              </h5>

              <div className="space-y-2.5 text-xs font-mono">
                {/* XAUUSD */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-amber-300 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      XAU/USD (Gold)
                    </span>
                    <span className="text-emerald-400 text-sm">
                      {stats.winRateBySymbol.XAUUSD.winRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${stats.winRateBySymbol.XAUUSD.winRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>{stats.winRateBySymbol.XAUUSD.wins}W / {stats.winRateBySymbol.XAUUSD.losses}L</span>
                    <span className="text-emerald-400 font-semibold">+${stats.winRateBySymbol.XAUUSD.netPnlUsd}</span>
                  </div>
                </div>

                {/* EURUSD */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-300 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      EUR/USD (Forex)
                    </span>
                    <span className="text-emerald-400 text-sm">
                      {stats.winRateBySymbol.EURUSD.winRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-400 h-full rounded-full"
                      style={{ width: `${stats.winRateBySymbol.EURUSD.winRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>{stats.winRateBySymbol.EURUSD.wins}W / {stats.winRateBySymbol.EURUSD.losses}L</span>
                    <span className="text-emerald-400 font-semibold">+${stats.winRateBySymbol.EURUSD.netPnlUsd}</span>
                  </div>
                </div>

                {/* BTCUSD */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-orange-300 flex items-center gap-1">
                      <Bitcoin className="w-3.5 h-3.5 text-orange-400" />
                      BTC/USD (Crypto)
                    </span>
                    <span className="text-emerald-400 text-sm">
                      {stats.winRateBySymbol.BTCUSD.winRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full"
                      style={{ width: `${stats.winRateBySymbol.BTCUSD.winRate}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>{stats.winRateBySymbol.BTCUSD.wins}W / {stats.winRateBySymbol.BTCUSD.losses}L</span>
                    <span className="text-emerald-400 font-semibold">+${stats.winRateBySymbol.BTCUSD.netPnlUsd}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown by Timeframe */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                WINRATE BERDASARKAN TIMEFRAME
              </h5>

              <div className="space-y-2 text-xs font-mono">
                {(['1M', '5M', '15M', '30M', '1H'] as TimeframeType[]).map((tf) => {
                  const data = stats.winRateByTimeframe[tf];
                  return (
                    <div key={tf} className="flex items-center justify-between p-1.5 rounded bg-slate-900/40 border border-slate-800/60">
                      <span className="text-slate-300 font-semibold w-10">{tf}</span>
                      <div className="flex-1 mx-2 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${data.winRate}%` }}
                        />
                      </div>
                      <span className="text-amber-400 font-bold w-12 text-right">
                        {data.total > 0 ? `${data.winRate}%` : '-'}
                      </span>
                      <span className="text-[10px] text-slate-500 w-16 text-right">
                        ({data.wins}/{data.total})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown by Direction & Mathematical Expectancy */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                ARAH & EXPECTANCY TRADING
              </h5>

              <div className="space-y-2.5 text-xs font-mono">
                {/* BUY Setup */}
                <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    BUY (Long)
                  </span>
                  <span className="text-slate-200 font-bold">
                    {stats.winRateByDirection.BUY.winRate}% WR
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({stats.winRateByDirection.BUY.wins} Win / {stats.winRateByDirection.BUY.total} Trade)
                  </span>
                </div>

                {/* SELL Setup */}
                <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60 flex items-center justify-between">
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    SELL (Short)
                  </span>
                  <span className="text-slate-200 font-bold">
                    {stats.winRateByDirection.SELL.winRate}% WR
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({stats.winRateByDirection.SELL.wins} Win / {stats.winRateByDirection.SELL.total} Trade)
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    MATHEMATICAL EDGE AUDIT
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Dengan rata-rata R:R <strong className="text-slate-200">{stats.averageRR}</strong> dan Winrate <strong className="text-emerald-400">{stats.winRatePercent}%</strong>, strategi menghasilkan <em>Positive Mathematical Expectancy</em> yang konsisten di atas ambang batas 50% breakeven baseline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
