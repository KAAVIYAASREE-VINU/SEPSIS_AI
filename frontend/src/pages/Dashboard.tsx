import React from 'react';
import { Patient } from '../types';
import { KPICard } from '../components/KPICard';
import { RiskDistribution } from '../components/RiskDistribution';
import { AlertPanel } from '../components/AlertPanel';
import { PatientTable } from '../components/PatientTable';
import { Users, AlertTriangle, Activity, AlertOctagon } from 'lucide-react';

interface DashboardProps {
  patients: Patient[];
  onViewProfile: (patientId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ patients, onViewProfile }) => {
  const totalActive = patients.length;
  const highRiskCount = patients.filter((p) => p.latestRiskLevel === 'HIGH').length;
  const modRiskCount = patients.filter((p) => p.latestRiskLevel === 'MODERATE').length;
  const deterioratingCount = patients.filter(
    (p) => p.latestTrend === 'RAPID_DETERIORATION'
  ).length;

  return (
    <div className="space-y-6">
      {/* 4 COMPACT KPI CARDS */}
      <section id="kpi-cards-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Active Patients */}
          <KPICard
            id="kpi-active-patients"
            label="Active Patients"
            value={totalActive}
            context="Across 5 hospital wards"
            icon={Users}
            variant="default"
          />

          {/* 2. High Risk */}
          <KPICard
            id="kpi-high-risk"
            label="High Risk"
            value={highRiskCount}
            context="Risk score ≥65 /100"
            icon={AlertTriangle}
            variant="high-risk"
          />

          {/* 3. Moderate Risk */}
          <KPICard
            id="kpi-moderate-risk"
            label="Moderate Risk"
            value={modRiskCount}
            context="Risk score 35–64 /100"
            icon={Activity}
            variant="moderate-risk"
          />

          {/* 4. Deteriorating */}
          <KPICard
            id="kpi-deteriorating"
            label="Deteriorating"
            value={deterioratingCount}
            context="Rapid delta ≥+20 pts"
            icon={AlertOctagon}
            variant="deteriorating"
          />
        </div>
      </section>

      {/* 12-COLUMN GRID FOR VISUALIZATIONS & RECENT ALERTS */}
      <section id="middle-dashboard-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Risk Distribution Chart (5 cols on lg) */}
        <div className="lg:col-span-6 h-full">
          <RiskDistribution patients={patients} />
        </div>

        {/* Recent Alerts Panel (7 cols on lg) */}
        <div className="lg:col-span-6 h-full">
          <AlertPanel patients={patients} onViewPatient={onViewProfile} />
        </div>
      </section>

      {/* ACTIVE PATIENTS TABLE */}
      <section id="active-patients-section">
        <PatientTable
          patients={patients}
          onViewProfile={onViewProfile}
          title="Active Monitored Patients"
          subtitle="Real-time risk scoring, trajectory direction, and vital assessment timelines"
        />
      </section>
    </div>
  );
};
