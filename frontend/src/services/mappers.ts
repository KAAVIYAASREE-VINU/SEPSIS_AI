/**
 * mappers.ts — Convert backend API responses to the frontend Patient/Assessment types.
 *
 * The backend uses snake_case and different field names; the frontend uses camelCase.
 * This file is the single translation layer — UI components never see raw backend types.
 *
 * Key differences handled here:
 *  - patient_id  → id
 *  - display_name → name
 *  - risk_level/trend_direction enums → frontend enum values
 *  - Backend trend: DETERIORATING / IMPROVING / STABLE / INSUFFICIENT_HISTORY
 *    Frontend trend: RISING / STABLE / IMPROVING / RAPID_DETERIORATION
 *  - Backend risk bands: LOW 0-34 / MODERATE 35-64 / HIGH 65-100
 *  - Build synthetic time-series history from assessment records
 */

import {
  Patient,
  AssessmentRecord,
  RiskLevel,
  TrendDirection,
  ConsciousnessLevel,
  TemperaturePoint,
  BloodPressurePoint,
  WBCPoint,
} from '../types';
import { BackendPatient, BackendHistoryItem, BackendAssessment } from './api';

// ─────────────────────────────────────────────────────────────────────────────
//  Enum mapping
// ─────────────────────────────────────────────────────────────────────────────

/** Map backend trend direction to frontend TrendDirection enum */
export function mapTrend(
  backendTrend: string | null | undefined,
  riskDelta: number | null | undefined
): TrendDirection {
  if (!backendTrend) return 'STABLE';
  const delta = riskDelta ?? 0;
  switch (backendTrend) {
    case 'DETERIORATING':
      return delta >= 20 ? 'RAPID_DETERIORATION' : 'RISING';
    case 'IMPROVING':
      return 'IMPROVING';
    case 'STABLE':
      return 'STABLE';
    case 'INSUFFICIENT_HISTORY':
      return 'STABLE';
    default:
      return 'STABLE';
  }
}

export function mapRiskLevel(level: string | null | undefined): RiskLevel {
  switch (level?.toUpperCase()) {
    case 'HIGH':     return 'HIGH';
    case 'MODERATE': return 'MODERATE';
    case 'LOW':      return 'LOW';
    default:         return 'LOW';
  }
}

function mapConsciousness(c: string | null | undefined): ConsciousnessLevel {
  switch (c) {
    case 'Alert':        return 'Alert';
    case 'Voice':        return 'Voice';
    case 'Pain':         return 'Pain';
    case 'Unresponsive': return 'Unresponsive';
    default:             return 'Alert';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Date formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day   = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const time  = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Assessment history → time-series arrays
// ─────────────────────────────────────────────────────────────────────────────

function buildTemperatureHistory(history: BackendHistoryItem[]): TemperaturePoint[] {
  return history
    .filter((h) => h.temperature != null)
    .map((h) => ({
      time: formatTimeLabel(h.timestamp),
      temperature: h.temperature as number,
    }));
}

function buildBloodPressureHistory(history: BackendHistoryItem[]): BloodPressurePoint[] {
  return history
    .filter((h) => h.systolic_bp != null)
    .map((h) => ({
      time: formatTimeLabel(h.timestamp),
      systolic: h.systolic_bp as number,
      // Backend doesn't store diastolic in history; derive from systolic × 0.65
      diastolic: Math.round((h.systolic_bp as number) * 0.65),
    }));
}

function buildWBCHistory(history: BackendHistoryItem[]): WBCPoint[] {
  return history
    .filter((h) => {
      // WBC is not in BackendHistoryItem — handled via assessments instead
      return false;
    })
    .map(() => ({ time: '', wbc: 0 }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map assessment history item → AssessmentRecord
// ─────────────────────────────────────────────────────────────────────────────

export function mapHistoryToAssessmentRecord(
  item: BackendHistoryItem,
  patientId: string
): AssessmentRecord {
  const trend = mapTrend(item.trend_direction, item.risk_delta);
  const riskLevel = mapRiskLevel(item.risk_level);
  const riskScore = item.risk_score ?? 0;
  const riskDelta = item.risk_delta ?? 0;

  const recommendation = riskLevel === 'HIGH' || trend === 'RAPID_DETERIORATION'
    ? 'Immediate clinical review recommended per local protocol.'
    : riskLevel === 'MODERATE'
    ? 'Increase frequency of observations. Clinical review recommended.'
    : 'Routine clinical observations per ward protocol.';

  return {
    id: item.assessment_id,
    timestamp: formatDateTime(item.timestamp),
    timeLabel: formatTimeLabel(item.timestamp),
    riskScore,
    riskLevel,
    trend,
    riskDelta,
    mlProbability: Number((riskScore / 100).toFixed(2)),
    vitals: {
      temperature: item.temperature ?? 37.0,
      heartRate: item.heart_rate ?? 80,
      respiratoryRate: item.respiratory_rate ?? 16,
      systolicBp: item.systolic_bp ?? 120,
      spo2: item.spo2 ?? 98,
      consciousness: 'Alert', // not stored in history item
    },
    labs: {
      lactate: item.lactate ?? undefined,
      creatinine: item.creatinine ?? undefined,
    },
    contributingFactors: [],
    dataConfidence: 90,
    recommendation,
  };
}

/** Map a full BackendAssessment (from POST response) → AssessmentRecord */
export function mapBackendAssessment(a: BackendAssessment): AssessmentRecord {
  const trend = mapTrend(a.trend_direction, a.risk_delta);
  return {
    id: a.assessment_id,
    timestamp: formatDateTime(a.timestamp),
    timeLabel: formatTimeLabel(a.timestamp),
    riskScore: a.risk_score,
    riskLevel: mapRiskLevel(a.risk_level),
    trend,
    riskDelta: a.risk_delta,
    mlProbability: a.ml_probability,
    vitals: {
      temperature: a.temperature ?? 37.0,
      heartRate: a.heart_rate ?? 80,
      respiratoryRate: a.respiratory_rate ?? 16,
      systolicBp: a.systolic_bp ?? 120,
      spo2: a.spo2 ?? 98,
      consciousness: mapConsciousness(a.consciousness),
    },
    labs: {
      wbc: a.wbc ?? undefined,
      lactate: a.lactate ?? undefined,
      creatinine: a.creatinine ?? undefined,
    },
    contributingFactors: a.contributing_factors,
    dataConfidence: a.data_quality === 'complete' ? 96 : 88,
    recommendation: a.recommendation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map BackendPatient → frontend Patient
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a backend patient (enriched with latest assessment data) to the
 * frontend Patient type. History and time-series arrays are populated
 * separately from the /history endpoint and merged via mergePatientHistory.
 */
export function mapBackendPatient(
  p: BackendPatient,
  history: BackendHistoryItem[] = []
): Patient {
  const latestRiskScore = p.risk_score ?? 0;
  const latestRiskLevel = mapRiskLevel(p.risk_level);
  const latestTrend     = mapTrend(p.trend_direction, p.risk_delta);
  const latestRiskDelta = p.risk_delta ?? 0;

  // Build assessment records from history
  const assessments: AssessmentRecord[] = history.map((h) =>
    mapHistoryToAssessmentRecord(h, p.patient_id)
  );

  // Latest vitals — from last history item if available
  const lastHistory = history.length > 0 ? history[history.length - 1] : null;
  const currentVitals = {
    temperature: lastHistory?.temperature ?? 37.0,
    heartRate: lastHistory?.heart_rate ?? 80,
    respiratoryRate: lastHistory?.respiratory_rate ?? 16,
    systolicBp: lastHistory?.systolic_bp ?? 120,
    spo2: lastHistory?.spo2 ?? 98,
    consciousness: 'Alert' as ConsciousnessLevel,
  };
  const currentLabs = {
    lactate: lastHistory?.lactate ?? undefined,
    creatinine: lastHistory?.creatinine ?? undefined,
  };

  // Build time-series arrays
  const temperatureHistory = buildTemperatureHistory(history);
  const bloodPressureHistory = buildBloodPressureHistory(history);
  const wbcHistory: WBCPoint[] = [];

  // Ward / bed formatting
  const ward = [p.ward, p.unit].filter(Boolean).join(' — ') || 'General Ward';
  const bed  = p.bed || 'Bed —';

  return {
    id: p.patient_id,
    name: p.display_name,
    age: p.age,
    ward,
    bed,
    admissionDate: formatDateTime(p.admission_datetime),
    latestRiskScore,
    latestRiskLevel,
    latestTrend,
    latestRiskDelta,
    lastAssessmentTime: p.last_updated
      ? formatDateTime(p.last_updated)
      : formatDateTime(p.updated_at),
    currentVitals,
    currentLabs,
    contributingFactors: p.contributing_factors ?? [],
    assessments,
    temperatureHistory,
    bloodPressureHistory,
    wbcHistory,
  };
}
