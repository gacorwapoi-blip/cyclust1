import React, { useState, useEffect } from 'react';
import { TimeframeType, AssetSymbol } from '../types.ts';
import { Maximize2, Minimize2, ExternalLink, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';

interface TradingViewChartPanelProps {
  timeframe: TimeframeType;
  spotPrice?: string;
  symbol?: AssetSymbol;
}

export const TradingViewChartPanel: React.FC<TradingViewChartPanelProps> = ({
  timeframe,
  spotPrice,
  symbol = 'XAUUSD',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isEur = symbol === 'EURUSD';
  const isBtc = symbol === 'BTCUSD';

  const defaultChartSymbol = isEur ? 'FX:EURUSD' : isBtc ? 'BINANCE:BTCUSDT' : 'OANDA:XAUUSD';
  const [chartSymbol, setChartSymbol] = useState<string>(defaultChartSymbol);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // When symbol prop changes, update active chart symbol
  useEffect(() => {
    setChartSymbol(isEur ? 'FX:EURUSD' : isBtc ? 'BINANCE:BTCUSDT' : 'OANDA:XAUUSD');
  }, [symbol, isEur, isBtc]);

  // Map timeframe to TradingView interval:
  // 1M -> "1", 5M -> "5", 15M -> "15", 30M -> "30", 1H -> "60"
  const getTvInterval = (tf: TimeframeType): string => {
    switch (tf) {
      case '1M':
        return '1';
      case '5M':
        return '5';
      case '15M':
        return '15';
      case '30M':
        return '30';
      case '1H':
        return '60';
      default:
        return '1';
    }
  };

  const interval = getTvInterval(timeframe);

  const embedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    chartSymbol
  )}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=090d14&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%22%23090d14%22%2C%22paneProperties.vertGridProperties.color%22%3A%22%231e293b%22%2C%22paneProperties.horzGridProperties.color%22%3A%22%231e293b%22%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(
    chartSymbol
  )}`;

  const goldSymbols = [
    { id: 'OANDA:XAUUSD', label: 'OANDA', title: 'OANDA Spot Gold' },
    { id: 'FX_IDC:XAUUSD', label: 'FX_IDC', title: 'FX IDC Composite Gold' },
    { id: 'TVC:GOLD', label: 'TVC:GOLD', title: 'TradingView Spot Gold' },
  ];

  const eurSymbols = [
    { id: 'FX:EURUSD', label: 'FX:EURUSD', title: 'TradingView FX EURUSD' },
    { id: 'OANDA:EURUSD', label: 'OANDA', title: 'OANDA EUR/USD' },
    { id: 'FOREXCOM:EURUSD', label: 'FOREX.COM', title: 'Forex.com EUR/USD' },
  ];

  const btcSymbols = [
    { id: 'BINANCE:BTCUSDT', label: 'BINANCE', title: 'Binance BTC/USDT Spot' },
    { id: 'COINBASE:BTCUSD', label: 'COINBASE', title: 'Coinbase BTC/USD' },
    { id: 'BYBIT:BTCUSDT', label: 'BYBIT', title: 'Bybit BTC/USDT' },
  ];

  const availableFeeds = isEur ? eurSymbols : isBtc ? btcSymbols : goldSymbols;

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden shadow-xl shadow-black/20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                LIVE REAL-TIME TRADINGVIEW CHART ({symbol})
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
                OTC SPOT FEED
              </span>
            </div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span>{chartSymbol}</span>
              <span className="text-slate-400 font-normal text-xs">• Timeframe {timeframe} ({interval}m)</span>
            </h3>
          </div>
        </div>

        {/* Controls & Broker Selector */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Symbol Selector */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            {availableFeeds.map((feed) => (
              <button
                key={feed.id}
                type="button"
                onClick={() => setChartSymbol(feed.id)}
                className={`px-2 py-1 rounded transition-colors ${
                  chartSymbol === feed.id
                    ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={feed.title}
              >
                {feed.label}
              </button>
            ))}
          </div>

          {/* Reload Widget */}
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reload Chart Frame"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Expand/Collapse Height */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isExpanded ? 'Kecilkan' : 'Perluas Chart'}</span>
          </button>

          {/* TradingView Direct Link */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(chartSymbol)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-500/30 text-xs font-mono text-amber-300 hover:bg-amber-400/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka TradingView</span>
          </a>
        </div>
      </div>

      {/* Spot Price Reference Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isEur ? 'Spot EUR/USD Real-Time:' : 'Spot Gold Real-Time:'}{' '}
            <strong className="text-amber-300 font-bold">{spotPrice || 'Aktif'}</strong>. Live candlestick streaming langsung dari server TradingView.
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Sinkronisasi Timeframe: <span className="text-amber-400 font-bold">{timeframe}</span>
        </div>
      </div>

      {/* Embedded Interactive TradingView Frame */}
      <div
        className={`w-full rounded-xl overflow-hidden border border-slate-800/90 bg-[#090d14] relative transition-all duration-300 ${
          isExpanded ? 'h-[620px]' : 'h-[440px]'
        }`}
      >
        <iframe
          key={`${chartSymbol}-${interval}-${reloadKey}`}
          title={`TradingView ${symbol} Real-Time Chart`}
          src={embedUrl}
          className="w-full h-full border-0"
          scrolling="no"
          allow="fullscreen"
        />
      </div>
    </section>
  );
};
