import React from 'react';
import { FactorAssessment } from '../types.ts';
import { CheckCircle2, XCircle, AlertCircle, Layers } from 'lucide-react';

interface FactorPanelProps {
  factors?: FactorAssessment;
  isLoading: boolean;
}

export const FactorPanel: React.FC<FactorPanelProps> = ({ factors, isLoading }) => {
  if (!factors && !isLoading) return null;

  const getPillClass = (value?: string) => {
    switch (value) {
      case 'Bullish':
      case 'Strong':
      case 'Low': // for news risk
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-600/40';
      case 'Bearish':
      case 'High': // for risk
        return 'bg-rose-950/70 text-rose-400 border-rose-600/40';
      case 'Range':
      case 'Moderate':
      case 'Medium':
      case 'Neutral':
      default:
        return 'bg-amber-950/70 text-amber-400 border-amber-600/40';
    }
  };

  const matrixItems = [
    { label: 'Trend', value: factors?.trend },
    { label: 'Momentum', value: factors?.momentum },
    { label: 'Structure', value: factors?.structure },
    { label: 'Liquidity', value: factors?.liquidity },
    { label: 'Macro', value: factors?.macro },
    { label: 'News Risk', value: factors?.newsRisk },
    { label: 'Volatility', value: factors?.volatility },
  ];

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">2. Quantitative Matrix</span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            MULTI-FACTOR ASSESSMENT
          </h2>
        </div>
      </div>

      {/* Factor Matrix Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
        {matrixItems.map((item) => (
          <div
            key={item.label}
            className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between text-center"
          >
            <div className="text-[11px] font-mono text-slate-400 mb-1">{item.label}</div>
            <div
              className={`text-xs font-mono font-semibold px-2 py-1 rounded border uppercase ${getPillClass(
                item.value
              )}`}
            >
              {item.value || (isLoading ? '...' : '-')}
            </div>
          </div>
        ))}
      </div>

      {/* 3-Column Factors List: Bullish, Bearish, Conflicting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Bullish Factors */}
        <div className="bg-slate-950/60 border border-emerald-900/40 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800/80">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Bullish Factors ({factors?.bullishFactors?.length || 0})
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            {factors?.bullishFactors?.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span className="leading-snug">{f}</span>
              </li>
            )) || <li className="text-slate-500 italic text-xs">Tidak ada faktor terdeteksi.</li>}
          </ul>
        </div>

        {/* Bearish Factors */}
        <div className="bg-slate-950/60 border border-rose-900/40 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800/80">
            <XCircle className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
              Bearish Factors ({factors?.bearishFactors?.length || 0})
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            {factors?.bearishFactors?.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span className="leading-snug">{f}</span>
              </li>
            )) || <li className="text-slate-500 italic text-xs">Tidak ada faktor terdeteksi.</li>}
          </ul>
        </div>

        {/* Conflicting Factors */}
        <div className="bg-slate-950/60 border border-amber-900/40 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800/80">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Conflicting Factors ({factors?.conflictingFactors?.length || 0})
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            {factors?.conflictingFactors?.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span className="leading-snug">{f}</span>
              </li>
            )) || <li className="text-slate-500 italic text-xs">Tidak ada konflik signifikan.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
};
