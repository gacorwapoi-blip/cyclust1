import { RiskCalculatorInput, RiskCalculatorOutput } from '../types.ts';

/**
 * Deterministic client-side Risk & Position Sizing Calculator for XAUUSD, EURUSD & BTCUSD.
 * XAUUSD: 1 standard lot = 100 troy oz ($1.00 move = $100 on 1.00 lot, 1 pip = 0.10).
 * EURUSD: 1 standard lot = 100,000 EUR ($0.0001 move = $10 on 1.00 lot, 1 pip = 0.0001).
 * BTCUSD: 1 standard lot = 1 BTC ($10.00 move = 1 pip, $1.00 move = $1.00 on 1.00 lot).
 */
export function calculateXauusdRisk(input: RiskCalculatorInput): RiskCalculatorOutput {
  const {
    balance,
    riskPercent,
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    symbol = 'XAUUSD',
    maxDailyRiskPercent = 3.0,
    currentDailyLossAmount = 0,
    maxAccountDrawdownPercent = 10.0,
  } = input;

  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';
  const contractSize = input.contractSize || (isEur ? 100000 : isBtc ? 1 : 100);
  const pipMultiplier = isEur ? 10000 : isBtc ? 0.1 : 10;
  const pointMultiplier = isEur ? 100000 : isBtc ? 1 : 100;

  const maxDailyAllowedRisk = (balance * maxDailyRiskPercent) / 100;
  const remainingDailyRiskAmount = Math.max(0, maxDailyAllowedRisk - currentDailyLossAmount);
  const remainingDailyRiskPercent = balance > 0 ? (remainingDailyRiskAmount / balance) * 100 : 0;
  const remainingDrawdownAmount = (balance * maxAccountDrawdownPercent) / 100;

  const defaultResult: RiskCalculatorOutput = {
    riskAmount: 0,
    potentialProfit: 0,
    potentialLoss: 0,
    rewardToRisk: null,
    slDistancePoints: 0,
    slDistancePips: 0,
    tpDistancePoints: 0,
    tpDistancePips: 0,
    lotSize: 0,
    isValid: false,
    warning: null,
    remainingDailyRiskAmount: Number(remainingDailyRiskAmount.toFixed(2)),
    remainingDailyRiskPercent: Number(remainingDailyRiskPercent.toFixed(2)),
    remainingDrawdownAmount: Number(remainingDrawdownAmount.toFixed(2)),
    isDailyRiskExceeded: false,
  };

  if (!balance || balance <= 0) {
    return { ...defaultResult, warning: 'Masukkan Balance akun yang valid (> 0).' };
  }

  if (!riskPercent || riskPercent <= 0) {
    return { ...defaultResult, warning: 'Tentukan persentase risiko per trade (> 0%).' };
  }

  const riskAmount = Number(((balance * riskPercent) / 100).toFixed(2));
  const isDailyRiskExceeded = riskAmount > remainingDailyRiskAmount;

  // If entry or SL are missing
  if (entryPrice === '' || stopLoss === '' || entryPrice <= 0 || stopLoss <= 0) {
    return {
      ...defaultResult,
      riskAmount,
      isDailyRiskExceeded,
      warning: 'Lengkapi Entry Price dan Stop Loss untuk kalkulasi lot & risiko.',
    };
  }

  const entry = Number(entryPrice);
  const sl = Number(stopLoss);
  const tp = takeProfit !== '' && Number(takeProfit) > 0 ? Number(takeProfit) : null;

  // Validate directional logic
  if (direction === 'LONG') {
    if (sl >= entry) {
      return {
        ...defaultResult,
        riskAmount,
        isDailyRiskExceeded,
        warning: 'Untuk posisi LONG, Stop Loss harus berada di BAWAH Entry Price.',
      };
    }
    if (tp !== null && tp <= entry) {
      return {
        ...defaultResult,
        riskAmount,
        isDailyRiskExceeded,
        warning: 'Untuk posisi LONG, Take Profit harus berada di ATAS Entry Price.',
      };
    }
  } else {
    // SHORT
    if (sl <= entry) {
      return {
        ...defaultResult,
        riskAmount,
        isDailyRiskExceeded,
        warning: 'Untuk posisi SHORT, Stop Loss harus berada di ATAS Entry Price.',
      };
    }
    if (tp !== null && tp >= entry) {
      return {
        ...defaultResult,
        riskAmount,
        isDailyRiskExceeded,
        warning: 'Untuk posisi SHORT, Take Profit harus berada di BAWAH Entry Price.',
      };
    }
  }

  const slDistance = Math.abs(entry - sl);
  const dollarPerLotAtSl = slDistance * contractSize;

  if (dollarPerLotAtSl <= 0) {
    return {
      ...defaultResult,
      riskAmount,
      isDailyRiskExceeded,
      warning: 'Jarak Stop Loss terlalu sempit.',
    };
  }

  // Calculate lot size rounded to 2 decimal places (standard broker micro-lot resolution 0.01)
  const rawLots = riskAmount / dollarPerLotAtSl;
  const lotSize = Math.max(0.01, Number(rawLots.toFixed(2)));
  const actualLoss = Number((lotSize * dollarPerLotAtSl).toFixed(2));

  let tpDistance = 0;
  let rewardToRisk: number | null = null;
  let potentialProfit = 0;

  if (tp !== null) {
    tpDistance = Math.abs(tp - entry);
    rewardToRisk = Number((tpDistance / slDistance).toFixed(2));
    potentialProfit = Number((lotSize * tpDistance * contractSize).toFixed(2));
  }

  const slDistancePips = Number((slDistance * pipMultiplier).toFixed(1));
  const tpDistancePips = Number((tpDistance * pipMultiplier).toFixed(1));
  const slDistancePoints = isEur ? Number((slDistance * pointMultiplier).toFixed(0)) : Number(slDistance.toFixed(2));
  const tpDistancePoints = isEur ? Number((tpDistance * pointMultiplier).toFixed(0)) : Number(tpDistance.toFixed(2));

  return {
    riskAmount,
    potentialProfit,
    potentialLoss: actualLoss,
    rewardToRisk,
    slDistancePoints,
    slDistancePips,
    tpDistancePoints,
    tpDistancePips,
    lotSize,
    isValid: true,
    warning: isDailyRiskExceeded
      ? `PERINGATAN: Risiko trade ini ($${riskAmount}) melampaui sisa batas harian ($${remainingDailyRiskAmount.toFixed(2)}).`
      : null,
    remainingDailyRiskAmount: Number(remainingDailyRiskAmount.toFixed(2)),
    remainingDailyRiskPercent: Number(remainingDailyRiskPercent.toFixed(2)),
    remainingDrawdownAmount: Number(remainingDrawdownAmount.toFixed(2)),
    isDailyRiskExceeded,
  };
}
