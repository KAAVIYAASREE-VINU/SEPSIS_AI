import { ConsciousnessLevel, LabValues, RiskLevel, TrendDirection, VitalSigns } from '../types';

export interface AssessmentCalculationResult {
  riskScore: number;
  riskLevel: RiskLevel;
  mlProbability: number;
  trend: TrendDirection;
  riskDelta: number;
  contributingFactors: string[];
  dataConfidence: number;
  recommendation: string;
}

export function calculateSepsisRisk(
  vitals: VitalSigns,
  labs?: LabValues,
  previousRiskScore: number = 40
): AssessmentCalculationResult {
  let score = 15; // baseline
  const factors: string[] = [];

  // Temperature
  if (vitals.temperature >= 38.3) {
    const pts = vitals.temperature >= 39.0 ? 14 : 9;
    score += pts;
    factors.push(`Pyrexia (${vitals.temperature.toFixed(1)}°C)`);
  } else if (vitals.temperature <= 36.0) {
    score += 15;
    factors.push(`Hypothermia (${vitals.temperature.toFixed(1)}°C)`);
  }

  // Heart Rate
  if (vitals.heartRate > 120) {
    score += 16;
    factors.push(`Severe tachycardia (${vitals.heartRate} bpm)`);
  } else if (vitals.heartRate > 90) {
    score += 9;
    factors.push(`Tachycardia (${vitals.heartRate} bpm)`);
  } else if (vitals.heartRate < 50) {
    score += 8;
    factors.push(`Bradycardia (${vitals.heartRate} bpm)`);
  }

  // Respiratory Rate
  if (vitals.respiratoryRate >= 28) {
    score += 16;
    factors.push(`Severe tachypnea (${vitals.respiratoryRate} breaths/min)`);
  } else if (vitals.respiratoryRate >= 22) {
    score += 10;
    factors.push(`Tachypnea (${vitals.respiratoryRate} breaths/min)`);
  } else if (vitals.respiratoryRate < 10) {
    score += 12;
    factors.push(`Bradypnea (${vitals.respiratoryRate} breaths/min)`);
  }

  // Systolic BP
  if (vitals.systolicBp <= 90) {
    score += 18;
    factors.push(`Hypotension (${vitals.systolicBp} mmHg)`);
  } else if (vitals.systolicBp <= 100) {
    score += 10;
    factors.push(`Borderline hypotension (${vitals.systolicBp} mmHg)`);
  }

  // SpO2
  if (vitals.spo2 < 92) {
    score += 16;
    factors.push(`Reduced SpO₂ (${vitals.spo2}%)`);
  } else if (vitals.spo2 < 95) {
    score += 8;
    factors.push(`Mild desaturation (${vitals.spo2}%)`);
  }

  // Consciousness
  if (vitals.consciousness === 'Unresponsive') {
    score += 24;
    factors.push('Altered consciousness (Unresponsive)');
  } else if (vitals.consciousness === 'Pain') {
    score += 18;
    factors.push('Altered consciousness (Responds to pain)');
  } else if (vitals.consciousness === 'Voice') {
    score += 12;
    factors.push('Altered consciousness (Responds to voice)');
  }

  // Laboratory values
  let labsIncludedCount = 0;
  if (labs?.lactate !== undefined && !isNaN(labs.lactate)) {
    labsIncludedCount++;
    if (labs.lactate >= 4.0) {
      score += 20;
      factors.push(`Severely elevated lactate (${labs.lactate.toFixed(1)} mmol/L)`);
    } else if (labs.lactate >= 2.0) {
      score += 12;
      factors.push(`Elevated lactate (${labs.lactate.toFixed(1)} mmol/L)`);
    }
  }

  if (labs?.wbc !== undefined && !isNaN(labs.wbc)) {
    labsIncludedCount++;
    if (labs.wbc > 15.0) {
      score += 12;
      factors.push(`Elevated WBC (${labs.wbc.toFixed(1)} ×10⁹/L)`);
    } else if (labs.wbc > 12.0) {
      score += 7;
      factors.push(`Mild leukocytosis (${labs.wbc.toFixed(1)} ×10⁹/L)`);
    } else if (labs.wbc < 4.0) {
      score += 10;
      factors.push(`Leukopenia (${labs.wbc.toFixed(1)} ×10⁹/L)`);
    }
  }

  if (labs?.creatinine !== undefined && !isNaN(labs.creatinine)) {
    labsIncludedCount++;
    if (labs.creatinine >= 2.0) {
      score += 12;
      factors.push(`Elevated creatinine (${labs.creatinine.toFixed(1)} mg/dL)`);
    } else if (labs.creatinine >= 1.5) {
      score += 6;
      factors.push(`Mildly elevated creatinine (${labs.creatinine.toFixed(1)} mg/dL)`);
    }
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(5, score));

  // Determine risk level
  let riskLevel: RiskLevel = 'LOW';
  if (finalScore >= 65) {
    riskLevel = 'HIGH';
  } else if (finalScore >= 35) {
    riskLevel = 'MODERATE';
  }

  // ML probability roughly aligned with risk score
  const mlProbability = Number((finalScore / 100 * 0.95 + 0.02).toFixed(2));

  // Trend vs previous
  const delta = finalScore - previousRiskScore;
  let trend: TrendDirection = 'STABLE';
  if (delta >= 20) {
    trend = 'RAPID_DETERIORATION';
  } else if (delta > 4) {
    trend = 'RISING';
  } else if (delta < -4) {
    trend = 'IMPROVING';
  } else {
    trend = 'STABLE';
  }

  // Data confidence
  const confidence = 84 + (labsIncludedCount * 4) + (factors.length > 2 ? 3 : 0);
  const dataConfidence = Math.min(99, confidence);

  // Recommendation
  let recommendation = 'Maintain routine clinical observations per ward protocol.';
  if (riskLevel === 'HIGH' || trend === 'RAPID_DETERIORATION') {
    recommendation = 'Immediate clinical review recommended per local protocol. Sepsis bundle initiation and senior physician alert required.';
  } else if (riskLevel === 'MODERATE') {
    recommendation = 'Immediate clinical review recommended per local protocol. Increase observation frequency and consider septic workup.';
  }

  if (factors.length === 0) {
    factors.push('All parameters within baseline clinical targets');
  }

  return {
    riskScore: finalScore,
    riskLevel,
    mlProbability,
    trend,
    riskDelta: delta,
    contributingFactors: factors,
    dataConfidence,
    recommendation,
  };
}
