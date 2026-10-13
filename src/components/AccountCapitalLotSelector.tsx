import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Layers,
  ShieldCheck,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  Info,
  DollarSign,
  AlertCircle,
  Zap,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { AssetSymbol } from '../types.ts';
import {
  AccountSettings,
  LotSizeMode,
  STRICT_COMPOUNDING_TIERS,
  getAccountSettings,
  saveAccountSettings,
  calculateEffectiveLotSize,
  getCurrentCompoundingTier,
} from '../utils/accountSettings.ts';

interface AccountCapitalLotSelectorProps {
  symbol?: AssetSymbol;
  slPips?: number;
  onSettingsChange?: (settings: AccountSettings) => void;
}

const PRESET_BALANCES = [500, 1000, 2500, 5000, 10000];
const STRICT_LOT_PRESETS: Array<{ lot: number; mode: LotSizeMode; label: string; desc: string }> = [
  { lot: 0.01, mode: 'PRESET_001', label: '0.01', desc: 'Modal Awal' },
  { lot: 0.02, mode: 'PRESET_002', label: '0.02', desc: 'Tier 2' },
  { lot: 0.03, mode: 'PRESET_003', label: '0.03', desc: 'Tier 3' },
  { lot: 0.04, mode: 'PRESET_004', label: '0.04', desc: 'Tier 4' },
  { lot: 0.05, mode: 'PRESET_005', label: '0.05', desc: 'Tier Max' },
];

export const AccountCapitalLotSelector: React.FC<AccountCapitalLotSelectorProps> = ({
  symbol = 'XAUUSD',
  slPips = 20,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<AccountSettings>(getAccountSettings());
  const [isCustomBalance, setIsCustomBalance] = useState<boolean>(false);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>(String(settings.balance));
  const [customLotInput, setCustomLotInput] = useState<string>(String(settings.customLot));

  useEffect(() => {
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AccountSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener('account-settings-changed', handleSettingsUpdate);
    return () => {
      window.removeEventListener('account-settings-changed', handleSettingsUpdate);
    };
  }, []);

  const updateAndSave = (newSettings: AccountSettings) => {
    setSettings(newSettings);
    saveAccountSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleSelectBalance = (val: number) => {
    setIsCustomBalance(false);
    setCustomBalanceInput(String(val));
    updateAndSave({ ...settings, balance: val });
  };

  const handleCustomBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomBalanceInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      updateAndSave({ ...settings, balance: num });
    }
  };

  const handleSelectLotMode = (mode: LotSizeMode) => {
    updateAndSave({ ...settings, lotMode: mode });
  };

  const handleCustomLotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomLotInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num > 0) {
      updateAndSave({ ...settings, lotMode: 'CUSTOM', customLot: num });
    }
  };

  const effective = calculateEffectiveLotSize(settings, slPips, symbol);
  const activeTier = getCurrentCompoundingTier(settings.balance);

  return (
    <div className="bg-slate-950/95 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/40 mb-5 relative overflow-hidden ring-1 ring-amber-500/20">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-800 gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-400">
                MANAJEMEN MODAL STRICT $2,500 USD & AUTO COMPOUNDING LOT
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 font-bold">
                Strict Risk Matrix (Maks 20 Pips)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Mulai 0.01 Lot di Modal $2,500 &mdash; Menaikkan Lot Bertahap (0.02 &rarr; 0.03 &rarr; 0.04 &rarr; 0.05) Otomatis
            </h3>
          </div>
        </div>

        {/* Live Active Badge */}
        <div className="bg-slate-900/90 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-3 shrink-0 shadow-inner">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-400 text-[10px]">LOT EKSEKUSI:</span>
            <span className="font-extrabold text-amber-300 text-sm tracking-tight">{effective.lotSize} Lot</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">MAX RISK (SL 20P):</span>
            <span className="font-extrabold text-rose-400 text-xs">-${effective.riskUsd} ({effective.riskPercent}%)</span>
          </div>
        </div>
      </div>

      {/* AUTO COMPOUNDING TIER LADDER BANNER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mb-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-200">
              TANGGA AUTO-COMPOUNDING STRICT (MODAL $2,500 USD BASE):
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Saldo Saat Ini:</span>
            <strong className="text-emerald-400 text-sm font-bold">${settings.balance.toLocaleString()}</strong>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50 text-[10px] font-bold">
              Tier Aktif: {activeTier.tierNumber} ({activeTier.lotSize} Lot)
            </span>
          </div>
        </div>

        {/* 5 Tiers Progress Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STRICT_COMPOUNDING_TIERS.map((tier) => {
            const isCurrent = activeTier.tierNumber === tier.tierNumber;
            const isPassed = settings.balance >= tier.maxBalance;

            return (
              <div
                key={tier.tierNumber}
                onClick={() => {
                  updateAndSave({
                    ...settings,
                    lotMode: 'AUTO_COMPOUND_TIER',
                  });
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                    : isPassed
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-slate-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-amber-300' : 'text-slate-400'}`}>
                    Tier {tier.tierNumber}
                  </span>
                  <span className={`text-xs font-mono font-black ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                    {tier.lotSize} Lot
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  {tier.maxBalance === Infinity ? '>$7,000' : `$${tier.minBalance.toLocaleString()} - $${tier.maxBalance.toLocaleString()}`}
                </div>
                {isCurrent && (
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-amber-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>SEDANG AKTIF</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Description of active tier */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <p className="text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{activeTier.description}</span>
          </p>
          {effective.nextTierBalance && effective.nextTierBalance < Infinity && (
            <div className="text-amber-400/90 whitespace-nowrap text-[10px] font-bold">
              Menuju Tier Berikutnya: Butuh +${(effective.nextTierBalance - settings.balance).toFixed(2)} lagi ({effective.progressToNextTierPercent}%)
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Modal Input & Lot Selection Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* Kolom 1: Pilihan Modal Akun (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>1. MODAL AKUN / BALANCE ($ USD):</span>
            </label>
            <span className="text-xs font-mono font-black text-emerald-400">
              ${settings.balance.toLocaleString()}
            </span>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_BALANCES.map((bal) => {
              const isSelected = !isCustomBalance && settings.balance === bal;
              return (
                <button
                  key={bal}
                  type="button"
                  onClick={() => handleSelectBalance(bal)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all border text-center ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  ${bal >= 1000 ? `${bal / 1000}k` : bal}
                </button>
              );
            })}
          </div>

          {/* Custom Balance Input */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-500">$</span>
              <input
                type="number"
                min="100"
                step="50"
                value={customBalanceInput}
                onChange={handleCustomBalanceChange}
                onFocus={() => setIsCustomBalance(true)}
                placeholder="2500"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
              Input Modal Manual
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            *Modal awal standar yang Anda tetapkan adalah <strong className="text-amber-300">$2,500 USD</strong>. Sistem menjaga risiko per trade sangat kecil di awal.
          </div>
        </div>

        {/* Kolom 2: Pilihan Ukuran Lot (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>2. MODE EKSEKUSI LOT (STRICT COMPOUNDING):</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              Aktif: <strong className="text-amber-300">{effective.label}</strong>
            </span>
          </div>

          {/* AUTO COMPOUNDING BUTTON (UTAMA) */}
          <button
            type="button"
            onClick={() => handleSelectLotMode('AUTO_COMPOUND_TIER')}
            className={`w-full p-2.5 rounded-xl border font-mono transition-all text-left flex items-center justify-between ${
              settings.lotMode === 'AUTO_COMPOUND_TIER'
                ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-400 text-white shadow-lg ring-1 ring-amber-400/40'
                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${settings.lotMode === 'AUTO_COMPOUND_TIER' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300">AUTO-COMPOUNDING TIER (REKOMENDASI STRICT)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
                    OTOMATIS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Mulai 0.01 lot di $2,500, otomatis naik ke 0.02, 0.03, 0.04, 0.05 saat modal bertambah
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-amber-300 block">{activeTier.lotSize} Lot</span>
              <span className="text-[9px] text-slate-400 block">Tier {activeTier.tierNumber}</span>
            </div>
          </button>

          {/* Quick Strict Lot Presets */}
          <div className="grid grid-cols-5 gap-1.5">
            {STRICT_LOT_PRESETS.map((p) => {
              const isSelected = settings.lotMode === p.mode;
              return (
                <button
                  key={p.lot}
                  type="button"
                  onClick={() => handleSelectLotMode(p.mode)}
                  className={`p-1.5 rounded-lg border text-center font-mono transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs block font-bold">{p.lot} Lot</span>
                  <span className={`text-[9px] block ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Other Optional Modes: Auto 1%, Auto 2%, Custom */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {/* Auto 1% */}
            <button
              type="button"
              onClick={() => handleSelectLotMode('AUTO_1PCT')}
              className={`p-1.5 rounded-lg border text-left font-mono transition-all ${
                settings.lotMode === 'AUTO_1PCT'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400">AUTO 1%</span>
                <Percent className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="text-[9px] text-slate-400 block">Maks $25 risk</span>
            </button>

            {/* Auto 2% */}
            <button
              type="button"
              onClick={() => handleSelectLotMode('AUTO_2PCT')}
              className={`p-1.5 rounded-lg border text-left font-mono transition-all ${
                settings.lotMode === 'AUTO_2PCT'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400">AUTO 2%</span>
                <Percent className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="text-[9px] text-slate-400 block">Maks $50 risk</span>
            </button>

            {/* Custom Input */}
            <div
              className={`p-1 rounded-lg border font-mono transition-all flex flex-col justify-between ${
                settings.lotMode === 'CUSTOM'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-[10px] font-bold text-amber-300 block px-1">CUSTOM</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={customLotInput}
                onChange={handleCustomLotChange}
                onFocus={() => handleSelectLotMode('CUSTOM')}
                placeholder="0.01"
                className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Reality Matrix / Simulasi Uang Nyata */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-mono text-xs relative z-10">
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">UKURAN LOT AKTIF</span>
          <span className="text-sm font-black text-amber-300 block mt-0.5">
            {effective.lotSize} Lot
          </span>
          <span className="text-[10px] text-slate-400 block">
            {effective.label}
          </span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-rose-900/50">
          <span className="text-[10px] text-rose-400 block font-bold">RESIKO MAKSIMAL CUT LOSS (20 PIPS)</span>
          <span className="text-sm font-black text-rose-300 block mt-0.5">
            -${effective.riskUsd.toFixed(2)}
          </span>
          <span className="text-[10px] text-rose-400/90 block">
            Hanya {effective.riskPercent}% dari Modal ${settings.balance.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-900/50">
          <span className="text-[10px] text-emerald-400 block font-bold">TARGET PROFIT TP1 (RR 1:2.0 / 40 PIPS)</span>
          <span className="text-sm font-black text-emerald-300 block mt-0.5">
            +${effective.rewardTp1Usd.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-400/90 block">
            +{(effective.riskPercent * 2).toFixed(2)}% dari Modal Akun
          </span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-900/50">
          <span className="text-[10px] text-emerald-400 block font-bold">TARGET PROFIT TP2 (RR 1:3.0 / 60 PIPS)</span>
          <span className="text-sm font-black text-emerald-300 block mt-0.5">
            +${effective.rewardTp2Usd.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-400/90 block">
            +{(effective.riskPercent * 3).toFixed(2)}% dari Modal Akun
          </span>
        </div>
      </div>
    </div>
  );
};
