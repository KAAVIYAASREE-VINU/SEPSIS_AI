import React, { useState, useEffect } from 'react';
import { NavigationPage, Patient, VitalSigns, LabValues } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { MonitorPatient } from './pages/MonitorPatient';
import { PatientProfile } from './pages/PatientProfile';
import { Alerts } from './pages/Alerts';
import { PatientHistory } from './pages/PatientHistory';
import { usePatients } from './hooks/usePatients';
import {
  submitAssessment,
  AssessmentPayload,
  BackendAssessment,
} from './services/api';
import { mapBackendAssessment, mapBackendPatient } from './services/mappers';
import { getPatientHistory, getPatient } from './services/api';
import { AssessmentCalculationResult } from './utils/sepsisCalculator';

// ─────────────────────────────────────────────────────────────────────────────
//  Loading screen shown while patients are being fetched from the backend
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f4f7]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-mono text-[#475569]">Connecting to SEPSIS-AI backend…</p>
        <p className="text-xs font-mono text-[#94a3b8]">localhost:8000</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f4f7]">
      <div className="bg-white rounded-[6px] border border-red-200 p-8 max-w-md text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <span className="text-red-600 text-xl">⚠</span>
        </div>
        <h2 className="text-sm font-mono font-bold text-[#0f172a]">Backend Connection Failed</h2>
        <p className="text-xs text-[#64748b]">{error}</p>
        <p className="text-xs font-mono text-[#94a3b8]">
          Make sure the FastAPI server is running on localhost:8000
          <br />
          <code className="text-teal-700">cd backend && uvicorn main:app --port 8000</code>
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 text-xs font-mono font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-[4px] transition-colors"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [latestAssessmentResult, setLatestAssessmentResult] = useState<AssessmentCalculationResult | null>(null);

  // Load patients from backend
  const { patients, setPatients, loading, error, reload } = usePatients();

  // Once patients load, set default selected patient
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Alert count based on live patient data
  const alertCount = patients.filter(
    (p) => p.latestRiskLevel === 'HIGH' || p.latestTrend === 'RAPID_DETERIORATION'
  ).length;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleViewProfile = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentPage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMonitorPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentPage('monitor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (page: NavigationPage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * handleAssessmentCompleted — called by AssessmentForm after the user submits.
   *
   * Now calls the backend instead of calculateSepsisRisk().
   * The backend result is merged back into the patients state so all pages
   * reflect the new data immediately without a full reload.
   */
  const handleAssessmentCompleted = async (
    patientId: string,
    _resultUnused: unknown, // kept for interface compat; we use backend result instead
    vitals: VitalSigns,
    labs: LabValues
  ) => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    setLatestAssessmentResult(null); // Clear previous result

    // Build backend payload (diastolic_bp derived from systolic if not provided)
    const payload: AssessmentPayload = {
      temperature: vitals.temperature,
      heart_rate: vitals.heartRate,
      respiratory_rate: vitals.respiratoryRate,
      systolic_bp: vitals.systolicBp,
      diastolic_bp: Math.round(vitals.systolicBp * 0.65),
      spo2: vitals.spo2,
      consciousness: vitals.consciousness,
      wbc: labs.wbc ?? null,
      lactate: labs.lactate ?? null,
      creatinine: labs.creatinine ?? null,
    };

    try {
      // POST to backend — risk calculated server-side
      const backendResult: BackendAssessment = await submitAssessment(
        patientId.trim().toUpperCase(),
        payload
      );

      const newRecord = mapBackendAssessment(backendResult);

      // Convert backend result to AssessmentCalculationResult format for form display
      const displayResult: AssessmentCalculationResult = {
        riskScore: newRecord.riskScore,
        riskLevel: newRecord.riskLevel,
        mlProbability: newRecord.mlProbability,
        trend: newRecord.trend,
        riskDelta: newRecord.riskDelta,
        contributingFactors: newRecord.contributingFactors,
        dataConfidence: newRecord.dataConfidence,
        recommendation: newRecord.recommendation,
      };

      // Set the result to be displayed in the form
      setLatestAssessmentResult(displayResult);

      // Re-fetch updated patient from backend and merge
      try {
        const updatedBp = await getPatient(patientId.trim().toUpperCase());
        const updatedHistory = await getPatientHistory(patientId.trim().toUpperCase());
        const updatedPatient = mapBackendPatient(updatedBp, updatedHistory);

        setPatients((prev) =>
          prev.map((p) =>
            p.id.toUpperCase() === patientId.trim().toUpperCase() ? updatedPatient : p
          )
        );
      } catch {
        // Fallback: update state locally from the assessment result
        setPatients((prev) =>
          prev.map((p) => {
            if (p.id.toUpperCase() !== patientId.trim().toUpperCase()) return p;
            return {
              ...p,
              latestRiskScore: newRecord.riskScore,
              latestRiskLevel: newRecord.riskLevel,
              latestTrend: newRecord.trend,
              latestRiskDelta: newRecord.riskDelta,
              lastAssessmentTime: newRecord.timestamp,
              currentVitals: vitals,
              currentLabs: labs,
              contributingFactors: newRecord.contributingFactors,
              assessments: [...p.assessments, newRecord],
              temperatureHistory: [
                ...p.temperatureHistory,
                { time: newRecord.timeLabel, temperature: vitals.temperature },
              ],
              bloodPressureHistory: [
                ...p.bloodPressureHistory,
                {
                  time: newRecord.timeLabel,
                  systolic: vitals.systolicBp,
                  diastolic: Math.round(vitals.systolicBp * 0.65),
                },
              ],
              wbcHistory:
                labs.wbc !== undefined
                  ? [...p.wbcHistory, { time: newRecord.timeLabel, wbc: labs.wbc as number }]
                  : p.wbcHistory,
            };
          })
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assessment failed';
      setAssessmentError(msg);
      console.error('[App] Assessment error:', err);
    } finally {
      setAssessmentLoading(false);
    }
  };

  // Header metadata per page
  const getHeaderConfig = () => {
    switch (currentPage) {
      case 'dashboard':
        return {
          title: 'Hospital Command Dashboard',
          subtitle:
            'Hospital-level sepsis risk surveillance, clinical distribution, and rapid deterioration alerting.',
        };
      case 'patients':
        return {
          title: 'Patients Registry',
          subtitle:
            'Searchable and filterable inpatient cohort registry across all intensive care and ward beds.',
        };
      case 'monitor':
        return {
          title: 'Monitor Patient Assessment',
          subtitle:
            'Bedside physiological evaluation form, laboratory marker scoring, and risk trajectory projection.',
        };
      case 'alerts':
        return {
          title: 'Hospital Sepsis Alerts',
          subtitle:
            'Priority escalation queue strictly isolating high-risk threshold violations and rapid deterioration events.',
        };
      case 'history':
        return {
          title: 'Patient History & Trajectory',
          subtitle:
            'Longitudinal trajectory curves, repeated assessment audit logs, and physiological parameter history.',
        };
      case 'profile':
        return {
          title: `Patient Profile — ${selectedPatient?.name || selectedPatientId}`,
          subtitle: `${selectedPatient?.ward || ''} · ${selectedPatient?.bed || ''} · Sepsis Risk Score Trajectory & Physiologic Parameters`,
        };
      default:
        return {
          title: 'SEPSIS-AI: Trajectory',
          subtitle: 'Clinical decision-support dashboard.',
        };
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen error={error} onRetry={reload} />;

  const headerConfig = getHeaderConfig();

  return (
    <div className="flex min-h-screen bg-[#f2f4f7] font-sans text-[#111827]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        alertCount={alertCount}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={headerConfig.title} subtitle={headerConfig.subtitle} />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <Dashboard patients={patients} onViewProfile={handleViewProfile} />
          )}

          {currentPage === 'patients' && (
            <Patients patients={patients} onViewProfile={handleViewProfile} />
          )}

          {currentPage === 'monitor' && (
            <>
              {assessmentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[4px] text-xs font-mono text-red-800">
                  Assessment error: {assessmentError}
                </div>
              )}
              {assessmentLoading && (
                <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-[4px] text-xs font-mono text-teal-800 flex items-center gap-2">
                  <div className="w-3 h-3 border border-teal-600 border-t-transparent rounded-full animate-spin" />
                  Sending to SEPSIS-AI backend for risk calculation…
                </div>
              )}
              <MonitorPatient
                patients={patients}
                onAssessmentCompleted={handleAssessmentCompleted}
                selectedPatientId={selectedPatientId}
                backendResult={latestAssessmentResult}
                submitting={assessmentLoading}
              />
            </>
          )}

          {currentPage === 'alerts' && (
            <Alerts patients={patients} onViewProfile={handleViewProfile} />
          )}

          {currentPage === 'history' && (
            <PatientHistory
              patients={patients}
              onViewProfile={handleViewProfile}
              onMonitorPatient={handleMonitorPatient}
              initialSelectedPatientId={selectedPatientId}
            />
          )}

          {currentPage === 'profile' && selectedPatient && (
            <PatientProfile
              patient={selectedPatient}
              onBack={() => handleNavigate('patients')}
              onNavigate={handleNavigate}
              onMonitorPatient={handleMonitorPatient}
            />
          )}
        </main>
      </div>
    </div>
  );
}
