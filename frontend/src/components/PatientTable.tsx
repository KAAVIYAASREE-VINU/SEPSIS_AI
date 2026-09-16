import React from 'react';
import { Patient } from '../types';
import { RiskBadge } from './RiskBadge';
import { TrendIndicator } from './TrendIndicator';
import { ExternalLink, Search, Filter } from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
  onViewProfile: (patientId: string) => void;
  showAgeColumn?: boolean;
  showFilters?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  riskFilter?: string;
  onRiskFilterChange?: (val: string) => void;
  wardFilter?: string;
  onWardFilterChange?: (val: string) => void;
  trendFilter?: string;
  onTrendFilterChange?: (val: string) => void;
  title?: string;
  subtitle?: string;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  onViewProfile,
  showAgeColumn = false,
  showFilters = false,
  searchQuery = '',
  onSearchChange,
  riskFilter = 'ALL',
  onRiskFilterChange,
  wardFilter = 'ALL',
  onWardFilterChange,
  trendFilter = 'ALL',
  onTrendFilterChange,
  title,
  subtitle,
}) => {
  // Extract unique wards for filter
  const wards = Array.from(new Set(patients.map((p) => p.ward)));

  return (
    <div
      id="patient-table-container"
      className="bg-white rounded-[6px] border border-[#e2e8f0] overflow-hidden"
    >
      {/* Optional Table Header / Filter Bar */}
      {(title || showFilters) && (
        <div className="p-4 border-b border-[#e2e8f0] bg-white space-y-3">
          {title && (
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#475569]">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-[#64748b] mt-0.5">{subtitle}</p>
                )}
              </div>
              <span className="text-xs font-mono text-[#334155] bg-[#f8fafc] px-2.5 py-1 rounded-[4px] border border-[#e2e8f0]">
                Showing {patients.length} records
              </span>
            </div>
          )}

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Patient ID or Name..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 focus:bg-white text-[#0f172a]"
                />
              </div>

              {/* Risk Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-[#64748b] shrink-0 uppercase">Risk:</span>
                <select
                  value={riskFilter}
                  onChange={(e) => onRiskFilterChange?.(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">High Risk (≥65)</option>
                  <option value="MODERATE">Moderate Risk (35-64)</option>
                  <option value="LOW">Low Risk (&lt;35)</option>
                </select>
              </div>

              {/* Ward Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-[#64748b] shrink-0 uppercase">Ward:</span>
                <select
                  value={wardFilter}
                  onChange={(e) => onWardFilterChange?.(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
                >
                  <option value="ALL">All Wards / Units</option>
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trend Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-[#64748b] shrink-0 uppercase">Trend:</span>
                <select
                  value={trendFilter}
                  onChange={(e) => onTrendFilterChange?.(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
                >
                  <option value="ALL">All Trends</option>
                  <option value="RAPID_DETERIORATION">⚠ Rapid Deterioration</option>
                  <option value="RISING">↑ Rising</option>
                  <option value="STABLE">→ Stable</option>
                  <option value="IMPROVING">↓ Improving</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-mono uppercase tracking-wider text-[#475569]">
              <th className="py-2.5 px-4">Patient ID</th>
              <th className="py-2.5 px-4">{showAgeColumn ? 'Name / Age' : 'Name'}</th>
              <th className="py-2.5 px-4">Ward / Unit</th>
              <th className="py-2.5 px-4">Risk Score</th>
              <th className="py-2.5 px-4">Trend</th>
              <th className="py-2.5 px-4">Last Assessment</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9] text-xs">
            {patients.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#64748b] font-mono">
                  No patients matching current criteria.
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr
                  key={patient.id}
                  id={`patient-row-${patient.id}`}
                  className="hover:bg-[#f8fafc] transition-colors"
                >
                  {/* Patient ID */}
                  <td className="py-3 px-4 font-mono font-semibold text-[#0f172a]">
                    {patient.id}
                  </td>

                  {/* Name (+ Age if requested) */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1e293b]">{patient.name}</div>
                    {showAgeColumn && (
                      <div className="text-[11px] text-[#64748b] font-mono">
                        Age: {patient.age}y
                      </div>
                    )}
                  </td>

                  {/* Ward / Unit & Bed */}
                  <td className="py-3 px-4">
                    <div className="text-[#334155] font-medium">{patient.ward}</div>
                    <div className="text-[11px] text-[#64748b] font-mono">
                      {patient.bed}
                    </div>
                  </td>

                  {/* Risk Score */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-base font-bold ${
                          patient.latestRiskLevel === 'HIGH'
                            ? 'text-red-700'
                            : patient.latestRiskLevel === 'MODERATE'
                            ? 'text-amber-800'
                            : 'text-emerald-700'
                        }`}
                      >
                        {patient.latestRiskScore}
                      </span>
                      <span className="text-[10px] text-[#64748b] font-mono">/100</span>
                      <RiskBadge level={patient.latestRiskLevel} size="sm" />
                    </div>
                  </td>

                  {/* Trend */}
                  <td className="py-3 px-4">
                    <TrendIndicator
                      trend={patient.latestTrend}
                      delta={patient.latestRiskDelta}
                      size="sm"
                    />
                  </td>

                  {/* Last Assessment */}
                  <td className="py-3 px-4 font-mono text-[11px] text-[#475569]">
                    {patient.lastAssessmentTime}
                  </td>

                  {/* View Profile Action */}
                  <td className="py-3 px-4 text-right">
                    <button
                      id={`btn-view-${patient.id}`}
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
  );
};
