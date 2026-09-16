"""
schemas.py — Pydantic models for request validation and response serialization.

Risk bands (RESEARCH PROTOTYPE ONLY — spec-aligned):
  LOW:      score 0  – 34
  MODERATE: score 35 – 64
  HIGH:     score 65 – 100
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ─────────────────────────────────────────────
#  PATIENT
# ─────────────────────────────────────────────

class PatientCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=200)
    age: int = Field(..., ge=0, le=130)
    gender: str = Field(..., pattern="^(M|F|Other)$")
    ward: Optional[str] = Field(None, max_length=100)
    unit: Optional[str] = Field(None, max_length=100)
    bed: Optional[str] = Field(None, max_length=50)


class PatientStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|discharged)$")


class PatientResponse(BaseModel):
    patient_id: str
    display_name: str
    age: int
    gender: str
    status: str
    ward: Optional[str] = None
    unit: Optional[str] = None
    bed: Optional[str] = None
    admission_datetime: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientDetailResponse(PatientResponse):
    """Patient detail with latest assessment data."""
    latest_assessment_id: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    ml_probability: Optional[float] = None
    trend_direction: Optional[str] = None
    risk_delta: Optional[float] = None
    contributing_factors: Optional[List[str]] = None
    recommendation: Optional[str] = None
    last_updated: Optional[datetime] = None


# ─────────────────────────────────────────────
#  ASSESSMENT
# ─────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    # Required vitals — declared Optional so that null → clear error (not cryptic 422)
    temperature: Optional[float] = Field(None, description="°C")
    heart_rate: Optional[float] = Field(None, description="bpm")
    respiratory_rate: Optional[float] = Field(None, description="breaths/min")
    systolic_bp: Optional[float] = Field(None, description="mmHg")
    diastolic_bp: Optional[float] = Field(None, description="mmHg")
    spo2: Optional[float] = Field(None, description="%")
    consciousness: Optional[str] = Field(None, description="Alert / Voice / Pain / Unresponsive")

    # Optional lab values
    wbc: Optional[float] = Field(None, description="×10⁹/L")
    hemoglobin: Optional[float] = Field(None, description="g/dL")
    lactate: Optional[float] = Field(None, description="mmol/L")
    creatinine: Optional[float] = Field(None, description="mg/dL")

    # ── Required-field null guard ──────────────────────────────────────────
    @model_validator(mode="after")
    def required_vitals_present(self):
        missing = []
        for field_name in ("temperature", "heart_rate", "respiratory_rate",
                           "systolic_bp", "diastolic_bp", "spo2", "consciousness"):
            if getattr(self, field_name) is None:
                missing.append(field_name)
        if missing:
            raise ValueError(
                f"Required vital(s) missing or invalid: {', '.join(missing)}. "
                "Ensure all required fields contain valid numeric values."
            )
        return self

    # ── Range validators ──────────────────────────────────────────────────
    @field_validator("temperature")
    @classmethod
    def temperature_range(cls, v):
        if v is not None and not (25.0 <= v <= 45.0):
            raise ValueError("Temperature must be between 25°C and 45°C")
        return v

    @field_validator("heart_rate")
    @classmethod
    def heart_rate_range(cls, v):
        if v is not None and not (0 < v <= 300):
            raise ValueError("Heart rate must be between 1 and 300 bpm")
        return v

    @field_validator("respiratory_rate")
    @classmethod
    def respiratory_rate_range(cls, v):
        if v is not None and not (0 < v <= 60):
            raise ValueError("Respiratory rate must be between 1 and 60 breaths/min")
        return v

    @field_validator("systolic_bp")
    @classmethod
    def systolic_bp_range(cls, v):
        if v is not None and not (0 < v <= 300):
            raise ValueError("Systolic BP must be between 1 and 300 mmHg")
        return v

    @field_validator("diastolic_bp")
    @classmethod
    def diastolic_bp_range(cls, v):
        if v is not None and not (0 < v <= 200):
            raise ValueError("Diastolic BP must be between 1 and 200 mmHg")
        return v

    @field_validator("spo2")
    @classmethod
    def spo2_range(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("SpO2 must be between 0 and 100%")
        return v

    @field_validator("consciousness")
    @classmethod
    def consciousness_valid(cls, v):
        if v is not None:
            valid = {"Alert", "Voice", "Pain", "Unresponsive"}
            if v not in valid:
                raise ValueError(f"Consciousness must be one of: {', '.join(sorted(valid))}")
        return v

    @field_validator("wbc")
    @classmethod
    def wbc_range(cls, v):
        if v is not None and v < 0:
            raise ValueError("WBC cannot be negative")
        return v

    @field_validator("lactate")
    @classmethod
    def lactate_range(cls, v):
        if v is not None and v < 0:
            raise ValueError("Lactate cannot be negative")
        return v

    @field_validator("creatinine")
    @classmethod
    def creatinine_range(cls, v):
        if v is not None and v < 0:
            raise ValueError("Creatinine cannot be negative")
        return v

    @field_validator("hemoglobin")
    @classmethod
    def hemoglobin_range(cls, v):
        if v is not None and v < 0:
            raise ValueError("Hemoglobin cannot be negative")
        return v


class AssessmentResponse(BaseModel):
    assessment_id: str
    patient_id: str
    timestamp: datetime

    # Raw vitals
    temperature: Optional[float]
    heart_rate: Optional[float]
    respiratory_rate: Optional[float]
    systolic_bp: Optional[float]
    diastolic_bp: Optional[float]
    spo2: Optional[float]
    consciousness: Optional[str]

    # Labs
    wbc: Optional[float]
    hemoglobin: Optional[float]
    lactate: Optional[float]
    creatinine: Optional[float]

    # Calculated
    risk_score: float
    risk_level: str
    ml_probability: float
    clinical_score: float
    trend_score: float
    trend_direction: str
    risk_delta: float
    contributing_factors: List[str]
    recommendation: str
    data_quality: str
    model_version: str

    class Config:
        from_attributes = True


class AssessmentHistoryItem(BaseModel):
    assessment_id: str
    timestamp: datetime
    risk_score: Optional[float]
    risk_level: Optional[str]
    risk_delta: Optional[float]
    trend_direction: Optional[str]
    temperature: Optional[float]
    heart_rate: Optional[float]
    respiratory_rate: Optional[float]
    systolic_bp: Optional[float]
    spo2: Optional[float]
    lactate: Optional[float]
    creatinine: Optional[float]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ALERT
# ─────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: int
    assessment_id: str
    patient_id: str
    created_at: datetime
    alert_type: str
    message: str
    acknowledged: bool
    acknowledged_at: Optional[datetime]

    # Enriched patient info
    patient_name: Optional[str] = None
    ward: Optional[str] = None
    unit: Optional[str] = None
    bed: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    trend_direction: Optional[str] = None
    risk_delta: Optional[float] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  DASHBOARD
# ─────────────────────────────────────────────

class DashboardSummary(BaseModel):
    active_patients: int
    high_risk: int
    moderate_risk: int
    low_risk: int
    deteriorating: int
    active_alerts: int
    total_monitored: int


class RecentEvent(BaseModel):
    assessment_id: str
    patient_id: str
    patient_name: str
    timestamp: datetime
    risk_score: Optional[float]
    risk_level: Optional[str]
    trend_direction: Optional[str]
    risk_delta: Optional[float]

    class Config:
        from_attributes = True
