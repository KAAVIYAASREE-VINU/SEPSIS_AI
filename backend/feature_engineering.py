"""
feature_engineering.py — Extract clinically-meaningful features from raw vitals and labs.

Each feature returns a numeric abnormality score (0.0 – 1.0) and a human-readable
label when the value is outside the normal range.

Reference ranges used here are standard adult ICU / early-warning thresholds.
This module is intentionally transparent so every contribution to the risk score
can be traced back to an observed value.

⚠  RESEARCH PROTOTYPE ONLY — NOT FOR CLINICAL USE.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List


# ─────────────────────────────────────────────────────────────────────────────
#  Data transfer object
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class FeatureVector:
    """Container for all extracted features and their explanations."""

    # Individual feature scores (0.0 – 1.0)
    temp_score: float = 0.0
    hr_score: float = 0.0
    rr_score: float = 0.0
    sbp_score: float = 0.0
    spo2_score: float = 0.0
    consciousness_score: float = 0.0
    wbc_score: float = 0.0
    lactate_score: float = 0.0
    creatinine_score: float = 0.0

    # Composite syndrome indicators
    qsofa_score: float = 0.0   # qSOFA-like: RR≥22, SBP≤100, altered consciousness
    sirs_score: float = 0.0    # SIRS-like: temp, HR, RR, WBC

    # Human-readable contributing factors (populated only when abnormal)
    factors: List[str] = field(default_factory=list)

    # Data completeness
    optional_fields_present: int = 0
    optional_fields_total: int = 4  # wbc, hemoglobin, lactate, creatinine


# ─────────────────────────────────────────────────────────────────────────────
#  Individual feature scorers
# ─────────────────────────────────────────────────────────────────────────────

def _score_temperature(temp_c: float) -> tuple[float, Optional[str]]:
    """
    Normal: 36.1 – 37.9 °C
    Mild abnormality:  <36.0 or 38.0–38.9
    Moderate:          <35.5 or 39.0–39.9
    Severe:            <35.0 or >=40.0
    """
    if 36.1 <= temp_c <= 37.9:
        return 0.0, None
    if temp_c < 35.0 or temp_c >= 40.0:
        label = "Severe hypothermia" if temp_c < 35.0 else "Severe hyperthermia"
        return 1.0, label
    if temp_c < 35.5 or temp_c >= 39.0:
        label = "Hypothermia" if temp_c < 35.5 else "High fever"
        return 0.7, label
    if temp_c < 36.1 or temp_c >= 38.0:
        label = "Low temperature" if temp_c < 36.1 else "Elevated temperature"
        return 0.35, label
    return 0.0, None


def _score_heart_rate(hr: float) -> tuple[float, Optional[str]]:
    """
    Normal: 60 – 99 bpm
    Mild:   50–59 or 100–109
    Moderate: 40–49 or 110–129
    Severe: <40 or >=130
    """
    if 60 <= hr <= 99:
        return 0.0, None
    if hr >= 130 or hr < 40:
        label = "Severe bradycardia" if hr < 40 else "Severe tachycardia"
        return 1.0, label
    if hr >= 110 or hr < 50:
        label = "Bradycardia" if hr < 50 else "Tachycardia"
        return 0.65, label
    label = "Mild bradycardia" if hr < 60 else "Mild tachycardia"
    return 0.3, label


def _score_respiratory_rate(rr: float) -> tuple[float, Optional[str]]:
    """
    Normal: 12 – 20 breaths/min
    Mild:   10–11 or 21–24
    Moderate: 8–9 or 25–29
    Severe: <8 or >=30   (qSOFA threshold: >=22)
    """
    if 12 <= rr <= 20:
        return 0.0, None
    if rr >= 30 or rr < 8:
        label = "Severe bradypnoea" if rr < 8 else "Severe tachypnoea"
        return 1.0, label
    if rr >= 25 or rr < 10:
        label = "Bradypnoea" if rr < 10 else "Tachypnoea"
        return 0.65, label
    label = "Mildly elevated respiratory rate" if rr > 20 else "Mildly low respiratory rate"
    return 0.35, label


def _score_systolic_bp(sbp: float) -> tuple[float, Optional[str]]:
    """
    Normal: 90 – 139 mmHg
    Mild hypotension:   80–89
    Moderate:           70–79
    Severe:             <70
    Hypertension (mild concern): 140–159
    """
    if 90 <= sbp <= 139:
        return 0.0, None
    if sbp < 70:
        return 1.0, "Severe hypotension"
    if sbp < 80:
        return 0.8, "Hypotension"
    if sbp < 90:
        return 0.55, "Low systolic blood pressure"
    if sbp >= 180:
        return 0.5, "Severe hypertension"
    if sbp >= 160:
        return 0.25, "Hypertension"
    return 0.1, "Mildly elevated blood pressure"


def _score_spo2(spo2: float) -> tuple[float, Optional[str]]:
    """
    Normal: >=95%
    Mild:   92–94%
    Moderate: 88–91%
    Severe: <88%
    """
    if spo2 >= 95:
        return 0.0, None
    if spo2 < 88:
        return 1.0, "Severe oxygen desaturation"
    if spo2 < 92:
        return 0.75, "Reduced oxygen saturation"
    return 0.4, "Mildly reduced oxygen saturation"


def _score_consciousness(level: str) -> tuple[float, Optional[str]]:
    """
    AVPU scale — Alert / Voice / Pain / Unresponsive
    qSOFA counts any non-Alert state.
    """
    mapping = {
        "Alert": (0.0, None),
        "Voice": (0.5, "Responds to voice only"),
        "Pain": (0.85, "Responds to pain only"),
        "Unresponsive": (1.0, "Unresponsive"),
    }
    return mapping.get(level, (0.0, None))


def _score_wbc(wbc: Optional[float]) -> tuple[float, Optional[str]]:
    """
    Normal: 4.5 – 11.0 ×10⁹/L
    Leukocytosis ≥12 or ≥20: mild / severe
    Leukopenia <4.5 or <2.0: mild / severe
    """
    if wbc is None:
        return 0.0, None
    if 4.5 <= wbc <= 11.0:
        return 0.0, None
    if wbc >= 20.0 or wbc < 2.0:
        label = "Severe leukopenia" if wbc < 2.0 else "Markedly elevated WBC"
        return 1.0, label
    if wbc >= 12.0 or wbc < 4.5:
        label = "Leukopenia" if wbc < 4.5 else "Elevated WBC"
        return 0.6, label
    return 0.0, None


def _score_lactate(lactate: Optional[float]) -> tuple[float, Optional[str]]:
    """
    Normal: <2.0 mmol/L
    Mild:   2.0–3.9
    Severe: >=4.0  (septic shock threshold)
    """
    if lactate is None:
        return 0.0, None
    if lactate < 2.0:
        return 0.0, None
    if lactate >= 4.0:
        return 1.0, "Elevated lactate (high)"
    return 0.65, "Elevated lactate"


def _score_creatinine(creatinine: Optional[float]) -> tuple[float, Optional[str]]:
    """
    Normal (adult): 0.6 – 1.2 mg/dL
    Mild elevation: 1.2 – 1.9
    Moderate:       2.0 – 3.9
    Severe:         >=4.0
    """
    if creatinine is None:
        return 0.0, None
    if creatinine <= 1.2:
        return 0.0, None
    if creatinine >= 4.0:
        return 1.0, "Severely elevated creatinine"
    if creatinine >= 2.0:
        return 0.65, "Elevated creatinine"
    return 0.35, "Mildly elevated creatinine"


# ─────────────────────────────────────────────────────────────────────────────
#  Composite syndrome scores
# ─────────────────────────────────────────────────────────────────────────────

def _qsofa_like(rr: float, sbp: float, consciousness: str) -> float:
    """
    qSOFA-like indicator (3-point scale, normalized to 0–1).
    Criteria: RR ≥22, SBP ≤100, altered consciousness (non-Alert).
    A score of 2+ is associated with higher in-hospital mortality risk in
    suspected infection (Seymour et al., JAMA 2016).
    """
    points = 0
    if rr >= 22:
        points += 1
    if sbp <= 100:
        points += 1
    if consciousness != "Alert":
        points += 1
    return round(points / 3.0, 4)


def _sirs_like(temp_c: float, hr: float, rr: float, wbc: Optional[float]) -> float:
    """
    SIRS-like indicator (4-point scale, normalized to 0–1).
    Criteria: temp <36 or >38, HR >90, RR >20, WBC <4 or >12.
    """
    points = 0
    if temp_c < 36.0 or temp_c > 38.0:
        points += 1
    if hr > 90:
        points += 1
    if rr > 20:
        points += 1
    if wbc is not None and (wbc < 4.0 or wbc > 12.0):
        points += 1
    # Denominator is 3 when WBC missing, 4 when present
    denom = 4 if wbc is not None else 3
    return round(points / denom, 4)


# ─────────────────────────────────────────────────────────────────────────────
#  Main extraction function
# ─────────────────────────────────────────────────────────────────────────────

def extract_features(
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
) -> FeatureVector:
    """
    Extract all features from a single assessment and return a FeatureVector.
    """
    fv = FeatureVector()

    # ── Score each vital / lab ──
    fv.temp_score, temp_label = _score_temperature(temperature)
    fv.hr_score, hr_label = _score_heart_rate(heart_rate)
    fv.rr_score, rr_label = _score_respiratory_rate(respiratory_rate)
    fv.sbp_score, sbp_label = _score_systolic_bp(systolic_bp)
    fv.spo2_score, spo2_label = _score_spo2(spo2)
    fv.consciousness_score, cons_label = _score_consciousness(consciousness)
    fv.wbc_score, wbc_label = _score_wbc(wbc)
    fv.lactate_score, lact_label = _score_lactate(lactate)
    fv.creatinine_score, creat_label = _score_creatinine(creatinine)

    # ── Composite indicators ──
    fv.qsofa_score = _qsofa_like(respiratory_rate, systolic_bp, consciousness)
    fv.sirs_score = _sirs_like(temperature, heart_rate, respiratory_rate, wbc)

    # ── Collect human-readable factors (only abnormal ones) ──
    for label in [
        temp_label, hr_label, rr_label, sbp_label,
        spo2_label, cons_label, wbc_label, lact_label, creat_label,
    ]:
        if label:
            fv.factors.append(label)

    # ── Data completeness ──
    optional_present = sum(
        1 for v in [wbc, hemoglobin, lactate, creatinine] if v is not None
    )
    fv.optional_fields_present = optional_present

    return fv
