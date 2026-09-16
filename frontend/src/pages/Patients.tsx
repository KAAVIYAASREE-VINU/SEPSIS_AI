import React, { useState } from 'react';
import { Patient } from '../types';
import { PatientTable } from '../components/PatientTable';

interface PatientsPageProps {
  patients: Patient[];
  onViewProfile: (patientId: string) => void;
}

export const Patients: React.FC<PatientsPageProps> = ({ patients, onViewProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [trendFilter, setTrendFilter] = useState('ALL');

  // Filter patients based on user inputs
  const filteredPatients = patients.filter((patient) => {
    // Search query matching ID or Name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = patient.id.toLowerCase().includes(q);
      const matchName = patient.name.toLowerCase().includes(q);
      if (!matchId && !matchName) return false;
    }

    // Risk filter
    if (riskFilter !== 'ALL' && patient.latestRiskLevel !== riskFilter) {
      return false;
    }

    // Ward filter
    if (wardFilter !== 'ALL' && patient.ward !== wardFilter) {
      return false;
    }

    // Trend filter
    if (trendFilter !== 'ALL' && patient.latestTrend !== trendFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-[6px] border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#0f172a]">
            Patient Cohort Directory
          </h2>
          <p className="text-xs text-[#64748b]">
            Comprehensive census across ICU, Emergency, and Step-down Inpatient Wards
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#64748b]">Active Census:</span>
          <span className="font-bold text-[#0f172a]">{patients.length} Inpatients</span>
        </div>
      </div>

      <PatientTable
        patients={filteredPatients}
        onViewProfile={onViewProfile}
        showAgeColumn={true}
        showFilters={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        wardFilter={wardFilter}
        onWardFilterChange={setWardFilter}
        trendFilter={trendFilter}
        onTrendFilterChange={setTrendFilter}
        title="Hospital-Wide Patient Monitoring Registry"
        subtitle="Filter cohort by clinical unit, trajectory slope, or sepsis risk stratification"
      />
    </div>
  );
};
