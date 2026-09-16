"""
models.py — SQLAlchemy ORM models for patients, assessments, and alerts.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    admission_datetime = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, default="active", nullable=False)  # "active" | "discharged"
    ward = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    bed = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assessments = relationship("Assessment", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ── Raw vitals ──
    temperature = Column(Float, nullable=True)
    heart_rate = Column(Float, nullable=True)
    respiratory_rate = Column(Float, nullable=True)
    systolic_bp = Column(Float, nullable=True)
    diastolic_bp = Column(Float, nullable=True)
    spo2 = Column(Float, nullable=True)
    consciousness = Column(String, nullable=True)  # Alert / Voice / Pain / Unresponsive

    # ── Lab values (all optional) ──
    wbc = Column(Float, nullable=True)
    hemoglobin = Column(Float, nullable=True)
    lactate = Column(Float, nullable=True)
    creatinine = Column(Float, nullable=True)

    # ── Calculated scores ──
    clinical_score = Column(Float, nullable=True)
    ml_probability = Column(Float, nullable=True)
    trend_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)       # LOW / MODERATE / HIGH
    trend_direction = Column(String, nullable=True)  # DETERIORATING / IMPROVING / STABLE / INSUFFICIENT_HISTORY
    risk_delta = Column(Float, nullable=True)

    # ── Explanatory fields ──
    contributing_factors = Column(Text, nullable=True)   # JSON-encoded list
    recommendation = Column(Text, nullable=True)
    data_quality = Column(String, nullable=True)         # complete / partial
    model_version = Column(String, default="prototype-v1", nullable=True)

    # Relationship
    patient = relationship("Patient", back_populates="assessments")
    alert = relationship("Alert", back_populates="assessment", uselist=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String, ForeignKey("assessments.assessment_id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    alert_type = Column(String, nullable=False)   # HIGH_RISK | DETERIORATING
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="alerts")
    assessment = relationship("Assessment", back_populates="alert")
