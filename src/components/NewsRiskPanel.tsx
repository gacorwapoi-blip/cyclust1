import React from 'react';
import { NewsRiskEvent } from '../types.ts';
import { BellRing, Calendar, ShieldAlert } from 'lucide-react';

interface NewsRiskPanelProps {
  events?: NewsRiskEvent[];
  isLoading: boolean;
}

export const NewsRiskPanel: React.FC<NewsRiskPanelProps> = ({ events, isLoading }) => {
  if (!events && !isLoading) return null;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-rose-950/80 text-rose-400 border-rose-600/50';
      case 'MEDIUM':
        return 'bg-amber-950/80 text-amber-400 border-amber-600/50';
      case 'LOW':
      default:
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50';
    }
  };

  return (
    <section className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">7. Event Risk Horizon</span>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-400" />
            ECONOMIC CALENDAR & HIGH-IMPACT NEWS RISK
          </h2>
        </div>
        <div className="text-[11px] text-slate-400">
          Aturan: Tidak ada klaim pasti arah berita; fokus pada eksposur volatilitas.
        </div>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((evt, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200">{evt.event}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getRiskBadge(
                      evt.riskLevel
                    )}`}
                  >
                    {evt.riskLevel} RISK
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{evt.time || 'Upcoming Session'}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  {evt.generalImpact}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 text-center text-xs text-slate-400">
          {isLoading
            ? 'Memeriksa kalender ekonomi AS & event geopolitik terkini...'
            : 'Tidak ada rilis berita high-impact berjarak sangat dekat terdeteksi saat analisis.'}
        </div>
      )}
    </section>
  );
};
