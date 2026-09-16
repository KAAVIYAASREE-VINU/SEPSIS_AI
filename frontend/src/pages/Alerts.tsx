import React from 'react';
import { Patient } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TrendIndicator } from '../components/TrendIndicator';
import { AlertOctagon, ExternalLink } from 'lucide-react';

interface AlertsPageProps {
  patients: Patient[];
  onViewProfile: (patientId: string) => void;
}

export const Alerts: React.FC<AlertsPageProps> = ({ patients, onViewProfile }) => {
  // Show ONLY: High-risk patients & Deteriorating patients
  const alertPatients = patients
    .filter(
      (p) =>
        p.latestRiskLevel === 'HIGH' || p.latestTrend === 'RAPID_DETERIORATION'
    )
    .sort((a, b) => b.latestRiskScore - a.latestRiskScore);

  return (
    <div className="space-y-6">
      {/* Alert Banner / Header */}
      <div className="bg-[#fff7f7] border border-red-300 rounded-[6px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-red-100 text-red-700 border border-red-200 flex items-center justify-center">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-red-950">
              Hospital Sepsis Alert Registry
            </h2>
            <p className="text-xs text-red-900 mt-0.5">
              Strictly filtered to high-risk thresholds (Score ≥ 65) and rapid physiologic deterioration events (Delta ≥ +20 pts).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white text-red-800 border border-red-300 rounded-[4px]">
            {alertPatients.length} High-Risk Alert Events Active
          </span>
        </div>
      </div>

      {/* Hospital-Level Alert Table */}
      {/* Strict adherence: NO acknowledgement state, NO new/seen status, NO doctor assignment, NO clinician ownership */}
      <div
        id="alerts-table-container"
        className="bg-white rounded-[6px] border border-[#e2e8f0] overflow-hidden"
      >
        <div className="p-4 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#475569]">
              Active Escalation Queue
            </h3>
            <p className="text-xs text-[#64748b]">
              Bedside alert triggers across inpatient clinical units
            </p>
          </div>
          <span className="text-xs font-mono text-[#64748b]">
            Telemetry auto-sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                <th className="py-2.5 px-4">Patient ID</th>
                <th className="py-2.5 px-4">Patient Name</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Risk Level</th>
                <th className="py-2.5 px-4">Trend</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Ward / Unit</th>
                <th className="py-2.5 px-4">Risk Delta</th>
                <th className="py-2.5 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {alertPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#64748b] font-mono">
                    No active high-risk or deteriorating patients in current telemetry window.
                  </td>
                </tr>
              ) : (
                alertPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    id={`alert-row-${patient.id}`}
                    className="hover:bg-[#fff9f9] transition-colors"
                  >
                    {/* Patient ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#0f172a]">
                      {patient.id}
                    </td>

                    {/* Patient Name */}
                    <td className="py-3 px-4 font-semibold text-[#1e293b]">
                      {patient.name}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-base font-extrabold text-red-700">
                        {patient.latestRiskScore}
                      </span>
                      <span className="text-[10px] text-[#64748b] font-mono"> /100</span>
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4">
                      <RiskBadge level={patient.latestRiskLevel} size="sm" />
                    </td>

                    {/* Trend */}
                    <td className="py-3 px-4">
                      <TrendIndicator
                        trend={patient.latestTrend}
                        delta={patient.latestRiskDelta}
                        size="sm"
                      />
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#475569]">
                      {patient.lastAssessmentTime}
                    </td>

                    {/* Ward / Unit & Bed */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1e293b]">{patient.ward}</div>
                      <div className="text-[11px] font-mono text-[#64748b]">
                        {patient.bed}
                      </div>
                    </td>

                    {/* Risk Delta */}
                    <td className="py-3 px-4 font-mono text-xs font-bold">
                      <span
                        className={
                          patient.latestRiskDelta > 0
                            ? 'text-red-700'
                            : patient.latestRiskDelta < 0
                            ? 'text-emerald-700'
                            : 'text-[#64748b]'
                        }
                      >
                        {patient.latestRiskDelta > 0
                          ? `+${patient.latestRiskDelta}`
                          : patient.latestRiskDelta}
                      </span>
                    </td>

                    {/* Profile Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewProfile(patient.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-[4px] transition-colors"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3 text-teal-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
