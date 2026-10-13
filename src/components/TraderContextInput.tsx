import React, { useRef } from 'react';
import { SlidersHorizontal, X, Sparkles, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { TimeframeType } from '../types.ts';

interface TraderContextInputProps {
  isOpen: boolean;
  onClose: () => void;
  userNotes: string;
  onChangeUserNotes: (val: string) => void;
  userPrice: string;
  onChangeUserPrice: (val: string) => void;
  chartImage: string | null;
  onSelectChartImage: (img: string | null) => void;
  selectedTimeframe: TimeframeType;
  onSelectTimeframe: (tf: TimeframeType) => void;
  onApplyAndAnalyze: () => void;
  isLoading: boolean;
}

export const TraderContextInput: React.FC<TraderContextInputProps> = ({
  isOpen,
  onClose,
  userNotes,
  onChangeUserNotes,
  userPrice,
  onChangeUserPrice,
  chartImage,
  onSelectChartImage,
  selectedTimeframe,
  onSelectTimeframe,
  onApplyAndAnalyze,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'Fokus pada 5M scalping: tunggu liquidity sweep di batas sesi sebelum entry.',
    'Konfirmasi 15M MSS (Market Structure Shift) dan reaksi FVG.',
    'Evaluasi korelasi DXY dan yield US 10-Year Treasury.',
    'Periksa false breakout di atas PDH (Previous Day High) / EQH.',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar (PNG, JPG, WebP) yang didukung untuk screenshot chart.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onSelectChartImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-4 sm:p-5 mb-5 shadow-2xl relative animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            KONTEKS TRADER & UPLOAD CHART SCREENSHOT
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
        Kalibrasikan kuotasi harga broker Anda, tentukan timeframe analisis (5M, 15M, 30M, 1H), atau unggah tangkapan layar chart untuk dianalisis oleh AI market analyst.
      </p>

      {/* Grid: Broker Price + Timeframe + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
        <div className="sm:col-span-4">
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            HARGA BROKER ANDA (OPSIONAL)
          </label>
          <input
            type="text"
            value={userPrice}
            onChange={(e) => onChangeUserPrice(e.target.value)}
            placeholder="misal: 2648.50"
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none"
          />
        </div>

        <div className="sm:col-span-8">
          <label className="block text-[11px] font-mono text-slate-400 mb-1">
            CATATAN TEKNIKAL / AREA LEVEL PANTAUAN
          </label>
          <input
            type="text"
            value={userNotes}
            onChange={(e) => onChangeUserNotes(e.target.value)}
            placeholder="misal: TF 5M rejection di EQH $2660, tunggu displacement ke FVG..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 outline-none"
          />
        </div>
      </div>

      {/* Chart Screenshot Upload Zone */}
      <div className="mb-4">
        <label className="block text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>UPLOAD SCREENSHOT CHART (5M / 15M / 30M / 1H)</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">PNG, JPG, WebP</span>
        </label>

        {chartImage ? (
          <div className="relative rounded-lg border border-amber-500/40 overflow-hidden bg-slate-950 p-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={chartImage}
                alt="Chart Screenshot"
                referrerPolicy="no-referrer"
                className="h-16 w-28 object-cover rounded border border-slate-800"
              />
              <div className="text-xs font-mono text-slate-300">
                <span className="text-emerald-400 font-bold block">✓ Screenshot Terunggah</span>
                <span className="text-[11px] text-slate-400">Siap dianalisis oleh AI vision quant</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectChartImage(null)}
              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 transition-colors"
              title="Hapus Screenshot"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer bg-slate-950/60 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-6 h-6 text-amber-400 mx-auto mb-1" />
            <p className="text-xs font-mono text-slate-300">
              Klik atau seret gambar screenshot chart XAUUSD ke sini
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              AI akan mendeteksi formasi candle, sweep likuiditas, dan fair value gap secara visual
            </p>
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="mb-4">
        <span className="text-[10px] font-mono text-slate-400 block mb-1.5">CONTOH FOKUS CEPAT:</span>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeUserNotes(qp)}
              className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 px-2.5 py-1 rounded transition-colors text-left font-mono"
            >
              + {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
        >
          Tutup
        </button>
        <button
          type="button"
          onClick={onApplyAndAnalyze}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 transition-all font-mono shadow-md shadow-amber-500/10 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Terapkan & Jalankan Analisis</span>
        </button>
      </div>
    </div>
  );
};
