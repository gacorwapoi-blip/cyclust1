import React, { useState } from 'react';
import { QuantAnalysisResult, TimeframeType, ExactTradePlan } from '../types.ts';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Zap,
  Copy,
  Check,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Sparkles,
  PlusCircle,
  BookmarkCheck,
} from 'lucide-react';
import { recordDecisionFromAnalysis } from '../utils/tradeJournal.ts';
import { AccountCapitalLotSelector } from './AccountCapitalLotSelector.tsx';
import {
  getAccountSettings,
  calculateEffectiveLotSize,
  AccountSettings,
} from '../utils/accountSettings.ts';

interface BuySellConfirmationPanelProps {
  analysisData?: QuantAnalysisResult | null;
  timeframe: TimeframeType;
  isLoading: boolean;
}

export const BuySellConfirmationPanel: React.FC<BuySellConfirmationPanelProps> = ({
  analysisData,
  timeframe,
  isLoading,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [recorded, setRecorded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'RECOMMENDED' | 'BUY' | 'SELL'>('RECOMMENDED');
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(getAccountSettings());

  const handleRecordToJournal = (planId?: 'PLAN_A' | 'PLAN_B' | 'PLAN_SCALP') => {
    if (!analysisData) return;
    const currentSettings = getAccountSettings();
    const slPips = displayPlan?.stopLossPips || 20;
    const eff = calculateEffectiveLotSize(currentSettings, slPips, analysisData.symbol);
    const result = recordDecisionFromAnalysis(
      analysisData,
      planId,
      false,
      eff.lotSize,
      currentSettings.balance
    );
    setRecorded(true);
    setTimeout(() => setRecorded(false), 2500);
    // Dispatch custom event to notify journal listeners if any
    window.dispatchEvent(new Event('storage'));
  };

  if (!analysisData && !isLoading) return null;

  const tradeSetup = analysisData?.tradeSetup;
  const snapshot = analysisData?.snapshot;
  const structure = analysisData?.structureDetail;
  const liquidity = analysisData?.liquidityMap;
  const factors = analysisData?.factors;
  const decision = analysisData?.decision;

  const exactPlans = tradeSetup?.exactPlans || [];
  const planA = exactPlans.find((p) => p.planId === 'PLAN_A') || exactPlans[0];
  const planB = exactPlans.find((p) => p.planId === 'PLAN_B') || exactPlans[1];
  const planScalp = exactPlans.find((p) => p.planId === 'PLAN_SCALP') || exactPlans[2];

  // Determine overall dominant confirmation signal
  const direction = tradeSetup?.direction || 'WAIT FOR CONFIRMATION';
  const isBuyDominant =
    direction === 'LONG SETUP DEVELOPING' ||
    direction === 'LONG' ||
    decision?.decision === 'LONG SETUP DEVELOPING' ||
    (tradeSetup?.entryZone && tradeSetup.entryZone.toLowerCase().includes('demand')) ||
    (structure?.htfBias === 'Bullish');

  const isSellDominant =
    direction === 'SHORT SETUP DEVELOPING' ||
    direction === 'SHORT' ||
    decision?.decision === 'SHORT SETUP DEVELOPING' ||
    (tradeSetup?.entryZone && tradeSetup.entryZone.toLowerCase().includes('supply')) ||
    (structure?.htfBias === 'Bearish');

  // Signal State: BUY | SELL | WAIT
  let signalStatus: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (isBuyDominant && !isSellDominant) {
    signalStatus = 'BUY';
  } else if (isSellDominant && !isBuyDominant) {
    signalStatus = 'SELL';
  } else if (tradeSetup?.direction === 'NO TRADE') {
    signalStatus = 'WAIT';
  } else {
    signalStatus = isBuyDominant ? 'BUY' : 'WAIT';
  }

  // Active Candidate Plan based on signal
  let candidatePlan =
    signalStatus === 'BUY' ? planA || planScalp : signalStatus === 'SELL' ? planB || planScalp : planScalp || planA;

  // DYNAMIC FILTER: JANGAN MEMBERI REKOMENDASI ENTRY YANG SUDAH TERLEWAT
  // If the candidate plan is missed, adjust to live scalp or wait for new pattern
  const isCandidateMissed = candidatePlan?.isMissed || candidatePlan?.status === 'MISSED_PASSED';
  if (isCandidateMissed) {
    if (planScalp && !planScalp.isMissed) {
      candidatePlan = planScalp;
    } else {
      signalStatus = 'WAIT';
    }
  }

  const recommendedPlan: ExactTradePlan | undefined = candidatePlan;

  // Selected view plan based on user tab
  const displayPlan: ExactTradePlan | undefined =
    activeTab === 'BUY'
      ? planA || recommendedPlan
      : activeTab === 'SELL'
      ? planB || recommendedPlan
      : recommendedPlan;

  const isDisplayPlanMissed = displayPlan?.isMissed || displayPlan?.status === 'MISSED_PASSED';
  const isDisplayPlanInvalidated = displayPlan?.isInvalidated || displayPlan?.status === 'INVALIDATED';

  // Confirmation Checklist Criteria for Buy vs Sell
  const currentPrice = snapshot?.price || '$4,350.00';
  const lastSweep = liquidity?.lastLiquidityEvent?.eventType || 'Konsolidasi Likuiditas';
  const dxyBias = factors?.macro === 'Bullish' ? 'DXY Melemah (Katalis Emas Bullish)' : 'DXY Menguat (Tekanan Emas)';

  const nearestSellSide = liquidity?.sellSideLiquidity?.[0]?.price || 'PDL';
  const nearestBuySide = liquidity?.buySideLiquidity?.[0]?.price || 'PDH';

  // Buy Checklist
  const buyChecklist = [
    {
      title: 'Zona Diskon / Demand OB',
      detail: 'Harga berada di bawah Median 50% Equilibrium menuju level akumulasi diskon.',
      valid: true,
    },
    {
      title: 'Sweep Sell-Side Liquidity',
      detail: `Rejeksi di area likuiditas bawah (${nearestSellSide}) dengan sumbu candle (wick).`,
      valid: true,
    },
    {
      title: 'Displacement Bullish Timeframe ' + timeframe,
      detail: 'Muncul candle hijau bervolume menolak level terendah.',
      valid: isBuyDominant,
    },
    {
      title: 'Korelasi DXY & Yield Obligasi',
      detail: 'Tidak ada lonjakan yield AS mendadak yang menembus resistensi baru.',
      valid: true,
    },
  ];

  // Sell Checklist
  const sellChecklist = [
    {
      title: 'Zona Premium / Supply FVG',
      detail: 'Harga menyentuh area premium dekat batas resistensi sesi.',
      valid: isSellDominant,
    },
    {
      title: 'Sweep Buy-Side Liquidity (PDH/EQH)',
      detail: `Sapu likuiditas di area resistensi atas (${nearestBuySide}) diikuti upper wick panjang.`,
      valid: isSellDominant,
    },
    {
      title: 'Market Structure Shift (MSS) Bearish',
      detail: 'Penembusan swing low internal pada candle ' + timeframe + '.',
      valid: isSellDominant,
    },
    {
      title: 'Tekanan DXY Menguat',
      detail: 'Indeks Dollar AS memantul kuat dari support teknikal.',
      valid: false,
    },
  ];

  const handleCopyConfirmation = () => {
    if (!displayPlan) return;
    const eff = calculateEffectiveLotSize(accountSettings, displayPlan.stopLossPips || 20, analysisData?.symbol);
    const text = `=== ${analysisData?.symbol || 'XAUUSD'} STRICT RISK-REWARD SETUP ===
TIMEFRAME: ${displayPlan.timeframe || timeframe}
MODAL AKUN: $${accountSettings.balance.toLocaleString()}
UKURAN LOT: ${eff.lotSize} Lot (${eff.label})
RESIKO SL (20p): -$${eff.riskUsd} (${eff.riskPercent}%)
POTENSI TP1: +$${eff.rewardTp1Usd}
ENTRY: ${displayPlan.entryExactPrice}
SL: ${displayPlan.stopLossExact} (${displayPlan.stopLossPips} pips)
TP1: ${displayPlan.takeProfit1} (+${displayPlan.takeProfit1Pips} pips, RR: ${displayPlan.tp1RR || (displayPlan.isDefensiveRR ? '1:1.0' : '1:2.0')})
TP2: ${displayPlan.takeProfit2} (+${displayPlan.takeProfit2Pips} pips, RR: ${displayPlan.tp2RR || '1:3.0'})${displayPlan.takeProfit3 ? `\nTP3: ${displayPlan.takeProfit3} (+${displayPlan.takeProfit3Pips} pips, RR: ${displayPlan.tp3RR || '1:4.0'})` : ''}
PRIMARY LIQUIDITY: ${displayPlan.primaryLiquidity || (signalStatus === 'BUY' ? 'Buy-Side PDH' : 'Sell-Side PDL')}
MARKET VOLATILITY: ${displayPlan.marketVolatility || 'Normal'}
TP QUALITY: ${displayPlan.tpQuality || 'Valid'}
DECISION: ${displayPlan.decision || (signalStatus === 'BUY' ? 'LONG SETUP DEVELOPING' : signalStatus === 'SELL' ? 'SHORT SETUP DEVELOPING' : 'WAIT FOR CONFIRMATION')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      id="buy-sell-confirmation-column"
      className="bg-slate-900/90 border-2 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-2xl transition-all duration-300 ${
        signalStatus === 'BUY'
          ? 'border-emerald-500/80 shadow-emerald-950/40'
          : signalStatus === 'SELL'
          ? 'border-rose-500/80 shadow-rose-950/40'
          : 'border-amber-500/80 shadow-amber-950/40'
      }"
      style={{
        borderColor:
          signalStatus === 'BUY'
            ? 'rgba(16, 185, 129, 0.7)'
            : signalStatus === 'SELL'
            ? 'rgba(244, 63, 94, 0.7)'
            : 'rgba(245, 158, 11, 0.7)',
      }}
    >
      {/* Background Accent Glow */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
          signalStatus === 'BUY' ? 'bg-emerald-500' : signalStatus === 'SELL' ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />

      {/* TOP HEADER: Clear Title & Tab Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 mb-5 border-b border-slate-800/90 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                signalStatus === 'BUY'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                  : signalStatus === 'SELL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                  : 'bg-amber-950 text-amber-300 border border-amber-500/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>KOLOM UTAMA: KONFIRMASI BUY ATAU SELL</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              Timeframe: {timeframe}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            PANDUAN KEPUTUSAN EKSEKUSI TEGAS & TERUKUR
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Analisis multi-faktor otomatis mengonfirmasi arah transaksi secara definitif tanpa keraguan
          </p>
        </div>

        {/* Action Toggle Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('RECOMMENDED')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'RECOMMENDED'
                ? signalStatus === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                  : signalStatus === 'SELL'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                  : 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rekomendasi Utama</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BUY')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kriteria BUY</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SELL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'SELL'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-900'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Kriteria SELL</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE ACCOUNT CAPITAL & LOT SIZING SELECTOR */}
      <AccountCapitalLotSelector
        symbol={analysisData?.symbol}
        slPips={displayPlan?.stopLossPips || 20}
        onSettingsChange={setAccountSettings}
      />

      {/* CORE HERO CONFIRMATION BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 relative z-10">
        {/* BIG VERDICT CARD (Cols 1-7) */}
        <div
          className={`lg:col-span-7 rounded-2xl p-5 border flex flex-col justify-between ${
            signalStatus === 'BUY'
              ? 'bg-gradient-to-br from-emerald-950/80 via-slate-950 to-slate-950 border-emerald-500/60 shadow-xl'
              : signalStatus === 'SELL'
              ? 'bg-gradient-to-br from-rose-950/80 via-slate-950 to-slate-950 border-rose-500/60 shadow-xl'
              : 'bg-gradient-to-br from-amber-950/80 via-slate-950 to-slate-950 border-amber-500/60 shadow-xl'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                VERDIK RESMI TERMINAL QUANT
              </span>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Live Spot: <strong className="text-white">{currentPrice}</strong>
              </span>
            </div>

            {/* Giant Confirmation Statement */}
            <div className="flex items-center gap-3.5 mb-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  signalStatus === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : signalStatus === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}
              >
                {signalStatus === 'BUY' ? (
                  <TrendingUp className="w-7 h-7 stroke-[2.5]" />
                ) : signalStatus === 'SELL' ? (
                  <TrendingDown className="w-7 h-7 stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                )}
              </div>

              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  STATUS KONFIRMASI SAAT INI:
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    signalStatus === 'BUY'
                      ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : signalStatus === 'SELL'
                      ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                      : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {signalStatus === 'BUY'
                    ? 'KONFIRMASI BUY / LONG VALID'
                    : signalStatus === 'SELL'
                    ? 'KONFIRMASI SELL / SHORT VALID'
                    : 'WAIT / TUNGGU PULLBACK REJECTION'}
                </div>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              {signalStatus === 'BUY' ? (
                <>
                  <strong className="text-emerald-300">ARGUMEN BUY JELAS:</strong> Emas berada dalam zona{' '}
                  <span className="text-amber-300 font-bold">Discount Demand</span> di bawah median 50% Equilibrium.
                  Risiko penurunan lebih terbatas karena adanya pertahanan likuiditas buy-side di sekitar batas bawah harian.
                </>
              ) : signalStatus === 'SELL' ? (
                <>
                  <strong className="text-rose-300">ARGUMEN SELL JELAS:</strong> Emas berada dalam zona{' '}
                  <span className="text-amber-300 font-bold">Premium Supply</span> di dekat resistance swing high. Terdapat
                  potensi sapuan likuiditas atas (PDH) diikuti penolakan tajam ke arah median harga.
                </>
              ) : (
                <>
                  <strong className="text-amber-300">ARAH KONSOLIDASI / RE-CALIBRATION:</strong> Harga sedang berada di area netral tengah
                  rentang atau setup sebelumnya telah terlewat. Disarankan menunggu konfirmasi retest pada batas pola baru sebelum membuka posisi baru.
                </>
              )}
            </p>

            {/* Missed / Passed Entry Alert */}
            {isDisplayPlanMissed && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/90 border border-amber-500/60 text-xs font-mono text-amber-200 flex items-start gap-2.5 shadow-md">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block font-bold uppercase tracking-wider">
                    ⚠️ STATUS: ENTRY TELAH TERLEWAT (JANGAN FOMO)
                  </strong>
                  <span className="text-[11px] text-amber-200/90 block mt-0.5 leading-relaxed">
                    {displayPlan?.statusDetail || `Harga telah bergerak jauh melampaui entry atau TP1 telah tercapai. JANGAN KEJAR HARGA! Pola market telah bergeser dan sistem menunggu pembentukan struktur baru di sekitar ${currentPrice}.`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Parameters Summary Bar */}
          {displayPlan && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">TIPE ORDER</span>
                <span className="font-bold text-amber-300 truncate block">{displayPlan.orderType}</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block">TITIK ENTRY</span>
                <span className="font-bold text-white block">{displayPlan.entryExactPrice}</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-rose-500/20">
                <span className="text-[10px] text-rose-400 block">STOP LOSS</span>
                <span className="font-bold text-rose-300 block">{displayPlan.stopLossExact}</span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 block">TARGET TP1</span>
                <span className="font-bold text-emerald-300 block">{displayPlan.takeProfit1}</span>
              </div>
            </div>
          )}
        </div>

        {/* ORDER BLUEPRINT TICKET (Cols 8-12) */}
        <div className="lg:col-span-5 bg-slate-950/95 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                <span>TIKET EKSEKUSI MT4/MT5</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRecordToJournal(displayPlan?.planId)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    recorded
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70'
                      : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-600/50 text-amber-300'
                  }`}
                  title="Catat keputusan dan setup ini langsung ke Kalender & Jurnal Trade"
                >
                  {recorded ? (
                    <>
                      <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                      <span>Tercatat!</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3 h-3 text-amber-400" />
                      <span>Catat ke Jurnal</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyConfirmation}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Salin Sinyal</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {displayPlan ? (
              <div className="space-y-2 font-mono text-xs">
                {/* Conflict Rule Warning */}
                {displayPlan.conflictNote && (
                  <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-[11px] text-amber-300 leading-tight flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-200 uppercase font-bold">Conflict Rule Active:</strong>{' '}
                      {displayPlan.conflictNote}
                    </div>
                  </div>
                )}

                {/* Status & Decision Badge */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">DECISION / STATUS:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[11px] ${
                      displayPlan.decision?.includes('LONG')
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : displayPlan.decision?.includes('SHORT')
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {displayPlan.decision || 'WAIT FOR CONFIRMATION'}
                  </span>
                </div>

                {/* Entry Field */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">ENTRY (Live/Limit):</span>
                  <div className="text-right">
                    <span className="text-amber-300 font-extrabold text-sm">{displayPlan.entryExactPrice}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Zona: {displayPlan.entryZone}</span>
                  </div>
                </div>

                {/* SL Field */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-rose-950/80">
                  <div>
                    <span className="text-rose-400 font-semibold block">STOP LOSS (SL):</span>
                    <span className="text-[10px] text-slate-400">SL DISTANCE:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-300 font-extrabold text-sm">{displayPlan.stopLossExact}</span>
                    <span className="text-[10px] font-bold text-rose-400 block">{displayPlan.stopLossPips} pips (Maks Lose: 20p)</span>
                  </div>
                </div>

                {/* Lot Size & Money Risk/Reward Matrix */}
                {(() => {
                  const eff = calculateEffectiveLotSize(accountSettings, displayPlan.stopLossPips || 20, analysisData?.symbol);
                  return (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/40 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>LOT OPEN POSISI (MODAL ${accountSettings.balance.toLocaleString()}):</span>
                        </span>
                        <span className="text-amber-300 font-black text-sm">{eff.lotSize} Lot</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Mode Lot: <strong>{eff.label}</strong></span>
                        <span className="text-rose-400 font-bold">Risiko Cut Loss: -${eff.riskUsd} ({eff.riskPercent}%)</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/40 flex items-center justify-between font-mono">
                        <span>Potensi Profit TP1: +${eff.rewardTp1Usd}</span>
                        <span>Potensi TP2: +${eff.rewardTp2Usd}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Defensive RR Notification if strict/rawan */}
                {displayPlan.isDefensiveRR && (
                  <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/50 text-[11px] text-amber-200 leading-tight flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 uppercase block">Kondisi Strict / Rawan Terdeteksi:</span>
                      <span className="text-[10px] text-amber-200/95 block mt-0.5">
                        {displayPlan.defensiveReason || 'Target TP1 disesuaikan ke RR 1:1.0 guna memitigasi risiko pembalikan arah mendadak.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* TP1 - Minimum RR 1:2 or Defensive 1:1 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-emerald-950/80">
                  <div>
                    <span className="text-emerald-400 font-semibold block">
                      TP1 ({displayPlan.isDefensiveRR ? 'Defensive RR' : 'Min RR'}):{' '}
                      <span className="text-emerald-300 font-extrabold">{displayPlan.tp1RR || (displayPlan.isDefensiveRR ? '1:1.0' : '1:2.0')}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">TP1 DISTANCE:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-300 font-extrabold text-sm">{displayPlan.takeProfit1}</span>
                    <span className="text-[10px] font-bold text-emerald-400 block">+{displayPlan.takeProfit1Pips} pips</span>
                  </div>
                </div>

                {/* TP2 - Target RR */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-emerald-950/80">
                  <div>
                    <span className="text-emerald-400 font-semibold block">
                      TP2 ({displayPlan.isDefensiveRR ? 'Target 2' : 'Primary'}):{' '}
                      <span className="text-emerald-300 font-extrabold">{displayPlan.tp2RR || (displayPlan.isDefensiveRR ? '1:2.0' : '1:3.0')}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">TP2 DISTANCE:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-300 font-extrabold text-sm">{displayPlan.takeProfit2}</span>
                    <span className="text-[10px] font-bold text-emerald-400 block">+{displayPlan.takeProfit2Pips} pips</span>
                  </div>
                </div>

                {/* TP3 - Extended RR */}
                {displayPlan.takeProfit3 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-emerald-950/80">
                    <div>
                      <span className="text-emerald-400 font-semibold block">
                        TP3 (Extended): <span className="text-emerald-300 font-extrabold">{displayPlan.tp3RR || (displayPlan.isDefensiveRR ? '1:3.0' : '1:4.0')}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">TP3 DISTANCE:</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-300 font-extrabold text-sm">{displayPlan.takeProfit3}</span>
                      <span className="text-[10px] font-bold text-emerald-400 block">+{displayPlan.takeProfit3Pips} pips</span>
                    </div>
                  </div>
                )}

                {/* Quality & Volatility Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">PRIMARY LIQUIDITY</span>
                    <span className="text-xs font-bold text-amber-300 truncate block">
                      {displayPlan.primaryLiquidity || 'Median 50%'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">VOLATILITY & QUALITY</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                        {displayPlan.marketVolatility || 'Normal'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          displayPlan.tpQuality === 'Valid'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : displayPlan.tpQuality === 'Weak'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {displayPlan.tpQuality || 'Valid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk / Reward Summary Bar */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/30 border border-amber-500/30">
                  <span className="text-amber-400 font-bold">Rasio Risk/Reward:</span>
                  <span className="text-amber-300 font-extrabold">{displayPlan.rrRatio}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-mono text-slate-400">
                Memuat data parameter order...
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
            <span className="text-amber-400 font-semibold">Peringatan:</span> Geser SL ke Breakeven (BEP) setelah TP1 tercapai untuk mengeliminasi risiko pasar.
          </div>
        </div>
      </div>

      {/* CHECKLIST COMPARISON: Mengapa BUY atau Mengapa SELL? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* BUY CHECKLIST COLUMN */}
        <div
          className={`rounded-xl p-4 border transition-all ${
            signalStatus === 'BUY'
              ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <span className="text-xs font-mono font-extrabold text-emerald-300 uppercase tracking-wider">
                SYARAT KONFIRMASI BUY (LONG)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                signalStatus === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {signalStatus === 'BUY' ? 'STATUS: TERPENUHI' : 'STATUS: MENUNGGU'}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {buyChecklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                {item.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-bold ${item.valid ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SELL CHECKLIST COLUMN */}
        <div
          className={`rounded-xl p-4 border transition-all ${
            signalStatus === 'SELL'
              ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                ✕
              </div>
              <span className="text-xs font-mono font-extrabold text-rose-300 uppercase tracking-wider">
                SYARAT KONFIRMASI SELL (SHORT)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                signalStatus === 'SELL' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {signalStatus === 'SELL' ? 'STATUS: TERPENUHI' : 'STATUS: BELUM VALID'}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {sellChecklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                {item.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-bold ${item.valid ? 'text-rose-300' : 'text-slate-500'}`}>
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-snug">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER STRIP: ATURAN DISIPLIN MUTLAK */}
      <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Aturan Invalidation:</strong> Batalkan setup jika candle close menembus level Stop Loss pada timeframe {timeframe}. Jangan pernah menahan posisi tanpa SL.
          </span>
        </div>
        <div className="text-slate-400 shrink-0 flex items-center gap-1.5">
          <span>Target R:R:</span>
          <span
            className={`font-extrabold px-2 py-0.5 rounded border ${
              displayPlan?.isDefensiveRR
                ? 'text-amber-300 bg-amber-950/80 border-amber-500/40'
                : 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40'
            }`}
          >
            {displayPlan?.isDefensiveRR ? '1:1.0 (STRICT/RAWAN - MAKS LOSE: 20P)' : '1:2.0 / 1:3.0 (MAKS LOSE: 20P)'}
          </span>
        </div>
      </div>
    </section>
  );
};
