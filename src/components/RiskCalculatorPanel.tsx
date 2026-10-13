import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, ArrowRight, RotateCcw, AlertTriangle, ShieldCheck, Check, Percent } from 'lucide-react';
import { RiskCalculatorInput, AssetSymbol } from '../types.ts';
import { calculateXauusdRisk } from '../utils/riskCalculator.ts';
import { parseNumericPrice } from '../utils/tradeJournal.ts';
import { getAccountSettings, AccountSettings } from '../utils/accountSettings.ts';

interface RiskCalculatorPanelProps {
  currentSpotPrice?: string;
  symbol?: AssetSymbol;
}

export const RiskCalculatorPanel: React.FC<RiskCalculatorPanelProps> = ({ currentSpotPrice, symbol = 'XAUUSD' }) => {
  const initialSettings = getAccountSettings();
  const [balance, setBalance] = useState<number>(initialSettings.balance);
  const [riskPercent, setRiskPercent] = useState<number>(initialSettings.riskPercent || 1.0);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [takeProfit, setTakeProfit] = useState<number | ''>('');

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AccountSettings>;
      if (customEvent.detail && customEvent.detail.balance) {
        setBalance(customEvent.detail.balance);
      }
    };
    window.addEventListener('account-settings-changed', handleUpdate);
    return () => {
      window.removeEventListener('account-settings-changed', handleUpdate);
    };
  }, []);

  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';

  // Extract clean number from current spot price if available (e.g. "$2,645.50" -> 2645.50 or "1.08450" -> 1.08450)
  const spotNumeric = useMemo(() => {
    if (!currentSpotPrice || currentSpotPrice === 'DATA UNAVAILABLE') return null;
    const num = parseNumericPrice(currentSpotPrice);
    return num > 0 ? num : null;
  }, [currentSpotPrice]);

  const handleUseSpotAsEntry = () => {
    if (spotNumeric) {
      setEntryPrice(spotNumeric);
    }
  };

  const handleReset = () => {
    setBalance(10000);
    setRiskPercent(1.0);
    setDirection('LONG');
    setEntryPrice('');
    setStopLoss('');
    setTakeProfit('');
  };

  // Deterministic local calculation
  const calcResult = useMemo(() => {
    const input: RiskCalculatorInput = {
      balance,
      riskPercent,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      symbol,
      contractSize: isBtc ? 1 : isEur ? 100000 : 100, // 1 BTC, 100,000 for EURUSD, 100 oz for XAUUSD
    };
    return calculateXauusdRisk(input);
  }, [balance, riskPercent, direction, entryPrice, stopLoss, takeProfit, symbol, isEur, isBtc]);

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">8. Execution Architecture</span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-400" />
            LOCAL RISK & POSITION SIZING CALCULATOR
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded">
            100% Deterministic JS (Zero AI Math)
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 bg-slate-950 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Input Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Account Balance & Risk % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                ACCOUNT BALANCE ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={balance || ''}
                  onChange={(e) => setBalance(Number(e.target.value) || 0)}
                  placeholder="10000"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-100 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-400">RISK PERCENT (%)</label>
                {/* Quick risk buttons */}
                <div className="flex gap-1">
                  {[0.5, 1.0, 2.0].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRiskPercent(p)}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                        riskPercent === p
                          ? 'bg-amber-400/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={riskPercent || ''}
                  onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
                  placeholder="1.0"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg pl-3 pr-7 py-2 text-xs font-mono text-slate-100 outline-none transition-colors"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Trade Direction Toggle */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">TRADE DIRECTION</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('LONG')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all ${
                  direction === 'LONG'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ▲ LONG (BUY BIAS)
              </button>
              <button
                type="button"
                onClick={() => setDirection('SHORT')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all ${
                  direction === 'SHORT'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ▼ SHORT (SELL BIAS)
              </button>
            </div>
          </div>

          {/* Entry, Stop Loss, Take Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-400">ENTRY PRICE</label>
                {spotNumeric && (
                  <button
                    type="button"
                    onClick={handleUseSpotAsEntry}
                    className="text-[10px] text-amber-400 hover:underline"
                    title="Gunakan harga spot terkini"
                  >
                    Use Spot
                  </button>
                )}
              </div>
              <input
                type="number"
                step={isEur ? '0.00001' : '0.1'}
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={isEur ? '1.08500' : '2645.00'}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-rose-400 mb-1">
                STOP LOSS (SL)
              </label>
              <input
                type="number"
                step={isEur ? '0.00001' : '0.1'}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={isEur ? (direction === 'LONG' ? '1.08300' : '1.08700') : (direction === 'LONG' ? '2635.00' : '2655.00')}
                className="w-full bg-slate-950 border border-rose-900/40 focus:border-rose-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-emerald-400 mb-1">
                TAKE PROFIT (TP)
              </label>
              <input
                type="number"
                step={isEur ? '0.00001' : '0.1'}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={isEur ? (direction === 'LONG' ? '1.09000' : '1.08000') : (direction === 'LONG' ? '2670.00' : '2620.00')}
                className="w-full bg-slate-950 border border-emerald-900/40 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Validation Notice or Prompt */}
          {calcResult.warning ? (
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{calcResult.warning}</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Kalkulasi risiko valid. Perhatikan money management 1-2% max per trade.</span>
            </div>
          )}
        </div>

        {/* Right Column: Output Display Cards (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center justify-between">
              <span>POSITION SIZING & R:R METRICS</span>
              <span className="text-[10px] text-slate-500">
                {isEur ? '1 Lot = 100,000 EUR' : '1 Lot = 100 oz XAU'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {/* Risk Amount */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">MAX RISK AMOUNT</span>
                <div className="text-base sm:text-lg font-bold font-mono text-rose-400">
                  ${calcResult.riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-500">({riskPercent}% Balance)</span>
              </div>

              {/* Recommended Lot Size */}
              <div className="bg-slate-900/70 border border-amber-500/30 rounded-lg p-3">
                <span className="text-[10px] font-mono text-amber-400 block mb-0.5">POSITION SIZE (LOT)</span>
                <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
                  {calcResult.isValid ? `${calcResult.lotSize} Lots` : '-'}
                </div>
                <span className="text-[10px] text-slate-500">Std Contract (0.01 min)</span>
              </div>

              {/* Risk to Reward */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">RISK : REWARD (R:R)</span>
                <div
                  className={`text-base sm:text-lg font-bold font-mono ${
                    calcResult.rewardToRisk && calcResult.rewardToRisk >= 2
                      ? 'text-emerald-400'
                      : calcResult.rewardToRisk && calcResult.rewardToRisk >= 1.5
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }`}
                >
                  {calcResult.rewardToRisk ? `1 : ${calcResult.rewardToRisk}` : '-'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {calcResult.rewardToRisk ? `Risk 1 : Reward ${calcResult.rewardToRisk}` : 'Target minimal 1:1.5'}
                </span>
              </div>

              {/* Potential Profit */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">POTENTIAL PROFIT</span>
                <div className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                  {calcResult.potentialProfit > 0
                    ? `+$${calcResult.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '-'}
                </div>
                <span className="text-[10px] text-slate-500">TP target tercapai</span>
              </div>
            </div>

            {/* Distances Detail */}
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-300 flex items-center justify-between">
              <span>SL Distance: {calcResult.slDistancePoints ? `$${calcResult.slDistancePoints}` : '-'}</span>
              <span className="text-slate-500">|</span>
              <span>TP Distance: {calcResult.tpDistancePoints ? `$${calcResult.tpDistancePoints}` : '-'}</span>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
            *Kalkulator tidak melakukan auto-execution. Eksekusi trade dilakukan mandiri di broker Anda.
          </div>
        </div>
      </div>
    </section>
  );
};
