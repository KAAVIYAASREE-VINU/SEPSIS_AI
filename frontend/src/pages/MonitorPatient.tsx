import React from 'react';
import { AssessmentCalculationResult } from '../utils/sepsisCalculator';
import { LabValues, Patient, VitalSigns } from '../types';
import { AssessmentForm } from '../components/AssessmentForm';

interface MonitorPatientProps {
  patients: Patient[];
  onAssessmentCompleted: (
    patientId: string,
    result: AssessmentCalculationResult,
    vitals: VitalSigns,
    labs: LabValues
  ) => void;
  selectedPatientId?: string;
  backendResult?: AssessmentCalculationResult | null;
  submitting?: boolean;
}

export const MonitorPatient: React.FC<MonitorPatientProps> = ({
  patients,
  onAssessmentCompleted,
  selectedPatientId,
  backendResult,
  submitting,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-[6px] border border-[#e2e8f0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[#0f172a]">
              Clinical Decision-Support: Real-Time Sepsis Assessment
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Enter bedside physiologic parameters and optional lab markers to generate trajectory risk scores and factor rationales.
            </p>
          </div>

          <div className="text-[11px] font-mono text-[#64748b] bg-[#f8fafc] px-3 py-1.5 rounded-[4px] border border-[#e2e8f0] self-start md:self-auto">
            Algorithm: Ensemble CDS ML-Trajectory
          </div>
        </div>
      </div>

      <AssessmentForm
        patients={patients}
        onAssessmentCompleted={onAssessmentCompleted}
        initialPatientId={selectedPatientId}
        backendResult={backendResult}
        submitting={submitting}
      />
    </div>
  );
};
