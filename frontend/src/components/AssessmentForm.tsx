import React, { useState } from 'react';
import {
  ConsciousnessLevel,
  LabValues,
  Patient,
  VitalSigns,
} from '../types';
import { calculateSepsisRisk, AssessmentCalculationResult } from '../utils/sepsisCalculator';
import { RiskBadge } from './RiskBadge';
import { TrendIndicator } from './TrendIndicator';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AssessmentFormProps {
  patients: Patient[];
  onAssessmentCompleted?: (patientId: string, result: AssessmentCalculationResult, vitals: VitalSigns, labs: LabValues) => void;
  initialPatientId?: string;
  /** Backend-calculated result to display (replaces client-side calculation) */
  backendResult?: AssessmentCalculationResult | null;
  /** Whether the backend call is in progress */
  submitting?: boolean;
}

interface FormState {
  patientId: string;
  temperature: string;
  heartRate: string;
  respiratoryRate: string;
  systolicBp: string;
  spo2: string;
  consciousness: ConsciousnessLevel;
  wbc: string;
  lactate: string;
  creatinine: string;
}

interface FormErrors {
  patientId?: string;
  temperature?: string;
  heartRate?: string;
  respiratoryRate?: string;
  systolicBp?: string;
  spo2?: string;
  consciousness?: string;
  wbc?: string;
  lactate?: string;
  creatinine?: string;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({
  patients,
  onAssessmentCompleted,
  initialPatientId,
  backendResult,
  submitting: externalSubmitting,
}) => {
  // Find initial patient if provided
  const defaultPatient = patients.find((p) => p.id === initialPatientId) || patients[0];

  const [formData, setFormData] = useState<FormState>({
    patientId: defaultPatient ? defaultPatient.id : 'PT-8092',
    temperature: defaultPatient ? String(defaultPatient.currentVitals.temperature) : '38.8',
    heartRate: defaultPatient ? String(defaultPatient.currentVitals.heartRate) : '118',
    respiratoryRate: defaultPatient ? String(defaultPatient.currentVitals.respiratoryRate) : '26',
    systolicBp: defaultPatient ? String(defaultPatient.currentVitals.systolicBp) : '88',
    spo2: defaultPatient ? String(defaultPatient.currentVitals.spo2) : '91',
    consciousness: defaultPatient ? defaultPatient.currentVitals.consciousness : 'Alert',
    wbc: defaultPatient?.currentLabs.wbc ? String(defaultPatient.currentLabs.wbc) : '16.5',
    lactate: defaultPatient?.currentLabs.lactate ? String(defaultPatient.currentLabs.lactate) : '3.2',
    creatinine: defaultPatient?.currentLabs.creatinine ? String(defaultPatient.currentLabs.creatinine) : '1.9',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<AssessmentCalculationResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Update result when backend response arrives
  React.useEffect(() => {
    if (backendResult) {
      setResult(backendResult);
      setSavedSuccess(true);
    }
  }, [backendResult]);

  // Quick Preset Loader
  const handleSelectPatient = (pId: string) => {
    const p = patients.find((pat) => pat.id === pId);
    if (p) {
      setFormData({
        patientId: p.id,
        temperature: String(p.currentVitals.temperature),
        heartRate: String(p.currentVitals.heartRate),
        respiratoryRate: String(p.currentVitals.respiratoryRate),
        systolicBp: String(p.currentVitals.systolicBp),
        spo2: String(p.currentVitals.spo2),
        consciousness: p.currentVitals.consciousness,
        wbc: p.currentLabs.wbc !== undefined ? String(p.currentLabs.wbc) : '',
        lactate: p.currentLabs.lactate !== undefined ? String(p.currentLabs.lactate) : '',
        creatinine: p.currentLabs.creatinine !== undefined ? String(p.currentLabs.creatinine) : '',
      });
      setErrors({});
      setResult(null);
      setSavedSuccess(false);
    }
  };

  const loadPreset = (type: 'severe' | 'moderate' | 'normal') => {
    if (type === 'severe') {
      setFormData((prev) => ({
        ...prev,
        temperature: '39.2',
        heartRate: '124',
        respiratoryRate: '28',
        systolicBp: '82',
        spo2: '89',
        consciousness: 'Voice',
        wbc: '19.4',
        lactate: '4.4',
        creatinine: '2.4',
      }));
    } else if (type === 'moderate') {
      setFormData((prev) => ({
        ...prev,
        temperature: '38.2',
        heartRate: '98',
        respiratoryRate: '22',
        systolicBp: '102',
        spo2: '94',
        consciousness: 'Alert',
        wbc: '13.2',
        lactate: '2.3',
        creatinine: '1.4',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        temperature: '36.8',
        heartRate: '72',
        respiratoryRate: '15',
        systolicBp: '120',
        spo2: '99',
        consciousness: 'Alert',
        wbc: '6.8',
        lactate: '1.1',
        creatinine: '0.9',
      }));
    }
    setErrors({});
    setResult(null);
    setSavedSuccess(false);
  };

  // Validation function
  const validate = (data: FormState): FormErrors => {
    const errs: FormErrors = {};

    // Patient ID
    if (!data.patientId.trim()) {
      errs.patientId = 'Patient ID is required.';
    }

    // Temperature (30 - 45 °C)
    if (!data.temperature.trim()) {
      errs.temperature = 'Temperature is required.';
    } else {
      const val = parseFloat(data.temperature);
      if (isNaN(val) || val < 30 || val > 45) {
        errs.temperature = 'Must be between 30.0 and 45.0 °C.';
      }
    }

    // Heart Rate (30 - 240 bpm)
    if (!data.heartRate.trim()) {
      errs.heartRate = 'Heart Rate is required.';
    } else {
      const val = parseInt(data.heartRate, 10);
      if (isNaN(val) || val < 30 || val > 240) {
        errs.heartRate = 'Must be between 30 and 240 bpm.';
      }
    }

    // Respiratory Rate (5 - 60 breaths/min)
    if (!data.respiratoryRate.trim()) {
      errs.respiratoryRate = 'Respiratory Rate is required.';
    } else {
      const val = parseInt(data.respiratoryRate, 10);
      if (isNaN(val) || val < 5 || val > 60) {
        errs.respiratoryRate = 'Must be between 5 and 60 breaths/min.';
      }
    }

    // Systolic BP (40 - 260 mmHg)
    if (!data.systolicBp.trim()) {
      errs.systolicBp = 'Systolic BP is required.';
    } else {
      const val = parseInt(data.systolicBp, 10);
      if (isNaN(val) || val < 40 || val > 260) {
        errs.systolicBp = 'Must be between 40 and 260 mmHg.';
      }
    }

    // SpO2 (50 - 100 %)
    if (!data.spo2.trim()) {
      errs.spo2 = 'SpO₂ is required.';
    } else {
      const val = parseInt(data.spo2, 10);
      if (isNaN(val) || val < 50 || val > 100) {
        errs.spo2 = 'Must be between 50 and 100%.';
      }
    }

    // Optional lab validations (if provided, must be valid number)
    if (data.wbc.trim()) {
      const val = parseFloat(data.wbc);
      if (isNaN(val) || val < 0.1 || val > 100) {
        errs.wbc = 'Invalid WBC (0.1–100 ×10⁹/L).';
      }
    }

    if (data.lactate.trim()) {
      const val = parseFloat(data.lactate);
      if (isNaN(val) || val < 0.1 || val > 30) {
        errs.lactate = 'Invalid lactate (0.1–30 mmol/L).';
      }
    }

    if (data.creatinine.trim()) {
      const val = parseFloat(data.creatinine);
      if (isNaN(val) || val < 0.1 || val > 20) {
        errs.creatinine = 'Invalid creatinine (0.1–20 mg/dL).';
      }
    }

    return errs;
  };

  const handleChange = (field: keyof FormState, val: string) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, [field]: true }));
    setSavedSuccess(false);

    // Revalidate live
    const validationErrors = validate(updated);
    setErrors(validationErrors);
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validate(formData);
    setErrors(validationErrors);
  };

  const getFieldBorderClass = (field: keyof FormState, isRequired: boolean) => {
    const isTouched = touched[field];
    const hasError = !!errors[field];
    const val = formData[field];

    if (hasError && (isTouched || Object.keys(touched).length > 0)) {
      return 'border-red-400 bg-[#fff5f5] focus:border-red-500 text-red-900';
    }
    if (isRequired && isTouched && !hasError && val.trim() !== '') {
      return 'border-emerald-500 bg-[#f0fdf4] focus:border-emerald-600 text-emerald-950';
    }
    if (!isRequired && isTouched && !hasError && val.trim() !== '') {
      return 'border-emerald-500 bg-[#f0fdf4] focus:border-emerald-600 text-emerald-950';
    }
    return 'border-[#cbd5e1] bg-[#f8fafc] focus:border-teal-600 focus:bg-white text-[#0f172a]';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all as touched
    const allTouched: Record<string, boolean> = {
      patientId: true,
      temperature: true,
      heartRate: true,
      respiratoryRate: true,
      systolicBp: true,
      spo2: true,
      consciousness: true,
      wbc: true,
      lactate: true,
      creatinine: true,
    };
    setTouched(allTouched);

    const validationErrors = validate(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Parse values
    const vitals: VitalSigns = {
      temperature: parseFloat(formData.temperature),
      heartRate: parseInt(formData.heartRate, 10),
      respiratoryRate: parseInt(formData.respiratoryRate, 10),
      systolicBp: parseInt(formData.systolicBp, 10),
      spo2: parseInt(formData.spo2, 10),
      consciousness: formData.consciousness,
    };

    const labs: LabValues = {};
    if (formData.wbc.trim()) labs.wbc = parseFloat(formData.wbc);
    if (formData.lactate.trim()) labs.lactate = parseFloat(formData.lactate);
    if (formData.creatinine.trim()) labs.creatinine = parseFloat(formData.creatinine);

    // Clear previous result while waiting for backend
    setResult(null);
    setSavedSuccess(false);

    // Call parent callback — App.tsx will send to backend and update via backendResult prop
    if (onAssessmentCompleted) {
      onAssessmentCompleted(formData.patientId.trim(), null as any, vitals, labs);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Selector / Simulation Presets Toolbar */}
      <div className="bg-white p-4 rounded-[6px] border border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#475569] font-medium">
            Select Active Patient:
          </span>
          <select
            value={formData.patientId}
            onChange={(e) => handleSelectPatient(e.target.value)}
            className="px-2.5 py-1 text-xs font-mono font-semibold bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.name} ({p.ward})
              </option>
            ))}
          </select>
        </div>

        {/* Rapid Simulation Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#64748b]">Simulate Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('severe')}
            className="px-2 py-1 text-[11px] font-mono text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-[4px] transition-colors"
          >
            High Sepsis Risk
          </button>
          <button
            type="button"
            onClick={() => loadPreset('moderate')}
            className="px-2 py-1 text-[11px] font-mono text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-[4px] transition-colors"
          >
            Moderate Deterioration
          </button>
          <button
            type="button"
            onClick={() => loadPreset('normal')}
            className="px-2 py-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-[4px] transition-colors"
          >
            Stable Normal
          </button>
        </div>
      </div>

      {/* Main Assessment Form — Clean Two-Column Layout */}
      <form
        id="assessment-form"
        onSubmit={handleSubmit}
        className="bg-white rounded-[6px] border border-[#e2e8f0] p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SECTION 1 — VITAL SIGNS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <Activity className="w-4 h-4 text-teal-700" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
                Section 1 — Vital Signs (Required)
              </h2>
            </div>

            {/* Patient ID */}
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Patient ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.patientId}
                onChange={(e) => handleChange('patientId', e.target.value)}
                onBlur={() => handleBlur('patientId')}
                placeholder="e.g. PT-8092"
                className={`w-full px-3 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                  'patientId',
                  true
                )}`}
              />
              {errors.patientId && touched.patientId && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.patientId}</p>
              )}
            </div>

            {/* Temperature */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Temperature <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">Inline: °C</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleChange('temperature', e.target.value)}
                  onBlur={() => handleBlur('temperature')}
                  placeholder="37.0"
                  className={`w-full pl-3 pr-12 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'temperature',
                    true
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  °C
                </span>
              </div>
              {errors.temperature && touched.temperature && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.temperature}</p>
              )}
            </div>

            {/* Heart Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Heart Rate <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">Inline: bpm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => handleChange('heartRate', e.target.value)}
                  onBlur={() => handleBlur('heartRate')}
                  placeholder="75"
                  className={`w-full pl-3 pr-12 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'heartRate',
                    true
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  bpm
                </span>
              </div>
              {errors.heartRate && touched.heartRate && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.heartRate}</p>
              )}
            </div>

            {/* Respiratory Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Respiratory Rate <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">breaths/min</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.respiratoryRate}
                  onChange={(e) => handleChange('respiratoryRate', e.target.value)}
                  onBlur={() => handleBlur('respiratoryRate')}
                  placeholder="16"
                  className={`w-full pl-3 pr-24 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'respiratoryRate',
                    true
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  breaths/min
                </span>
              </div>
              {errors.respiratoryRate && touched.respiratoryRate && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.respiratoryRate}</p>
              )}
            </div>

            {/* Systolic BP */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Systolic BP <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">mmHg</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.systolicBp}
                  onChange={(e) => handleChange('systolicBp', e.target.value)}
                  onBlur={() => handleBlur('systolicBp')}
                  placeholder="120"
                  className={`w-full pl-3 pr-16 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'systolicBp',
                    true
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  mmHg
                </span>
              </div>
              {errors.systolicBp && touched.systolicBp && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.systolicBp}</p>
              )}
            </div>

            {/* SpO2 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  SpO₂ (Oxygen Saturation) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={formData.spo2}
                  onChange={(e) => handleChange('spo2', e.target.value)}
                  onBlur={() => handleBlur('spo2')}
                  placeholder="98"
                  className={`w-full pl-3 pr-10 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'spo2',
                    true
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  %
                </span>
              </div>
              {errors.spo2 && touched.spo2 && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.spo2}</p>
              )}
            </div>

            {/* Consciousness Dropdown */}
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Consciousness (AVPU) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.consciousness}
                onChange={(e) => handleChange('consciousness', e.target.value as ConsciousnessLevel)}
                className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-[4px] focus:outline-none focus:border-teal-600 text-[#0f172a]"
              >
                <option value="Alert">Alert (A - Fully conscious)</option>
                <option value="Voice">Voice (V - Responds to vocal stimulus)</option>
                <option value="Pain">Pain (P - Responds to pain stimulus)</option>
                <option value="Unresponsive">Unresponsive (U - Comatose)</option>
              </select>
            </div>
          </div>

          {/* SECTION 2 — LABORATORY VALUES (OPTIONAL) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
              <FileCheck className="w-4 h-4 text-teal-700" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e293b]">
                Section 2 — Laboratory Values (Optional)
              </h2>
            </div>

            <p className="text-xs text-[#64748b]">
              Laboratory inputs enhance prediction confidence and multi-organ dysfunction scoring.
            </p>

            {/* WBC */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  White Blood Cell Count (WBC)
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">×10⁹/L</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.wbc}
                  onChange={(e) => handleChange('wbc', e.target.value)}
                  onBlur={() => handleBlur('wbc')}
                  placeholder="e.g. 14.5"
                  className={`w-full pl-3 pr-20 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'wbc',
                    false
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  ×10⁹/L
                </span>
              </div>
              {errors.wbc && touched.wbc && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.wbc}</p>
              )}
            </div>

            {/* Lactate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Serum Lactate
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">mmol/L</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.lactate}
                  onChange={(e) => handleChange('lactate', e.target.value)}
                  onBlur={() => handleBlur('lactate')}
                  placeholder="e.g. 2.8"
                  className={`w-full pl-3 pr-20 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'lactate',
                    false
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  mmol/L
                </span>
              </div>
              {errors.lactate && touched.lactate && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.lactate}</p>
              )}
              <p className="text-[11px] text-[#64748b] font-mono mt-1">
                Threshold: &gt;2.0 mmol/L indicates hyperlactatemia; &gt;4.0 mmol/L severe septic shock.
              </p>
            </div>

            {/* Creatinine */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#334155]">
                  Serum Creatinine
                </label>
                <span className="text-[11px] font-mono text-[#64748b]">mg/dL</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.creatinine}
                  onChange={(e) => handleChange('creatinine', e.target.value)}
                  onBlur={() => handleBlur('creatinine')}
                  placeholder="e.g. 1.6"
                  className={`w-full pl-3 pr-16 py-2 text-xs font-mono rounded-[4px] border transition-colors outline-none ${getFieldBorderClass(
                    'creatinine',
                    false
                  )}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#64748b] pointer-events-none">
                  mg/dL
                </span>
              </div>
              {errors.creatinine && touched.creatinine && (
                <p className="text-[11px] text-red-600 mt-1 font-mono">{errors.creatinine}</p>
              )}
            </div>

            {/* Protocol Notice Box */}
            <div className="p-3 bg-[#f8fafc] rounded-[4px] border border-[#e2e8f0] text-xs text-[#64748b] space-y-1.5 mt-4">
              <div className="font-mono font-semibold uppercase text-[10px] text-[#475569] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                CDS Inference Engine Guidance
              </div>
              <p className="leading-relaxed">
                Evaluation calculates systemic inflammatory response syndrome (SIRS), qSOFA,
                and hemodynamic instability metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: "Run Assessment" */}
        <div className="mt-8 pt-4 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#64748b] font-mono">
            Ensure all vital sign inputs are calibrated against bedside monitors.
          </div>

          <button
            type="submit"
            id="btn-run-assessment"
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-mono font-semibold text-xs tracking-wider uppercase rounded-[4px] transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-teal-200" />
            <span>Run Assessment</span>
          </button>
        </div>
      </form>

      {/* ASSESSMENT RESULT PANEL (Revealed below the form) */}
      {result && (
        <div
          id="assessment-result-panel"
          className="bg-white rounded-[6px] border-2 border-teal-600/40 p-6 shadow-sm space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#e2e8f0] gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[4px] bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0f172a]">
                  Assessment Result — {formData.patientId}
                </h3>
                <p className="text-[11px] text-[#64748b]">
                  Calculated at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#64748b]">
                Model Confidence:{' '}
                <strong className="text-slate-900">{result.dataConfidence}%</strong>
              </span>
              {savedSuccess && (
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Recorded to Trajectory
                </span>
              )}
            </div>
          </div>

          {/* Primary Metric Grid - Risk score is strongest visual element */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Risk Score Strongest Visual Box */}
            <div
              className={`md:col-span-4 p-5 rounded-[6px] border flex flex-col justify-between ${
                result.riskLevel === 'HIGH'
                  ? 'bg-[#fff5f5] border-red-300'
                  : result.riskLevel === 'MODERATE'
                  ? 'bg-[#fffdf5] border-amber-300'
                  : 'bg-[#f0fdf4] border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#475569] font-bold">
                  Sepsis Risk Score
                </span>
                <RiskBadge level={result.riskLevel} size="md" />
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-5xl font-mono font-extrabold tracking-tight ${
                      result.riskLevel === 'HIGH'
                        ? 'text-red-700'
                        : result.riskLevel === 'MODERATE'
                        ? 'text-amber-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    {result.riskScore}
                  </span>
                  <span className="text-sm font-mono text-[#64748b]">/100</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs font-mono">
                <span className="text-[#64748b]">Risk Classification</span>
                <span className="font-bold text-[#0f172a] uppercase">
                  {result.riskLevel} RISK
                </span>
              </div>
            </div>

            {/* Trajectory & Model Probability stats */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ML Probability */}
              <div className="p-4 rounded-[6px] bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                  ML Probability
                </span>
                <div className="text-2xl font-bold font-mono text-[#0f172a] my-1">
                  {(result.mlProbability * 100).toFixed(0)}%
                </div>
                <div className="text-[11px] text-[#64748b] font-mono">
                  p = {result.mlProbability.toFixed(2)}
                </div>
              </div>

              {/* Trend Direction */}
              <div className="p-4 rounded-[6px] bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                  Trend Direction
                </span>
                <div className="my-1">
                  <TrendIndicator trend={result.trend} size="md" />
                </div>
                <div className="text-[11px] text-[#64748b] font-mono">
                  Trajectory status
                </div>
              </div>

              {/* Risk Delta vs Previous */}
              <div className="p-4 rounded-[6px] bg-[#f8fafc] border border-[#e2e8f0] flex flex-col justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#475569]">
                  Delta vs Previous
                </span>
                <div
                  className={`text-2xl font-bold font-mono my-1 ${
                    result.riskDelta > 0
                      ? 'text-red-700'
                      : result.riskDelta < 0
                      ? 'text-emerald-700'
                      : 'text-[#0f172a]'
                  }`}
                >
                  {result.riskDelta > 0 
                    ? `+${result.riskDelta.toFixed(1)}` 
                    : result.riskDelta < 0 
                    ? result.riskDelta.toFixed(1) 
                    : result.riskDelta}
                </div>
                <div className="text-[11px] text-[#64748b] font-mono">
                  Points vs last score
                </div>
              </div>
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="p-4 rounded-[6px] bg-[#f8fafc] border border-[#e2e8f0]">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#334155] mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Primary Contributing Factors
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {result.contributingFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-[4px] bg-white border border-[#e2e8f0] text-xs text-[#1e293b] font-mono flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                  <span className="truncate">{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation Box */}
          <div
            className={`p-4 rounded-[6px] border ${
              result.riskLevel === 'HIGH'
                ? 'bg-[#fff5f5] border-red-300 text-red-900'
                : result.riskLevel === 'MODERATE'
                ? 'bg-[#fffdf5] border-amber-300 text-amber-900'
                : 'bg-[#f0fdf4] border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider font-bold mb-1">
              Clinical Action Recommendation
            </div>
            <p className="text-xs font-medium font-sans leading-relaxed">
              {result.recommendation}
            </p>
          </div>

          {/* Disclaimer banner */}
          <div className="p-3 bg-[#f8fafc] rounded-[4px] border border-[#e2e8f0] flex items-start gap-2 text-[11px] text-[#64748b]">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-[#64748b] mt-0.5" />
            <span>
              <strong>Clinical Guardrail Notice:</strong> This is a research prototype decision-support output and not a medical diagnosis or treatment system. All therapeutic choices require independent clinical judgment by qualified healthcare professionals.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
