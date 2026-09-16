/**
 * api.ts — Typed API client for the SEPSIS-AI FastAPI backend.
 *
 * All risk calculation happens on the backend.
 * This module is the single source of truth for all HTTP communication.
 *
 * Backend base URL is read from VITE_API_BASE_URL (default: http://localhost:8000).
 *
 * ⚠ RESEARCH PROTOTYPE ONLY — NOT FOR CLINICAL USE.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
//  Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) {
        if (Array.isArray(err.detail)) {
          detail = err.detail
            .map((e: { loc?: string[]; msg: string }) =>
              `${e.loc?.slice(-1)[0] ?? ''}: ${e.msg}`
            )
            .join('; ');
        } else {
          detail = String(err.detail);
        }
      }
    } catch (_) {
      /* ignore json parse error */
    }
    const error = new Error(detail);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}

const get  = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);

// ─────────────────────────────────────────────────────────────────────────────
//  Backend response types (matching FastAPI schemas exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendPatient {
  patient_id: string;
  display_name: string;
  age: number;
  gender: string;
  status: string;
  ward: string | null;
  unit: string | null;
  bed: string | null;
  admission_datetime: string;
  created_at: string;
  updated_at: string;
  // From enrichment with latest assessment
  latest_assessment_id?: string | null;
  risk_score?: number | null;
  risk_level?: string | null;
  ml_probability?: number | null;
  trend_direction?: string | null;
  risk_delta?: number | null;
  contributing_factors?: string[] | null;
  recommendation?: string | null;
  last_updated?: string | null;
}

export interface BackendAssessment {
  assessment_id: string;
  patient_id: string;
  timestamp: string;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
  consciousness: string | null;
  wbc: number | null;
  hemoglobin: number | null;
  lactate: number | null;
  creatinine: number | null;
  risk_score: number;
  risk_level: string;
  ml_probability: number;
  clinical_score: number;
  trend_score: number;
  trend_direction: string;
  risk_delta: number;
  contributing_factors: string[];
  recommendation: string;
  data_quality: string;
  model_version: string;
}

export interface BackendHistoryItem {
  assessment_id: string;
  timestamp: string;
  risk_score: number | null;
  risk_level: string | null;
  risk_delta: number | null;
  trend_direction: string | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  systolic_bp: number | null;
  spo2: number | null;
  lactate: number | null;
  creatinine: number | null;
}

export interface BackendDashboardSummary {
  active_patients: number;
  high_risk: number;
  moderate_risk: number;
  low_risk: number;
  deteriorating: number;
  active_alerts: number;
  total_monitored: number;
}

export interface BackendAlert {
  id: number;
  assessment_id: string;
  patient_id: string;
  created_at: string;
  alert_type: string;
  message: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  patient_name: string | null;
  ward: string | null;
  unit: string | null;
  bed: string | null;
  risk_score: number | null;
  risk_level: string | null;
  trend_direction: string | null;
  risk_delta: number | null;
}

export interface AssessmentPayload {
  temperature: number;
  heart_rate: number;
  respiratory_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
  consciousness: string;
  wbc?: number | null;
  hemoglobin?: number | null;
  lactate?: number | null;
  creatinine?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  API functions
// ─────────────────────────────────────────────────────────────────────────────

// Dashboard
export const getDashboardSummary = () =>
  get<BackendDashboardSummary>('/api/dashboard/summary');

export const getRecentEvents = (limit = 20) =>
  get<BackendAssessment[]>(`/api/dashboard/recent-events?limit=${limit}`);

// Patients
export const getActivePatients = () =>
  get<BackendPatient[]>('/api/patients?status=active');

export const getPatient = (patientId: string) =>
  get<BackendPatient>(`/api/patients/${patientId}`);

export const getPatientHistory = (patientId: string) =>
  get<BackendHistoryItem[]>(`/api/patients/${patientId}/history`);

// Assessments
export const submitAssessment = (patientId: string, payload: AssessmentPayload) =>
  post<BackendAssessment>(`/api/patients/${patientId}/assessments`, payload);

// Alerts
export const getAlerts = (acknowledgedFilter?: boolean) => {
  const qs = acknowledgedFilter !== undefined
    ? `?acknowledged=${acknowledgedFilter}&limit=100`
    : '?limit=100';
  return get<BackendAlert[]>(`/api/alerts${qs}`);
};

export const acknowledgeAlert = (alertId: number) =>
  patch<BackendAlert>(`/api/alerts/${alertId}/acknowledge`);

// Health
export const checkHealth = () =>
  get<{ status: string }>('/health');
