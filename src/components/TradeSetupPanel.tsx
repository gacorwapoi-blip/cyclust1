import React, { useState, useEffect } from 'react';
import { TradeEntryStructure, TimeframeType, ExactTradePlan } from '../types.ts';
import {
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  Target,
  ShieldCheck,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Zap,
  Crosshair,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  getAccountSettings,
  calculateEffectiveLotSize,
  AccountSettings,
} from '../utils/accountSettings.ts';

interface TradeSetupPanelProps {
  tradeSetup?: TradeEntryStructure;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const TradeSetupPanel: React.FC<TradeSetupPanelProps> = ({ tradeSetup, timeframe, isLoading }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(getAccountSettings());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AccountSettings>;
      if (customEvent.detail) {
        setAccountSettings(customEvent.detail);
      }
    };
    window.addEventListener('account-settings-changed', handleUpdate);
    return () => {
      window.removeEventListener('account-settings-changed', handleUpdate);
    };
  }, []);

  if (!tradeSetup && !isLoading) return null;

  const direction = tradeSetup?.direction || 'WAIT FOR CONFIRMATION';

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case 'LONG SETUP DEVELOPING':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-emerald-950/50';
      case 'SHORT SETUP DEVELOPING':
        return 'bg-rose-950 text-rose-300 border-rose-500 shadow-rose-950/50';
      case 'NO TRADE':
        return 'bg-purple-950 text-purple-300 border-purple-500 shadow-purple-950/50';
      default:
        return 'bg-amber-950 text-amber-300 border-amber-500 shadow-amber-950/50';
    }
  };

  const handleCopyTicket = (plan: ExactTradePlan) => {
    const eff = calculateEffectiveLotSize(accountSettings, plan.stopLossPips || 20, 'XAUUSD');
    const text = `=== XAUUSD STRICT RISK-REWARD SETUP ===
TIMEFRAME: ${plan.timeframe || timeframe}
MODAL AKUN: $${accountSettings.balance.toLocaleString()}
OPEN LOT: ${eff.lotSize} Lot (${eff.label})
RESIKO CUT LOSS: -$${eff.riskUsd} (${eff.riskPercent}%)
ENTRY: ${plan.entryExactPrice}
SL: ${plan.stopLossExact} (Distance: ${plan.stopLossPips} pips, Anti-Sweep Buffer: +${plan.antiSweepBufferPips || 25} pips)
TP1: ${plan.takeProfit1} (Distance: +${plan.takeProfit1Pips} pips, RR: ${plan.tp1RR || (plan.isDefensiveRR ? '1:1.0' : '1:2.0')}, Potensi: +$${eff.rewardTp1Usd})
TP2: ${plan.takeProfit2} (RR: ${plan.tp2RR || '1:3.0'}, Potensi: +$${eff.rewardTp2Usd})${plan.takeProfit3 ? `\nTP3: ${plan.takeProfit3} (RR: ${plan.tp3RR || '1:4.0'})` : ''}
ATURAN BREAKEVEN: ${plan.bepActivationRule || 'Geser ke BEP saat 1:1 RR'}
KONFIRMASI CANDLE: ${plan.candleConfirmationRequirement || 'Tunggu rejection wick sebelum eksekusi'}
PRIMARY LIQUIDITY: ${plan.primaryLiquidity || 'Structure Equilibrium'}
MARKET VOLATILITY: ${plan.marketVolatility || 'Normal'}
TP QUALITY: ${plan.tpQuality || 'Valid'}
DECISION: ${plan.decision || direction}`;

    navigator.clipboard.writeText(text);
    setCopiedId(plan.planId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <section className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-xl shadow-black/20">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              4. ACTIONABLE EXECUTION FRAMEWORK
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {timeframe} Standardized Orders
            </span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            TITIK ENTRY EKSAK & ORDER EXECUTION TICKETS
          </h2>
        </div>

        <div className={`px-4 py-2 rounded-lg border text-xs font-mono font-extrabold tracking-wider shadow-lg ${getDirectionBadge(direction)}`}>
          BIAS: {direction}
        </div>
      </div>

      {/* Dynamic Pattern Adjustment Banner */}
      {tradeSetup?.patternAdjustmentNote && (
        <div className="mb-4 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs font-mono flex items-start gap-2.5 shadow-md">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
              <span>PENYESUAIAN POLA PASAR REAL-TIME & FILTER ENTRY</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-200 border border-cyan-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {tradeSetup.patternAdjustmentNote}
            </p>
          </div>
        </div>
      )}

      {/* PROMINENT ORDER TICKETS (Plan A, Plan B, Plan Scalp) */}
      {tradeSetup?.exactPlans && tradeSetup.exactPlans.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>DAFTAR TITIK ENTRY, STOP LOSS & TARGET LENGKAP:</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Klik &quot;Salin Tiket&quot; untuk parameter MT4/MT5/TradingView
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {tradeSetup.exactPlans.map((plan) => {
              const isBuy = plan.type === 'BUY_SETUP';
              const isScalp = plan.planId === 'PLAN_SCALP';
              const isMissed = plan.isMissed || plan.status === 'MISSED_PASSED';
              const isInvalidated = plan.isInvalidated || plan.status === 'INVALIDATED';
              const isActiveNow = plan.status === 'ACTIVE_NOW';

              return (
                <div
                  key={plan.planId}
                  className={`rounded-xl border p-4 flex flex-col justify-between relative transition-all duration-200 ${
                    isMissed
                      ? 'bg-slate-950/95 border-amber-500/50 shadow-md opacity-90'
                      : isInvalidated
                      ? 'bg-slate-950/95 border-rose-900/60 shadow-md opacity-75'
                      : isBuy
                      ? 'bg-slate-950/90 border-emerald-500/40 hover:border-emerald-400/70 shadow-lg shadow-emerald-950/20'
                      : isScalp
                      ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-400/70 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-950/90 border-rose-500/40 hover:border-rose-400/70 shadow-lg shadow-rose-950/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-2 mb-3 border-b border-slate-800/80 gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {isBuy ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isScalp ? (
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            isBuy
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                              : isScalp
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                              : 'bg-rose-950/80 text-rose-300 border-rose-600/40'
                          }`}
                        >
                          {plan.orderType}
                        </span>

                        {/* Status Badge */}
                        {isMissed ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/60">
                            ENTRY TERLEWAT
                          </span>
                        ) : isInvalidated ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600/60">
                            BATAL / HIT SL
                          </span>
                        ) : isActiveNow ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            DI ZONA ENTRY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-850 text-slate-300 border border-slate-700">
                            PENDING PULLBACK
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-mono font-bold text-white leading-snug">
                        {plan.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyTicket(plan)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
                      title="Salin parameter order"
                    >
                      {copiedId === plan.planId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Conflict Notice */}
                  {plan.conflictNote && (
                    <div className="mb-2.5 p-2 rounded-lg bg-amber-950/70 border border-amber-500/50 text-[10px] text-amber-300 flex items-start gap-1.5 leading-tight">
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{plan.conflictNote}</span>
                    </div>
                  )}

                  {/* Missed / Passed Entry Warning */}
                  {isMissed && (
                    <div className="mb-2.5 p-2.5 rounded-lg bg-amber-950/90 border border-amber-500/70 text-[11px] text-amber-200 flex items-start gap-2 leading-snug shadow">
                      <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 block tracking-wide">
                          ⚠️ ENTRY SUDAH TERLEWAT (JANGAN FOMO)
                        </span>
                        <span className="text-[10px] text-amber-200/90 block mt-0.5">
                          {plan.statusDetail || 'Harga telah bergerak melampaui level entry. Menunggu pembentukan pola pullback baru.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Invalidated Warning */}
                  {isInvalidated && (
                    <div className="mb-2.5 p-2.5 rounded-lg bg-rose-950/90 border border-rose-500/70 text-[11px] text-rose-200 flex items-start gap-2 leading-snug shadow">
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-300 block tracking-wide">
                          🛑 STRUKTUR BATAL (HIT SL)
                        </span>
                        <span className="text-[10px] text-rose-200/90 block mt-0.5">
                          {plan.statusDetail || 'Harga telah menembus batas invalidasi SL. Pola lama tidak berlaku.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Pricing Matrix */}
                  <div className="space-y-2 font-mono text-xs mb-3">
                    {/* Decision / Status */}
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px]">
                      <span className="text-slate-400 text-[10px]">DECISION:</span>
                      <span className="font-bold text-amber-300">{plan.decision || 'WAIT CONFIRMATION'}</span>
                    </div>

                    {/* Entry Exact */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30">
                      <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold mb-0.5">
                        <span>ENTRY EXACT</span>
                        <span className="text-[10px] text-slate-400">{plan.entryZone}</span>
                      </div>
                      <div className="text-base font-extrabold text-amber-300">
                        {plan.entryExactPrice}
                      </div>
                    </div>

                    {/* Stop Loss with Strict 20-pip Max Risk Rule */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-rose-500/30 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-rose-400 font-bold">
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>STOP LOSS (MAKS RISK 20 PIPS)</span>
                        </span>
                        <span className="text-[10px] text-rose-300 font-mono font-bold">
                          {plan.stopLossPips} pips (Maks 20p)
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-rose-300 font-mono flex items-baseline justify-between">
                        <span>{plan.stopLossExact}</span>
                        <span className="text-[10px] text-rose-400/90 font-mono">
                          Buffer: +{plan.antiSweepBufferPips || 10}p | Batas Cut Loss Ketat
                        </span>
                      </div>
                      {(() => {
                        const eff = calculateEffectiveLotSize(accountSettings, plan.stopLossPips || 20, 'XAUUSD');
                        return (
                          <div className="space-y-1 pt-0.5">
                            <div className="text-[10px] text-slate-300 bg-slate-950/80 p-1 rounded border border-slate-800 flex items-center justify-between">
                              <span>Lot Open (${accountSettings.balance.toLocaleString()}):</span>
                              <span className="text-amber-300 font-bold font-mono">{eff.lotSize} Lot ({eff.label})</span>
                            </div>
                            <div className="text-[10px] text-rose-400 bg-rose-950/30 px-1 py-0.5 rounded border border-rose-900/40 flex items-center justify-between font-mono">
                              <span>Risiko Loss (20p):</span>
                              <span className="font-bold">-${eff.riskUsd} ({eff.riskPercent}%)</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Take Profits with Healthy Risk-to-Reward (TP Lebih Besar dari SL) */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>TAKE PROFIT TARGETS</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 font-mono">
                            LEBIH BESAR DARI SL
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-300 font-extrabold">
                          {plan.tp1RR || 'RR 1:2.0+'}
                        </span>
                      </div>
                      {plan.isDefensiveRR && plan.defensiveReason && (
                        <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200/90 leading-tight flex items-start gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>Info Kondisi Rawan:</strong> {plan.defensiveReason} TP1 diamankan bertahap lalu geser BEP.</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                        <span>TP1: {plan.takeProfit1}</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          +{plan.takeProfit1Pips}p ({plan.tp1RR || '1:2.0'})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                        <span>TP2: {plan.takeProfit2}</span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          +{plan.takeProfit2Pips}p ({plan.tp2RR || '1:3.0'})
                        </span>
                      </div>
                      {plan.takeProfit3 && (
                        <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                          <span>TP3: {plan.takeProfit3}</span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            +{plan.takeProfit3Pips}p ({plan.tp3RR || '1:4.0'})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Auto Breakeven Rule */}
                    {plan.bepActivationRule && (
                      <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[10px] text-cyan-200 flex items-start gap-1.5 leading-snug">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-cyan-300 block">MANAJEMEN BREAKEVEN (BEP):</span>
                          <span className="text-[10px] text-cyan-200/90">{plan.bepActivationRule}</span>
                        </div>
                      </div>
                    )}

                    {/* Liquidity Target & Volatility */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block">PRIMARY LIQ:</span>
                        <span className="text-amber-300 font-bold truncate block">{plan.primaryLiquidity || '50% Eq'}</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block">VOLATILITY:</span>
                        <div className="flex items-center gap-1 font-bold">
                          <span className="text-slate-300">{plan.marketVolatility || 'Normal'}</span>
                          <span
                            className={`px-1 rounded text-[9px] ${
                              plan.tpQuality === 'Valid'
                                ? 'text-emerald-400 bg-emerald-950'
                                : 'text-amber-400 bg-amber-950'
                            }`}
                          >
                            {plan.tpQuality || 'Valid'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trigger & Confirmation Rules */}
                  <div className="bg-slate-900/60 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 border border-slate-800/80 space-y-1.5 mt-auto">
                    <div className="font-bold text-slate-200 text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-400" />
                      <span>Syarat Eksekusi & Konfirmasi Candle:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {plan.triggerCondition}
                    </p>
                    {plan.candleConfirmationRequirement && (
                      <div className="text-[10px] text-emerald-300/95 bg-slate-950/70 p-1.5 rounded border border-emerald-500/20">
                        <span className="font-bold text-emerald-400">Filter Konfirmasi: </span>
                        {plan.candleConfirmationRequirement}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Core Setup Matrix (10 parameters) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-xs font-mono">
        {/* HTF Bias & Market Regime */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HTF BIAS & REGIME</span>
          <div className="text-slate-200 font-semibold">{tradeSetup?.htfBias}</div>
          <div className="text-amber-400 font-medium">{tradeSetup?.marketRegime}</div>
        </div>

        {/* Liquidity Target & Event */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">LIQUIDITY TARGET & EVENT</span>
          <div className="text-emerald-400 font-semibold">{tradeSetup?.liquidityTarget}</div>
          <div className="text-slate-300">Event: <strong className="text-amber-300">{tradeSetup?.liquidityEvent}</strong></div>
        </div>

        {/* Confirmation Trigger */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CONFIRMATION TRIGGER</span>
          <div className="text-slate-200 leading-relaxed">{tradeSetup?.confirmation}</div>
        </div>

        {/* Entry Zone */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-1">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">PRIMARY ENTRY ZONE</span>
          <div className="text-sm font-bold text-amber-300">{tradeSetup?.entryZone}</div>
        </div>

        {/* Invalidation Level */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">PRIMARY INVALIDATION (SL)</span>
          <div className="text-sm font-bold text-rose-300">{tradeSetup?.invalidation}</div>
        </div>

        {/* Target & Risk/Reward */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">PROFIT TARGET & R:R</span>
          <div className="text-sm font-bold text-emerald-300">{tradeSetup?.target}</div>
          <div className="text-slate-300 text-[11px]">R:R Ratio: <strong className="text-amber-400">{tradeSetup?.rr}</strong></div>
        </div>
      </div>

      {/* 3-5 Concrete Quant Reasons */}
      <div className="p-4 rounded-xl bg-slate-950/95 border border-slate-800/90 mb-4">
        <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>RATIONALE & CONFLUENCE FACTORS:</span>
        </div>
        <ul className="space-y-1.5 text-xs font-mono text-slate-300">
          {tradeSetup?.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What could make this analysis wrong */}
      <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-800/40 text-xs font-mono">
        <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          <span>WHAT COULD MAKE THIS ANALYSIS WRONG? (CRUCIAL INVALIDATION NOTICE):</span>
        </div>
        <p className="text-rose-200/90 leading-relaxed">
          {tradeSetup?.whatCouldMakeWrong}
        </p>
      </div>
    </section>
  );
};
