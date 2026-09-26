import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

const TIMELINE_STEPS = [0, 6, 12, 24, 48, 72];

export const TimelineSlider: React.FC = () => {
  const { forecastHorizonHours, setForecastHorizonHours } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      const currentIndex = TIMELINE_STEPS.indexOf(forecastHorizonHours);
      const nextIndex = (currentIndex + 1) % TIMELINE_STEPS.length;
      setForecastHorizonHours(TIMELINE_STEPS[nextIndex]);
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlaying, forecastHorizonHours, setForecastHorizonHours]);

  return (
    <div className="h-12 bg-white border-t border-slate-200 px-4 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Play / Step Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
            isPlaying
              ? 'bg-amber-100 border-amber-300 text-amber-900'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Animate Drift'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            setForecastHorizonHours(0);
          }}
          title="Reset to Present State (0h)"
          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 font-mono pl-2">
          <Clock className="w-3.5 h-3.5 text-slate-700" />
          <span>FORECAST HORIZON:</span>
          <span className="text-slate-900 font-bold">
            {forecastHorizonHours === 0 ? 'NOW (T+0h)' : `+${forecastHorizonHours} HOURS`}
          </span>
        </div>
      </div>

      {/* Discrete Horizon Step Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {TIMELINE_STEPS.map((h) => {
          const isSelected = forecastHorizonHours === h;
          return (
            <button
              key={h}
              onClick={() => {
                setIsPlaying(false);
                setForecastHorizonHours(h);
              }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {h === 0 ? 'T+0' : `+${h}h`}
            </button>
          );
        })}
      </div>

      {/* Uncertainty Indicator */}
      <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>Drift Uncertainty:</span>
          <span
            className={`font-semibold ${
              forecastHorizonHours > 24
                ? 'text-amber-700'
                : forecastHorizonHours > 0
                ? 'text-blue-700'
                : 'text-emerald-700'
            }`}
          >
            {forecastHorizonHours === 0
              ? '±0.8 nm (SAR Validated)'
              : forecastHorizonHours <= 12
              ? '±2.4 nm'
              : forecastHorizonHours <= 24
              ? '±4.0 nm'
              : '±9.8 nm (Expanding)'}
          </span>
        </div>

        <div className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-medium">
          Baseline Dynamic Model
        </div>
      </div>
    </div>
  );
};

