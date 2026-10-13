import React, { useState, useEffect } from 'react';
import { QuantAnalysisResult, TimeframeType, AssetSymbol } from './types.ts';
import { Header } from './components/Header.tsx';
import { MarketSnapshotPanel } from './components/MarketSnapshotPanel.tsx';
import { TradingViewChartPanel } from './components/TradingViewChartPanel.tsx';
import { BuySellConfirmationPanel } from './components/BuySellConfirmationPanel.tsx';
import { DecisionJournalPanel } from './components/DecisionJournalPanel.tsx';
import { InstitutionalFlowPanel } from './components/InstitutionalFlowPanel.tsx';
import { LiquidityMapPanel } from './components/LiquidityMapPanel.tsx';
import { MarketStructurePanel } from './components/MarketStructurePanel.tsx';
import { ScalpingPanel } from './components/ScalpingPanel.tsx';
import { TradeSetupPanel } from './components/TradeSetupPanel.tsx';
import { FactorPanel } from './components/FactorPanel.tsx';
import { TechnicalPanel } from './components/TechnicalPanel.tsx';
import { ScenarioPanel } from './components/ScenarioPanel.tsx';
import { DecisionPanel } from './components/DecisionPanel.tsx';
import { ContrarianPanel } from './components/ContrarianPanel.tsx';
import { NewsRiskPanel } from './components/NewsRiskPanel.tsx';
import { RiskCalculatorPanel } from './components/RiskCalculatorPanel.tsx';
import { SourcesPanel } from './components/SourcesPanel.tsx';
import { TraderContextInput } from './components/TraderContextInput.tsx';
import {
  isAutoRecordEnabled,
  recordDecisionFromAnalysis,
  syncTradesWithCandleHistoryApi,
  syncTradesWithServerStorage,
} from './utils/tradeJournal.ts';
import { Sparkles, AlertTriangle, Activity, Terminal, RotateCw, RefreshCw } from 'lucide-react';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<QuantAnalysisResult | null>(null);
  const [showTraderNotes, setShowTraderNotes] = useState<boolean>(false);
  const [userNotes, setUserNotes] = useState<string>('');
  const [userPrice, setUserPrice] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<AssetSymbol>('XAUUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('15M');
  const [isScalpMode, setIsScalpMode] = useState<boolean>(true);
  const [chartImage, setChartImage] = useState<string | null>(null);

  const runAnalysis = async (
    targetTf?: TimeframeType,
    targetSym?: AssetSymbol,
    triggerType: 'INITIAL_LOAD' | 'TAB_SWITCH' | 'MANUAL_TRIGGER' = 'MANUAL_TRIGGER'
  ) => {
    setIsLoading(true);
    setError(null);
    const tf = targetTf || selectedTimeframe;
    const sym = targetSym || selectedSymbol;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: sym,
          timeframe: tf,
          userNotes: userNotes.trim(),
          userPrice: userPrice.trim(),
          chartImage: chartImage || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses data pasar kuantitatif.');
      }

      setAnalysisData(data);
      // USER MANDATE: Jangan rekam trade saat buka app atau sekedar ganti timeframe/simbol
      // Hanya rekam jika user sengaja mengaktifkan auto-record DAN memicu tombol analisa manual
      if (triggerType === 'MANUAL_TRIGGER' && isAutoRecordEnabled() && data?.tradeSetup) {
        recordDecisionFromAnalysis(data, undefined, true);
      }
    } catch (err: any) {
      console.error('Fetch analysis failed:', err);
      setError(err.message || 'Gagal menghubungi server analitik.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTimeframe = (tf: TimeframeType) => {
    setSelectedTimeframe(tf);
    if (tf === '5M') {
      setIsScalpMode(true);
    }
    runAnalysis(tf, selectedSymbol, 'TAB_SWITCH');
  };

  const handleSelectSymbol = (sym: AssetSymbol) => {
    if (sym === selectedSymbol) return;
    setSelectedSymbol(sym);
    runAnalysis(selectedTimeframe, sym, 'TAB_SWITCH');
  };

  const handleClearSession = () => {
    setAnalysisData(null);
    setUserNotes('');
    setUserPrice('');
    setChartImage(null);
  };

  useEffect(() => {
    // 1. Muat dan sinkronisasi seluruh data hasil trade dari server (agar tidak reset/hilang)
    syncTradesWithServerStorage();

    // 2. Jalankan analisis pasar awal tanpa merekam trade otomatis baru
    runAnalysis('15M', 'XAUUSD', 'INITIAL_LOAD');

    // 3. Auto-sync historical candles on startup to resolve any trades that touched TP/SL while offline
    syncTradesWithCandleHistoryApi();

    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        syncTradesWithServerStorage();
        syncTradesWithCandleHistoryApi();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, []);

  const isEur = selectedSymbol === 'EURUSD';
  const isBtc = selectedSymbol === 'BTCUSD';

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation Terminal Header with Multi-Asset Tabs */}
      <Header
        isLoading={isLoading}
        onAnalyze={() => runAnalysis()}
        onRefresh={() => runAnalysis()}
        onClear={handleClearSession}
        onToggleTraderNotes={() => setShowTraderNotes((prev) => !prev)}
        showTraderNotes={showTraderNotes}
        hasAnalyzed={!!analysisData}
        timestamp={analysisData?.timestamp}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={handleSelectTimeframe}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={handleSelectSymbol}
        isScalpMode={isScalpMode}
        onToggleScalpMode={() => setIsScalpMode((prev) => !prev)}
        sessionName={analysisData?.snapshot?.session}
      />

      {/* Main Terminal Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
        {/* Trader Context & Chart Screenshot Input Drawer */}
        <TraderContextInput
          isOpen={showTraderNotes}
          onClose={() => setShowTraderNotes(false)}
          userNotes={userNotes}
          onChangeUserNotes={setUserNotes}
          userPrice={userPrice}
          onChangeUserPrice={setUserPrice}
          chartImage={chartImage}
          onSelectChartImage={setChartImage}
          selectedTimeframe={selectedTimeframe}
          onSelectTimeframe={handleSelectTimeframe}
          onApplyAndAnalyze={() => {
            setShowTraderNotes(false);
            runAnalysis();
          }}
          isLoading={isLoading}
        />

        {/* Error Alert Banner */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-600/50 rounded-xl p-4 text-xs sm:text-sm text-rose-200 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-300 mb-0.5">Kendala Analisis:</div>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => runAnalysis()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-900/80 hover:bg-rose-800 text-xs font-mono text-white border border-rose-700/60 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Initial Empty State if cleared */}
        {!analysisData && !isLoading && !error && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-4">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border mb-2 ${
                  isEur
                    ? 'bg-blue-400/10 border-blue-500/30 text-blue-400'
                    : isBtc
                    ? 'bg-orange-400/10 border-orange-500/30 text-orange-400'
                    : 'bg-amber-400/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <Terminal className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {selectedSymbol} QUANT-LITE AI TRADING ANALYST
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Decision-support kuantitatif multi-timeframe (1M, 5M, 15M, 30M, 1H) untuk {selectedSymbol}: memetakan likuiditas institusional (EQH/EQL), pergeseran struktur (BOS/MSS/CHoCH), modul scalping agresif, serta struktur entri terstandarisasi.
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => runAnalysis()}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-950 transition-all shadow-lg cursor-pointer ${
                    isEur
                      ? 'bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 hover:from-blue-300 hover:to-indigo-300 shadow-blue-500/10'
                      : isBtc
                      ? 'bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 hover:from-orange-300 hover:to-yellow-300 shadow-orange-500/10'
                      : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-amber-500/10'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Jalankan Analisis Pasar {selectedSymbol}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator Card */}
        {isLoading && (
          <div
            className={`bg-slate-900/60 border rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden ${
              isEur ? 'border-blue-500/30' : isBtc ? 'border-orange-500/30' : 'border-amber-500/30'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-16 h-16 rounded-full border-4 border-slate-800 animate-spin ${
                    isEur ? 'border-t-blue-400' : isBtc ? 'border-t-orange-400' : 'border-t-amber-400'
                  }`}
                ></div>
                <Activity className={`w-6 h-6 absolute ${isEur ? 'text-blue-400' : isBtc ? 'text-orange-400' : 'text-amber-400'}`} />
              </div>
              <h3 className="text-base font-bold text-white font-mono">
                MENGHITUNG METRIK PASAR {selectedSymbol} {selectedTimeframe} & LIKUIDITAS
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Memproses kuotasi live {selectedSymbol}, menghitung metrik sub-pip, memetakan level EQH/EQL, mendeteksi liquidity sweep, order book L2, dan merumuskan struktur entri...
              </p>
              <div
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border bg-slate-950/80 inline-block ${
                  isEur ? 'text-blue-400/80 border-blue-900/40' : isBtc ? 'text-orange-400/80 border-orange-900/40' : 'text-amber-400/80 border-slate-800'
                }`}
              >
                Aset: {selectedSymbol} | Timeframe: {selectedTimeframe} | Modul Scalping: {isScalpMode ? 'ACTIVE' : 'STANDBY'}
              </div>
            </div>
          </div>
        )}

        {/* 1. Market Snapshot & High-Accuracy Price Metrics */}
        <MarketSnapshotPanel
          snapshot={analysisData?.snapshot}
          timeframe={selectedTimeframe}
          isLoading={isLoading}
        />

        {/* 1B. Live Interactive TradingView Candlestick Chart */}
        <TradingViewChartPanel
          timeframe={selectedTimeframe}
          spotPrice={analysisData?.snapshot?.price}
          symbol={selectedSymbol}
        />

        {/* 1C. KOLOM UTAMA: KONFIRMASI BUY ATAU SELL SECARA JELAS */}
        <BuySellConfirmationPanel
          analysisData={analysisData}
          timeframe={selectedTimeframe}
          isLoading={isLoading}
        />

        {/* 1C-2. REKAM KEPUTUSAN AI, KALENDER TRADE & WINRATE EVALUATION */}
        <DecisionJournalPanel
          currentAnalysis={analysisData}
          currentSpotPrice={analysisData?.snapshot?.price}
          selectedSymbol={selectedSymbol}
        />

        {/* 1D. INSTITUTIONAL ORDER FLOW, LIQUIDITY TRACK, ORDER BOOK L2, VOLUME BUBBLES & WHALE TRACKING */}
        <InstitutionalFlowPanel
          orderFlow={analysisData?.orderFlow}
          liquidityTrack={analysisData?.liquidityTrack}
          orderBook={analysisData?.orderBook}
          volumeBubbles={analysisData?.volumeBubbles}
          whaleTracking={analysisData?.whaleTracking}
          liquidityHeatmap={analysisData?.liquidityHeatmap}
          timeframe={selectedTimeframe}
          spotPrice={analysisData?.snapshot?.price}
          isLoading={isLoading}
        />

        {/* 2. Liquidity Map Panel (Buy-Side & Sell-Side Pools, Last Sweep Event) */}
        <LiquidityMapPanel
          liquidityMap={analysisData?.liquidityMap}
          timeframe={selectedTimeframe}
          isLoading={isLoading}
        />

        {/* 3. Market Structure Panel (HTF Bias vs LTF, BOS, MSS, CHoCH, Price Action Zones) */}
        <MarketStructurePanel
          structure={analysisData?.structureDetail}
          priceActionZones={analysisData?.priceActionZones}
          timeframe={selectedTimeframe}
          isLoading={isLoading}
        />

        {/* 4. Scalping Panel (Fast 5M/15M Execution Module) */}
        {isScalpMode && (
          <ScalpingPanel
            scalpingDetail={analysisData?.scalpingDetail}
            timeframe={selectedTimeframe}
            isLoading={isLoading}
          />
        )}

        {/* 5. Actionable Standardized Trade Entry Structure */}
        <TradeSetupPanel
          tradeSetup={analysisData?.tradeSetup}
          timeframe={selectedTimeframe}
          isLoading={isLoading}
        />

        {/* 6. Multi-Factor Scorecard & Macro Assessment */}
        <FactorPanel factors={analysisData?.factors} isLoading={isLoading} />

        {/* 7. Comprehensive Technical Narrative */}
        <TechnicalPanel technical={analysisData?.technical} isLoading={isLoading} />

        {/* 8. 3 Detailed Scenarios: Bullish, Bearish, No-Trade */}
        <ScenarioPanel scenarios={analysisData?.scenarios} isLoading={isLoading} />

        {/* 9. AI Decision Support & Setup Quality (0-10, NOT win prob) */}
        <DecisionPanel decision={analysisData?.decision} isLoading={isLoading} />

        {/* 10. Compulsory Contrarian Audit & Invalidation Traps */}
        <ContrarianPanel contrarian={analysisData?.contrarian} isLoading={isLoading} />

        {/* 11. Economic Calendar & News Risk Matrix */}
        <NewsRiskPanel events={analysisData?.newsRisk} isLoading={isLoading} />

        {/* 12. Local Deterministic Risk & Position Sizing Calculator */}
        <RiskCalculatorPanel
          currentSpotPrice={analysisData?.snapshot?.price}
          symbol={selectedSymbol}
        />

        {/* 13. Citations, Grounding Sources & Factual Distinctions */}
        <SourcesPanel
          sources={analysisData?.sources}
          searchQueries={analysisData?.searchQueries}
          factualVsInterpretationNote={analysisData?.factualVsInterpretationNote}
          isLoading={isLoading}
        />
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-5 mt-8 text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isEur ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
            <span>{selectedSymbol} QUANT-LITE AI TRADING ANALYST • Multi-Timeframe Strategy Engine</span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xl">
            Decision support tool for education & discipline. Bukan auto-trading bot. Tidak memberikan jaminan profit atau kepastian pasar.
          </p>
        </div>
      </footer>
    </div>
  );
}
