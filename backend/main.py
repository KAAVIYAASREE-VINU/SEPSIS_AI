"""
main.py — FastAPI application entry point.

All API endpoints are defined here.
⚠  RESEARCH PROTOTYPE ONLY — NOT FOR CLINICAL USE.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from alerts import maybe_create_alert
from database import Base, engine, get_db
from models import Alert, Assessment, Patient
from risk_engine import calculate_risk
from schemas import (
    AlertResponse,
    AssessmentCreate,
    AssessmentHistoryItem,
    AssessmentResponse,
    DashboardSummary,
    PatientCreate,
    PatientDetailResponse,
    PatientResponse,
    PatientStatusUpdate,
    RecentEvent,
)
from trend_analysis import calculate_trend

# ─────────────────────────────────────────────────────────────────────────────
#  Bootstrap
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

# Create all tables on startup (adds new columns if schema changed)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SEPSIS-AI Trajectory API",
    description=(
        "Clinical decision-support prototype for identifying possible patient deterioration. "
        "⚠ NOT FOR CLINICAL USE. Research/demo purposes only."
    ),
    version="1.1.0",
)

# ─────────────────────────────────────────────────────────────────────────────
#  CORS
# ─────────────────────────────────────────────────────────────────────────────

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
)
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _next_patient_id(db: Session) -> str:
    """Generate next P1001, P1002 … style patient ID."""
    count = db.query(Patient).count()
    return f"P{1001 + count}"


def _assessment_uuid() -> str:
    return f"A-{uuid.uuid4().hex[:12].upper()}"


def _get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


def _parse_factors(factors_json: Optional[str]) -> List[str]:
    if not factors_json:
        return []
    try:
        return json.loads(factors_json)
    except Exception:
        return [factors_json]


def _enrich_patient(patient: Patient, db: Session) -> PatientDetailResponse:
    """Attach latest assessment data to a patient response."""
    latest: Optional[Assessment] = (
        db.query(Assessment)
        .filter(Assessment.patient_id == patient.patient_id)
        .order_by(Assessment.timestamp.desc())
        .first()
    )
    detail = PatientDetailResponse(
        patient_id=patient.patient_id,
        display_name=patient.display_name,
        age=patient.age,
        gender=patient.gender,
        status=patient.status,
        ward=getattr(patient, "ward", None),
        unit=getattr(patient, "unit", None),
        bed=getattr(patient, "bed", None),
        admission_datetime=patient.admission_datetime,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )
    if latest:
        detail.latest_assessment_id = latest.assessment_id
        detail.risk_score = latest.risk_score
        detail.risk_level = latest.risk_level
        detail.ml_probability = latest.ml_probability
        detail.trend_direction = latest.trend_direction
        detail.risk_delta = latest.risk_delta
        detail.contributing_factors = _parse_factors(latest.contributing_factors)
        detail.recommendation = latest.recommendation
        detail.last_updated = latest.timestamp
    return detail


def _build_alert_response(alert: Alert, db: Session) -> AlertResponse:
    """Build an AlertResponse enriched with patient and latest assessment data."""
    patient = db.query(Patient).filter(Patient.patient_id == alert.patient_id).first()

    # Get the assessment this alert was raised for
    assessment = (
        db.query(Assessment)
        .filter(Assessment.assessment_id == alert.assessment_id)
        .first()
    )

    return AlertResponse(
        id=alert.id,
        assessment_id=alert.assessment_id,
        patient_id=alert.patient_id,
        created_at=alert.created_at,
        alert_type=alert.alert_type,
        message=alert.message,
        acknowledged=alert.acknowledged,
        acknowledged_at=alert.acknowledged_at,
        patient_name=patient.display_name if patient else None,
        ward=getattr(patient, "ward", None) if patient else None,
        unit=getattr(patient, "unit", None) if patient else None,
        bed=getattr(patient, "bed", None) if patient else None,
        risk_score=assessment.risk_score if assessment else None,
        risk_level=assessment.risk_level if assessment else None,
        trend_direction=assessment.trend_direction if assessment else None,
        risk_delta=assessment.risk_delta if assessment else None,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Root / Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "SEPSIS-AI Trajectory API",
        "status": "running",
        "version": "1.1.0",
        "docs": "/docs",
        "disclaimer": "Research prototype only. Not for clinical use.",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────────────────
#  PATIENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/patients", response_model=PatientDetailResponse, status_code=201, tags=["Patients"])
def create_patient(body: PatientCreate, db: Session = Depends(get_db)):
    """Register a new patient."""
    patient_id = _next_patient_id(db)
    now = datetime.utcnow()
    patient = Patient(
        patient_id=patient_id,
        display_name=body.display_name,
        age=body.age,
        gender=body.gender,
        ward=body.ward,
        unit=body.unit,
        bed=body.bed,
        admission_datetime=now,
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return _enrich_patient(patient, db)


@app.get("/api/patients", response_model=List[PatientDetailResponse], tags=["Patients"])
def list_patients(
    status: Optional[str] = Query(None, description="active | discharged"),
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None, description="LOW | MODERATE | HIGH"),
    trend_direction: Optional[str] = Query(None),
    ward: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List patients with optional filters."""
    query = db.query(Patient)
    if status:
        query = query.filter(Patient.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Patient.display_name.ilike(like)) | (Patient.patient_id.ilike(like))
        )
    if ward:
        query = query.filter(Patient.ward.ilike(f"%{ward}%"))

    patients = query.order_by(Patient.admission_datetime.desc()).all()

    # Enrich with latest assessment data
    results = [_enrich_patient(p, db) for p in patients]

    # Post-enrichment filters
    if risk_level:
        results = [r for r in results if r.risk_level == risk_level.upper()]
    if trend_direction:
        results = [r for r in results if r.trend_direction == trend_direction.upper()]

    return results


@app.get("/api/patients/{patient_id}", response_model=PatientDetailResponse, tags=["Patients"])
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get full patient detail including latest assessment."""
    patient = _get_patient_or_404(db, patient_id)
    return _enrich_patient(patient, db)


@app.patch("/api/patients/{patient_id}/status", response_model=PatientDetailResponse, tags=["Patients"])
def update_patient_status(
    patient_id: str,
    body: PatientStatusUpdate,
    db: Session = Depends(get_db),
):
    """Discharge or re-activate a patient."""
    patient = _get_patient_or_404(db, patient_id)
    patient.status = body.status
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return _enrich_patient(patient, db)


# ─────────────────────────────────────────────────────────────────────────────
#  ASSESSMENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/patients/{patient_id}/assessments",
    response_model=AssessmentResponse,
    status_code=201,
    tags=["Assessments"],
)
def create_assessment(
    patient_id: str,
    body: AssessmentCreate,
    db: Session = Depends(get_db),
):
    """
    Submit a new clinical observation for a patient.
    Calculates risk score, trend, and contributing factors automatically.

    Required vitals: temperature, heart_rate, respiratory_rate,
                     systolic_bp, diastolic_bp, spo2, consciousness
    Optional labs:   wbc, hemoglobin, lactate, creatinine (send null or omit if unavailable)
    """
    patient = _get_patient_or_404(db, patient_id)

    # 1. Fetch previous assessments (oldest → newest)
    previous = (
        db.query(Assessment)
        .filter(Assessment.patient_id == patient_id)
        .order_by(Assessment.timestamp.asc())
        .all()
    )

    # 2. Preliminary clinical score (no trend yet) — needed to calculate trend delta
    preliminary = calculate_risk(
        temperature=body.temperature,
        heart_rate=body.heart_rate,
        respiratory_rate=body.respiratory_rate,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        spo2=body.spo2,
        consciousness=body.consciousness,
        wbc=body.wbc,
        hemoglobin=body.hemoglobin,
        lactate=body.lactate,
        creatinine=body.creatinine,
        trend_score=0.0,
        trend_direction="INSUFFICIENT_HISTORY",
    )

    # 3. Calculate trend
    trend_result = calculate_trend(
        current_clinical_score=preliminary["clinical_score"],
        previous_assessments=previous,
    )

    # 4. Final risk calculation including trend bonus
    final = calculate_risk(
        temperature=body.temperature,
        heart_rate=body.heart_rate,
        respiratory_rate=body.respiratory_rate,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        spo2=body.spo2,
        consciousness=body.consciousness,
        wbc=body.wbc,
        hemoglobin=body.hemoglobin,
        lactate=body.lactate,
        creatinine=body.creatinine,
        trend_score=trend_result["trend_score"],
        trend_direction=trend_result["trend_direction"],
    )

    # 5. Persist assessment
    assessment_id = _assessment_uuid()
    now = datetime.utcnow()
    assessment = Assessment(
        assessment_id=assessment_id,
        patient_id=patient_id,
        timestamp=now,
        temperature=body.temperature,
        heart_rate=body.heart_rate,
        respiratory_rate=body.respiratory_rate,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        spo2=body.spo2,
        consciousness=body.consciousness,
        wbc=body.wbc,
        hemoglobin=body.hemoglobin,
        lactate=body.lactate,
        creatinine=body.creatinine,
        clinical_score=final["clinical_score"],
        ml_probability=final["ml_probability"],
        trend_score=trend_result["trend_score"],
        risk_score=final["risk_score"],
        risk_level=final["risk_level"],
        trend_direction=trend_result["trend_direction"],
        risk_delta=trend_result["risk_delta"],
        contributing_factors=json.dumps(final["contributing_factors"]),
        recommendation=final["recommendation"],
        data_quality=final["data_quality"],
        model_version=final["model_version"],
    )
    db.add(assessment)
    patient.updated_at = now
    db.commit()
    db.refresh(assessment)

    # 6. Create alert if warranted (spec: risk_score >= 65 OR risk_delta >= 20)
    maybe_create_alert(
        db=db,
        assessment_id=assessment_id,
        patient_id=patient_id,
        risk_score=final["risk_score"],
        risk_level=final["risk_level"],
        trend_direction=trend_result["trend_direction"],
        risk_delta=trend_result["risk_delta"],
    )

    # 7. Return complete result
    return AssessmentResponse(
        assessment_id=assessment.assessment_id,
        patient_id=assessment.patient_id,
        timestamp=assessment.timestamp,
        temperature=assessment.temperature,
        heart_rate=assessment.heart_rate,
        respiratory_rate=assessment.respiratory_rate,
        systolic_bp=assessment.systolic_bp,
        diastolic_bp=assessment.diastolic_bp,
        spo2=assessment.spo2,
        consciousness=assessment.consciousness,
        wbc=assessment.wbc,
        hemoglobin=assessment.hemoglobin,
        lactate=assessment.lactate,
        creatinine=assessment.creatinine,
        risk_score=final["risk_score"],
        risk_level=final["risk_level"],
        ml_probability=final["ml_probability"],
        clinical_score=final["clinical_score"],
        trend_score=trend_result["trend_score"],
        trend_direction=trend_result["trend_direction"],
        risk_delta=trend_result["risk_delta"],
        contributing_factors=final["contributing_factors"],
        recommendation=final["recommendation"],
        data_quality=final["data_quality"],
        model_version=final["model_version"],
    )


@app.get(
    "/api/patients/{patient_id}/history",
    response_model=List[AssessmentHistoryItem],
    tags=["Assessments"],
)
def get_patient_history(patient_id: str, db: Session = Depends(get_db)):
    """Return all assessments for a patient ordered by time (oldest first)."""
    _get_patient_or_404(db, patient_id)
    assessments = (
        db.query(Assessment)
        .filter(Assessment.patient_id == patient_id)
        .order_by(Assessment.timestamp.asc())
        .all()
    )
    return assessments


# ─────────────────────────────────────────────────────────────────────────────
#  DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

def _compute_dashboard_summary(db: Session) -> DashboardSummary:
    """Shared logic for both summary endpoints."""
    active_patients = db.query(Patient).filter(Patient.status == "active").all()

    high_risk = moderate_risk = low_risk = deteriorating = 0

    for p in active_patients:
        latest = (
            db.query(Assessment)
            .filter(Assessment.patient_id == p.patient_id)
            .order_by(Assessment.timestamp.desc())
            .first()
        )
        if not latest:
            continue
        if latest.risk_level == "HIGH":
            high_risk += 1
        elif latest.risk_level == "MODERATE":
            moderate_risk += 1
        elif latest.risk_level == "LOW":
            low_risk += 1

        if latest.trend_direction == "DETERIORATING":
            deteriorating += 1

    active_alerts = (
        db.query(Alert)
        .join(Patient, Alert.patient_id == Patient.patient_id)
        .filter(Patient.status == "active", Alert.acknowledged == False)
        .count()
    )

    return DashboardSummary(
        active_patients=len(active_patients),
        high_risk=high_risk,
        moderate_risk=moderate_risk,
        low_risk=low_risk,
        deteriorating=deteriorating,
        active_alerts=active_alerts,
        total_monitored=len(active_patients),
    )


@app.get("/api/dashboard/summary", response_model=DashboardSummary, tags=["Dashboard"])
def dashboard_summary(db: Session = Depends(get_db)):
    """Dynamic dashboard summary — all counts calculated from DB."""
    return _compute_dashboard_summary(db)


@app.get("/api/dashboard/stats", response_model=DashboardSummary, tags=["Dashboard"])
def dashboard_stats(db: Session = Depends(get_db)):
    """Alias for /api/dashboard/summary — identical response."""
    return _compute_dashboard_summary(db)


@app.get("/api/dashboard/recent-events", response_model=List[RecentEvent], tags=["Dashboard"])
def recent_events(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Latest assessments from active patients, newest first."""
    active_ids = [
        p.patient_id
        for p in db.query(Patient).filter(Patient.status == "active").all()
    ]
    if not active_ids:
        return []

    rows = (
        db.query(Assessment, Patient)
        .join(Patient, Assessment.patient_id == Patient.patient_id)
        .filter(Assessment.patient_id.in_(active_ids))
        .order_by(Assessment.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        RecentEvent(
            assessment_id=a.assessment_id,
            patient_id=a.patient_id,
            patient_name=p.display_name,
            timestamp=a.timestamp,
            risk_score=a.risk_score,
            risk_level=a.risk_level,
            trend_direction=a.trend_direction,
            risk_delta=a.risk_delta,
        )
        for a, p in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
#  ALERTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=List[AlertResponse], tags=["Alerts"])
def list_alerts(
    acknowledged: Optional[bool] = Query(None),
    patient_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Return alerts enriched with patient and assessment data."""
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    if patient_id:
        query = query.filter(Alert.patient_id == patient_id)

    alerts = query.limit(limit).all()
    return [_build_alert_response(alert, db) for alert in alerts]


@app.patch("/api/alerts/{alert_id}/acknowledge", response_model=AlertResponse, tags=["Alerts"])
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an alert as acknowledged. Does not delete it."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    if not alert.acknowledged:
        alert.acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
    return _build_alert_response(alert, db)
