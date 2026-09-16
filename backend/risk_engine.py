"""
risk_engine.py — Transparent prototype risk scoring engine.

Scoring methodology:
  1. Each vital / lab is independently scored 0–1 by feature_engineering.py.
  2. Weighted sum of individual scores → clinical_score (0–100).
  3. Composite syndrome indicators (qSOFA-like, SIRS-like) add bonus points.
  4. Trend component is added separately by trend_analysis.py.
  5. Final risk_score = clinical_score + trend_score, clipped to 0–100.
  6. ml_probability = risk_score / 100  (transparent proxy, not an ML model output).

Risk bands (RESEARCH PROTOTYPE ONLY — spec-aligned):
  LOW:      score 0  – 34
  MODERATE: score 35 – 64
  HIGH:     score 65 – 100

Alert threshold: risk_score >= 65 OR risk_delta >= 20

⚠  NOT A DIAGNOSTIC TOOL. NOT FOR CLINICAL USE.
"""

from __future__ import annotations
from typing import Optional, List

from feature_engineering import FeatureVector, extract_features


# ─────────────────────────────────────────────────────────────────────────────
#  Feature weights  (must sum to 1.0 for clinical_score baseline)
# ─────────────────────────────────────────────────────────────────────────────
#
#  Weights are informed by clinical significance in early deterioration detection.
#  Lactate, SBP, and SpO2 carry the highest weight because they are primary
#  indicators of end-organ perfusion and oxygenation failure.
#
FEATURE_WEIGHTS = {
    "sbp_score":           0.18,   # Hypotension → perfusion failure
    "lactate_score":       0.18,   # Elevated lactate → anaerobic metabolism
    "spo2_score":          0.14,   # Hypoxaemia
    "rr_score":            0.12,   # Tachypnoea → respiratory compensation
    "consciousness_score": 0.12,   # Altered consciousness → encephalopathy
    "hr_score":            0.10,   # Tachycardia
    "temp_score":          0.07,   # Fever / hypothermia
    "wbc_score":           0.05,   # Immune response
    "creatinine_score":    0.04,   # Renal impairment
}
# Weights above sum to 1.0; verified below.
assert abs(sum(FEATURE_WEIGHTS.values()) - 1.0) < 1e-6, "Feature weights must sum to 1.0"

# Bonus points added on top of weighted score (not subject to weight constraint)
QSOFA_BONUS_MAX = 12.0   # Added proportionally to qSOFA-like score
SIRS_BONUS_MAX  = 8.0    # Added proportionally to SIRS-like score


# ─────────────────────────────────────────────────────────────────────────────
#  Risk banding
# ─────────────────────────────────────────────────────────────────────────────

def _risk_level(score: float) -> str:
    if score >= 65:
        return "HIGH"
    if score >= 35:
        return "MODERATE"
    return "LOW"


# ─────────────────────────────────────────────────────────────────────────────
#  Recommendation generator
# ─────────────────────────────────────────────────────────────────────────────

def _generate_recommendation(risk_level: str, trend_direction: str) -> str:
    """
    Generate a safe, non-prescriptive recommendation.
    All recommendations defer to clinical judgement.
    """
    if risk_level == "HIGH":
        if trend_direction == "DETERIORATING":
            return (
                "High-risk indicators with deteriorating trajectory detected. "
                "Urgent clinical review according to local protocol is recommended."
            )
        return (
            "High-risk deterioration indicators detected. "
            "Clinical review according to local protocol is recommended."
        )
    if risk_level == "MODERATE":
        if trend_direction == "DETERIORATING":
            return (
                "Moderate risk with worsening trend detected. "
                "Increased monitoring frequency and clinical assessment recommended."
            )
        return (
            "Moderate-risk indicators present. "
            "Continued monitoring and clinical review recommended."
        )
    # LOW
    if trend_direction == "DETERIORATING":
        return "Low risk currently, but a worsening trend is noted. Continue close monitoring."
    return "Low-risk indicators. Routine monitoring per local protocol."


# ─────────────────────────────────────────────────────────────────────────────
#  Main scoring function
# ─────────────────────────────────────────────────────────────────────────────

def calculate_risk(
    temperature: float,
    heart_rate: float,
    respiratory_rate: float,
    systolic_bp: float,
    diastolic_bp: float,
    spo2: float,
    consciousness: str,
    wbc: Optional[float] = None,
    hemoglobin: Optional[float] = None,
    lactate: Optional[float] = None,
    creatinine: Optional[float] = None,
    trend_score: float = 0.0,
    trend_direction: str = "INSUFFICIENT_HISTORY",
) -> dict:
    """
    Calculate transparent prototype risk score.

    Returns a dict with:
      - clinical_score  (0–100, from vitals/labs only)
      - risk_score      (0–100, clinical + trend)
      - ml_probability  (0–1, transparent proxy)
      - risk_level      (LOW / MODERATE / HIGH)
      - contributing_factors  (list[str])
      - recommendation  (str)
      - data_quality    (str)
      - model_version   (str)
    """
    # 1. Extract features
    fv: FeatureVector = extract_features(
        temperature=temperature,
        heart_rate=heart_rate,
        respiratory_rate=respiratory_rate,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        spo2=spo2,
        consciousness=consciousness,
        wbc=wbc,
        hemoglobin=hemoglobin,
        lactate=lactate,
        creatinine=creatinine,
    )

    # 2. Weighted sum of individual feature scores → 0–100 scale
    weighted_sum = sum(
        getattr(fv, key) * weight
        for key, weight in FEATURE_WEIGHTS.items()
    )
    baseline_score = weighted_sum * 100.0  # scale to 0–100

    # 3. Add syndrome bonuses
    qsofa_bonus = fv.qsofa_score * QSOFA_BONUS_MAX
    sirs_bonus  = fv.sirs_score  * SIRS_BONUS_MAX
    clinical_score = min(100.0, baseline_score + qsofa_bonus + sirs_bonus)

    # 4. Add trend component (supplied from trend_analysis.py)
    raw_total = clinical_score + trend_score
    risk_score = round(min(100.0, max(0.0, raw_total)), 1)
    clinical_score = round(clinical_score, 1)

    # 5. Risk level
    risk_level = _risk_level(risk_score)

    # 6. Contributing factors
    factors: List[str] = list(fv.factors)   # abnormal vitals/labs

    if fv.qsofa_score >= 2/3:
        factors.append("qSOFA-like criteria met (≥2 of 3)")
    elif fv.qsofa_score >= 1/3:
        factors.append("Partial qSOFA-like criteria")

    if fv.sirs_score >= 0.75:
        factors.append("SIRS-like criteria met (≥3 of 4)")
    elif fv.sirs_score >= 0.5:
        factors.append("Partial SIRS-like criteria")

    if trend_direction == "DETERIORATING" and trend_score > 0:
        factors.append("Positive risk trajectory")
    if trend_direction == "DETERIORATING" and trend_score >= 10:
        factors.append("Rapid increase from previous assessment")

    # Deduplicate while preserving order
    seen = set()
    unique_factors: List[str] = []
    for f in factors:
        if f not in seen:
            seen.add(f)
            unique_factors.append(f)

    # 7. Recommendation
    recommendation = _generate_recommendation(risk_level, trend_direction)

    # 8. Data quality
    data_quality = (
        "complete" if fv.optional_fields_present == fv.optional_fields_total
        else "partial"
    )

    # 9. ml_probability (transparent proxy)
    ml_probability = round(risk_score / 100.0, 4)

    return {
        "clinical_score": clinical_score,
        "risk_score": risk_score,
        "ml_probability": ml_probability,
        "risk_level": risk_level,
        "contributing_factors": unique_factors,
        "recommendation": recommendation,
        "data_quality": data_quality,
        "model_version": "prototype-v1",
    }
