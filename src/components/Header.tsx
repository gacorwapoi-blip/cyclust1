import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Trash2,
  ShieldCheck,
  Coins,
  TrendingUp,
  Bitcoin,
  Download,
  Check,
  Loader2,
  Terminal,
  Copy,
  X,
} from 'lucide-react';
import { TimeframeType, AssetSymbol } from '../types.ts';

interface HeaderProps {
  isLoading: boolean;
  onAnalyze: () => void;
  onRefresh: () => void;
  onClear: () => void;
  onToggleTraderNotes: () => void;
  showTraderNotes: boolean;
  hasAnalyzed: boolean;
  timestamp?: string;
  selectedTimeframe: TimeframeType;
  onSelectTimeframe: (tf: TimeframeType) => void;
  selectedSymbol: AssetSymbol;
  onSelectSymbol: (symbol: AssetSymbol) => void;
  isScalpMode: boolean;
  onToggleScalpMode: () => void;
  sessionName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isLoading,
  onAnalyze,
  onRefresh,
  onClear,
  onToggleTraderNotes,
  showTraderNotes,
  hasAnalyzed,
  timestamp,
  selectedTimeframe,
  onSelectTimeframe,
  selectedSymbol,
  onSelectSymbol,
  isScalpMode,
  onToggleScalpMode,
  sessionName,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showVpsModal, setShowVpsModal] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleDownloadZip = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingZip) return;
    setDownloadingZip(true);
    try {
      const response = await fetch('/trade-quant-vps.zip');
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const zipBlob = new Blob([blob], { type: 'application/zip' });
      const downloadUrl = window.URL.createObjectURL(zipBlob);
      const tempLink = document.createElement('a');
      tempLink.href = downloadUrl;
      tempLink.setAttribute('download', 'trade-quant-vps.zip');
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2000);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Blob download failed, using fallback navigation:', err);
      window.location.assign('/trade-quant-vps.zip');
    } finally {
      setDownloadingZip(false);
    }
  };

  const vpsCommand = `curl -sL https://filebin.net/tradequant2026/trade-quant-vps.zip -o trade-quant-vps.zip && unzip -o trade-quant-vps.zip -d my-trade-quant && cd my-trade-quant && npm install && npm run build && pm2 start "npm run start" --name "quant-app"`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(vpsCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const isEur = selectedSymbol === 'EURUSD';

  const timeframes: { id: TimeframeType; label: string; badge?: string }[] = [
    { id: '1M', label: '1M', badge: 'Ultra-Scalp' },
    { id: '5M', label: '5M', badge: 'Scalp' },
    { id: '15M', label: '15M', badge: 'Execution' },
    { id: '30M', label: '30M', badge: 'Structure' },
    { id: '1H', label: '1H', badge: 'Swing' },
  ];

  return (
    <header className="border-b border-slate-800/90 bg-slate-950/95 backdrop-blur sticky top-0 z-30 shadow-lg shadow-black/20">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 space-y-3">
        {/* Top line: Brand, Asset Tabs, and Main Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Brand Identity & Asset Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                  isEur
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-blue-500/10'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                }`}
              >
                {isEur ? <TrendingUp className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                    <span>{selectedSymbol}</span>
                    <span
                      className={`font-sans font-extrabold text-xs px-2 py-0.5 rounded border ${
                        isEur
                          ? 'text-blue-400 bg-blue-400/10 border-blue-400/25'
                          : 'text-amber-400 bg-amber-400/10 border-amber-400/25'
                      }`}
                    >
                      QUANT-LITE
                    </span>
                    <span className="text-slate-300 font-sans font-semibold text-xs tracking-wider">
                      AI TRADING ANALYST
                    </span>
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    DECISION-SUPPORT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal">
                  Identical Strategy Suite: Order Flow • Liquidity Engine • Scalp & Entry Architecture
                </p>
              </div>
            </div>

            {/* Asset Tabs Switcher */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner mt-1 sm:mt-0 sm:ml-2">
              <button
                type="button"
                onClick={() => onSelectSymbol('XAUUSD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  selectedSymbol === 'XAUUSD'
                    ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/15 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>XAU/USD</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-sans font-semibold">
                  GOLD
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectSymbol('EURUSD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  selectedSymbol === 'EURUSD'
                    ? 'bg-gradient-to-r from-blue-500/25 to-indigo-500/15 text-blue-300 border border-blue-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>EUR/USD</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-400/20 text-blue-300 font-sans font-semibold">
                  FOREX
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectSymbol('BTCUSD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  selectedSymbol === 'BTCUSD'
                    ? 'bg-gradient-to-r from-orange-500/25 to-amber-500/15 text-orange-300 border border-orange-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Bitcoin className="w-3.5 h-3.5 text-orange-400" />
                <span>BTC/USD</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-400/20 text-orange-300 font-sans font-semibold">
                  CRYPTO
                </span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
            {timestamp && (
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80 hidden xl:block">
                Last Update: <span className="text-amber-300">{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleTraderNotes}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showTraderNotes
                  ? 'bg-slate-800 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
              title="Input harga broker dan screenshot chart"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Chart & Konteks</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border shadow-sm transition-all cursor-pointer ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                    : downloadingZip
                    ? 'bg-slate-800 text-emerald-400 border-slate-700'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-700/70 shadow-emerald-500/10'
                }`}
                title="Download source code arsip .ZIP (100% bersih siap pakai)"
              >
                {downloadingZip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : downloadSuccess ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{downloadSuccess ? 'TERUNDUH .ZIP!' : downloadingZip ? 'MENGUNDUH...' : 'DOWNLOAD .ZIP'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVpsModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
                title="Panduan deploy command-line ke VPS"
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">VPS Guide</span>
              </button>
            </div>

            {hasAnalyzed && (
              <>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 disabled:opacity-50 transition-colors"
                  title="Perbarui data pasar terkini"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>REFRESH</span>
                </button>

                <button
                  type="button"
                  onClick={onClear}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 transition-colors"
                  title="Bersihkan sesi analisis"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CLEAR</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer min-w-[145px] ${
                isEur
                  ? 'bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 hover:from-blue-300 hover:to-indigo-300 shadow-blue-500/15'
                  : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-amber-500/15'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>ANALYZING...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                  <span>ANALYZE {selectedSymbol}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Sub-bar: Timeframe Selector & Scalping Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-1">Timeframe:</span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              {timeframes.map((tf) => {
                const isActive = selectedTimeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => onSelectTimeframe(tf.id)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{tf.label}</span>
                    {tf.badge && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-sans font-semibold ${
                          isActive
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tf.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scalping Feature Toggle */}
            <button
              type="button"
              onClick={onToggleScalpMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-xs font-semibold border transition-all ${
                isScalpMode
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <Zap className={`w-3 h-3 ${isScalpMode ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
              <span>SCALPING ENGINE {isScalpMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Session & Status context */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            {sessionName && (
              <span className="truncate max-w-[220px] sm:max-w-none text-slate-300">
                Session: <span className="text-amber-300/90">{sessionName}</span>
              </span>
            )}
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline text-slate-400">
              No Auto-Trade • Objective Decision-Support
            </span>
          </div>
        </div>
      </div>

      {/* VPS Deployment & Zip Guide Modal */}
      {showVpsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-200 font-sans max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Deploy ke VPS & Source Code (.ZIP)</h3>
                  <p className="text-xs text-slate-400">Arsip valid PKZip (181 KB) - Siap pakai tanpa folder sampah node_modules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVpsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Download Action */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-emerald-400 font-mono">Opsi 1: Download Langsung ke Komputer</div>
                  <div className="text-xs text-slate-400">File biner ZIP asli siap diekstrak dengan Windows, macOS, atau Linux unzip.</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  {downloadingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadSuccess ? 'SUDAH TERUNDUH!' : downloadingZip ? 'MENGUNDUH...' : 'DOWNLOAD ZIP (~181 KB)'}</span>
                </button>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 break-all space-y-1">
                <div>Direct Browser Download: <span className="text-amber-300">{typeof window !== 'undefined' ? `${window.location.origin}/trade-quant-vps.zip` : '/trade-quant-vps.zip'}</span></div>
                <div className="text-[10px] text-slate-400">Untuk VPS gunakan direct download link pada Opsi 2 di bawah (bebas otentikasi preview Cloud Run).</div>
              </div>
            </div>

            {/* Direct VPS Terminal One-Liner */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400">Opsi 2: Jalankan Langsung di Terminal VPS (1 Baris)</span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd ? 'Tersalin!' : 'Salin Perintah'}</span>
                </button>
              </div>
              <div className="p-3 bg-black/90 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                <code>{vpsCommand}</code>
              </div>
            </div>

            {/* Step by step VPS checklist */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-slate-200">Langkah Setup di VPS (Ubuntu / Debian / CentOS):</div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-400">
                <li><strong className="text-slate-200">Install Node.js 18+ & PM2:</strong> <code className="text-amber-300">curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs unzip && npm i -g pm2</code></li>
                <li><strong className="text-slate-200">Unzip source code:</strong> <code className="text-amber-300">unzip trade-quant-vps.zip -d quant-app && cd quant-app</code></li>
                <li><strong className="text-slate-200">Install & Build:</strong> <code className="text-amber-300">npm install && npm run build</code></li>
                <li><strong className="text-slate-200">Run 24/7 background:</strong> <code className="text-amber-300">pm2 start "npm run start" --name "quant-app" && pm2 save && pm2 startup</code></li>
              </ol>
            </div>

            {/* Footer close button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVpsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
