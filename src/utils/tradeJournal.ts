import {
  RecordedDecision,
  QuantAnalysisResult,
  TradeOutcomeStatus,
  TradeCloseReason,
  WinratePerformanceStats,
  DayTradeSummary,
  AssetSymbol,
  TimeframeType,
  LiveOpenPositionSituation,
} from '../types.ts';
import {
  getAccountSettings,
  calculateEffectiveLotSize,
  syncAccountBalanceWithJournal,
} from './accountSettings.ts';

const STORAGE_KEY = 'quant_trade_journal_v1';
const AUTO_RECORD_KEY = 'quant_auto_record_enabled_v1';

export function isAutoRecordEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(AUTO_RECORD_KEY);
  return stored !== null ? stored === 'true' : false;
}

export function setAutoRecordEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_RECORD_KEY, enabled ? 'true' : 'false');
}

/**
 * Formats full anti-bias timestamp with Day, Date, Month, Year, Hour, Minute, Second (WIB / Local)
 */
export function formatTradeTimestamp(dateInput: string | number | Date): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const datePart = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(d);

  return `${datePart} • ${timePart} WIB`;
}

/**
 * Formats duration between entry and exit timestamps (e.g. "18m 42d")
 */
export function formatTradeDuration(startInput: string | number | Date, endInput?: string | number | Date): string {
  const startMs = new Date(startInput).getTime();
  const endMs = endInput ? new Date(endInput).getTime() : Date.now();
  if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return '1 detik';

  const diffSec = Math.floor((endMs - startMs) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}d`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }
  return `${seconds} detik`;
}

const LEGACY_STORAGE_KEYS = [
  'quant_trade_journal_v1',
  'xauusd_ai_quant_journal_trades_v2',
  'xauusd_ai_quant_journal_trades',
  'quant_journal_backup_trades'
];

/**
 * Clean data policy: Initial state is clean empty array (0 trades).
 * No synthetic, mock, or benchmark trades.
 */
export const DEFAULT_SEED_TRADES: RecordedDecision[] = [];

/**
 * Detector for synthetic/dummy benchmark trades (e.g. TRD-20260902-01, TRD-20260904-02)
 */
export function isDummyBenchmarkTrade(trade: any): boolean {
  if (!trade || typeof trade !== 'object') return true;
  if (typeof trade.id === 'string' && /^TRD-202609\d{2}-\d{2}$/.test(trade.id)) {
    return true;
  }
  if (typeof trade.notes === 'string' && trade.notes.includes('Asian low $4,308.20')) {
    return true;
  }
  return false;
}

/**
 * Retrieve saved trades from localStorage.
 * Only returns genuine real-time trades; automatically purges any dummy benchmark seeds.
 */
export function getStoredTrades(): RecordedDecision[] {
  if (typeof window === 'undefined') return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    
    // Check legacy storage keys if primary key is empty
    if (!raw || raw === '[]') {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const found = localStorage.getItem(legacyKey);
        if (found && found !== '[]') {
          raw = found;
          localStorage.setItem(STORAGE_KEY, found);
          break;
        }
      }
    }

    if (!raw || raw === '[]') {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate that items are genuine real trades and strip any dummy benchmark data
      const valid = parsed
        .filter((t) => t && typeof t === 'object' && t.id && t.symbol && !isDummyBenchmarkTrade(t))
        .map((t) => {
          // USER MANDATE: Jangan pernah buka posisi (OPEN) jika harga belum menyentuh entry!
          // Migrasikan posisi lama yang salah status agar menjadi PENDING jika belum terjemput
          if (t.status === 'OPEN' && t.entryTriggered !== true) {
            return {
              ...t,
              status: 'PENDING' as TradeOutcomeStatus,
              entryTriggered: false,
            };
          }
          return t;
        });

      // If dummy items were filtered out, resave clean array
      if (valid.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        // Clean legacy storage as well
        for (const k of LEGACY_STORAGE_KEYS) {
          localStorage.removeItem(k);
        }
      }
      return valid;
    }

    return [];
  } catch (err) {
    console.error('Error loading stored trades:', err);
    return [];
  }
}

/**
 * Save trades to localStorage and persist to server
 */
export function saveStoredTrades(trades: RecordedDecision[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanOnly = trades.filter((t) => !isDummyBenchmarkTrade(t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanOnly));
    window.dispatchEvent(new CustomEvent('journal-updated', { detail: cleanOnly }));
    window.dispatchEvent(new Event('storage'));

    // Persistent server-side background save
    fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: cleanOnly }),
    }).catch((err) => {
      console.warn('[Storage] Background server save error:', err);
    });
  } catch (err) {
    console.error('Error saving trades:', err);
  }
}

/**
 * Synchronizes client trades with persistent server storage bidirectionally.
 * Merges trades by ID and ensures no trades are lost across sessions, tabs, or reloads.
 */
export async function syncTradesWithServerStorage(): Promise<RecordedDecision[]> {
  if (typeof window === 'undefined') return [];
  const localTrades = getStoredTrades();

  try {
    const res = await fetch('/api/trades/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: localTrades }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.trades)) {
        const cleanTrades = data.trades.filter((t: any) => !isDummyBenchmarkTrade(t));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanTrades));
        window.dispatchEvent(new CustomEvent('journal-updated', { detail: cleanTrades }));
        window.dispatchEvent(new Event('storage'));
        return cleanTrades;
      }
    }
  } catch (err) {
    console.warn('[Sync] Server trade sync network error:', err);
  }

  return localTrades;
}

/**
 * Clear all journal trades (murni 0 trade) on both local and server storage
 */
export function clearAllJournalTrades(): RecordedDecision[] {
  if (typeof window === 'undefined') return [];
  const empty: RecordedDecision[] = [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    window.dispatchEvent(new CustomEvent('journal-updated', { detail: empty }));
    window.dispatchEvent(new Event('storage'));

    // Clear server-side storage
    fetch('/api/trades/clear', { method: 'POST' }).catch((err) => {
      console.warn('[Storage] Server clear trades error:', err);
    });
  } catch (err) {
    console.error('Error clearing trades:', err);
  }
  return empty;
}

/**
 * Purges any dummy/mock records immediately
 */
export function purgeDummyTrades(): RecordedDecision[] {
  return clearAllJournalTrades();
}

/**
 * Formats price with correct decimal places for XAUUSD ($4,350.20), EURUSD (1.08500), and BTCUSD ($88,450.50)
 */
export function formatPriceBySymbol(val: number, symbol: AssetSymbol): string {
  if (symbol === 'EURUSD') {
    return val.toFixed(5);
  }
  if (symbol === 'BTCUSD') {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
  }
  return `$${val.toFixed(2)}`;
}

/**
 * Robust numeric price parser that handles currency strings like "$4,364.53",
 * prefixed strings like "TP1: $4,364.53 (+132 p)", and raw numbers without digit mangling.
 */
export function parseNumericPrice(val?: string | number | null): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val !== 'string') return 0;

  // Match currency or standard decimal numbers (e.g. $4,354.59 or 4354.59 or 1.14850)
  const match = val.match(/(?:\$|\b)([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/);
  if (!match) return 0;
  const clean = match[1].replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Records an AI Quantitative Decision into the user's trading journal.
 * Validates prices with anti-bias checks to prevent premature TP or SL triggers.
 */
export function recordDecisionFromAnalysis(
  result: QuantAnalysisResult,
  customPlanId?: 'PLAN_A' | 'PLAN_B' | 'PLAN_SCALP',
  isAuto = false,
  userLotSize?: number,
  userAccountBalance?: number
): RecordedDecision | null {
  if (!result || !result.tradeSetup) return null;

  const symbol = result.symbol || 'XAUUSD';
  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';
  const plans = result.tradeSetup.exactPlans || [];

  // Pick target plan: either user specified or default to Plan A / Plan Scalp
  let selectedPlan = plans.find((p) => p.planId === customPlanId);
  if (!selectedPlan) {
    selectedPlan = plans.find((p) => p.planId === 'PLAN_A') || plans[0];
  }

  if (!selectedPlan) return null;

  // Determine direction
  let direction: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (selectedPlan.type === 'BUY_SETUP') direction = 'BUY';
  else if (selectedPlan.type === 'SELL_SETUP') direction = 'SELL';
  else if (selectedPlan.decision.includes('LONG')) direction = 'BUY';
  else if (selectedPlan.decision.includes('SHORT')) direction = 'SELL';

  // Do not record pure "WAIT FOR CONFIRMATION" as open positions unless manually triggered
  if (direction === 'WAIT' && isAuto) {
    return null;
  }

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const tradeId = `TRD-${now.getTime().toString().slice(-8)}`;

  const entry = selectedPlan.entryExactNum || parseNumericPrice(selectedPlan.entryExactPrice);
  const rawSl = selectedPlan.stopLossNum || parseNumericPrice(selectedPlan.stopLossExact);
  // USER MANDATE: Maksimal lose nya di 20 pips untuk semua trade (1:1, 1:2, dan 1:3)
  const pipMultiplier = isEur ? 10000 : isBtc ? 0.1 : 10;
  const rawSlDist = Math.abs(entry - rawSl);
  const rawSlPips = Math.round(rawSlDist * pipMultiplier);
  const slDecimals = isEur ? 5 : isBtc ? 1 : 2;
  const sl = rawSlPips > 20
    ? (direction === 'BUY'
        ? Number((entry - 20 / pipMultiplier).toFixed(slDecimals))
        : Number((entry + 20 / pipMultiplier).toFixed(slDecimals)))
    : rawSl;

  const tp1 = selectedPlan.takeProfit1Num || parseNumericPrice(selectedPlan.takeProfit1);
  const tp2 = selectedPlan.takeProfit2Num || parseNumericPrice(selectedPlan.takeProfit2);
  const tp3 = selectedPlan.takeProfit3Num || parseNumericPrice(selectedPlan.takeProfit3);

  const formatPrice = (val: number) => formatPriceBySymbol(val, symbol);

  // Avoid recording identical trade if generated within the last 5 minutes
  const existing = getStoredTrades();
  const isRecentDuplicate = existing.some((t) => {
    const timeDiff = now.getTime() - new Date(t.timestamp).getTime();
    return (
      timeDiff < 3 * 60 * 1000 &&
      t.symbol === symbol &&
      t.timeframe === result.timeframe &&
      t.direction === direction &&
      Math.abs(t.entryPrice - entry) < (isEur ? 0.0005 : isBtc ? 30 : 2.0)
    );
  });

  if (isRecentDuplicate) {
    return null;
  }

  // Cek harga spot pasar saat rekaman keputusan dibuat
  const activeSpot =
    result.snapshot?.priceStats?.exactPrice ||
    parseNumericPrice(result.snapshot?.price) ||
    0;

  // USER MANDATE: JANGAN NGACO BUKA POSISI (OPEN) JIKA HARGA BELUM NYENTUH ENTRY!
  // Posisi HANYA boleh berstatus 'OPEN' jika harga spot nyata sudah menyentuh / crossing titik entry:
  // - BUY: harga spot sudah turun menyentuh level entry (activeSpot <= entry) atau tepat di harga market
  // - SELL: harga spot sudah naik menyentuh level entry (activeSpot >= entry) atau tepat di harga market
  // Jika harga belum menyentuh, status WAJIB 'PENDING' (menunggu jemputan harga)
  let isEntryTouched = false;
  if (activeSpot > 0) {
    const isAtImmediateMarket = Math.abs(activeSpot - entry) <= (isEur ? 0.00015 : isBtc ? 5.0 : 0.20);
    if (direction === 'BUY') {
      isEntryTouched = activeSpot <= entry || isAtImmediateMarket;
    } else if (direction === 'SELL') {
      isEntryTouched = activeSpot >= entry || isAtImmediateMarket;
    }
  }

  const initialStatus: TradeOutcomeStatus = isEntryTouched ? 'OPEN' : 'PENDING';

  const newDecision: RecordedDecision = {
    id: tradeId,
    timestamp: now.toISOString(),
    timestampFormatted: formatTradeTimestamp(now),
    dateKey,
    symbol,
    timeframe: result.timeframe,
    direction,
    planId: selectedPlan.planId,
    planTitle: selectedPlan.title || `${symbol} ${direction} (${result.timeframe})`,
    orderType: selectedPlan.orderType || (direction === 'BUY' ? 'Buy Limit' : 'Sell Limit'),
    entryPrice: entry,
    entryPriceFormatted: formatPrice(entry),
    stopLoss: sl,
    stopLossFormatted: formatPrice(sl),
    takeProfit1: tp1,
    takeProfit1Formatted: formatPrice(tp1),
    takeProfit2: tp2 > 0 ? tp2 : undefined,
    takeProfit2Formatted: tp2 > 0 ? formatPrice(tp2) : undefined,
    takeProfit3: tp3 > 0 ? tp3 : undefined,
    takeProfit3Formatted: tp3 > 0 ? formatPrice(tp3) : undefined,
    projectedRR: selectedPlan.rrRatio || '1:2.0',
    setupQuality: result.decision?.setupQuality || 8.0,
    status: initialStatus,
    outcomeReason: 'PENDING',
    pipsGained: 0,
    pnlPercent: 0,
    pnlUsd: 0,
    lotSize: userLotSize && userLotSize > 0
      ? Number(userLotSize.toFixed(2))
      : (() => {
          try {
            const sett = getAccountSettings();
            return calculateEffectiveLotSize(sett, 20, symbol).lotSize;
          } catch {
            return 0.01;
          }
        })(),
    notes: isEntryTouched
      ? `${selectedPlan.triggerCondition || 'Decision-support structure trigger'} [Order LANGSUNG TERJEMPUT @ spot ${formatPrice(activeSpot)}] (Modal: $${userAccountBalance || getAccountSettings().balance || 2500})`
      : `${selectedPlan.triggerCondition || 'Decision-support structure trigger'} [Order PENDING: Menunggu harga pasar menyentuh level ${formatPrice(entry)}] (Modal: $${userAccountBalance || getAccountSettings().balance || 2500})`,
    autoRecorded: isAuto,
    entryTriggered: isEntryTouched,
    entryTriggeredTimestamp: isEntryTouched ? now.toISOString() : undefined,
    entryTriggeredTimestampFormatted: isEntryTouched ? formatTradeTimestamp(now) : undefined,
  };

  const updatedList = [newDecision, ...existing];
  saveStoredTrades(updatedList);
  return newDecision;
}

/**
 * Updates a trade outcome manually or systematically
 */
export function updateTradeStatus(
  tradeId: string,
  newStatus: TradeOutcomeStatus,
  outcomeReason?: TradeCloseReason,
  customExitPrice?: number,
  notes?: string
): RecordedDecision[] {
  const trades = getStoredTrades();
  const index = trades.findIndex((t) => t.id === tradeId);
  if (index === -1) return trades;

  const trade = { ...trades[index] };
  const isEur = trade.symbol === 'EURUSD';
  const pipMultiplier = isEur ? 10000 : 10;
  const contractSize = isEur ? 100000 : 100;

  trade.status = newStatus;
  trade.outcomeReason = outcomeReason || (newStatus === 'WIN' ? 'HIT_TP1' : newStatus === 'LOSS' ? 'HIT_SL' : newStatus === 'CANCELLED' ? 'MANUAL_CLOSE' : 'BREAK_EVEN');

  if (newStatus !== 'OPEN' && newStatus !== 'PENDING') {
    const closedDate = new Date();
    trade.closedTimestamp = closedDate.toISOString();
    trade.closedTimestampFormatted = formatTradeTimestamp(closedDate);
    trade.durationFormatted = formatTradeDuration(trade.timestamp, closedDate);
  } else {
    trade.closedTimestamp = undefined;
    trade.closedTimestampFormatted = undefined;
    trade.durationFormatted = undefined;
  }

  // Jika trade diubah menjadi OPEN (misal user klik masuk market sekarang)
  if (newStatus === 'OPEN') {
    trade.entryTriggered = true;
    if (!trade.entryTriggeredTimestamp) {
      const nowDate = new Date();
      trade.entryTriggeredTimestamp = nowDate.toISOString();
      trade.entryTriggeredTimestampFormatted = formatTradeTimestamp(nowDate);
    }
    if (customExitPrice !== undefined && customExitPrice > 0) {
      trade.entryPrice = customExitPrice;
      trade.entryPriceFormatted = isEur ? customExitPrice.toFixed(5) : `$${customExitPrice.toFixed(2)}`;
    }
  }

  // Jika dibatalkan (order cancelled)
  if (newStatus === 'CANCELLED') {
    trade.pipsGained = 0;
    trade.pnlPercent = 0;
    trade.pnlUsd = 0;
    trade.exitPrice = trade.entryPrice;
    trade.exitPriceFormatted = trade.entryPriceFormatted;
    if (notes !== undefined) {
      trade.notes = notes;
    }
    trades[index] = trade;
    saveStoredTrades(trades);
    return trades;
  }

  let exit = customExitPrice;
  if (exit === undefined) {
    if (newStatus === 'WIN') {
      exit = trade.outcomeReason === 'HIT_TP2' && trade.takeProfit2 ? trade.takeProfit2 : trade.takeProfit1;
    } else if (newStatus === 'LOSS') {
      exit = trade.stopLoss;
    } else {
      exit = trade.entryPrice;
    }
  }

  trade.exitPrice = exit;
  trade.exitPriceFormatted = isEur ? exit.toFixed(5) : `$${exit.toFixed(2)}`;

  if (newStatus === 'WIN') {
    const diff = trade.direction === 'BUY' ? exit - trade.entryPrice : trade.entryPrice - exit;
    const pips = Math.round(Math.max(1, diff * pipMultiplier));
    trade.pipsGained = pips;
    trade.pnlPercent = trade.outcomeReason === 'HIT_TP2' ? 3.0 : 2.0;
    trade.pnlUsd = Number((trade.lotSize * diff * contractSize).toFixed(2));
  } else if (newStatus === 'LOSS') {
    const diff = trade.direction === 'BUY' ? trade.entryPrice - exit : exit - trade.entryPrice;
    const pips = -Math.round(Math.max(1, diff * pipMultiplier));
    trade.pipsGained = pips;
    trade.pnlPercent = -1.0;
    trade.pnlUsd = -Number((trade.lotSize * Math.abs(diff) * contractSize).toFixed(2));
  } else {
    // BREAK_EVEN or OPEN
    trade.pipsGained = 0;
    trade.pnlPercent = 0;
    trade.pnlUsd = 0;
  }

  if (notes !== undefined) {
    trade.notes = notes;
  }

  trades[index] = trade;
  saveStoredTrades(trades);

  // Auto-compounding: Update global balance based on total closed net PnL
  try {
    const totalNetPnl = trades
      .filter((t) => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAK_EVEN')
      .reduce((acc, t) => acc + (t.pnlUsd || 0), 0);
    syncAccountBalanceWithJournal(totalNetPnl);
  } catch (err) {
    console.warn('[Compounding] Auto sync balance error:', err);
  }

  return trades;
}

/**
 * Delete a specific trade record
 */
export function deleteTrade(tradeId: string): RecordedDecision[] {
  const trades = getStoredTrades().filter((t) => t.id !== tradeId);
  saveStoredTrades(trades);
  return trades;
}

/**
 * Calculate comprehensive winrate and performance statistics
 */
export function calculateWinrateStats(trades: RecordedDecision[]): WinratePerformanceStats {
  const closed = trades.filter((t) => t.status === 'WIN' || t.status === 'LOSS' || t.status === 'BREAK_EVEN');
  const open = trades.filter((t) => t.status === 'OPEN');
  const wins = trades.filter((t) => t.status === 'WIN');
  const losses = trades.filter((t) => t.status === 'LOSS');
  const breakEvens = trades.filter((t) => t.status === 'BREAK_EVEN');

  const totalDecisive = wins.length + losses.length;
  const winRatePercent = totalDecisive > 0 ? Number(((wins.length / totalDecisive) * 100).toFixed(1)) : 0;
  const lossRatePercent = totalDecisive > 0 ? Number(((losses.length / totalDecisive) * 100).toFixed(1)) : 0;

  const netPnlUsd = Number(closed.reduce((acc, t) => acc + (t.pnlUsd || 0), 0).toFixed(2));
  const netPnlPercent = Number(closed.reduce((acc, t) => acc + (t.pnlPercent || 0), 0).toFixed(1));
  const netPips = closed.reduce((acc, t) => acc + (t.pipsGained || 0), 0);

  const grossProfits = wins.reduce((acc, t) => acc + (t.pnlUsd > 0 ? t.pnlUsd : 0), 0);
  const grossLosses = Math.abs(losses.reduce((acc, t) => acc + (t.pnlUsd < 0 ? t.pnlUsd : 0), 0));
  const profitFactor = grossLosses > 0 ? Number((grossProfits / grossLosses).toFixed(2)) : grossProfits > 0 ? 9.99 : 0;

  // Average projected RR
  let totalRR = 0;
  let rrCount = 0;
  closed.forEach((t) => {
    if (t.projectedRR) {
      const match = t.projectedRR.match(/1:([0-9.]+)/);
      if (match && match[1]) {
        totalRR += parseFloat(match[1]);
        rrCount++;
      }
    }
  });
  const avgRRValue = rrCount > 0 ? (totalRR / rrCount).toFixed(1) : '0.0';
  const averageRR = rrCount > 0 ? `1:${avgRRValue}` : '-';

  // Streak calculation (chronological)
  const sorted = [...closed].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let bestStreak = 0;
  let currentStreakCount = 0;
  let currentStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';

  sorted.forEach((t) => {
    if (t.status === 'WIN') {
      if (currentStreakType === 'WIN') {
        currentStreakCount++;
      } else {
        currentStreakType = 'WIN';
        currentStreakCount = 1;
      }
      if (currentStreakCount > bestStreak) bestStreak = currentStreakCount;
    } else if (t.status === 'LOSS') {
      if (currentStreakType === 'LOSS') {
        currentStreakCount++;
      } else {
        currentStreakType = 'LOSS';
        currentStreakCount = 1;
      }
    }
  });

  // By Symbol
  const xauTrades = closed.filter((t) => t.symbol === 'XAUUSD');
  const xauWins = xauTrades.filter((t) => t.status === 'WIN').length;
  const xauLosses = xauTrades.filter((t) => t.status === 'LOSS').length;
  const xauTotal = xauWins + xauLosses;

  const eurTrades = closed.filter((t) => t.symbol === 'EURUSD');
  const eurWins = eurTrades.filter((t) => t.status === 'WIN').length;
  const eurLosses = eurTrades.filter((t) => t.status === 'LOSS').length;
  const eurTotal = eurWins + eurLosses;

  const btcTrades = closed.filter((t) => t.symbol === 'BTCUSD');
  const btcWins = btcTrades.filter((t) => t.status === 'WIN').length;
  const btcLosses = btcTrades.filter((t) => t.status === 'LOSS').length;
  const btcTotal = btcWins + btcLosses;

  // By Timeframe
  const timeframes: TimeframeType[] = ['1M', '5M', '15M', '30M', '1H'];
  const winRateByTimeframe: Record<TimeframeType, { total: number; wins: number; winRate: number }> = {
    '1M': { total: 0, wins: 0, winRate: 0 },
    '5M': { total: 0, wins: 0, winRate: 0 },
    '15M': { total: 0, wins: 0, winRate: 0 },
    '30M': { total: 0, wins: 0, winRate: 0 },
    '1H': { total: 0, wins: 0, winRate: 0 },
  };

  timeframes.forEach((tf) => {
    const tfTrades = closed.filter((t) => t.timeframe === tf && (t.status === 'WIN' || t.status === 'LOSS'));
    const tfWins = tfTrades.filter((t) => t.status === 'WIN').length;
    winRateByTimeframe[tf] = {
      total: tfTrades.length,
      wins: tfWins,
      winRate: tfTrades.length > 0 ? Number(((tfWins / tfTrades.length) * 100).toFixed(1)) : 0,
    };
  });

  // By Direction
  const buyTrades = closed.filter((t) => t.direction === 'BUY' && (t.status === 'WIN' || t.status === 'LOSS'));
  const buyWins = buyTrades.filter((t) => t.status === 'WIN').length;
  const sellTrades = closed.filter((t) => t.direction === 'SELL' && (t.status === 'WIN' || t.status === 'LOSS'));
  const sellWins = sellTrades.filter((t) => t.status === 'WIN').length;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: open.length,
    wins: wins.length,
    losses: losses.length,
    breakEvens: breakEvens.length,
    winRatePercent,
    lossRatePercent,
    netPnlUsd,
    netPnlPercent,
    netPips,
    profitFactor,
    averageRR,
    bestWinStreak: bestStreak,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    winRateBySymbol: {
      XAUUSD: {
        total: xauTrades.length,
        wins: xauWins,
        losses: xauLosses,
        winRate: xauTotal > 0 ? Number(((xauWins / xauTotal) * 100).toFixed(1)) : 0,
        netPnlUsd: Number(xauTrades.reduce((a, b) => a + (b.pnlUsd || 0), 0).toFixed(2)),
      },
      EURUSD: {
        total: eurTrades.length,
        wins: eurWins,
        losses: eurLosses,
        winRate: eurTotal > 0 ? Number(((eurWins / eurTotal) * 100).toFixed(1)) : 0,
        netPnlUsd: Number(eurTrades.reduce((a, b) => a + (b.pnlUsd || 0), 0).toFixed(2)),
      },
      BTCUSD: {
        total: btcTrades.length,
        wins: btcWins,
        losses: btcLosses,
        winRate: btcTotal > 0 ? Number(((btcWins / btcTotal) * 100).toFixed(1)) : 0,
        netPnlUsd: Number(btcTrades.reduce((a, b) => a + (b.pnlUsd || 0), 0).toFixed(2)),
      },
    },
    winRateByTimeframe,
    winRateByDirection: {
      BUY: {
        total: buyTrades.length,
        wins: buyWins,
        winRate: buyTrades.length > 0 ? Number(((buyWins / buyTrades.length) * 100).toFixed(1)) : 0,
      },
      SELL: {
        total: sellTrades.length,
        wins: sellWins,
        winRate: sellTrades.length > 0 ? Number(((sellWins / sellTrades.length) * 100).toFixed(1)) : 0,
      },
    },
  };
}

/**
 * Group trades by day (dateKey: YYYY-MM-DD) for Trade Calendar
 */
export function getDayTradeSummaries(trades: RecordedDecision[]): Map<string, DayTradeSummary> {
  const map = new Map<string, DayTradeSummary>();

  trades.forEach((trade) => {
    let day = map.get(trade.dateKey);
    if (!day) {
      day = {
        dateKey: trade.dateKey,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        breakEvens: 0,
        openTrades: 0,
        netPnlUsd: 0,
        netPnlPercent: 0,
        netPips: 0,
        winRate: 0,
        trades: [],
      };
      map.set(trade.dateKey, day);
    }

    day.totalTrades++;
    day.trades.push(trade);

    if (trade.status === 'WIN') day.wins++;
    else if (trade.status === 'LOSS') day.losses++;
    else if (trade.status === 'BREAK_EVEN') day.breakEvens++;
    else if (trade.status === 'OPEN') day.openTrades++;

    day.netPnlUsd += trade.pnlUsd || 0;
    day.netPnlPercent += trade.pnlPercent || 0;
    day.netPips += trade.pipsGained || 0;
  });

  // Calculate day winrate
  map.forEach((day) => {
    const decisive = day.wins + day.losses;
    day.winRate = decisive > 0 ? Number(((day.wins / decisive) * 100).toFixed(1)) : 0;
    day.netPnlUsd = Number(day.netPnlUsd.toFixed(2));
    day.netPnlPercent = Number(day.netPnlPercent.toFixed(1));
  });

  return map;
}

/**
 * Evaluates open trades against the current spot price to test if TP or SL was touched.
 * Incorporates strict anti-bias rules:
 * 1. Limit orders must be filled (touched entry price) before any TP/SL can trigger.
 * 2. Recent trades (< 60s) cannot immediately trigger TP/SL to prevent premature execution artifacts.
 * 3. Exact timestamps (Day, Date, Hour, Minute, Second WIB) and durations are attached.
 */
export function evaluateOpenTradesAgainstSpotPrice(
  trades: RecordedDecision[],
  currentSpotPrice: number,
  symbol: AssetSymbol
): { updatedTrades: RecordedDecision[]; changedCount: number } {
  let changedCount = 0;
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const nowFormatted = formatTradeTimestamp(now);

  const updatedTrades = trades.map((t) => {
    // Hanya evaluasi trade OPEN atau PENDING pada simbol yang sesuai
    if ((t.status !== 'OPEN' && t.status !== 'PENDING') || t.symbol !== symbol) return t;

    const isEur = symbol === 'EURUSD';
    const isBtc = symbol === 'BTCUSD';
    const pipMultiplier = isEur ? 10000 : isBtc ? 0.1 : 10;
    const contractSize = isEur ? 100000 : isBtc ? 1 : 100;

    const tradeTimeMs = new Date(t.timestamp).getTime();
    // Anti-Premature: Allow at least 45 seconds of real-time market movement
    if (nowMs - tradeTimeMs < 45 * 1000) {
      return t;
    }

    let entryFilled = t.entryTriggered === true;
    let entryFilledTime = t.entryTriggeredTimestamp;
    let entryFilledTimeFormatted = t.entryTriggeredTimestampFormatted;

    // USER MANDATE: JANGAN NGACO BUKA POSISI (OPEN) JIKA HARGA BELUM NYENTUH!
    // Cek apakah order sudah benar-benar disentuh / terjemput oleh harga spot live
    if (!entryFilled) {
      const isBuyTouched = t.direction === 'BUY' && currentSpotPrice <= t.entryPrice;
      const isSellTouched = t.direction === 'SELL' && currentSpotPrice >= t.entryPrice;

      if (isBuyTouched || isSellTouched) {
        entryFilled = true;
        entryFilledTime = nowIso;
        entryFilledTimeFormatted = nowFormatted;
        changedCount++;
        // Order baru saja tersentuh pada tick ini! Buka status menjadi OPEN dan mulai running
        return {
          ...t,
          status: 'OPEN' as TradeOutcomeStatus,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted,
          notes: `${t.notes || ''} [Order TERJEMPUT pada ${nowFormatted} @ harga spot ${formatPriceBySymbol(currentSpotPrice, symbol)}]`,
        };
      } else {
        // Harga spot BELUM menyentuh titik entry! Order tetap PENDING dalam antrian, DILARANG trigger TP/SL
        if (t.status !== 'PENDING') {
          changedCount++;
          return { ...t, status: 'PENDING' as TradeOutcomeStatus, entryTriggered: false };
        }
        return t;
      }
    }

    // Hitung floating pips saat ini
    const rawFloatingPips = t.direction === 'BUY'
      ? (currentSpotPrice - t.entryPrice) * pipMultiplier
      : (t.entryPrice - currentSpotPrice) * pipMultiplier;
    const floatingPips = Number(rawFloatingPips.toFixed(1));

    // Update High Watermark (puncak pips floating)
    const prevHighestPips = t.highestFloatingPips || 0;
    const currentHighPips = Math.max(prevHighestPips, floatingPips > 0 ? floatingPips : 0);
    if (currentHighPips > prevHighestPips) {
      t.highestFloatingPips = currentHighPips;
    }

    // USER REQUIREMENT:
    // "pasang trailing stop dengan selisih 50% dari kenaikan pips yang sedang floating,
    // dengan syarat minimal kenaikan di 10 pips, baru pasang trailing yang maju terus sampe ke titik tp."
    const isTrailingEligible = currentHighPips >= 10.0;
    const trailingPipsLocked = isTrailingEligible
      ? Math.floor(currentHighPips * 0.5 * 10) / 10 // Kunci 50% dari kenaikan tertinggi
      : 0;

    let trailingPrice: number | undefined;
    if (isTrailingEligible) {
      trailingPrice = t.direction === 'BUY'
        ? Number((t.entryPrice + trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2))
        : Number((t.entryPrice - trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2));
      
      t.isTrailingActive = true;
      t.trailingStopPrice = trailingPrice;
      t.trailingStopPriceFormatted = formatPriceBySymbol(trailingPrice, symbol);
      t.trailingStopPipsLocked = trailingPipsLocked;
    }

    // Check long trade
    if (t.direction === 'BUY') {
      // 1. Check Trailing Stop first (jika sudah aktif & disentuh harga saat retrace)
      if (isTrailingEligible && trailingPrice !== undefined && currentSpotPrice <= trailingPrice) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        const exitPriceFormatted = formatPriceBySymbol(trailingPrice, symbol);
        const pnlUsd = Number((t.lotSize * (trailingPrice - t.entryPrice) * contractSize).toFixed(2));
        const pnlPercent = Number(((trailingPipsLocked / 20) * 1.0).toFixed(1));

        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'WIN' as TradeOutcomeStatus,
          outcomeReason: 'HIT_TRAILING_STOP' as TradeCloseReason,
          exitPrice: trailingPrice,
          exitPriceFormatted,
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: trailingPipsLocked,
          pnlPercent,
          pnlUsd,
          isTrailingActive: true,
          trailingStopPrice: trailingPrice,
          trailingStopPriceFormatted: exitPriceFormatted,
          trailingStopPipsLocked: trailingPipsLocked,
          highestFloatingPips: currentHighPips,
          notes: `${t.notes || ''} [Trailing Stop 50% (+${trailingPipsLocked}p terkunci dari peak +${currentHighPips}p) Tersentuh @ ${exitPriceFormatted} - Profit Terkunci Aman!]`,
        };
      }

      // 2. Check Stop Loss (hanya jika trailing stop belum aktif)
      if (!isTrailingEligible && t.stopLoss && t.stopLoss > 0 && currentSpotPrice <= t.stopLoss) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'LOSS' as TradeOutcomeStatus,
          outcomeReason: 'HIT_SL' as TradeCloseReason,
          exitPrice: t.stopLoss,
          exitPriceFormatted: formatPriceBySymbol(t.stopLoss, symbol),
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: -Math.abs(Math.round((t.entryPrice - t.stopLoss) * pipMultiplier)),
          pnlPercent: -1.0,
          pnlUsd: -Number((t.lotSize * (t.entryPrice - t.stopLoss) * contractSize).toFixed(2)),
          notes: `${t.notes || ''} [Stop Loss tersentuh pada ${nowFormatted} @ harga spot ${formatPriceBySymbol(currentSpotPrice, symbol)}]`,
        };
      }

      // 3. Check Take Profit (TP2 & TP1)
      if (t.takeProfit1 && t.takeProfit1 > 0 && currentSpotPrice >= t.takeProfit1) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        const hitTp2 = Boolean(t.takeProfit2 && t.takeProfit2 > 0 && currentSpotPrice >= t.takeProfit2);
        const exitTarget = hitTp2 && t.takeProfit2 ? t.takeProfit2 : t.takeProfit1;
        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'WIN' as TradeOutcomeStatus,
          outcomeReason: (hitTp2 ? 'HIT_TP2' : 'HIT_TP1') as TradeCloseReason,
          exitPrice: currentSpotPrice,
          exitPriceFormatted: formatPriceBySymbol(currentSpotPrice, symbol),
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: Math.abs(Math.round((exitTarget - t.entryPrice) * pipMultiplier)),
          pnlPercent: hitTp2 ? 3.0 : 2.0,
          pnlUsd: Number((t.lotSize * (exitTarget - t.entryPrice) * contractSize).toFixed(2)),
          notes: `${t.notes || ''} [Take Profit (${hitTp2 ? 'TP2' : 'TP1'}) tersentuh pada ${nowFormatted} @ harga spot ${formatPriceBySymbol(currentSpotPrice, symbol)}]`,
        };
      }
    }

    // Check short trade
    if (t.direction === 'SELL') {
      // 1. Check Trailing Stop first (jika sudah aktif & disentuh harga saat retrace)
      if (isTrailingEligible && trailingPrice !== undefined && currentSpotPrice >= trailingPrice) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        const exitPriceFormatted = formatPriceBySymbol(trailingPrice, symbol);
        const pnlUsd = Number((t.lotSize * (t.entryPrice - trailingPrice) * contractSize).toFixed(2));
        const pnlPercent = Number(((trailingPipsLocked / 20) * 1.0).toFixed(1));

        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'WIN' as TradeOutcomeStatus,
          outcomeReason: 'HIT_TRAILING_STOP' as TradeCloseReason,
          exitPrice: trailingPrice,
          exitPriceFormatted,
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: trailingPipsLocked,
          pnlPercent,
          pnlUsd,
          isTrailingActive: true,
          trailingStopPrice: trailingPrice,
          trailingStopPriceFormatted: exitPriceFormatted,
          trailingStopPipsLocked: trailingPipsLocked,
          highestFloatingPips: currentHighPips,
          notes: `${t.notes || ''} [Trailing Stop 50% (+${trailingPipsLocked}p terkunci dari peak +${currentHighPips}p) Tersentuh @ ${exitPriceFormatted} - Profit Terkunci Aman!]`,
        };
      }

      // 2. Check Stop Loss (hanya jika trailing stop belum aktif)
      if (!isTrailingEligible && t.stopLoss && t.stopLoss > 0 && currentSpotPrice >= t.stopLoss) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'LOSS' as TradeOutcomeStatus,
          outcomeReason: 'HIT_SL' as TradeCloseReason,
          exitPrice: t.stopLoss,
          exitPriceFormatted: formatPriceBySymbol(t.stopLoss, symbol),
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: -Math.abs(Math.round((t.stopLoss - t.entryPrice) * pipMultiplier)),
          pnlPercent: -1.0,
          pnlUsd: -Number((t.lotSize * (t.stopLoss - t.entryPrice) * contractSize).toFixed(2)),
          notes: `${t.notes || ''} [Stop Loss tersentuh pada ${nowFormatted} @ harga spot ${formatPriceBySymbol(currentSpotPrice, symbol)}]`,
        };
      }

      // 3. Check Take Profit (TP2 & TP1)
      if (t.takeProfit1 && t.takeProfit1 > 0 && currentSpotPrice <= t.takeProfit1) {
        changedCount++;
        const durationFormatted = formatTradeDuration(t.timestamp, now);
        const hitTp2 = Boolean(t.takeProfit2 && t.takeProfit2 > 0 && currentSpotPrice <= t.takeProfit2);
        const exitTarget = hitTp2 && t.takeProfit2 ? t.takeProfit2 : t.takeProfit1;
        return {
          ...t,
          entryTriggered: true,
          entryTriggeredTimestamp: entryFilledTime || t.timestamp,
          entryTriggeredTimestampFormatted: entryFilledTimeFormatted || t.timestampFormatted,
          status: 'WIN' as TradeOutcomeStatus,
          outcomeReason: (hitTp2 ? 'HIT_TP2' : 'HIT_TP1') as TradeCloseReason,
          exitPrice: currentSpotPrice,
          exitPriceFormatted: formatPriceBySymbol(currentSpotPrice, symbol),
          closedTimestamp: nowIso,
          closedTimestampFormatted: nowFormatted,
          durationFormatted,
          pipsGained: Math.abs(Math.round((t.entryPrice - exitTarget) * pipMultiplier)),
          pnlPercent: hitTp2 ? 3.0 : 2.0,
          pnlUsd: Number((t.lotSize * (t.entryPrice - exitTarget) * contractSize).toFixed(2)),
          notes: `${t.notes || ''} [Take Profit (${hitTp2 ? 'TP2' : 'TP1'}) tersentuh pada ${nowFormatted} @ harga spot ${formatPriceBySymbol(currentSpotPrice, symbol)}]`,
        };
      }
    }

    if (entryFilled && !t.entryTriggered) {
      return {
        ...t,
        entryTriggered: true,
        entryTriggeredTimestamp: entryFilledTime,
        entryTriggeredTimestampFormatted: entryFilledTimeFormatted,
      };
    }

    return t;
  });

  if (changedCount > 0) {
    saveStoredTrades(updatedTrades);
  }

  return { updatedTrades, changedCount };
}

/**
 * Auto-Sync / Offline Recovery:
 * Evaluates all OPEN trades against full historical candlestick High/Low
 * from the market server.
 * This ensures trades that hit TP or SL while the user's laptop was closed/off
 * are accurately recognized and recorded as WIN/LOSS according to the actual exchange candles.
 */
export async function syncTradesWithCandleHistoryApi(): Promise<{
  updatedTrades: RecordedDecision[];
  resolvedCount: number;
  details: any[];
}> {
  const currentTrades = getStoredTrades();
  const openTrades = currentTrades.filter((t) => t.status === 'OPEN');
  if (openTrades.length === 0) {
    return { updatedTrades: currentTrades, resolvedCount: 0, details: [] };
  }

  try {
    const res = await fetch('/api/sync-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: currentTrades }),
    });

    if (!res.ok) {
      throw new Error(`Sync request failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.updatedTrades)) {
      if (data.resolvedCount > 0) {
        saveStoredTrades(data.updatedTrades);
      }
      return {
        updatedTrades: data.updatedTrades,
        resolvedCount: data.resolvedCount || 0,
        details: data.details || [],
      };
    }
  } catch (err) {
    console.warn('[Sync] Offline candle history sync error:', err);
  }

  return { updatedTrades: currentTrades, resolvedCount: 0, details: [] };
}

/**
 * Calculates live open trade situation: exact pips moved (Naik / Turun),
 * floating profit / drawdown, dollar PnL, distance to TP1, safety buffer to SL,
 * and visual range gauge percentage.
 */
export function calculateLivePositionSituation(
  trade: RecordedDecision,
  rawSpotPrice: number | string | undefined
): LiveOpenPositionSituation | null {
  const currentSpotPrice = parseNumericPrice(rawSpotPrice);
  if (!currentSpotPrice || currentSpotPrice <= 0 || !trade.entryPrice || trade.entryPrice <= 0) {
    return null;
  }

  const isEur = trade.symbol === 'EURUSD';
  const isBtc = trade.symbol === 'BTCUSD';
  const pipMultiplier = isEur ? 10000 : isBtc ? 0.1 : 10;
  const contractSize = isEur ? 100000 : isBtc ? 1 : 100;
  const currentPriceFormatted = formatPriceBySymbol(currentSpotPrice, trade.symbol);

  let isTriggered = trade.entryTriggered === true;

  // USER MANDATE: Cek apakah harga spot sudah menyentuh / crossing titik entry
  let pipsUntilFill: number | undefined;
  if (!isTriggered) {
    if (trade.direction === 'BUY') {
      if (currentSpotPrice <= trade.entryPrice) {
        isTriggered = true;
      } else {
        pipsUntilFill = Number(((currentSpotPrice - trade.entryPrice) * pipMultiplier).toFixed(1));
      }
    } else if (trade.direction === 'SELL') {
      if (currentSpotPrice >= trade.entryPrice) {
        isTriggered = true;
      } else {
        pipsUntilFill = Number(((trade.entryPrice - currentSpotPrice) * pipMultiplier).toFixed(1));
      }
    }
  }

  // 1. Nominal price change from Entry (Naik / Turun)
  const priceMovementPoints = currentSpotPrice - trade.entryPrice;
  const rawPriceMovementPips = priceMovementPoints * pipMultiplier;
  const priceMovementPips = Number(rawPriceMovementPips.toFixed(1));

  let priceDirection: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
  let priceDirectionText = '0.0 pips (Di Titik Entry)';
  if (priceMovementPips > 0.05) {
    priceDirection = 'UP';
    priceDirectionText = `Naik +${priceMovementPips} pips (${isEur ? `+${priceMovementPoints.toFixed(5)}` : `+$${priceMovementPoints.toFixed(2)}`})`;
  } else if (priceMovementPips < -0.05) {
    priceDirection = 'DOWN';
    priceDirectionText = `Turun ${priceMovementPips} pips (${isEur ? `${priceMovementPoints.toFixed(5)}` : `-$${Math.abs(priceMovementPoints).toFixed(2)}`})`;
  }

  // 2. Direction-aware floating PnL (Pips & USD)
  // JIKA BELUM TERJEMPUT: Floating PnL adalah 0 (tidak ada posisi terbuka di pasar)
  const rawFloatingPips = !isTriggered
    ? 0
    : trade.direction === 'BUY'
    ? (currentSpotPrice - trade.entryPrice) * pipMultiplier
    : (trade.entryPrice - currentSpotPrice) * pipMultiplier;
  const floatingPips = Number(rawFloatingPips.toFixed(1));

  const isFloatingProfit = isTriggered && floatingPips > 0.05;
  const isFloatingDrawdown = isTriggered && floatingPips < -0.05;
  const isBreakeven = isTriggered && !isFloatingProfit && !isFloatingDrawdown;

  const floatingStatusText = !isTriggered
    ? `ORDER PENDING (Menunggu Jemputan ${pipsUntilFill !== undefined ? `Sisa ${pipsUntilFill}p` : ''})`
    : isFloatingProfit
    ? `FLOATING PROFIT (+${floatingPips} pips)`
    : isFloatingDrawdown
    ? `FLOATING DRAWDOWN (${floatingPips} pips)`
    : `AT BREAKEVEN (0.0 pips)`;

  const floatingPipsFormatted = !isTriggered
    ? '0.0 pips (Order Pending)'
    : floatingPips > 0 ? `+${floatingPips} pips` : `${floatingPips} pips`;

  // Dollar PnL: standard 1 lot XAUUSD = 100 oz, EURUSD = 100,000 units, BTCUSD = 1 BTC
  const lot = trade.lotSize || (isBtc ? 0.05 : 0.10);
  const floatingPriceDiff = trade.direction === 'BUY'
    ? (currentSpotPrice - trade.entryPrice)
    : (trade.entryPrice - currentSpotPrice);
  const floatingPnlUsd = !isTriggered ? 0 : Number((lot * floatingPriceDiff * contractSize).toFixed(2));

  // Risk percentage relative to SL distance
  const slPipsDistance = Math.max(Math.abs(trade.entryPrice - trade.stopLoss) * pipMultiplier, 10);
  const floatingPnlPercent = !isTriggered ? 0 : Number(((floatingPips / slPipsDistance) * 1.0).toFixed(2));

  // 3. Distance to TP1 (Hanya aktif jika sudah terjemput)
  let tp1RemainingPips = 0;
  let isTp1Reached = false;
  if (isTriggered && trade.takeProfit1 && trade.takeProfit1 > 0) {
    if (trade.direction === 'BUY') {
      const diff = (trade.takeProfit1 - currentSpotPrice) * pipMultiplier;
      tp1RemainingPips = Number(Math.max(0, diff).toFixed(1));
      isTp1Reached = currentSpotPrice >= trade.takeProfit1;
    } else {
      const diff = (currentSpotPrice - trade.takeProfit1) * pipMultiplier;
      tp1RemainingPips = Number(Math.max(0, diff).toFixed(1));
      isTp1Reached = currentSpotPrice <= trade.takeProfit1;
    }
  }

  // 4. Distance to SL (Safety buffer - Hanya aktif jika sudah terjemput)
  let slBufferPips = 0;
  let isSlReached = false;
  if (isTriggered && trade.stopLoss && trade.stopLoss > 0) {
    if (trade.direction === 'BUY') {
      const diff = (currentSpotPrice - trade.stopLoss) * pipMultiplier;
      slBufferPips = Number(Math.max(0, diff).toFixed(1));
      isSlReached = currentSpotPrice <= trade.stopLoss;
    } else {
      const diff = (trade.stopLoss - currentSpotPrice) * pipMultiplier;
      slBufferPips = Number(Math.max(0, diff).toFixed(1));
      isSlReached = currentSpotPrice >= trade.stopLoss;
    }
  }

  // 5. Visual Gauge (0% = SL, 100% = TP1)
  let gaugeProgressPct = 50;
  let entryGaugePct = 50;
  const tp1 = trade.takeProfit1;
  const sl = trade.stopLoss;
  const entry = trade.entryPrice;

  if (tp1 && sl && tp1 !== sl) {
    if (trade.direction === 'BUY') {
      const totalSpan = tp1 - sl;
      if (totalSpan > 0) {
        entryGaugePct = Math.min(100, Math.max(0, ((entry - sl) / totalSpan) * 100));
        gaugeProgressPct = Math.min(100, Math.max(0, ((currentSpotPrice - sl) / totalSpan) * 100));
      }
    } else {
      const totalSpan = sl - tp1;
      if (totalSpan > 0) {
        entryGaugePct = Math.min(100, Math.max(0, ((sl - entry) / totalSpan) * 100));
        gaugeProgressPct = Math.min(100, Math.max(0, ((sl - currentSpotPrice) / totalSpan) * 100));
      }
    }
  }

  // 6. BEP Eligibility: If floating profit is >= 10 pips or >= 40% of target
  const isEligibleForBE = !trade.isBreakEvenActive && floatingPips >= Math.max(10, slPipsDistance * 0.4);

  // 7. USER MANDATE: Trailing Stop 50% Engine
  // "pasang trailing stop dengan selisih 50% dari kenaikan pips yang sedang floating,
  // dengan syarat minimal kenaikan di 10 pips, baru pasang trailing yang maju terus sampe ke titik tp."
  const highestFloatingPips = Math.max(
    trade.highestFloatingPips || 0,
    isTriggered && floatingPips > 0 ? floatingPips : 0
  );
  const isEligibleForTrailing = isTriggered && highestFloatingPips >= 10.0;
  const isTrailingActive = isEligibleForTrailing;
  const trailingPipsLocked = isEligibleForTrailing
    ? Math.floor(highestFloatingPips * 0.5 * 10) / 10
    : 0;

  let trailingStopPrice: number | undefined;
  let trailingStopPriceFormatted: string | undefined;
  let trailingDistancePips: number | undefined;

  if (isEligibleForTrailing && trailingPipsLocked > 0) {
    if (trade.direction === 'BUY') {
      trailingStopPrice = Number(
        (trade.entryPrice + trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2)
      );
      trailingDistancePips = Number(((currentSpotPrice - trailingStopPrice) * pipMultiplier).toFixed(1));
    } else {
      trailingStopPrice = Number(
        (trade.entryPrice - trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2)
      );
      trailingDistancePips = Number(((trailingStopPrice - currentSpotPrice) * pipMultiplier).toFixed(1));
    }
    trailingStopPriceFormatted = formatPriceBySymbol(trailingStopPrice, trade.symbol);
  }

  return {
    currentSpotPrice,
    currentPriceFormatted,
    isTriggered,
    pipsUntilFill,
    priceMovementPoints,
    priceMovementPips,
    priceDirection,
    priceDirectionText,
    floatingPips,
    floatingPipsFormatted,
    isFloatingProfit,
    isFloatingDrawdown,
    isBreakeven,
    floatingStatusText,
    floatingPnlUsd,
    floatingPnlPercent,
    tp1RemainingPips,
    isTp1Reached,
    slBufferPips,
    isSlReached,
    gaugeProgressPct,
    entryGaugePct,
    isEligibleForBE,
    isEligibleForTrailing,
    isTrailingActive,
    trailingStopPrice,
    trailingStopPriceFormatted,
    trailingPipsLocked,
    highestFloatingPips,
    trailingDistancePips,
  };
}

