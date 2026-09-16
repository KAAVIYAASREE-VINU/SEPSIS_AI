import React from 'react';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import { Patient } from '../types';
import { TemperatureTrend } from './TemperatureTrend';
import { BloodPressureTrend } from './BloodPressureTrend';
import { WBCTrend } from './WBCTrend';

interface ClinicalTrendsProps {
  patient: Patient;
}

export const ClinicalTrends: React.FC<ClinicalTrendsProps> = ({ patient }) => {
  return (
    <section id="clinical-trends-section" className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-700 shrink-0" />
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
              Clinical Trends & Trajectories (Last 24 Hours)
            </h3>
            <p className="text-xs text-[#64748b]">
              Continuous physiologic trend monitoring for early identification of septic deterioration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-[#475569] bg-white px-2 py-0.5 rounded-[4px] border border-[#e2e8f0]">
            Patient: {patient.id}
          </span>
          <span className="text-[10px] font-mono text-[#64748b]">
            Simulated 2–4h Resolution
          </span>
        </div>
      </div>

      {/* 3-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Temperature Trend */}
        <TemperatureTrend
          data={patient.temperatureHistory}
          patient={patient}
        />

        {/* 2. Blood Pressure Trend */}
        <BloodPressureTrend
          data={patient.bloodPressureHistory}
          patient={patient}
        />

        {/* 3. WBC Count Trend */}
        <WBCTrend
          data={patient.wbcHistory}
          patient={patient}
        />
      </div>

      {/* Clinical Research Disclaimer / Safety Notice */}
      <div className="px-3.5 py-2.5 bg-[#f8fafc] rounded-[6px] border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748b]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#334155]">
            Prototype — Simulated Data
          </span>
        </div>
        <p className="text-[11px] leading-tight text-[#64748b]">
          This is a research prototype, not a diagnostic or treatment system. The clinical trend charts are for demonstrating visualization and trajectory monitoring only.
        </p>
      </div>
    </section>
  );
};
