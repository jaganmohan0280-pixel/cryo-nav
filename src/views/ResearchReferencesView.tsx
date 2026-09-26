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
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Scientific Research, Data Sources & Official References
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Academic Foundations, Hydrodynamic Drift Models & Earth Observation Citations
            </p>
          </div>

          <div className="bg-white px-3 py-2 rounded border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
            <div>Data Index: <strong className="text-blue-700">{researchReferences.length} Peer-Reviewed Citations</strong></div>
            <div className="text-[10px] text-slate-500">WMO / IMO Polar Code Standards</div>
          </div>
        </div>

        {/* References Catalog */}
        <div className="space-y-4">
          {researchReferences.map((ref) => (
            <div
              key={ref.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{ref.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                      {ref.category}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">
                    Source: {ref.source}
                  </div>
                </div>

                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                {ref.description}
              </p>

              <div className="text-[11px] font-mono text-slate-400 truncate pt-1 border-t border-slate-100">
                URL: <span className="text-slate-600 hover:underline">{ref.url}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scientific Rigor Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3 font-mono text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Polar Code & Hydrodynamic Standards Compliance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
            <div>
              <span className="text-slate-500 block text-[10px]">SEA ICE STAGE SPECIFICATION</span>
              <div className="font-semibold text-slate-900">World Meteorological Organization (WMO No. 259)</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">HYDRODYNAMIC DRIFT DRIFT MODEL</span>
              <div className="font-semibold text-slate-900">ECMWF / OpenDrift Particle Drift Schema</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">VESSEL CLASSIFICATION</span>
              <div className="font-semibold text-blue-700">IMO Polar Code PC1 - PC7 Standards</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">DATA PROVENANCE</span>
              <div className="font-semibold text-emerald-700">Copernicus Marine Service & NOAA STAR Ingestion</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
