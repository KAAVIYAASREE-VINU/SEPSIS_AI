"""
seed_data.py — Populate the database with 11 synthetic demo patients and
               multiple assessments per patient so trajectories, risk deltas,
               and dashboard counts are real and dynamic.

Run once:
    cd backend
    python seed_data.py

Re-running is safe — if the database already contains patients with these IDs
the script will skip them (idempotent).

Risk bands (spec-aligned):
  LOW:      0  – 34
  MODERATE: 35 – 64
  HIGH:     65 – 100

Alert triggers:
  risk_score >= 65  OR  risk_delta >= 20

⚠  All data is entirely synthetic and for demonstration purposes only.
   NOT FOR CLINICAL USE.
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, ".")

from database import Base, SessionLocal, engine
from models import Alert, Assessment, Patient
from risk_engine import calculate_risk
from trend_analysis import calculate_trend
from alerts import HIGH_RISK_THRESHOLD, RAPID_DELTA_THRESHOLD

# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _aid() -> str:
    return f"A-{uuid.uuid4().hex[:12].upper()}"


def _dt(hours_ago: float) -> datetime:
    return datetime.utcnow() - timedelta(hours=hours_ago)


# ─────────────────────────────────────────────────────────────────────────────
#  Patient definitions
#  (patient_id, display_name, age, gender, admission_hours_ago, ward, unit, bed)
# ─────────────────────────────────────────────────────────────────────────────

PATIENTS = [
    ("PT-9520", "Samuel Okafor",    58, "M", 72,  "Ward A", "ICU",  "A-01"),
    ("PT-8492", "Eleanor Vance",    74, "F", 48,  "Ward B", "HDU",  "B-04"),
    ("PT-2290", "Julian Ramos",     45, "M", 36,  "Ward C", "Gen",  "C-02"),
    ("PT-7182", "Rosemary Thorne",  82, "F", 96,  "Ward A", "ICU",  "A-03"),
    ("PT-6219", "Marcus Chen",      61, "M", 60,  "Ward B", "HDU",  "B-07"),
    ("PT-3091", "Arthur Pendleton", 69, "M", 84,  "Ward A", "ICU",  "A-05"),
    ("PT-1844", "Hannah Davies",    33, "F", 24,  "Ward D", "Gen",  "D-01"),
    ("PT-5503", "Devon Bradley",    55, "M", 52,  "Ward C", "Gen",  "C-08"),
    ("PT-4721", "Claire Moreau",    49, "F", 18,  "Ward D", "Gen",  "D-06"),
    ("PT-1033", "Grace Holloway",   77, "F", 108, "Ward A", "ICU",  "A-02"),
    ("PT-3914", "Tariq Al-Mansoor", 63, "M", 40,  "Ward D", "Gen",  "D-09"),
]

# ─────────────────────────────────────────────────────────────────────────────
#  Assessment series
#  Each dict has hours_ago + raw vitals/labs.
#  The risk engine calculates scores; these are just input observations.
#
#  Target outcomes (with new risk bands LOW 0-34, MOD 35-64, HIGH 65-100):
#    HIGH:     PT-9520, PT-8492, PT-7182, PT-6219, PT-3091, PT-1033
#    MODERATE: PT-2290, PT-5503
#    LOW:      PT-1844, PT-4721, PT-3914
#
#  Eleanor Vance (PT-8492) trajectory target: ~32 → ~46 → ~64 → ~88
# ─────────────────────────────────────────────────────────────────────────────

ASSESSMENT_SERIES: dict[str, list[dict]] = {

    # ── PT-9520 Samuel Okafor — HIGH / DETERIORATING ──────────────────────
    "PT-9520": [
        dict(hours_ago=68, temperature=37.2, heart_rate=88,  respiratory_rate=18,
             systolic_bp=118, diastolic_bp=76, spo2=97, consciousness="Alert",
             wbc=10.2, hemoglobin=13.1, lactate=1.2, creatinine=1.0),
        dict(hours_ago=50, temperature=38.1, heart_rate=104, respiratory_rate=22,
             systolic_bp=104, diastolic_bp=68, spo2=94, consciousness="Alert",
             wbc=13.8, hemoglobin=12.4, lactate=2.1, creatinine=1.3),
        dict(hours_ago=32, temperature=38.9, heart_rate=118, respiratory_rate=26,
             systolic_bp=92,  diastolic_bp=60, spo2=91, consciousness="Voice",
             wbc=17.2, hemoglobin=11.8, lactate=3.2, creatinine=1.7),
        dict(hours_ago=14, temperature=39.4, heart_rate=128, respiratory_rate=30,
             systolic_bp=84,  diastolic_bp=54, spo2=88, consciousness="Voice",
             wbc=19.6, hemoglobin=11.0, lactate=4.1, creatinine=2.1),
    ],

    # ── PT-8492 Eleanor Vance — HIGH / DETERIORATING (~32→46→64→88) ──────
    # Calibrated to produce approximate trajectory 32 → 46 → 64 → 88
    # with the new bands (LOW<35, MOD 35-64, HIGH≥65).
    "PT-8492": [
        # ~32: mild abnormalities, LOW
        dict(hours_ago=72, temperature=37.6, heart_rate=88,  respiratory_rate=19,
             systolic_bp=112, diastolic_bp=72, spo2=96, consciousness="Alert",
             wbc=11.2, hemoglobin=12.8, lactate=1.6, creatinine=1.1),
        # ~46: moderate abnormalities, MODERATE
        dict(hours_ago=48, temperature=38.2, heart_rate=102, respiratory_rate=22,
             systolic_bp=104, diastolic_bp=66, spo2=94, consciousness="Alert",
             wbc=13.4, hemoglobin=12.0, lactate=2.2, creatinine=1.3),
        # ~64: near HIGH threshold, MODERATE
        dict(hours_ago=24, temperature=38.8, heart_rate=114, respiratory_rate=26,
             systolic_bp=94,  diastolic_bp=60, spo2=91, consciousness="Alert",
             wbc=16.2, hemoglobin=11.4, lactate=3.0, creatinine=1.6),
        # ~88: HIGH / DETERIORATING
        dict(hours_ago=8,  temperature=39.3, heart_rate=126, respiratory_rate=30,
             systolic_bp=84,  diastolic_bp=54, spo2=88, consciousness="Voice",
             wbc=19.2, hemoglobin=10.6, lactate=4.2, creatinine=2.1),
    ],

    # ── PT-2290 Julian Ramos — MODERATE / STABLE ─────────────────────────
    "PT-2290": [
        dict(hours_ago=32, temperature=37.8, heart_rate=100, respiratory_rate=22,
             systolic_bp=102, diastolic_bp=64, spo2=94, consciousness="Alert",
             wbc=12.8, hemoglobin=12.8, lactate=2.1, creatinine=1.3),
        dict(hours_ago=16, temperature=38.2, heart_rate=104, respiratory_rate=23,
             systolic_bp=100, diastolic_bp=63, spo2=93, consciousness="Alert",
             wbc=13.4, hemoglobin=12.4, lactate=2.3, creatinine=1.4),
        dict(hours_ago=4,  temperature=38.0, heart_rate=102, respiratory_rate=22,
             systolic_bp=102, diastolic_bp=64, spo2=94, consciousness="Alert",
             wbc=13.0, hemoglobin=12.6, lactate=2.2, creatinine=1.4),
    ],

    # ── PT-7182 Rosemary Thorne — HIGH / DETERIORATING ───────────────────
    "PT-7182": [
        dict(hours_ago=92, temperature=36.8, heart_rate=84,  respiratory_rate=18,
             systolic_bp=122, diastolic_bp=74, spo2=97, consciousness="Alert",
             wbc=9.4, hemoglobin=11.8, lactate=1.0, creatinine=1.2),
        dict(hours_ago=68, temperature=37.9, heart_rate=100, respiratory_rate=22,
             systolic_bp=106, diastolic_bp=66, spo2=94, consciousness="Alert",
             wbc=13.6, hemoglobin=11.0, lactate=2.4, creatinine=1.6),
        dict(hours_ago=44, temperature=38.8, heart_rate=116, respiratory_rate=26,
             systolic_bp=90,  diastolic_bp=58, spo2=91, consciousness="Voice",
             wbc=17.8, hemoglobin=10.2, lactate=3.6, creatinine=2.2),
        dict(hours_ago=20, temperature=39.6, heart_rate=134, respiratory_rate=32,
             systolic_bp=78,  diastolic_bp=50, spo2=86, consciousness="Pain",
             wbc=21.2, hemoglobin=9.6,  lactate=5.2, creatinine=3.1),
    ],

    # ── PT-6219 Marcus Chen — HIGH / DETERIORATING ───────────────────────
    "PT-6219": [
        dict(hours_ago=56, temperature=37.4, heart_rate=90,  respiratory_rate=19,
             systolic_bp=115, diastolic_bp=72, spo2=96, consciousness="Alert",
             wbc=10.8, hemoglobin=13.8, lactate=1.4, creatinine=0.9),
        dict(hours_ago=36, temperature=38.4, heart_rate=110, respiratory_rate=24,
             systolic_bp=98,  diastolic_bp=62, spo2=92, consciousness="Alert",
             wbc=15.6, hemoglobin=12.6, lactate=2.6, creatinine=1.4),
        dict(hours_ago=18, temperature=39.2, heart_rate=122, respiratory_rate=28,
             systolic_bp=86,  diastolic_bp=54, spo2=89, consciousness="Voice",
             wbc=18.8, hemoglobin=11.4, lactate=3.9, creatinine=1.9),
    ],

    # ── PT-3091 Arthur Pendleton — HIGH / STABLE ─────────────────────────
    "PT-3091": [
        dict(hours_ago=80, temperature=38.5, heart_rate=114, respiratory_rate=25,
             systolic_bp=88,  diastolic_bp=56, spo2=91, consciousness="Voice",
             wbc=16.4, hemoglobin=11.6, lactate=3.4, creatinine=1.8),
        dict(hours_ago=56, temperature=38.8, heart_rate=118, respiratory_rate=27,
             systolic_bp=86,  diastolic_bp=54, spo2=90, consciousness="Voice",
             wbc=17.0, hemoglobin=11.2, lactate=3.6, creatinine=1.9),
        dict(hours_ago=32, temperature=38.6, heart_rate=116, respiratory_rate=26,
             systolic_bp=88,  diastolic_bp=55, spo2=91, consciousness="Voice",
             wbc=16.8, hemoglobin=11.4, lactate=3.5, creatinine=1.9),
    ],

    # ── PT-1844 Hannah Davies — LOW / IMPROVING ──────────────────────────
    "PT-1844": [
        dict(hours_ago=20, temperature=38.0, heart_rate=92,  respiratory_rate=19,
             systolic_bp=114, diastolic_bp=72, spo2=96, consciousness="Alert",
             wbc=11.8, hemoglobin=13.6, lactate=1.4, creatinine=0.9),
        dict(hours_ago=10, temperature=37.5, heart_rate=84,  respiratory_rate=17,
             systolic_bp=120, diastolic_bp=76, spo2=97, consciousness="Alert",
             wbc=10.4, hemoglobin=13.8, lactate=1.1, creatinine=0.8),
        dict(hours_ago=2,  temperature=37.1, heart_rate=78,  respiratory_rate=16,
             systolic_bp=124, diastolic_bp=78, spo2=98, consciousness="Alert",
             wbc=9.4, hemoglobin=14.0, lactate=0.9, creatinine=0.8),
    ],

    # ── PT-5503 Devon Bradley — MODERATE / STABLE ────────────────────────
    "PT-5503": [
        dict(hours_ago=48, temperature=38.2, heart_rate=104, respiratory_rate=22,
             systolic_bp=100, diastolic_bp=63, spo2=93, consciousness="Alert",
             wbc=13.6, hemoglobin=12.2, lactate=2.2, creatinine=1.3),
        dict(hours_ago=24, temperature=38.1, heart_rate=102, respiratory_rate=22,
             systolic_bp=102, diastolic_bp=64, spo2=94, consciousness="Alert",
             wbc=13.2, hemoglobin=12.4, lactate=2.1, creatinine=1.3),
    ],

    # ── PT-4721 Claire Moreau — LOW / STABLE ─────────────────────────────
    "PT-4721": [
        dict(hours_ago=14, temperature=37.1, heart_rate=74,  respiratory_rate=15,
             systolic_bp=124, diastolic_bp=78, spo2=98, consciousness="Alert",
             wbc=8.6, hemoglobin=13.2, lactate=0.9, creatinine=0.7),
        dict(hours_ago=4,  temperature=37.0, heart_rate=72,  respiratory_rate=15,
             systolic_bp=126, diastolic_bp=80, spo2=99, consciousness="Alert",
             wbc=8.2, hemoglobin=13.4, lactate=0.8, creatinine=0.7),
    ],

    # ── PT-1033 Grace Holloway — HIGH / DETERIORATING ────────────────────
    "PT-1033": [
        dict(hours_ago=104, temperature=37.0, heart_rate=82,  respiratory_rate=17,
             systolic_bp=120, diastolic_bp=74, spo2=97, consciousness="Alert",
             wbc=9.6, hemoglobin=12.4, lactate=1.1, creatinine=1.1),
        dict(hours_ago=80,  temperature=37.8, heart_rate=98,  respiratory_rate=21,
             systolic_bp=108, diastolic_bp=68, spo2=95, consciousness="Alert",
             wbc=12.4, hemoglobin=11.8, lactate=1.9, creatinine=1.3),
        dict(hours_ago=56,  temperature=38.6, heart_rate=112, respiratory_rate=25,
             systolic_bp=94,  diastolic_bp=60, spo2=92, consciousness="Alert",
             wbc=15.8, hemoglobin=11.0, lactate=2.8, creatinine=1.7),
        dict(hours_ago=30,  temperature=39.3, heart_rate=126, respiratory_rate=30,
             systolic_bp=82,  diastolic_bp=52, spo2=88, consciousness="Voice",
             wbc=19.4, hemoglobin=10.2, lactate=4.4, creatinine=2.6),
    ],

    # ── PT-3914 Tariq Al-Mansoor — LOW / STABLE ──────────────────────────
    "PT-3914": [
        dict(hours_ago=36, temperature=37.3, heart_rate=78,  respiratory_rate=16,
             systolic_bp=130, diastolic_bp=82, spo2=98, consciousness="Alert",
             wbc=9.0, hemoglobin=14.2, lactate=1.0, creatinine=0.9),
        dict(hours_ago=16, temperature=37.2, heart_rate=76,  respiratory_rate=16,
             systolic_bp=128, diastolic_bp=80, spo2=98, consciousness="Alert",
             wbc=8.8, hemoglobin=14.4, lactate=0.9, creatinine=0.9),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
#  Seed function
# ─────────────────────────────────────────────────────────────────────────────

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        inserted_patients    = 0
        inserted_assessments = 0
        inserted_alerts      = 0

        for row in PATIENTS:
            pid, name, age, gender, admission_hours_ago, ward, unit, bed = row

            # ── Skip if already exists ────────────────────────────────────
            existing = db.query(Patient).filter(Patient.patient_id == pid).first()
            if existing:
                print(f"  SKIP   {pid} — {name} (already in DB)")
                continue

            # ── Create patient ────────────────────────────────────────────
            patient = Patient(
                patient_id=pid,
                display_name=name,
                age=age,
                gender=gender,
                ward=ward,
                unit=unit,
                bed=bed,
                admission_datetime=_dt(admission_hours_ago),
                status="active",
                created_at=_dt(admission_hours_ago),
                updated_at=datetime.utcnow(),
            )
            db.add(patient)
            db.flush()

            # ── Create assessment series ──────────────────────────────────
            series = ASSESSMENT_SERIES.get(pid, [])
            previous_assessments: list[Assessment] = []

            for obs in series:
                hours_ago = obs.pop("hours_ago")

                prelim = calculate_risk(**obs, trend_score=0.0,
                                        trend_direction="INSUFFICIENT_HISTORY")

                trend_result = calculate_trend(
                    current_clinical_score=prelim["clinical_score"],
                    previous_assessments=previous_assessments,
                )

                final = calculate_risk(
                    **obs,
                    trend_score=trend_result["trend_score"],
                    trend_direction=trend_result["trend_direction"],
                )

                assessment = Assessment(
                    assessment_id=_aid(),
                    patient_id=pid,
                    timestamp=_dt(hours_ago),
                    temperature=obs["temperature"],
                    heart_rate=obs["heart_rate"],
                    respiratory_rate=obs["respiratory_rate"],
                    systolic_bp=obs["systolic_bp"],
                    diastolic_bp=obs["diastolic_bp"],
                    spo2=obs["spo2"],
                    consciousness=obs["consciousness"],
                    wbc=obs.get("wbc"),
                    hemoglobin=obs.get("hemoglobin"),
                    lactate=obs.get("lactate"),
                    creatinine=obs.get("creatinine"),
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
                db.flush()
                previous_assessments.append(assessment)
                inserted_assessments += 1

                # Alert: risk_score >= 65 OR risk_delta >= 20
                is_high_risk    = final["risk_score"] >= HIGH_RISK_THRESHOLD
                is_rapid_deteri = trend_result["risk_delta"] >= RAPID_DELTA_THRESHOLD

                if is_high_risk or is_rapid_deteri:
                    existing_alert = (
                        db.query(Alert)
                        .filter(Alert.assessment_id == assessment.assessment_id)
                        .first()
                    )
                    if not existing_alert:
                        if is_high_risk and is_rapid_deteri:
                            msg   = ("High-risk indicators with rapid deterioration detected. "
                                     "Urgent clinical review recommended according to local protocol.")
                            atype = "HIGH_RISK"
                        elif is_high_risk:
                            msg   = ("High-risk deterioration indicators detected. "
                                     "Clinical review recommended according to local protocol.")
                            atype = "HIGH_RISK"
                        else:
                            msg   = ("Rapid deterioration detected — risk score increased by 20+ points. "
                                     "Increased monitoring and clinical assessment recommended.")
                            atype = "RAPID_DETERIORATION"

                        db.add(Alert(
                            assessment_id=assessment.assessment_id,
                            patient_id=pid,
                            created_at=assessment.timestamp,
                            alert_type=atype,
                            message=msg,
                            acknowledged=False,
                        ))
                        inserted_alerts += 1

            inserted_patients += 1
            latest_level = previous_assessments[-1].risk_level if previous_assessments else "N/A"
            latest_score = previous_assessments[-1].risk_score if previous_assessments else 0
            scores_str = " → ".join(
                f"{a.risk_score:.0f}" for a in previous_assessments
            )
            print(f"  OK     {pid} — {name:25}  {latest_level:10}  [{scores_str}]")

        db.commit()
        print(f"\n  Patients inserted   : {inserted_patients}")
        print(f"  Assessments inserted: {inserted_assessments}")
        print(f"  Alerts inserted     : {inserted_alerts}")

    except Exception as exc:
        db.rollback()
        print(f"\n  ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\nSeeding SEPSIS-AI database...\n")
    seed()
    print("\nDone.\n")
