import { AssetSymbol } from '../types.ts';

export type LotSizeMode =
  | 'AUTO_COMPOUND_TIER' // Mode Strict Rekomendasi: Mulai 0.01 di $2.500, naik bertahap 0.02, 0.03, 0.04, 0.05
  | 'PRESET_001'
  | 'PRESET_002'
  | 'PRESET_003'
  | 'PRESET_004'
  | 'PRESET_005'
  | 'PRESET_01'
  | 'PRESET_1'
  | 'AUTO_1PCT'
  | 'AUTO_2PCT'
  | 'CUSTOM';

export interface CompoundingTierRule {
  tierNumber: number;
  lotSize: number;
  minBalance: number;
  maxBalance: number;
  label: string;
  description: string;
}

/**
 * STRICT COMPOUNDING TIERS untuk modal awal $2,500 USD:
 * Tier 1: $2,500 - $3,200  => Lot 0.01 (Fase Pengujian Modal Aman & Konservatif)
 * Tier 2: $3,200 - $4,200  => Lot 0.02 (Naik bertahap setelah profit +$700)
 * Tier 3: $4,200 - $5,500  => Lot 0.03 (Naik bertahap setelah profit +$1,700)
 * Tier 4: $5,500 - $7,000  => Lot 0.04 (Naik bertahap setelah profit +$3,000)
 * Tier 5: > $7,000         => Lot 0.05 (Skala maksimal untuk akun $2,500 bertumbuh)
 */
export const STRICT_COMPOUNDING_TIERS: CompoundingTierRule[] = [
  {
    tierNumber: 1,
    lotSize: 0.01,
    minBalance: 0,
    maxBalance: 3200,
    label: 'Tier 1: 0.01 Lot',
    description: 'Modal Awal $2,500 - $3,200: Disiplin mikro, risiko maksimal lose 20 pips hanya -$2.00 (0.08% akun).',
  },
  {
    tierNumber: 2,
    lotSize: 0.02,
    minBalance: 3200,
    maxBalance: 4200,
    label: 'Tier 2: 0.02 Lot',
    description: 'Modal $3,200 - $4,200: Menaikkan lot secara terukur setelah akumulasi profit +$700 tercapai.',
  },
  {
    tierNumber: 3,
    lotSize: 0.03,
    minBalance: 4200,
    maxBalance: 5500,
    label: 'Tier 3: 0.03 Lot',
    description: 'Modal $4,200 - $5,500: Pertumbuhan portofolio lanjutan, risiko tetap strict terkendali.',
  },
  {
    tierNumber: 4,
    lotSize: 0.04,
    minBalance: 5500,
    maxBalance: 7000,
    label: 'Tier 4: 0.04 Lot',
    description: 'Modal $5,500 - $7,000: Akun sudah melipatgandakan modal lebih dari 100% secara sehat.',
  },
  {
    tierNumber: 5,
    lotSize: 0.05,
    minBalance: 7000,
    maxBalance: Infinity,
    label: 'Tier 5: 0.05 Lot',
    description: 'Modal > $7,000: Batas lot aman teratas untuk strategi ini agar bebas overleveraging.',
  },
];

export interface AccountSettings {
  initialBalance: number; // e.g. 2500 USD
  balance: number; // Current equity/balance in USD
  lotMode: LotSizeMode;
  customLot: number;
  riskPercent: number; // e.g. 1.0 or 2.0
  autoScaleEnabled: boolean; // strict auto compounding ladder
  strictDrawdownProtection: boolean; // turunkan lot jika modal drawdown
}

const SETTINGS_KEY = 'user_account_trade_settings_v2';

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  initialBalance: 2500,
  balance: 2500,
  lotMode: 'AUTO_COMPOUND_TIER',
  customLot: 0.01,
  riskPercent: 1.0,
  autoScaleEnabled: true,
  strictDrawdownProtection: true,
};

export function getAccountSettings(): AccountSettings {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      // Periksa v1 legacy jika ada
      const legacyRaw = localStorage.getItem('user_account_trade_settings_v1');
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        return {
          ...DEFAULT_ACCOUNT_SETTINGS,
          balance: typeof parsedLegacy.balance === 'number' && parsedLegacy.balance > 0 ? parsedLegacy.balance : 2500,
        };
      }
      return DEFAULT_ACCOUNT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      initialBalance: typeof parsed.initialBalance === 'number' && parsed.initialBalance > 0 ? parsed.initialBalance : 2500,
      balance: typeof parsed.balance === 'number' && parsed.balance > 0 ? parsed.balance : 2500,
      lotMode: parsed.lotMode || 'AUTO_COMPOUND_TIER',
      customLot: typeof parsed.customLot === 'number' && parsed.customLot > 0 ? parsed.customLot : 0.01,
      riskPercent: typeof parsed.riskPercent === 'number' && parsed.riskPercent > 0 ? parsed.riskPercent : 1.0,
      autoScaleEnabled: parsed.autoScaleEnabled !== false,
      strictDrawdownProtection: parsed.strictDrawdownProtection !== false,
    };
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS;
  }
}

export function saveAccountSettings(settings: AccountSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('account-settings-changed', { detail: settings }));
  } catch (err) {
    console.error('Failed to save account settings:', err);
  }
}

/**
 * Mencari tier compounding aktif saat ini berdasarkan saldo/equity akun
 */
export function getCurrentCompoundingTier(currentBalance: number): CompoundingTierRule {
  const safeBal = Math.max(0, currentBalance);
  for (const tier of STRICT_COMPOUNDING_TIERS) {
    if (safeBal >= tier.minBalance && safeBal < tier.maxBalance) {
      return tier;
    }
  }
  return STRICT_COMPOUNDING_TIERS[STRICT_COMPOUNDING_TIERS.length - 1];
}

/**
 * Calculates effective lot size based on account balance, symbol, stop loss pips, and chosen lot mode.
 */
export function calculateEffectiveLotSize(
  settings: AccountSettings,
  slPips: number = 20,
  symbol: AssetSymbol = 'XAUUSD'
): {
  lotSize: number;
  riskUsd: number;
  riskPercent: number;
  rewardTp1Usd: number;
  rewardTp2Usd: number;
  rewardTp3Usd: number;
  label: string;
  activeTier?: CompoundingTierRule;
  nextTierBalance?: number;
  progressToNextTierPercent?: number;
} {
  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';

  // Dollar value per pip per 1.00 standard lot:
  // XAUUSD: 1 pip ($0.10 move) * 100 oz contract = $10.00 / pip / standard lot ($0.10 / pip untuk 0.01 lot)
  // EURUSD: 1 pip (0.0001 move) * 100,000 units = $10.00 / pip / standard lot ($0.10 / pip untuk 0.01 lot)
  // BTCUSD: 1 pip ($1.00 move) * 1 BTC contract = $1.00 / pip / standard lot ($0.01 / pip untuk 0.01 lot)
  const dollarPerPipPerLot = isBtc ? 1.0 : 10.0;
  // Strict rule: maksimal loss dibatasi pada 20 pips
  const safeSlPips = Math.min(Math.max(1, slPips), 20);

  let lot = 0.01;
  let modeLabel = '0.01 Lot (Auto Strict Tier 1)';
  const currentTier = getCurrentCompoundingTier(settings.balance);

  let nextTierBalance: number | undefined;
  let progressToNextTierPercent: number | undefined;

  if (currentTier.tierNumber < 5) {
    nextTierBalance = currentTier.maxBalance;
    const tierSpan = currentTier.maxBalance - Math.max(2500, currentTier.minBalance);
    const progressInTier = Math.max(0, settings.balance - Math.max(2500, currentTier.minBalance));
    progressToNextTierPercent = Math.min(100, Math.round((progressInTier / (tierSpan || 1)) * 100));
  } else {
    progressToNextTierPercent = 100;
  }

  if (settings.lotMode === 'AUTO_COMPOUND_TIER') {
    lot = currentTier.lotSize;
    modeLabel = `Auto-Compounding Tier ${currentTier.tierNumber} (${lot.toFixed(2)} Lot)`;
  } else if (settings.lotMode === 'PRESET_001') {
    lot = 0.01;
    modeLabel = '0.01 Lot (Strict Micro)';
  } else if (settings.lotMode === 'PRESET_002') {
    lot = 0.02;
    modeLabel = '0.02 Lot (Strict Level 2)';
  } else if (settings.lotMode === 'PRESET_003') {
    lot = 0.03;
    modeLabel = '0.03 Lot (Strict Level 3)';
  } else if (settings.lotMode === 'PRESET_004') {
    lot = 0.04;
    modeLabel = '0.04 Lot (Strict Level 4)';
  } else if (settings.lotMode === 'PRESET_005') {
    lot = 0.05;
    modeLabel = '0.05 Lot (Strict Level 5)';
  } else if (settings.lotMode === 'PRESET_01') {
    lot = 0.10;
    modeLabel = '0.10 Lot (Mini)';
  } else if (settings.lotMode === 'PRESET_1') {
    lot = 1.00;
    modeLabel = '1.00 Lot (Standard)';
  } else if (settings.lotMode === 'CUSTOM') {
    lot = Math.max(0.01, Number(settings.customLot.toFixed(2)));
    modeLabel = `${lot.toFixed(2)} Lot (Custom)`;
  } else if (settings.lotMode === 'AUTO_1PCT' || settings.lotMode === 'AUTO_2PCT') {
    const riskPct = settings.lotMode === 'AUTO_1PCT' ? 1.0 : 2.0;
    const allowedRiskUsd = (settings.balance * riskPct) / 100;
    const dollarRiskPerLot = safeSlPips * dollarPerPipPerLot;
    if (dollarRiskPerLot > 0) {
      const calculated = allowedRiskUsd / dollarRiskPerLot;
      // Cap at 0.05 for strictly disciplined $2500 compounding
      lot = Math.min(0.05, Math.max(0.01, Number(calculated.toFixed(2))));
      modeLabel = `Auto ${riskPct}% (${lot.toFixed(2)} Lot)`;
    } else {
      lot = 0.01;
      modeLabel = `Auto ${riskPct}% (0.01 Lot)`;
    }
  }

  // Calculate actual risk and rewards
  const riskUsd = Number((lot * safeSlPips * dollarPerPipPerLot).toFixed(2));
  const effectiveRiskPercent = settings.balance > 0 ? Number(((riskUsd / settings.balance) * 100).toFixed(2)) : 0;

  // Realistis & Disiplin RR:
  // TP1 = 1:2.0 (40 pips jika SL 20 pips)
  // TP2 = 1:3.0 (60 pips jika SL 20 pips)
  // TP3 = 1:4.0 (80 pips jika SL 20 pips)
  const rewardTp1Usd = Number((riskUsd * 2.0).toFixed(2));
  const rewardTp2Usd = Number((riskUsd * 3.0).toFixed(2));
  const rewardTp3Usd = Number((riskUsd * 4.0).toFixed(2));

  return {
    lotSize: lot,
    riskUsd,
    riskPercent: effectiveRiskPercent,
    rewardTp1Usd,
    rewardTp2Usd,
    rewardTp3Usd,
    label: modeLabel,
    activeTier: currentTier,
    nextTierBalance,
    progressToNextTierPercent,
  };
}

/**
 * Sinkronisasi modal akun dengan akumulasi Net PnL dari hasil transaksi jurnal
 */
export function syncAccountBalanceWithJournal(netPnlUsd: number): AccountSettings {
  const settings = getAccountSettings();
  const base = settings.initialBalance || 2500;
  const newBalance = Math.max(100, Number((base + netPnlUsd).toFixed(2)));

  const updated: AccountSettings = {
    ...settings,
    balance: newBalance,
  };

  saveAccountSettings(updated);
  return updated;
}
