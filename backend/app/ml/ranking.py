"""
Transparent weighted ranking system for Molecule Explorer.

Score = Σ(property_score × normalized_weight)

Toxicity is inverted: lower toxicity → higher score.
Shows the user exactly how the score was calculated.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.models.schemas import CandidateInfo, Priorities, PredictionResult

logger = logging.getLogger(__name__)


def normalize_priorities(priorities: Priorities) -> dict[str, float]:
    """
    Normalize priority weights so they sum to 1.0.
    """
    raw = {
        "activity": max(0, priorities.activity),
        "absorption": max(0, priorities.absorption),
        "solubility": max(0, priorities.solubility),
        "toxicity": max(0, priorities.toxicity),
    }
    total = sum(raw.values())
    if total == 0:
        # Equal weights if all zero
        return {k: 0.25 for k in raw}
    return {k: v / total for k, v in raw.items()}


def _score_prediction(pred: PredictionResult) -> Optional[float]:
    """
    Convert a prediction value to a 0-1 score.
    Higher is always better in the output.
    """
    if pred.value is None:
        return None

    prop = pred.property_name.lower()

    if prop == "activity":
        # Probability 0-1, higher is better
        return max(0.0, min(1.0, pred.value))

    elif prop == "absorption":
        # Percentage 0-100, normalize to 0-1
        return max(0.0, min(1.0, pred.value / 100.0))

    elif prop == "solubility":
        # log S: typically -10 to 0, more positive is better
        # Normalize: -6 → 0, 0 → 1
        return max(0.0, min(1.0, (pred.value + 6.0) / 6.0))

    elif prop == "toxicity":
        # Probability 0-1, INVERT: lower toxicity → higher score
        return max(0.0, min(1.0, 1.0 - pred.value))

    else:
        # Unknown property — use raw value clamped
        return max(0.0, min(1.0, pred.value))


def rank_candidate(
    candidate: CandidateInfo,
    priorities: Priorities,
) -> tuple[float, dict[str, dict]]:
    """
    Calculate the overall ranking score for a single candidate.

    Returns
    -------
    (overall_score, breakdown_dict)

    breakdown_dict example:
    {
        "activity": {"score": 0.72, "weight": 0.40, "contribution": 0.288},
        ...
    }
    """
    weights = normalize_priorities(priorities)
    breakdown: dict[str, dict] = {}
    overall = 0.0
    total_weight_used = 0.0

    pred_map: dict[str, PredictionResult] = {}
    for pred in candidate.predictions:
        pred_map[pred.property_name.lower()] = pred

    for prop_name, weight in weights.items():
        pred = pred_map.get(prop_name)
        if pred is None:
            breakdown[prop_name] = {
                "score": None,
                "weight": round(weight, 4),
                "contribution": 0.0,
                "note": "No prediction available",
            }
            continue

        score = _score_prediction(pred)
        if score is None:
            breakdown[prop_name] = {
                "score": None,
                "weight": round(weight, 4),
                "contribution": 0.0,
                "note": "Prediction value unavailable",
            }
            continue

        contribution = score * weight
        overall += contribution
        total_weight_used += weight

        breakdown[prop_name] = {
            "score": round(score, 4),
            "weight": round(weight, 4),
            "contribution": round(contribution, 4),
            "raw_value": pred.value,
            "unit": pred.unit,
            "inverted": prop_name == "toxicity",
        }

    # Normalize if not all weights were used
    if total_weight_used > 0 and total_weight_used < 0.99:
        overall = overall / total_weight_used

    return round(overall, 4), breakdown


def rank_candidates(
    candidates: list[CandidateInfo],
    priorities: Priorities,
) -> list[CandidateInfo]:
    """
    Rank a list of candidates according to user priorities.
    Returns a new list sorted by overall score (descending).
    """
    scored: list[tuple[float, dict, CandidateInfo]] = []

    for cand in candidates:
        score, breakdown = rank_candidate(cand, priorities)
        # Create a copy with ranking info
        ranked = cand.model_copy()
        ranked.ranking_score = score
        ranked.ranking_breakdown = breakdown
        scored.append((score, breakdown, ranked))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    return [item[2] for item in scored]
