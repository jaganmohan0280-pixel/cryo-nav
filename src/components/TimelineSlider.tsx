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
    <div className="h-12 bg-white border-t border-[#DCE7E7] px-4 flex items-center justify-between z-20 shrink-0 select-none font-sans">
      {/* Play / Step Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition ${
            isPlaying
              ? 'bg-[#FFF7DE] border-[#F6D77A] text-[#735A1E]'
              : 'bg-[#F5F7F7] hover:bg-[#E8F8F6] border-[#DCE7E7] text-[#075563]'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Animate drift'}</span>
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            setForecastHorizonHours(0);
          }}
          title="Reset to Present State (0h)"
          className="p-1 rounded-[8px] bg-[#F5F7F7] hover:bg-[#E8F8F6] text-[#63777B] hover:text-[#075563] border border-[#DCE7E7] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#63777B] pl-2 font-sans">
          <Clock className="w-3.5 h-3.5 text-[#075563]" />
          <span>Forecast Horizon:</span>
          <span className="text-[#18343A] font-semibold">
            {forecastHorizonHours === 0 ? 'Now' : `+${forecastHorizonHours} h`}
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
              className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition ${
                isSelected
                  ? 'bg-[#2BB9BD] text-white shadow-2xs'
                  : 'bg-[#F5F7F7] text-[#63777B] hover:text-[#075563] hover:bg-[#E8F8F6] border border-[#DCE7E7]'
              }`}
            >
              {h === 0 ? 'Now' : `+${h} h`}
            </button>
          );
        })}
      </div>

      {/* Uncertainty Indicator */}
      <div className="hidden lg:flex items-center gap-3 text-xs font-sans">
        <div className="flex items-center gap-1.5 text-[#63777B]">
          <span>Drift Uncertainty:</span>
          <span
            className={`font-semibold ${
              forecastHorizonHours > 24
                ? 'text-[#8A6A22]'
                : forecastHorizonHours > 0
                ? 'text-[#075563]'
                : 'text-[#3F705A]'
            }`}
          >
            {forecastHorizonHours === 0
              ? '±0.8 nm (SAR validated)'
              : forecastHorizonHours <= 12
              ? '±2.4 nm'
              : forecastHorizonHours <= 24
              ? '±4.0 nm'
              : '±9.8 nm (Expanding)'}
          </span>
        </div>

        <div className="px-2.5 py-0.5 rounded-[6px] bg-[#E8F8F6] border border-[#DCE7E7] text-[11px] text-[#075563] font-medium">
          Baseline Dynamic Model
        </div>
      </div>
    </div>
  );
};

