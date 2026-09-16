export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export type TrendDirection = 'RISING' | 'STABLE' | 'IMPROVING' | 'RAPID_DETERIORATION';

export type ConsciousnessLevel = 'Alert' | 'Voice' | 'Pain' | 'Unresponsive';

export interface VitalSigns {
  temperature: number; // °C
  heartRate: number; // bpm
  respiratoryRate: number; // breaths/min
  systolicBp: number; // mmHg
  spo2: number; // %
  consciousness: ConsciousnessLevel;
}

export interface LabValues {
  wbc?: number; // ×10⁹/L
  lactate?: number; // mmol/L
  creatinine?: number; // mg/dL
}

export interface AssessmentRecord {
  id: string;
  timestamp: string; // e.g. "15 Sep 2026, 04:30"
  timeLabel: string; // e.g. "04:30" or "T-4h"
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  trend: TrendDirection;
  riskDelta: number; // e.g. +14, -6, 0
  mlProbability: number; // 0.00 - 1.00
  vitals: VitalSigns;
  labs?: LabValues;
  contributingFactors: string[];
  dataConfidence: number; // percentage, e.g. 94
  recommendation: string;
}

export interface TemperaturePoint {
  time: string; // e.g. "06:00" or "14 Sep 18:00"
  temperature: number; // °C
}

export interface BloodPressurePoint {
  time: string; // e.g. "06:00"
  systolic: number; // mmHg
  diastolic: number; // mmHg
}

export interface WBCPoint {
  time: string; // e.g. "14 Sep 06:00"
  wbc: number; // ×10⁹/L
}

export interface Patient {
  id: string; // e.g. "PT-9041"
  name: string;
  age: number;
  ward: string; // e.g. "ICU — Ward 3", "Emergency", etc.
  bed: string; // e.g. "Bed 12"
  admissionDate: string; // e.g. "13 Sep 2026, 09:20"
  latestRiskScore: number;
  latestRiskLevel: RiskLevel;
  latestTrend: TrendDirection;
  latestRiskDelta: number;
  lastAssessmentTime: string;
  currentVitals: VitalSigns;
  currentLabs: LabValues;
  contributingFactors: string[];
  assessments: AssessmentRecord[];
  temperatureHistory: TemperaturePoint[];
  bloodPressureHistory: BloodPressurePoint[];
  wbcHistory: WBCPoint[];
}

export type NavigationPage = 'dashboard' | 'patients' | 'monitor' | 'alerts' | 'history' | 'profile';
