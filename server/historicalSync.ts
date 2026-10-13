import type { RecordedDecision, TradeOutcomeStatus, TradeCloseReason } from '../src/types.ts';

export interface CandleItem {
  time: number; // unix ms open time
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SyncResultDetail {
  tradeId: string;
  symbol: string;
  direction: string;
  status: TradeOutcomeStatus;
  reason: TradeCloseReason;
  exitPrice: number;
  exitPriceFormatted: string;
  exitTime: string;
  exitTimeFormatted: string;
  durationFormatted: string;
  pipsGained: number;
  pnlUsd: number;
  pnlPercent: number;
  notes: string;
}

function formatWibTimestamp(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(d) + ' WIB';
}

function formatDurationMs(startMs: number, endMs: number): string {
  const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
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

/**
 * Fetch 5M historical spot candles for EURUSD from Binance
 */
export async function fetchEurCandles(): Promise<CandleItem[]> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=EURUSDT&interval=5m&limit=300');
    if (!res.ok) return [];
    const raw: any[] = await res.json();
    return raw.map((k) => ({
      time: Number(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
  } catch (err) {
    console.warn('[Sync] Binance EURUSDT candle fetch error:', err);
    return [];
  }
}

/**
 * Fetch historical spot candles for Bitcoin (BTCUSD) from Binance
 */
export async function fetchBtcCandles(): Promise<CandleItem[]> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=300');
    if (!res.ok) return [];
    const raw: any[] = await res.json();
    return raw.map((k) => ({
      time: Number(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    })).sort((a, b) => a.time - b.time);
  } catch (err) {
    console.warn('[Sync] Binance BTCUSDT candle fetch error:', err);
    return [];
  }
}

/**
 * Fetch historical spot candles for Gold (XAUUSD)
 * Uses Binance PAXGUSDT (1 oz physical spot gold token, 1:1 spot gold with real-time 5m candles)
 * NOTE: We strictly DO NOT use COMEX Futures (GC=F) because futures have a +$30 basis/spread
 * that would artificially trigger TP or SL prematurely.
 */
export async function fetchGoldCandles(): Promise<CandleItem[]> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=5m&limit=300');
    if (res.ok) {
      const raw: any[] = await res.json();
      return raw.map((k) => ({
        time: Number(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      })).sort((a, b) => a.time - b.time);
    }
  } catch (err) {
    console.warn('[Sync] Binance PAXG spot gold candle fetch error:', err);
  }
  return [];
}

/**
 * Evaluates all OPEN trades against real historical candle High/Low
 * This solves the "laptop mati saat di jalan" problem:
 * If price touched TP, SL, or Trailing Stop while user was offline, it will backfill and resolve accurately.
 */
export async function syncOpenTradesWithCandles(trades: RecordedDecision[]): Promise<{
  updatedTrades: RecordedDecision[];
  resolvedCount: number;
  details: SyncResultDetail[];
}> {
  if (!Array.isArray(trades) || trades.length === 0) {
    return { updatedTrades: trades || [], resolvedCount: 0, details: [] };
  }

  const nowMs = Date.now();
  // Filter open & pending trades that are at least 2 minutes old (prevents instant-close upon creation)
  const openTrades = trades.filter(
    (t) => (t.status === 'OPEN' || t.status === 'PENDING') && nowMs - new Date(t.timestamp).getTime() > 2 * 60 * 1000
  );

  if (openTrades.length === 0) {
    return { updatedTrades: trades, resolvedCount: 0, details: [] };
  }

  const hasXau = openTrades.some((t) => t.symbol === 'XAUUSD');
  const hasEur = openTrades.some((t) => t.symbol === 'EURUSD');
  const hasBtc = openTrades.some((t) => t.symbol === 'BTCUSD');

  const [goldCandles, eurCandles, btcCandles] = await Promise.all([
    hasXau ? fetchGoldCandles() : Promise.resolve([]),
    hasEur ? fetchEurCandles() : Promise.resolve([]),
    hasBtc ? fetchBtcCandles() : Promise.resolve([]),
  ]);

  let resolvedCount = 0;
  const details: SyncResultDetail[] = [];

  const updatedTrades = trades.map((trade) => {
    if (trade.status !== 'OPEN' && trade.status !== 'PENDING') return trade;

    const tradeTimeMs = new Date(trade.timestamp).getTime();
    if (nowMs - tradeTimeMs < 2 * 60 * 1000) {
      return trade;
    }

    const isEur = trade.symbol === 'EURUSD';
    const isBtc = trade.symbol === 'BTCUSD';
    const candles = isEur ? eurCandles : isBtc ? btcCandles : goldCandles;
    if (!candles || candles.length === 0) return trade;

    const eligibleCandles = candles.filter((c) => {
      const candleCloseMs = c.time + 5 * 60 * 1000;
      return c.time >= tradeTimeMs && candleCloseMs <= nowMs;
    });
    if (eligibleCandles.length === 0) return trade;

    const pipMultiplier = isEur ? 10000 : isBtc ? 0.1 : 10;
    const contractSize = isEur ? 100000 : isBtc ? 1 : 100;

    const formatPrice = (p: number) => {
      if (isEur) return p.toFixed(5);
      if (isBtc) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
      return `$${p.toFixed(2)}`;
    };

    let isFilled = trade.entryTriggered === true;
    let fillTimestampMs = trade.entryTriggeredTimestamp ? new Date(trade.entryTriggeredTimestamp).getTime() : tradeTimeMs;
    let fillFormatted = trade.entryTriggeredTimestampFormatted || trade.timestampFormatted || formatWibTimestamp(tradeTimeMs);

    let isBreakEvenActive = trade.isBreakEvenActive || false;
    let highestFloatingPips = trade.highestFloatingPips || 0;
    let isTrailingActive = trade.isTrailingActive || false;
    let trailingStopPrice = trade.trailingStopPrice;
    let trailingPipsLocked = trade.trailingStopPipsLocked || 0;

    const initialRiskDist = trade.stopLoss && trade.stopLoss > 0
      ? Math.abs(trade.entryPrice - trade.stopLoss)
      : (isEur ? 0.0015 : isBtc ? 150 : 6.0);

    // Iterate chronologically through each completed candle after entry
    for (const candle of eligibleCandles) {
      const candleCloseMs = candle.time + 5 * 60 * 1000;
      const candleIso = new Date(candleCloseMs).toISOString();
      const candleFormatted = formatWibTimestamp(candleCloseMs);

      // STEP 1: Verify order fill for limit orders
      if (!isFilled) {
        if (trade.direction === 'BUY' && candle.low <= trade.entryPrice) {
          isFilled = true;
          fillTimestampMs = candle.time;
          fillFormatted = candleFormatted;
        } else if (trade.direction === 'SELL' && candle.high >= trade.entryPrice) {
          isFilled = true;
          fillTimestampMs = candle.time;
          fillFormatted = candleFormatted;
        } else {
          continue;
        }
      }

      const durationFormatted = formatDurationMs(fillTimestampMs, candleCloseMs);

      // BUY EVALUATION
      if (trade.direction === 'BUY') {
        const peakCandleFloatingPips = (candle.high - trade.entryPrice) * pipMultiplier;
        if (peakCandleFloatingPips > highestFloatingPips) {
          highestFloatingPips = Number(peakCandleFloatingPips.toFixed(1));
        }

        // USER MANDATE: Trailing stop 50% aktif saat floating >= 10 pips
        if (highestFloatingPips >= 10.0) {
          isTrailingActive = true;
          trailingPipsLocked = Math.floor(highestFloatingPips * 0.5 * 10) / 10;
          trailingStopPrice = Number(
            (trade.entryPrice + trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2)
          );
        }

        // 1. Check Trailing Stop exit
        if (isTrailingActive && trailingStopPrice !== undefined && candle.low <= trailingStopPrice) {
          resolvedCount++;
          const exitPrice = trailingStopPrice;
          const exitPriceFormatted = formatPrice(exitPrice);
          const pipsGained = trailingPipsLocked;
          const pnlUsd = Number((trade.lotSize * (exitPrice - trade.entryPrice) * contractSize).toFixed(2));
          const pnlPercent = Number(((trailingPipsLocked / 20) * 1.0).toFixed(1));
          const noteText = `${trade.notes || ''} [Tersentuh Trailing Stop 50% (+${trailingPipsLocked}p dari peak +${highestFloatingPips}p) @ ${exitPriceFormatted} pada candle ${candleFormatted} - Profit Terkunci]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TRAILING_STOP',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TRAILING_STOP' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained,
            pnlPercent,
            pnlUsd,
            isTrailingActive: true,
            trailingStopPrice,
            trailingStopPriceFormatted: exitPriceFormatted,
            trailingStopPipsLocked: trailingPipsLocked,
            highestFloatingPips,
            notes: noteText,
          };
        }

        const tp2Hit = Boolean(trade.takeProfit2 && trade.takeProfit2 > 0 && candle.high >= trade.takeProfit2);
        const tp1Hit = Boolean(trade.takeProfit1 && trade.takeProfit1 > 0 && candle.high >= trade.takeProfit1);

        // Auto-Breakeven Trigger Rule
        if (candle.high >= trade.entryPrice + initialRiskDist || tp1Hit) {
          isBreakEvenActive = true;
        }

        // Breakeven check (if trailing stop was not triggered yet)
        if (!isTrailingActive && isBreakEvenActive && candle.low <= trade.entryPrice) {
          resolvedCount++;
          const exitPrice = trade.entryPrice;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Terselamatkan Auto-Breakeven (${exitPriceFormatted}) setelah running profit 1:1 RR tercapai - Bebas Rugi]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'BREAK_EVEN',
            reason: 'BREAK_EVEN',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: 0,
            pnlUsd: 0,
            pnlPercent: 0,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'BREAK_EVEN' as TradeOutcomeStatus,
            outcomeReason: 'BREAK_EVEN' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: 0,
            pnlPercent: 0,
            pnlUsd: 0,
            isBreakEvenActive: true,
            breakEvenPrice: trade.entryPrice,
            notes: noteText,
          };
        }

        const slHit = Boolean(!isTrailingActive && !isBreakEvenActive && trade.stopLoss && trade.stopLoss > 0 && candle.low <= trade.stopLoss);
        if (slHit) {
          resolvedCount++;
          const exitPrice = trade.stopLoss;
          const diff = exitPrice - trade.entryPrice;
          const pips = -Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = -Math.abs(Number((trade.lotSize * Math.abs(diff) * contractSize).toFixed(2)));
          const pnlPercent = -1.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh Stop Loss (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'LOSS',
            reason: 'HIT_SL',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'LOSS' as TradeOutcomeStatus,
            outcomeReason: 'HIT_SL' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }

        if (tp2Hit && trade.takeProfit2) {
          resolvedCount++;
          const exitPrice = trade.takeProfit2;
          const diff = exitPrice - trade.entryPrice;
          const pips = Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = Number((trade.lotSize * diff * contractSize).toFixed(2));
          const pnlPercent = 3.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh TP2 (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TP2',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TP2' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }

        if (tp1Hit && trade.takeProfit1) {
          resolvedCount++;
          const exitPrice = trade.takeProfit1;
          const diff = exitPrice - trade.entryPrice;
          const pips = Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = Number((trade.lotSize * diff * contractSize).toFixed(2));
          const pnlPercent = 2.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh TP1 (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TP1',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TP1' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }
      }

      // SELL EVALUATION
      if (trade.direction === 'SELL') {
        const peakCandleFloatingPips = (trade.entryPrice - candle.low) * pipMultiplier;
        if (peakCandleFloatingPips > highestFloatingPips) {
          highestFloatingPips = Number(peakCandleFloatingPips.toFixed(1));
        }

        // USER MANDATE: Trailing stop 50% aktif saat floating >= 10 pips
        if (highestFloatingPips >= 10.0) {
          isTrailingActive = true;
          trailingPipsLocked = Math.floor(highestFloatingPips * 0.5 * 10) / 10;
          trailingStopPrice = Number(
            (trade.entryPrice - trailingPipsLocked / pipMultiplier).toFixed(isEur ? 5 : isBtc ? 1 : 2)
          );
        }

        // 1. Check Trailing Stop exit
        if (isTrailingActive && trailingStopPrice !== undefined && candle.high >= trailingStopPrice) {
          resolvedCount++;
          const exitPrice = trailingStopPrice;
          const exitPriceFormatted = formatPrice(exitPrice);
          const pipsGained = trailingPipsLocked;
          const pnlUsd = Number((trade.lotSize * (trade.entryPrice - exitPrice) * contractSize).toFixed(2));
          const pnlPercent = Number(((trailingPipsLocked / 20) * 1.0).toFixed(1));
          const noteText = `${trade.notes || ''} [Tersentuh Trailing Stop 50% (+${trailingPipsLocked}p dari peak +${highestFloatingPips}p) @ ${exitPriceFormatted} pada candle ${candleFormatted} - Profit Terkunci]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TRAILING_STOP',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TRAILING_STOP' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained,
            pnlPercent,
            pnlUsd,
            isTrailingActive: true,
            trailingStopPrice,
            trailingStopPriceFormatted: exitPriceFormatted,
            trailingStopPipsLocked: trailingPipsLocked,
            highestFloatingPips,
            notes: noteText,
          };
        }

        const tp2Hit = Boolean(trade.takeProfit2 && trade.takeProfit2 > 0 && candle.low <= trade.takeProfit2);
        const tp1Hit = Boolean(trade.takeProfit1 && trade.takeProfit1 > 0 && candle.low <= trade.takeProfit1);

        // Auto-Breakeven Trigger Rule
        if (candle.low <= trade.entryPrice - initialRiskDist || tp1Hit) {
          isBreakEvenActive = true;
        }

        // Breakeven check
        if (!isTrailingActive && isBreakEvenActive && candle.high >= trade.entryPrice) {
          resolvedCount++;
          const exitPrice = trade.entryPrice;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Terselamatkan Auto-Breakeven (${exitPriceFormatted}) setelah running profit 1:1 RR tercapai - Bebas Rugi]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'BREAK_EVEN',
            reason: 'BREAK_EVEN',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: 0,
            pnlUsd: 0,
            pnlPercent: 0,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'BREAK_EVEN' as TradeOutcomeStatus,
            outcomeReason: 'BREAK_EVEN' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: 0,
            pnlPercent: 0,
            pnlUsd: 0,
            isBreakEvenActive: true,
            breakEvenPrice: trade.entryPrice,
            notes: noteText,
          };
        }

        const slHit = Boolean(!isTrailingActive && !isBreakEvenActive && trade.stopLoss && trade.stopLoss > 0 && candle.high >= trade.stopLoss);
        if (slHit) {
          resolvedCount++;
          const exitPrice = trade.stopLoss;
          const diff = trade.entryPrice - exitPrice;
          const pips = -Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = -Math.abs(Number((trade.lotSize * Math.abs(diff) * contractSize).toFixed(2)));
          const pnlPercent = -1.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh Stop Loss (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'LOSS',
            reason: 'HIT_SL',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'LOSS' as TradeOutcomeStatus,
            outcomeReason: 'HIT_SL' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }

        if (tp2Hit && trade.takeProfit2) {
          resolvedCount++;
          const exitPrice = trade.takeProfit2;
          const diff = trade.entryPrice - exitPrice;
          const pips = Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = Number((trade.lotSize * diff * contractSize).toFixed(2));
          const pnlPercent = 3.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh TP2 (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TP2',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TP2' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }

        if (tp1Hit && trade.takeProfit1) {
          resolvedCount++;
          const exitPrice = trade.takeProfit1;
          const diff = trade.entryPrice - exitPrice;
          const pips = Math.abs(Math.round(diff * pipMultiplier));
          const pnlUsd = Number((trade.lotSize * diff * contractSize).toFixed(2));
          const pnlPercent = 2.0;
          const exitPriceFormatted = formatPrice(exitPrice);
          const noteText = `${trade.notes || ''} [Tersentuh TP1 (${exitPriceFormatted}) pada candle bursa: ${candleFormatted}]`;

          const detail: SyncResultDetail = {
            tradeId: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            status: 'WIN',
            reason: 'HIT_TP1',
            exitPrice,
            exitPriceFormatted,
            exitTime: candleIso,
            exitTimeFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlUsd,
            pnlPercent,
            notes: noteText,
          };
          details.push(detail);

          return {
            ...trade,
            entryTriggered: true,
            entryTriggeredTimestamp: new Date(fillTimestampMs).toISOString(),
            entryTriggeredTimestampFormatted: fillFormatted,
            status: 'WIN' as TradeOutcomeStatus,
            outcomeReason: 'HIT_TP1' as TradeCloseReason,
            exitPrice,
            exitPriceFormatted,
            closedTimestamp: candleIso,
            closedTimestampFormatted: candleFormatted,
            durationFormatted,
            pipsGained: pips,
            pnlPercent,
            pnlUsd,
            notes: noteText,
          };
        }
      }
    }

    if (isFilled) {
      return {
        ...trade,
        status: 'OPEN' as TradeOutcomeStatus,
        entryTriggered: true,
        entryTriggeredTimestamp: trade.entryTriggeredTimestamp || new Date(fillTimestampMs).toISOString(),
        entryTriggeredTimestampFormatted: trade.entryTriggeredTimestampFormatted || fillFormatted,
        isBreakEvenActive,
        breakEvenPrice: isBreakEvenActive ? trade.entryPrice : undefined,
        isTrailingActive,
        trailingStopPrice,
        trailingStopPriceFormatted: trailingStopPrice ? formatPrice(trailingStopPrice) : undefined,
        trailingStopPipsLocked: trailingPipsLocked,
        highestFloatingPips,
      };
    }

    return {
      ...trade,
      status: 'PENDING' as TradeOutcomeStatus,
      entryTriggered: false,
    };
  });

  return { updatedTrades, resolvedCount, details };
}
