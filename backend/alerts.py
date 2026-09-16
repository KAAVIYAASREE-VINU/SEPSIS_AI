"""
alerts.py — Alert creation logic.

An alert is created when (spec-aligned):
  1. risk_score >= 65  (HIGH risk threshold)      OR
  2. risk_delta >= 20  (rapid deterioration)

One alert per assessment (duplicate guard via assessment_id uniqueness).

Alert wording is deliberately safe and non-prescriptive.
⚠  RESEARCH PROTOTYPE ONLY — NOT FOR CLINICAL USE.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Alert

# ─────────────────────────────────────────────────────────────────────────────
#  Thresholds (must match risk_engine.py and spec)
# ─────────────────────────────────────────────────────────────────────────────
HIGH_RISK_THRESHOLD  = 65.0   # risk_score >= 65 → HIGH
RAPID_DELTA_THRESHOLD = 20.0  # risk_delta >= 20 → rapid deterioration alert

# ─────────────────────────────────────────────────────────────────────────────
#  Safe alert messages
# ─────────────────────────────────────────────────────────────────────────────

_MSG_HIGH_RISK = (
    "High-risk deterioration indicators detected. "
    "Clinical review recommended according to local protocol."
)

_MSG_RAPID_DETERIORATION = (
    "Rapid deterioration detected — risk score increased by 20 or more points. "
    "Increased monitoring frequency and clinical assessment recommended."
)

_MSG_HIGH_AND_RAPID = (
    "High-risk indicators with rapid deterioration detected. "
    "Urgent clinical review recommended according to local protocol."
)

# ─────────────────────────────────────────────────────────────────────────────
#  Alert type constants
# ─────────────────────────────────────────────────────────────────────────────

ALERT_TYPE_HIGH_RISK         = "HIGH_RISK"
ALERT_TYPE_RAPID_DETERIORATION = "RAPID_DETERIORATION"


# ─────────────────────────────────────────────────────────────────────────────
#  Main function
# ─────────────────────────────────────────────────────────────────────────────

def maybe_create_alert(
    db: Session,
    assessment_id: str,
    patient_id: str,
    risk_score: float,
    risk_level: str,
    trend_direction: str,
    risk_delta: float,
) -> Optional[Alert]:
    """
    Evaluate alert conditions and persist an alert if warranted.

    Triggers:
      - risk_score >= 65  (HIGH risk)
      - risk_delta >= 20  (rapid deterioration, any risk level)

    Returns the Alert object or None. Idempotent per assessment_id.
    """

    # ── Duplicate guard ──────────────────────────────────────────────────────
    existing = db.query(Alert).filter(Alert.assessment_id == assessment_id).first()
    if existing:
        return existing

    # ── Evaluate conditions ──────────────────────────────────────────────────
    is_high_risk    = risk_score >= HIGH_RISK_THRESHOLD
    is_rapid_deteri = risk_delta >= RAPID_DELTA_THRESHOLD

    if not (is_high_risk or is_rapid_deteri):
        return None

    # ── Determine alert type and message ─────────────────────────────────────
    if is_high_risk and is_rapid_deteri:
        alert_type = ALERT_TYPE_HIGH_RISK
        message    = _MSG_HIGH_AND_RAPID
    elif is_high_risk:
        alert_type = ALERT_TYPE_HIGH_RISK
        message    = _MSG_HIGH_RISK
    else:
        alert_type = ALERT_TYPE_RAPID_DETERIORATION
        message    = _MSG_RAPID_DETERIORATION

    # ── Persist ──────────────────────────────────────────────────────────────
    alert = Alert(
        assessment_id=assessment_id,
        patient_id=patient_id,
        created_at=datetime.utcnow(),
        alert_type=alert_type,
        message=message,
        acknowledged=False,
        acknowledged_at=None,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return alert
