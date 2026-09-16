import React, { useState } from 'react';
import { Patient, NavigationPage } from '../types';
import { RiskChart } from '../components/RiskChart';
import { RiskBadge } from '../components/RiskBadge';
import { TrendIndicator } from '../components/TrendIndicator';
import { Search, History, Building2, Bed, ExternalLink, Calendar, Zap } from 'lucide-react';

interface PatientHistoryProps {
  patients: Patient[];
  onViewProfile: (patientId: string) => void;
  onMonitorPatient: (patientId: string) => void;
  initialSelectedPatientId?: string;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  patients,
  onViewProfile,
  onMonitorPatient,
  initialSelectedPatientId,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedPatientId || (patients.length > 0 ? patients[0].id : '')
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Selected patient
  const selectedPatient = patients.find((p) => p.id === selectedId) || patients[0];

  // Search filtered patients list for quick selection
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Patient Selection Toolbar */}
      <div className="bg-white p-4 rounded-[6px] border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-700" />
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0f172a]">
              Longitudinal Patient History & Trajectory Audit
            </h2>
            <p className="text-xs text-[#64748b]">
              Select a patient to inspect historical sepsis trajectory epochs and vital trends
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Filter Search */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
            />
          </div>

          {/* Patient Selector Dropdown */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-semibold bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
          >
            {filteredPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.name} ({p.ward})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPatient && (
        <>
          {/* Selected Patient Identity Banner */}
          <div className="bg-white rounded-[6px] border border-[#e2e8f0] p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold font-sans tracking-tight text-[#0f172a]">
                    {selectedPatient.name}
                  </h3>
                  <span className="font-mono text-xs px-2.5 py-0.5 bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] rounded-[4px] font-bold">
                    {selectedPatient.id}
                  </span>
                  <RiskBadge level={selectedPatient.latestRiskLevel} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-[#64748b]">
                  <span className="font-mono">Age: <strong className="text-[#1e293b]">{selectedPatient.age}y</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#64748b]" />
                    <span className="font-medium text-[#1e293b]">{selectedPatient.ward}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-[#64748b]" />
                    <span className="font-mono font-semibold text-[#1e293b]">{selectedPatient.bed}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>Admitted: {selectedPatient.admissionDate}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewProfile(selectedPatient.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-[4px] transition-colors"
                >
                  <span>View Full Profile</span>
                  <ExternalLink className="w-3 h-3 text-teal-700" />
                </button>
                <button
                  onClick={() => onMonitorPatient(selectedPatient.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-[4px] transition-colors shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-teal-200" />
                  <span>Run Assessment</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Risk Trajectory Chart */}
          <div className="bg-white rounded-[6px] border border-[#e2e8f0] p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f1f5f9]">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
                  Historical Sepsis Risk Trajectory
                </h4>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Sequential risk trajectory points over admission timeline
                </p>
              </div>
              <span className="text-xs font-mono text-[#334155] bg-[#f8fafc] px-2.5 py-1 rounded-[4px] border border-[#e2e8f0]">
                {selectedPatient.assessments.length} Recorded Epochs
              </span>
            </div>

            <RiskChart assessments={selectedPatient.assessments} height={320} />
          </div>

          {/* Historical Assessments Table */}
          <div className="bg-white rounded-[6px] border border-[#e2e8f0] overflow-hidden">
            <div className="p-4 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
                  Historical Assessments Audit Log
                </h4>
                <p className="text-xs text-[#64748b]">
                  Chronological record of scores, risk levels, trends, and clinical factors
                </p>
              </div>
              <span className="text-xs font-mono text-[#64748b]">
                Order: Most recent first
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                    <th className="py-2.5 px-4">Assessment Timestamp</th>
                    <th className="py-2.5 px-4">Risk Score</th>
                    <th className="py-2.5 px-4">Risk Level</th>
                    <th className="py-2.5 px-4">Trend</th>
                    <th className="py-2.5 px-4">Delta vs Prior</th>
                    <th className="py-2.5 px-4">Vitals Snapshot</th>
                    <th className="py-2.5 px-4">Primary Factors / Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {[...selectedPatient.assessments]
                    .reverse()
                    .map((asm) => (
                      <tr key={asm.id} className="hover:bg-[#f8fafc] transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-mono text-[#0f172a] font-semibold whitespace-nowrap">
                          {asm.timestamp}
                        </td>

                        {/* Risk Score */}
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono font-bold text-base ${
                              asm.riskLevel === 'HIGH'
                                ? 'text-red-700'
                                : asm.riskLevel === 'MODERATE'
                                ? 'text-amber-800'
                                : 'text-emerald-700'
                            }`}
                          >
                            {asm.riskScore}
                          </span>
                          <span className="text-[10px] text-[#64748b] font-mono"> /100</span>
                        </td>

                        {/* Risk Level */}
                        <td className="py-3 px-4">
                          <RiskBadge level={asm.riskLevel} size="sm" />
                        </td>

                        {/* Trend */}
                        <td className="py-3 px-4">
                          <TrendIndicator trend={asm.trend} size="sm" />
                        </td>

                        {/* Delta */}
                        <td className="py-3 px-4 font-mono text-xs">
                          <span
                            className={
                              asm.riskDelta > 0
                                ? 'text-red-700 font-bold'
                                : asm.riskDelta < 0
                                ? 'text-emerald-700 font-bold'
                                : 'text-[#64748b]'
                            }
                          >
                            {asm.riskDelta > 0 ? `+${asm.riskDelta}` : asm.riskDelta}
                          </span>
                        </td>

                        {/* Vitals Snapshot */}
                        <td className="py-3 px-4 font-mono text-[11px] text-[#334155] whitespace-nowrap">
                          <div>
                            T: {asm.vitals.temperature}°C · HR: {asm.vitals.heartRate} · RR: {asm.vitals.respiratoryRate}
                          </div>
                          <div className="text-[#64748b] text-[10px]">
                            BP: {asm.vitals.systolicBp} · SpO₂: {asm.vitals.spo2}% · {asm.vitals.consciousness}
                          </div>
                        </td>

                        {/* Contributing Factors & Recommendation */}
                        <td className="py-3 px-4 text-[#475569]">
                          <div className="text-xs text-[#1e293b] font-medium">
                            {asm.contributingFactors.slice(0, 2).join('; ') || 'Baseline parameters stable'}
                          </div>
                          <div className="text-[11px] text-[#64748b] mt-0.5 italic">
                            {asm.recommendation}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
