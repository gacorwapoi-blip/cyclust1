import React from 'react';
import { DecisionSupport } from '../types.ts';
import { Target, Check, AlertOctagon, HelpCircle } from 'lucide-react';

interface DecisionPanelProps {
  decision?: DecisionSupport;
  isLoading: boolean;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ decision, isLoading }) => {
  if (!decision && !isLoading) return null;

  const getDecisionBadge = (dec?: string) => {
    switch (dec) {
      case 'LONG SETUP DEVELOPING':
        return {
          bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400',
          badgeText: 'LONG SETUP DEVELOPING',
          desc: 'Potensi bias kenaikan terkonfirmasi oleh konfluensi beberapa faktor makro & teknikal. Tunggu trigger eksekusi sesuai plan.',
        };
      case 'SHORT SETUP DEVELOPING':
        return {
          bg: 'bg-rose-950/70 border-rose-500/40 text-rose-400',
          badgeText: 'SHORT SETUP DEVELOPING',
          desc: 'Potensi bias penurunan terkonfirmasi oleh konfluensi resistensi atau data makro. Disiplin dengan invalidasi.',
        };
      case 'WAIT FOR CONFIRMATION':
        return {
          bg: 'bg-amber-950/70 border-amber-500/40 text-amber-400',
          badgeText: 'WAIT FOR CONFIRMATION',
          desc: 'Kondisi pasar sedang menguji level kunci atau menunggu rilis katalis. Jangan mendahului arah sebelum konfirmasi valid.',
        };
      case 'NO TRADE':
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          badgeText: 'NO TRADE',
          desc: 'Faktor yang saling bertentangan (conflicting) tinggi atau risiko berita ekstrem. Tidak ada edge probabilitas yang memadai.',
        };
    }
  };

  const currentDecision = getDecisionBadge(decision?.decision);

  // Setup quality calculation (0 - 10)
  const quality = decision?.setupQuality ?? 0;
  const qualityColor =
    quality >= 7
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : quality >= 5
      ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
      : 'text-rose-400 border-rose-500/40 bg-rose-950/40';

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="pb-3 mb-4 border-b border-slate-800/80">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">5. Decision Engine</span>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          AI DECISION SUPPORT & SETUP QUALITY
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Decision Badge & Rationale (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5">
          <div>
            <div className="text-[11px] font-mono text-slate-400 mb-2">QUANT ASSESSMENT OUTCOME</div>

            {/* Decision Status Box */}
            <div className={`p-4 rounded-xl border ${currentDecision.bg} mb-4`}>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-wide mb-1 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <span>{decision?.decision || (isLoading ? 'Calculating Decision...' : 'MENUNGGU ANALISIS')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentDecision.desc}
              </p>
            </div>

            {/* 3-5 Point Concise Rationale */}
            <div className="text-xs font-mono font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Rationale (Confluence Logic):
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {decision?.reasons?.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-slate-900/50 p-2 rounded border border-slate-800/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 font-mono text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{reason}</span>
                </li>
              )) || (
                <li className="text-slate-500 italic text-xs">
                  {isLoading ? 'Menyusun argumen konfluensi...' : 'Menunggu hasil analisis.'}
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Standar: Non-directional bias default</span>
            <span className="text-amber-400/80 font-mono">Bukan Sinyal Eksekusi Otomatis</span>
          </div>
        </div>

        {/* Right Column: Setup Quality Score (4 cols) */}
        <div className="lg:col-span-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Setup Quality</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Skor 0 - 10
              </span>
            </div>

            {/* Quality Score Circle */}
            <div className="flex flex-col items-center justify-center py-3">
              <div
                className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center font-mono ${qualityColor} shadow-lg`}
              >
                <span className="text-3xl font-extrabold">{isLoading ? '..' : quality}</span>
                <span className="text-[10px] text-slate-400 uppercase">/ 10 Score</span>
              </div>
            </div>

            {/* Quality explanation */}
            <p className="text-xs text-slate-300 leading-relaxed text-center mt-2 px-2">
              {decision?.setupQualityExplanation ||
                'Skor dihitung semata-mata dari banyaknya faktor makro, likuiditas, dan struktur teknikal yang saling mendukung (confluence).'}
            </p>
          </div>

          {/* Strict Quant Warning Box */}
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px] text-amber-300/90 leading-normal flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200">Bukan Probabilitas Profit: </strong>
              Skor 8/10 bukan berarti 80% menang. Setup berkualitas tinggi tetap dapat gagal jika terjadi news spike atau anomali likuiditas.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
