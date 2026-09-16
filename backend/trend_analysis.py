"""
trend_analysis.py — Compare sequential assessments to calculate risk trajectory.

Outputs:
  - trend_score      : float (0–20) added to clinical_score in risk_engine
  - risk_delta       : float, difference between current and previous risk_score
  - trend_direction  : DETERIORATING | IMPROVING | STABLE | INSUFFICIENT_HISTORY

Thresholds are deliberately conservative to avoid false deterioration alerts
when only one assessment exists.

⚠  RESEARCH PROTOTYPE ONLY — NOT FOR CLINICAL USE.
"""

from __future__ import annotations
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from models import Assessment


# ─────────────────────────────────────────────────────────────────────────────
#  Threshold constants
# ─────────────────────────────────────────────────────────────────────────────

# Minimum absolute change in risk_score to be called "DETERIORATING" or "IMPROVING"
DETERIORATION_THRESHOLD = 8.0   # points
IMPROVEMENT_THRESHOLD   = 8.0   # points

# Rapid deterioration: large change in a single step
RAPID_DETERIORATION     = 20.0  # points → full trend bonus

# Max bonus added to risk_score for trend
TREND_SCORE_MAX = 20.0

# Number of previous assessments to include in velocity calculation
HISTORY_WINDOW = 5


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: velocity over multiple assessments
# ─────────────────────────────────────────────────────────────────────────────

def _calculate_velocity(history_scores: List[float]) -> float:
    """
    Calculate the mean per-step change over the recent history window.
    Positive → trending upward (deteriorating).
    Negative → trending downward (improving).
    """
    if len(history_scores) < 2:
        return 0.0
    deltas = [
        history_scores[i] - history_scores[i - 1]
        for i in range(1, len(history_scores))
    ]
    return sum(deltas) / len(deltas)


# ─────────────────────────────────────────────────────────────────────────────
#  Main trend function
# ─────────────────────────────────────────────────────────────────────────────

def calculate_trend(
    current_clinical_score: float,
    previous_assessments: List["Assessment"],
) -> dict:
    """
    Compare the current clinical score against previous assessments.

    Parameters
    ----------
    current_clinical_score:
        The clinical_score (0–100) calculated by risk_engine for the new assessment.
        This is the pre-trend score — trend is added on top.

    previous_assessments:
        Ordered list of Assessment ORM objects (oldest → newest).
        May be empty if this is the patient's first assessment.

    Returns
    -------
    dict with keys:
        trend_score       float (0–TREND_SCORE_MAX)
        risk_delta        float
        trend_direction   str
        velocity          float (internal, for debugging)
    """

    # ── No previous history ──────────────────────────────────────────────────
    if not previous_assessments:
        return {
            "trend_score": 0.0,
            "risk_delta": 0.0,
            "trend_direction": "INSUFFICIENT_HISTORY",
            "velocity": 0.0,
        }

    # ── Previous clinical scores (use clinical_score for fair comparison,
    #    fall back to risk_score if clinical not stored) ──────────────────────
    prev_scores: List[float] = []
    for a in previous_assessments[-HISTORY_WINDOW:]:
        # Prefer clinical_score (pre-trend) for apple-to-apple comparison
        score = a.clinical_score if a.clinical_score is not None else a.risk_score
        if score is not None:
            prev_scores.append(float(score))

    if not prev_scores:
        return {
            "trend_score": 0.0,
            "risk_delta": 0.0,
            "trend_direction": "INSUFFICIENT_HISTORY",
            "velocity": 0.0,
        }

    last_score = prev_scores[-1]
    risk_delta = round(current_clinical_score - last_score, 2)

    # ── Velocity (multi-step trend) ──────────────────────────────────────────
    all_scores = prev_scores + [current_clinical_score]
    velocity = _calculate_velocity(all_scores)

    # ── Trend direction ──────────────────────────────────────────────────────
    if risk_delta >= DETERIORATION_THRESHOLD:
        trend_direction = "DETERIORATING"
    elif risk_delta <= -IMPROVEMENT_THRESHOLD:
        trend_direction = "IMPROVING"
    else:
        trend_direction = "STABLE"

    # ── Trend score bonus ─────────────────────────────────────────────────────
    # Only add bonus for deterioration, not improvement
    if trend_direction == "DETERIORATING":
        # Scale: 0 at threshold → max at RAPID_DETERIORATION
        excess = max(0.0, risk_delta - DETERIORATION_THRESHOLD)
        scale  = min(1.0, excess / (RAPID_DETERIORATION - DETERIORATION_THRESHOLD))
        trend_score = round(TREND_SCORE_MAX * scale, 2)

        # Sustained multi-step deterioration amplifies the score slightly
        if velocity > 5.0 and len(prev_scores) >= 2:
            trend_score = min(TREND_SCORE_MAX, trend_score + 3.0)
    else:
        trend_score = 0.0

    return {
        "trend_score": trend_score,
        "risk_delta": risk_delta,
        "trend_direction": trend_direction,
        "velocity": round(velocity, 3),
    }
