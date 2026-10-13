export type TimeframeType = '1M' | '5M' | '15M' | '30M' | '1H';
export type AssetSymbol = 'XAUUSD' | 'EURUSD' | 'BTCUSD';

export type MarketRegimeType =
  | 'TRENDING BULLISH'
  | 'TRENDING BEARISH'
  | 'RANGE'
  | 'HIGH VOLATILITY'
  | 'UNCLEAR';

export type DecisionType =
  | 'LONG SETUP DEVELOPING'
  | 'SHORT SETUP DEVELOPING'
  | 'WAIT FOR CONFIRMATION'
  | 'NO TRADE';

export type BiasType = 'Bullish' | 'Bearish' | 'Neutral';
export type MomentumType = 'Strong' | 'Moderate' | 'Weak';
export type StructureType = 'Bullish' | 'Bearish' | 'Range';
export type RiskLevelType = 'Low' | 'Medium' | 'High';

export interface AccuratePriceStats {
  exactPrice: number;
  change24hDollar: number;
  change24hPercent: number;
  dayHigh: number;
  dayLow: number;
  dayRangeDollars: number;
  dayRangePips: number;
  sessionOpenPrice: number;
  sessionChangePercent: number;
  prevClose: number;
  spreadEstimatePips: number;
}

export interface MarketSnapshot {
  price: string;
  symbol?: AssetSymbol;
  priceStats?: AccuratePriceStats;
  timestamp: string;
  session: string;
  marketRegime: MarketRegimeType;
  volatility: RiskLevelType;
  goldContext: string;
  dxyContext: string;
  yieldsContext: string;
  fedContext: string;
  macroContext: string;
  geopoliticsContext: string;
  riskSentiment: 'Risk-On' | 'Risk-Off' | 'Mixed / Neutral';
}

export interface LiquidityLevelItem {
  label: string; // e.g. EQH, PDH, PWH, Asian High, London Low, EQL, PDL, PWL
  price: string;
  priceNum: number;
  distancePips: number;
  status: 'Untested' | 'Swept' | 'Nearest Target' | 'Active Pool';
  type: 'BUY_SIDE' | 'SELL_SIDE';
}

export interface LiquidityEventDetail {
  eventType:
    | 'Liquidity Sweep'
    | 'False Breakout'
    | 'Liquidity Grab'
    | 'Rejection'
    | 'Displacement after Sweep'
    | 'Liquidity Run / Continuation'
    | 'None / Ranging';
  levelSwept: string;
  sweepDirection: 'Above Buy-side' | 'Below Sell-side' | 'Neutral';
  reEnteredRange: boolean;
  displacement: boolean;
  mssAfterSweep: boolean;
  description: string;
}

export interface LiquidityMap {
  buySideLiquidity: LiquidityLevelItem[];
  sellSideLiquidity: LiquidityLevelItem[];
  lastLiquidityEvent: LiquidityEventDetail;
  notes: string;
}

export interface MarketStructureDetail {
  htfBias: 'Bullish' | 'Bearish' | 'Neutral / Ranging';
  ltfStructure: 'Bullish' | 'Bearish' | 'Consolidation / Range';
  bos: string;
  mss: string;
  choch: string;
  internalStructure: string;
  externalStructure: string;
  phase: 'Expansion' | 'Consolidation' | 'Reversal' | 'Pullback';
}

export interface PriceActionEntryZones {
  fvg: string;
  ifvg: string;
  orderBlock: string;
  breakerBlock: string;
  mitigationBlock: string;
  equilibrium50: string;
  premiumDiscount: 'Premium' | 'Discount' | 'Equilibrium';
  keySupport: string;
  keyResistance: string;
  recentCandleReaction: string;
}

export interface ScalpingDetail {
  enabled: boolean;
  timeframe: '1M' | '5M' | '15M';
  scalpBias: 'SCALP LONG' | 'SCALP SHORT' | 'STAND ASIDE';
  microTrigger: string;
  microEntryZone: string;
  tightInvalidation: string;
  slPips: number;
  quickTarget: string;
  tp1Price: string;
  tp1Pips: number;
  tp1RR: string; // e.g. "1:2.0"
  tp2Price: string;
  tp2Pips: number;
  tp2RR: string; // e.g. "1:3.0"
  tp3Price?: string;
  tp3Pips?: number;
  tp3RR?: string; // e.g. "1:4.0"
  estimatedRR: string;
  isDefensiveRR?: boolean;
  defensiveReason?: string;
  strictRawanConditions?: string[];
  primaryLiquidity: string;
  marketVolatility: 'Low' | 'Normal' | 'High' | 'Extreme';
  tpQuality: 'Valid' | 'Weak' | 'Invalid';
  volatilityWarning: string;
  executionTip: string;
}



export type PlanExecutionStatus =
  | 'ACTIVE_NOW' // Currently in entry zone right now
  | 'PENDING_ENTRY' // Approaching / waiting for pullback to entry
  | 'WATCHING_CONFIRMATION' // In zone, awaiting confirmation candle
  | 'MISSED_PASSED' // Price already moved far away or hit target (terlewat)
  | 'INVALIDATED'; // Breached invalidation / stop loss

export interface ExactTradePlan {
  planId: 'PLAN_A' | 'PLAN_B' | 'PLAN_SCALP';
  type: 'BUY_SETUP' | 'SELL_SETUP' | 'SCALP_SETUP';
  title: string;
  orderType: string;
  entryZone: string;
  entryExactPrice: string;
  entryExactNum?: number;
  stopLossExact: string;
  stopLossNum?: number;
  stopLossPips: number;
  takeProfit1: string;
  takeProfit1Num?: number;
  takeProfit1Pips: number;
  tp1RR: string; // e.g. "1:2.0"
  takeProfit2: string;
  takeProfit2Num?: number;
  takeProfit2Pips: number;
  tp2RR: string; // e.g. "1:3.0"
  takeProfit3?: string;
  takeProfit3Num?: number;
  takeProfit3Pips?: number;
  tp3RR?: string; // e.g. "1:4.0"
  rrRatio: string;
  isDefensiveRR?: boolean; // True jika kondisi strict atau rawan memicu target defensif 1:1.0
  defensiveReason?: string; // Penjelasan alasan penyesuaian RR ke 1:1.0 (volatilitas, chop, news, counter-trend)
  strictRawanConditions?: string[]; // Daftar faktor risiko pemicu RR 1:1.0
  primaryLiquidity: string;
  marketVolatility: 'Low' | 'Normal' | 'High' | 'Extreme';
  tpQuality: 'Valid' | 'Weak' | 'Invalid';
  conflictNote?: string;
  timeframe: TimeframeType;
  decision: DecisionType;
  triggerCondition: string;
  confirmationRules: string[];
  status: PlanExecutionStatus;
  statusLabel?: string; // e.g. "SIAP EKSEKUSI DI AREA", "MENUNGGU PULLBACK", "ENTRY SUDAH TERLEWAT", "STRUKTUR BATAL"
  statusDetail?: string; // Penjelasan posisi harga live relatif thd entry
  pipsFromEntry?: number; // Jarak pips harga spot dari titik entry
  isMissed?: boolean; // True jika harga sudah lari jauh / target sudah tersentuh
  isInvalidated?: boolean; // True jika SL / batas struktur tertembus
  isCurrentPatternActive?: boolean;
  estimatedAtrPips?: number;
  antiSweepBufferPips?: number;
  bepActivationRule?: string;
  recommendedLot1Pct?: number;
  candleConfirmationRequirement?: string;
}

export interface TradeEntryStructure {
  direction:
    | DecisionType
    | 'LONG'
    | 'SHORT'
    | 'WAIT FOR CONFIRMATION'
    | 'NO TRADE'
    | 'LONG SETUP DEVELOPING'
    | 'SHORT SETUP DEVELOPING'
    | 'ENTRY TERLEWAT - MENUNGGU STRUKTUR BARU';
  htfBias: string;
  marketRegime: string;
  liquidityTarget: string;
  liquidityEvent: string;
  confirmation: string;
  entryZone: string;
  invalidation: string;
  target: string;
  rr: string;
  reasons: string[];
  whatCouldMakeWrong: string;
  exactPlans?: ExactTradePlan[];
  patternAdjustmentNote?: string;
  isAdaptedToRecentMovement?: boolean;
}

export interface TechnicalContext {
  available: boolean;
  notes: string;
  trend: string;
  marketStructure: string;
  momentum: string;
  supportResistance: string;
  liquidityZones: string;
  fvg: string;
  orderBlock: string;
  breakoutRejection: string;
  sessionContext: string;
}

export interface FactorAssessment {
  trend: BiasType;
  momentum: MomentumType;
  structure: StructureType;
  liquidity: BiasType;
  macro: BiasType;
  newsRisk: RiskLevelType;
  volatility: RiskLevelType;
  bullishFactors: string[];
  bearishFactors: string[];
  conflictingFactors: string[];
}

export interface TradingScenario {
  trigger: string;
  confirmation: string;
  invalidation: string;
  riskContext: string;
  targetLiquidity?: string;
}

export interface ScenarioAnalysis {
  bullishScenario: TradingScenario;
  bearishScenario: TradingScenario;
  noTradeScenario: TradingScenario;
}

export interface DecisionSupport {
  decision: DecisionType;
  reasons: string[];
  setupQuality: number; // 0 - 10
  setupQualityExplanation: string;
}

export interface OrderFlowImbalanceItem {
  price: string;
  priceNum: number;
  bidVol: number;
  askVol: number;
  imbalanceType: 'BUY_IMBALANCE' | 'SELL_IMBALANCE' | 'ABSORPTION';
  ratio: string;
}

export interface OrderFlowData {
  cumulativeVolumeDelta: number; // e.g. +3850 lots
  cvdTrend: 'Bullish Divergence' | 'Bearish Divergence' | 'Bullish Flow' | 'Bearish Flow' | 'Neutral';
  buyVolumeLots: number;
  sellVolumeLots: number;
  buyVolumePercent: number;
  sellVolumePercent: number;
  deltaBias: string;
  imbalances: OrderFlowImbalanceItem[];
  stackedImbalanceZone: string;
  absorptionAlert: string;
}

export interface RestingLiquidityBand {
  price: string;
  priceNum: number;
  volumeLots: number;
  type: 'BUY_SIDE_LIQUIDITY' | 'SELL_SIDE_LIQUIDITY';
  distancePips: number;
  intensity: 'High' | 'Medium' | 'Extreme';
  description: string;
}

export interface LiquidityTrackData {
  restingLiquidityBands: RestingLiquidityBand[];
  totalRestingBuyStopsLots: number;
  totalRestingSellStopsLots: number;
  nearestMagnetPool: {
    price: string;
    distancePips: number;
    type: string;
    volumeLots: number;
  };
  liquidityVelocity: 'Rapid Absorption' | 'Spoofing & Pulling' | 'Dense Replenishment' | 'Normal Flow';
  sentimentBias: string;
}

export interface OrderBookLevel {
  price: number;
  priceStr: string;
  lots: number;
  cumulativeLots: number;
  percent: number;
}

export interface OrderBookData {
  spreadPips: number;
  spreadDollar: number;
  bestBid: number;
  bestAsk: number;
  bidDepthTotalLots: number;
  askDepthTotalLots: number;
  bidDepthPercent: number;
  askDepthPercent: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  topBidWall: { price: string; lots: number; note: string };
  topAskWall: { price: string; lots: number; note: string };
}

export interface VolumeBubbleItem {
  id: string;
  timestamp: string;
  price: number;
  priceStr: string;
  volumeLots: number;
  side: 'BUY' | 'SELL';
  deltaLots: number;
  classification: 'Whale Absorption' | 'Aggressive Sweep' | 'Institutional Block' | 'Retail FVG Fill' | 'Stop Run Cluster';
  xPercent: number; // 0 - 100 on canvas
  yPercent: number; // 0 - 100 on canvas
  relativeSize: number; // 1 to 5 scale
}

export interface LiquidityHeatmapLevel {
  price: number;
  priceStr: string;
  volumeLots: number;
  valueUsdStr: string;
  intensityPercent: number; // 0 to 100 for thermal coloring
  tier: 'EXTREME_CLUSTER' | 'HIGH_DENSITY' | 'MEDIUM_DENSITY' | 'LOW_DENSITY';
  poolType: 'SHORT_LIQUIDATION_BUY_STOPS' | 'LONG_LIQUIDATION_SELL_STOPS';
  distancePips: number;
  sweepProbability: number; // 0 to 100
  isAbovePrice: boolean;
  clusterLabel: string;
}

export interface LiquidityHeatmapData {
  levels: LiquidityHeatmapLevel[];
  topOverheadCluster: { price: string; volumeLots: number; valueUsd: string; distancePips: number };
  topUnderlyingCluster: { price: string; volumeLots: number; valueUsd: string; distancePips: number };
  totalOverheadLiquidityLots: number;
  totalUnderlyingLiquidityLots: number;
  overheadLiquidityUsd: string;
  underlyingLiquidityUsd: string;
  dominantMagnetSide: 'BUY_SIDE_OVERHEAD' | 'SELL_SIDE_UNDERLYING' | 'BALANCED';
  magnetSummary: string;
}

export interface LargePrintItem {
  id: string;
  time: string;
  price: string;
  lots: number;
  valueUsd: string;
  type: 'BUY' | 'SELL';
  executionStyle: 'Aggressive Taker' | 'Passive Iceberg Block' | 'Liquidity Sweep';
  impact: 'Bullish Push' | 'Bearish Pressure' | 'Absorption';
}

export interface WhaleTrackingData {
  whaleActivityIndex: number; // 0 - 100
  whaleBias: 'Heavy Institutional Accumulation' | 'Aggressive Whale Distribution' | 'Neutral Iceberg Positioning';
  whaleNetLots: number;
  whaleBuyLots: number;
  whaleSellLots: number;
  largePrints: LargePrintItem[];
  keyInsight: string;
}

export interface ContrarianCheck {
  title: string;
  failureModes: string[];
  trapScenarios: string;
}

export interface NewsRiskEvent {
  event: string;
  time: string;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH';
  generalImpact: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface WebSource {
  title: string;
  url: string;
}

export interface QuantAnalysisResult {
  timeframe: TimeframeType;
  symbol?: AssetSymbol;
  snapshot: MarketSnapshot;
  technical: TechnicalContext;
  structureDetail: MarketStructureDetail;
  liquidityMap: LiquidityMap;
  priceActionZones: PriceActionEntryZones;
  scalpingDetail: ScalpingDetail;
  tradeSetup: TradeEntryStructure;
  factors: FactorAssessment;
  scenarios: ScenarioAnalysis;
  decision: DecisionSupport;
  contrarian: ContrarianCheck;
  newsRisk: NewsRiskEvent[];
  sources: WebSource[];
  searchQueries: string[];
  factualVsInterpretationNote: string;
  timestamp: string;
  orderFlow?: OrderFlowData;
  liquidityTrack?: LiquidityTrackData;
  orderBook?: OrderBookData;
  volumeBubbles?: VolumeBubbleItem[];
  whaleTracking?: WhaleTrackingData;
  liquidityHeatmap?: LiquidityHeatmapData;
}

export interface RiskCalculatorInput {
  balance: number;
  riskPercent: number;
  direction: 'LONG' | 'SHORT';
  entryPrice: number | '';
  stopLoss: number | '';
  takeProfit: number | '';
  symbol?: AssetSymbol;
  contractSize?: number; // Standard: 100 oz per lot XAUUSD, 100,000 for EURUSD
  maxDailyRiskPercent?: number; // e.g. 3%
  currentDailyLossAmount?: number; // e.g. 50
  maxAccountDrawdownPercent?: number; // e.g. 10%
}

export interface RiskCalculatorOutput {
  riskAmount: number;
  potentialProfit: number;
  potentialLoss: number;
  rewardToRisk: number | null;
  slDistancePoints: number;
  slDistancePips: number;
  tpDistancePoints: number;
  tpDistancePips: number;
  lotSize: number;
  isValid: boolean;
  warning: string | null;
  remainingDailyRiskAmount: number;
  remainingDailyRiskPercent: number;
  remainingDrawdownAmount: number;
  isDailyRiskExceeded: boolean;
}

export type TradeOutcomeStatus = 'PENDING' | 'OPEN' | 'WIN' | 'LOSS' | 'BREAK_EVEN' | 'CANCELLED';

export type TradeCloseReason =
  | 'HIT_TP1'
  | 'HIT_TP2'
  | 'HIT_TP3'
  | 'HIT_SL'
  | 'HIT_TRAILING_STOP'
  | 'BREAK_EVEN'
  | 'MANUAL_CLOSE'
  | 'INVALIDATED'
  | 'PENDING';

export interface RecordedDecision {
  id: string;
  timestamp: string; // ISO string
  timestampFormatted?: string; // Formatted e.g. "Senin, 21 Sep 2026, 15:23:45 WIB"
  closedTimestamp?: string; // ISO string when trade is closed
  closedTimestampFormatted?: string; // Formatted e.g. "Senin, 21 Sep 2026, 15:48:12 WIB"
  durationFormatted?: string; // e.g. "24m 27s"
  dateKey: string; // YYYY-MM-DD
  symbol: AssetSymbol; // 'XAUUSD' | 'EURUSD' | 'BTCUSD'
  timeframe: TimeframeType;
  direction: 'BUY' | 'SELL' | 'WAIT';
  planId?: string;
  planTitle: string;
  orderType: string;
  entryPrice: number;
  entryPriceFormatted: string;
  stopLoss: number;
  stopLossFormatted: string;
  takeProfit1: number;
  takeProfit1Formatted: string;
  takeProfit2?: number;
  takeProfit2Formatted?: string;
  takeProfit3?: number;
  takeProfit3Formatted?: string;
  projectedRR: string; // e.g. "1:2.5"
  setupQuality: number; // 0-10
  status: TradeOutcomeStatus;
  outcomeReason?: TradeCloseReason;
  entryTriggered?: boolean;
  entryTriggeredTimestamp?: string;
  entryTriggeredTimestampFormatted?: string;
  exitPrice?: number;
  exitPriceFormatted?: string;
  pipsGained: number; // +45 or -20
  pnlPercent: number; // +2.5% or -1.0%
  pnlUsd: number; // e.g. +$250 or -$100
  lotSize: number; // e.g. 0.50
  notes?: string;
  autoRecorded?: boolean;
  isBreakEvenActive?: boolean;
  breakEvenPrice?: number;
  isTrailingActive?: boolean;
  trailingStopPrice?: number;
  trailingStopPriceFormatted?: string;
  trailingStopPipsLocked?: number;
  highestFloatingPips?: number;
  antiSweepBufferPips?: number;
  confirmationRuleRequired?: string;
}

export interface LiveOpenPositionSituation {
  currentSpotPrice: number;
  currentPriceFormatted: string;
  isTriggered: boolean;
  pipsUntilFill?: number;
  priceMovementPoints: number;
  priceMovementPips: number;
  priceDirection: 'UP' | 'DOWN' | 'FLAT';
  priceDirectionText: string;
  floatingPips: number;
  floatingPipsFormatted: string;
  isFloatingProfit: boolean;
  isFloatingDrawdown: boolean;
  isBreakeven: boolean;
  floatingStatusText: string;
  floatingPnlUsd: number;
  floatingPnlPercent: number;
  tp1RemainingPips: number;
  isTp1Reached: boolean;
  slBufferPips: number;
  isSlReached: boolean;
  gaugeProgressPct: number;
  entryGaugePct: number;
  isEligibleForBE: boolean;
  isEligibleForTrailing: boolean;
  isTrailingActive: boolean;
  trailingStopPrice?: number;
  trailingStopPriceFormatted?: string;
  trailingPipsLocked?: number;
  highestFloatingPips?: number;
  trailingDistancePips?: number;
}

export interface DayTradeSummary {
  dateKey: string; // YYYY-MM-DD
  totalTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  openTrades: number;
  netPnlUsd: number;
  netPnlPercent: number;
  netPips: number;
  winRate: number; // 0-100%
  trades: RecordedDecision[];
}

export interface WinratePerformanceStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRatePercent: number; // e.g. 68.5%
  lossRatePercent: number; // e.g. 28.5%
  netPnlUsd: number;
  netPnlPercent: number;
  netPips: number;
  profitFactor: number;
  averageRR: string;
  bestWinStreak: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  winRateBySymbol: {
    XAUUSD: { total: number; wins: number; losses: number; winRate: number; netPnlUsd: number };
    EURUSD: { total: number; wins: number; losses: number; winRate: number; netPnlUsd: number };
    BTCUSD: { total: number; wins: number; losses: number; winRate: number; netPnlUsd: number };
  };
  winRateByTimeframe: Record<TimeframeType, { total: number; wins: number; winRate: number }>;
  winRateByDirection: {
    BUY: { total: number; wins: number; winRate: number };
    SELL: { total: number; wins: number; winRate: number };
  };
}
