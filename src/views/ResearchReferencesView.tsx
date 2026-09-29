import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  ExternalLink,
  Award,
  Globe,
  Satellite,
  Compass,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const ResearchReferencesView: React.FC = () => {
  const { researchReferences } = useApp();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F7F7] text-[#18343A] font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[#DCE7E7] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#075563] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2BB9BD]" />
              Scientific Research, Data Sources & Official References
            </h1>
            <p className="text-xs text-[#63777B] mt-1 font-normal">
              Academic Foundations, Hydrodynamic Drift Models & Earth Observation Citations
            </p>
          </div>

          <div className="bg-white px-3.5 py-2 rounded-[8px] border border-[#DCE7E7] text-xs text-[#18343A]">
            <div>Data Index: <strong className="text-[#075563] font-semibold">{researchReferences.length} Peer-Reviewed Citations</strong></div>
            <div className="text-[10px] text-[#63777B]">WMO / IMO Polar Code Standards</div>
          </div>
        </div>

        {/* References Catalog */}
        <div className="space-y-4">
          {researchReferences.map((ref) => (
            <div
              key={ref.id}
              className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-3 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#18343A]">{ref.title}</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-[6px] bg-[#E8F8F6] text-[#075563] border border-[#DCE7E7] font-semibold">
                      {ref.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#63777B] mt-0.5">
                    Source: {ref.source}
                  </div>
                </div>

                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[#2BB9BD] hover:bg-[#22A8AC] text-white transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-[#63777B] font-normal leading-relaxed">
                {ref.description}
              </p>

              <div className="text-[11px] text-[#8B9A9D] truncate pt-1 border-t border-[#DCE7E7]">
                URL: <span className="text-[#075563] hover:underline">{ref.url}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scientific Rigor Card */}
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE7E7] space-y-3 text-xs shadow-2xs">
          <div className="font-semibold text-[#075563] flex items-center gap-2 tracking-tight">
            <ShieldCheck className="w-4 h-4 text-[#3F705A]" />
            Polar Code & Hydrodynamic Standards Compliance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#63777B]">
            <div>
              <span className="text-[#8B9A9D] block text-[10px]">SEA ICE STAGE SPECIFICATION</span>
              <div className="font-semibold text-[#18343A]">World Meteorological Organization (WMO No. 259)</div>
            </div>
            <div>
              <span className="text-[#8B9A9D] block text-[10px]">HYDRODYNAMIC DRIFT DRIFT MODEL</span>
              <div className="font-semibold text-[#18343A]">ECMWF / OpenDrift Particle Drift Schema</div>
            </div>
            <div>
              <span className="text-[#8B9A9D] block text-[10px]">VESSEL CLASSIFICATION</span>
              <div className="font-semibold text-[#075563]">IMO Polar Code PC1 - PC7 Standards</div>
            </div>
            <div>
              <span className="text-[#8B9A9D] block text-[10px]">DATA PROVENANCE</span>
              <div className="font-semibold text-[#3F705A]">Copernicus Marine Service & NOAA STAR Ingestion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
