import React from 'react';
import { useApp } from '../context/AppContext';
import { AntarcticMap } from '../components/Map/AntarcticMap';
import { TimelineSlider } from '../components/TimelineSlider';
import { ArrowRight, Radio } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { setActiveView, decisionChangeStatus } = useApp();

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.25rem)] overflow-hidden bg-[#F5F7F7] font-sans">
      {/* Decision Change Notice Banner (if triggered by observation acquisition) */}
      {decisionChangeStatus && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b select-none ${
            decisionChangeStatus.changed
              ? 'bg-[#FFF7DE] border-[#F6D77A] text-[#735A1E] font-medium'
              : 'bg-[#E8F8F6] border-[#DCE7E7] text-[#075563] font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#075563]" />
            <span className="font-semibold text-xs">
              {decisionChangeStatus.changed ? 'Decision changed' : 'Decision unchanged'}
            </span>
            <span className="hidden md:inline text-[11px]">
              — {decisionChangeStatus.message}
            </span>
          </div>
          <button
            onClick={() => setActiveView('acquisition')}
            className="text-[11px] underline font-medium flex items-center gap-1 hover:text-[#2BB9BD] shrink-0 ml-2"
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

