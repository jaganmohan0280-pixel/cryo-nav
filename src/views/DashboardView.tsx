import React from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { TimelineSlider } from '../components/TimelineSlider';
import { ArrowRight, Radio } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveView, decisionChangeStatus } = useApp();

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.25rem)] overflow-hidden bg-slate-50">
      {/* Decision Change Notice Banner (if triggered by observation acquisition) */}
      {decisionChangeStatus && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b select-none ${
            decisionChangeStatus.changed
              ? 'bg-amber-50 border-amber-200 text-amber-900 font-medium'
              : 'bg-blue-50 border-blue-200 text-blue-900 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-700" />
            <span className="font-bold font-mono">
              {decisionChangeStatus.changed ? 'DECISION CHANGED' : 'DECISION UNCHANGED'}
            </span>
            <span className="hidden md:inline text-[11px]">
              — {decisionChangeStatus.message}
            </span>
          </div>
          <button
            onClick={() => setActiveView('acquisition')}
            className="text-[11px] underline font-bold flex items-center gap-1 hover:text-slate-900 shrink-0 ml-2"
          >
            <span>View Satellite Observation</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Container: Map-Centric Workspace (Full Width & Height) */}
      <div className="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden">
        <AntarcticMap />
        <TimelineSlider />
      </div>
    </div>
  );
};

