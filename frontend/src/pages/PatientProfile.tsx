import React from 'react';
import { Patient, NavigationPage } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { TrendIndicator } from '../components/TrendIndicator';
import { VitalCard } from '../components/VitalCard';
import { RiskChart } from '../components/RiskChart';
import { ClinicalTrends } from '../components/ClinicalTrends';
import {
  ArrowLeft,
  Calendar,
  Bed,
  Building2,
  AlertTriangle,
  History,
  Activity,
  Zap,
} from 'lucide-react';

interface PatientProfileProps {
  patient: Patient;
  onBack: () => void;
  onNavigate: (page: NavigationPage) => void;
  onMonitorPatient: (patientId: string) => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({
  patient,
  onBack,
  onNavigate,
  onMonitorPatient,
}) => {
  // Helper to evaluate vital status for visual cues
  const getVitalStatus = (param: string, value: number): 'normal' | 'warning' | 'critical' => {
    switch (param) {
      case 'temp':
        if (value >= 39.0 || value <= 35.5) return 'critical';
        if (value >= 38.0 || value <= 36.0) return 'warning';
        return 'normal';
      case 'hr':
        if (value > 120 || value < 45) return 'critical';
        if (value > 90 || value < 55) return 'warning';
        return 'normal';
      case 'rr':
        if (value >= 26 || value < 10) return 'critical';
        if (value >= 22 || value < 12) return 'warning';
        return 'normal';
      case 'sbp':
        if (value <= 90) return 'critical';
        if (value <= 100) return 'warning';
        return 'normal';
      case 'spo2':
        if (value < 92) return 'critical';
        if (value < 95) return 'warning';
        return 'normal';
      case 'lactate':
        if (value >= 4.0) return 'critical';
        if (value >= 2.0) return 'warning';
        return 'normal';
      case 'wbc':
        if (value > 15.0 || value < 3.5) return 'critical';
        if (value > 11.5 || value < 4.0) return 'warning';
        return 'normal';
      case 'creatinine':
        if (value >= 2.0) return 'critical';
        if (value >= 1.4) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const v = patient.currentVitals;
  const l = patient.currentLabs;

  return (
    <div className="space-y-6">
      {/* Top Action & Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          id="btn-back-patients"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-[#475569] bg-white border border-[#cbd5e1] hover:bg-slate-50 rounded-[4px] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients Registry</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonitorPatient(patient.id)}
            id="btn-profile-run-assessment"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-[4px] transition-colors shadow-sm cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-teal-200" />
            <span>Perform New Assessment</span>
          </button>
        </div>
      </div>

      {/* IDENTITY HEADER */}
      {/* Explicitly NO DOCTOR / PHYSICIAN information shown */}
      <section
        id="patient-identity-header"
        className="bg-white rounded-[6px] border border-[#e2e8f0] p-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-sans tracking-tight text-[#0f172a]">
                {patient.name}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] rounded-[4px] font-bold">
                {patient.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-[#64748b]">
              <span className="font-mono">Age: <strong className="text-[#1e293b]">{patient.age} years</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#64748b]" />
                <span className="font-medium text-[#1e293b]">{patient.ward}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-[#64748b]" />
                <span className="font-mono font-semibold text-[#1e293b]">{patient.bed}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                <span>Admitted: <strong className="text-[#1e293b]">{patient.admissionDate}</strong></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <span className="text-xs font-mono text-[#64748b]">Last Assessment:</span>
            <span className="text-xs font-mono font-semibold text-[#0f172a] bg-[#f8fafc] px-2.5 py-1 rounded-[4px] border border-[#e2e8f0]">
              {patient.lastAssessmentTime}
            </span>
          </div>
        </div>
      </section>

      {/* CURRENT RISK - PRIMARY VISUAL FOCUS */}
      <section
        id="current-risk-section"
        className={`p-6 rounded-[6px] border ${
          patient.latestRiskLevel === 'HIGH'
            ? 'bg-[#fff7f7] border-red-300'
            : patient.latestRiskLevel === 'MODERATE'
            ? 'bg-[#fffbf0] border-amber-300'
            : 'bg-[#f0fdf4] border-emerald-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                patient.latestRiskLevel === 'HIGH'
                  ? 'bg-red-600 animate-pulse'
                  : patient.latestRiskLevel === 'MODERATE'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600'
              }`}
            ></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#475569]">
              Current Sepsis Risk Score (Primary Metric)
            </span>
          </div>
          <RiskBadge level={patient.latestRiskLevel} size="lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-3">
          {/* Large Risk Score */}
          <div className="md:col-span-4 flex items-baseline gap-2">
            <span
              className={`text-6xl font-mono font-extrabold tracking-tight ${
                patient.latestRiskLevel === 'HIGH'
                  ? 'text-red-700'
                  : patient.latestRiskLevel === 'MODERATE'
                  ? 'text-amber-800'
                  : 'text-emerald-700'
              }`}
            >
              {patient.latestRiskScore}
            </span>
            <span className="text-xl font-mono text-[#64748b]">/100</span>
          </div>

          {/* Trend arrow, label, and risk delta vs previous */}
          <div className="md:col-span-8 flex flex-wrap items-center gap-4">
            <div className="p-3 bg-white rounded-[4px] border border-[#e2e8f0] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] block">
                Trajectory Trend
              </span>
              <TrendIndicator trend={patient.latestTrend} size="lg" />
            </div>

            <div className="p-3 bg-white rounded-[4px] border border-[#e2e8f0] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] block">
                Risk Delta vs Previous
              </span>
              <div
                className={`font-mono text-base font-bold ${
                  patient.latestRiskDelta > 0
                    ? 'text-red-700'
                    : patient.latestRiskDelta < 0
                    ? 'text-emerald-700'
                    : 'text-[#0f172a]'
                }`}
              >
                {patient.latestRiskDelta > 0
                  ? `+${patient.latestRiskDelta} points`
                  : patient.latestRiskDelta < 0
                  ? `${patient.latestRiskDelta} points`
                  : '0 points (No change)'}
              </div>
            </div>

            <div className="p-3 bg-white rounded-[4px] border border-[#e2e8f0] space-y-1 flex-1 min-w-[200px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] block">
                Clinical Recommendation
              </span>
              <span className="text-xs font-semibold text-[#1e293b]">
                {patient.latestRiskLevel === 'HIGH' || patient.latestTrend === 'RAPID_DETERIORATION'
                  ? 'Immediate clinical review recommended per local protocol'
                  : patient.latestRiskLevel === 'MODERATE'
                  ? 'Increase frequency of observations to 2-hourly'
                  : 'Routine 4-hour clinical monitoring'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTRIBUTING FACTORS */}
      <section
        id="contributing-factors-section"
        className="bg-white rounded-[6px] border border-[#e2e8f0] p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
            Current Contributing Factors
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {patient.contributingFactors.map((factor, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-[4px] bg-[#f8fafc] border border-[#e2e8f0] text-xs font-mono text-[#1e293b] flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
              <span>{factor}</span>
            </div>
          ))}
        </div>
      </section>

      {/* LATEST VITALS GRID */}
      <section id="latest-vitals-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
              Latest Bedside Vitals & Laboratory Biomarkers
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#64748b]">
            Reference standards: Adult ICU/General Inpatient
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Temperature */}
          <VitalCard
            label="Temperature"
            value={v.temperature.toFixed(1)}
            unit="°C"
            reference="36.5–37.5"
            status={getVitalStatus('temp', v.temperature)}
          />

          {/* Heart Rate */}
          <VitalCard
            label="Heart Rate"
            value={v.heartRate}
            unit="bpm"
            reference="60–90"
            status={getVitalStatus('hr', v.heartRate)}
          />

          {/* Respiratory Rate */}
          <VitalCard
            label="Resp. Rate"
            value={v.respiratoryRate}
            unit="breaths/min"
            reference="12–20"
            status={getVitalStatus('rr', v.respiratoryRate)}
          />

          {/* Systolic BP */}
          <VitalCard
            label="Systolic BP"
            value={v.systolicBp}
            unit="mmHg"
            reference="100–135"
            status={getVitalStatus('sbp', v.systolicBp)}
          />

          {/* SpO2 */}
          <VitalCard
            label="SpO₂ Saturation"
            value={v.spo2}
            unit="%"
            reference="95–100"
            status={getVitalStatus('spo2', v.spo2)}
          />

          {/* Consciousness */}
          <VitalCard
            label="Consciousness"
            value={v.consciousness}
            unit=""
            reference="Alert (A)"
            status={v.consciousness !== 'Alert' ? 'critical' : 'normal'}
          />

          {/* WBC */}
          <VitalCard
            label="WBC Count"
            value={l.wbc !== undefined ? l.wbc.toFixed(1) : '—'}
            unit="×10⁹/L"
            reference="4.0–11.0"
            status={l.wbc !== undefined ? getVitalStatus('wbc', l.wbc) : 'normal'}
          />

          {/* Lactate */}
          <VitalCard
            label="Serum Lactate"
            value={l.lactate !== undefined ? l.lactate.toFixed(1) : '—'}
            unit="mmol/L"
            reference="0.5–2.0"
            status={l.lactate !== undefined ? getVitalStatus('lactate', l.lactate) : 'normal'}
          />

          {/* Creatinine */}
          <VitalCard
            label="Creatinine"
            value={l.creatinine !== undefined ? l.creatinine.toFixed(1) : '—'}
            unit="mg/dL"
            reference="0.6–1.2"
            status={l.creatinine !== undefined ? getVitalStatus('creatinine', l.creatinine) : 'normal'}
          />

          {/* Oxygen Support / Mode */}
          <VitalCard
            label="Oxygen Delivery"
            value={v.spo2 < 93 ? '4L/min NC' : 'Room Air'}
            unit=""
            reference="Ambient"
            status={v.spo2 < 93 ? 'warning' : 'normal'}
          />
        </div>
      </section>

      {/* CLINICAL TRENDS (LAST 24 HOURS) */}
      <ClinicalTrends patient={patient} />

      {/* RISK TRAJECTORY CHART */}
      <section
        id="risk-trajectory-section"
        className="bg-white rounded-[6px] border border-[#e2e8f0] p-5"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f1f5f9]">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
              Sepsis Risk Trajectory Curve
            </h3>
            <p className="text-xs text-[#64748b] mt-0.5">
              Longitudinal tracking of CDS risk scores across admission epochs
            </p>
          </div>
          <span className="text-xs font-mono text-[#334155] bg-[#f8fafc] px-2.5 py-1 rounded-[4px] border border-[#e2e8f0]">
            {patient.assessments.length} Historical Points
          </span>
        </div>

        <RiskChart assessments={patient.assessments} height={300} />
      </section>

      {/* ASSESSMENT HISTORY TABLE */}
      <section
        id="assessment-history-section"
        className="bg-white rounded-[6px] border border-[#e2e8f0] overflow-hidden"
      >
        <div className="p-4 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
              Assessment History
            </h3>
          </div>
          <span className="text-xs font-mono text-[#64748b]">
            Chronological audit log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Risk Level</th>
                <th className="py-2.5 px-4">Trend</th>
                <th className="py-2.5 px-4">Risk Delta</th>
                <th className="py-2.5 px-4">Key Assessment Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {[...patient.assessments]
                .reverse()
                .map((asm) => (
                  <tr key={asm.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#1e293b] font-medium">
                      {asm.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold text-sm ${
                          asm.riskLevel === 'HIGH'
                            ? 'text-red-700'
                            : asm.riskLevel === 'MODERATE'
                            ? 'text-amber-800'
                            : 'text-emerald-700'
                        }`}
                      >
                        {asm.riskScore}
                      </span>
                      <span className="text-[#64748b] text-[10px] font-mono"> /100</span>
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={asm.riskLevel} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <TrendIndicator trend={asm.trend} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
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
                    <td className="py-3 px-4 text-[#475569] font-sans">
                      {asm.contributingFactors[0] || 'Routine assessment'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
