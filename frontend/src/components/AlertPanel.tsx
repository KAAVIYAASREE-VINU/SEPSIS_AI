import React from 'react';
import { Patient } from '../types';
import { AlertOctagon, ChevronRight, TrendingUp } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { TrendIndicator } from './TrendIndicator';

interface AlertPanelProps {
  patients: Patient[];
  onViewPatient: (patientId: string) => void;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ patients, onViewPatient }) => {
  // Filter for high-risk or deteriorating patients
  const alertPatients = patients
    .filter(
      (p) =>
        p.latestRiskLevel === 'HIGH' || p.latestTrend === 'RAPID_DETERIORATION'
    )
    .sort((a, b) => b.latestRiskScore - a.latestRiskScore);

  return (
    <div
      id="recent-alerts-panel"
      className="bg-white rounded-[6px] border border-[#e2e8f0] p-5 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[4px] bg-red-50 text-red-700 border border-red-200 flex items-center justify-center">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#475569]">
              Recent Clinical Alerts
            </h2>
            <p className="text-xs text-[#64748b]">
              High-risk threshold violations and rapid deterioration events
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-[4px] text-xs font-mono font-bold bg-red-50 text-red-800 border border-red-200">
          {alertPatients.length} Active Events
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
        {alertPatients.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No active high-risk or deteriorating events detected.
          </div>
        ) : (
          alertPatients.map((patient) => (
            <div
              key={patient.id}
              id={`alert-item-${patient.id}`}
              onClick={() => onViewPatient(patient.id)}
              className="p-3 rounded-[4px] border border-[#fecaca] bg-[#fffbfb] hover:bg-[#fff5f5] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {patient.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">
                    {patient.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#64748b] bg-slate-100 px-1.5 py-0.2 rounded-[3px] border border-slate-200">
                    {patient.ward} · {patient.bed}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <RiskBadge level={patient.latestRiskLevel} size="sm" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#fee2e2]">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-[#64748b]">Score:</span>
                    <span className="font-bold text-red-700 text-sm">
                      {patient.latestRiskScore}
                    </span>
                    <span className="text-[#64748b] text-[11px]">/100</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[#64748b] text-[11px]">Delta:</span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        patient.latestRiskDelta > 0
                          ? 'text-red-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {patient.latestRiskDelta > 0
                        ? `+${patient.latestRiskDelta}`
                        : patient.latestRiskDelta}
                    </span>
                  </div>

                  <TrendIndicator trend={patient.latestTrend} size="sm" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#64748b]">
                    {patient.lastAssessmentTime}
                  </span>
                  <span className="text-xs text-teal-700 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                    Review
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
