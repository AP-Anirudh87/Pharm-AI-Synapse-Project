"""
Prediction service for Molecule Explorer.

Orchestrates QSAR predictions and provides an ADMET interface.
If no real ADMET model is configured, displays:
  "ADMET prediction unavailable in demo mode."
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from app.ml.qsar import predict_all_properties, predict_property, DEMO_MODE
from app.models.schemas import PredictionConfidence, PredictionResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ADMET interface
# ---------------------------------------------------------------------------

ADMET_ENABLED = os.getenv("ADMET_API_URL") is not None


def get_admet_predictions(smiles: str) -> list[PredictionResult]:
    """
    Get ADMET predictions for a molecule.

    If a real ADMET model/API is configured (via ADMET_API_URL env var),
    queries it. Otherwise returns unavailable status.

    This interface allows an external ADMET model/API to be connected later.
    """
    if ADMET_ENABLED:
        return _query_admet_api(smiles)

    # Demo mode — no real ADMET
    return [
        PredictionResult(
            property_name="admet_absorption",
            value=None,
            label="ADMET prediction unavailable in demo mode",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="No ADMET model configured",
        ),
        PredictionResult(
            property_name="admet_distribution",
            value=None,
            label="ADMET prediction unavailable in demo mode",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="No ADMET model configured",
        ),
        PredictionResult(
            property_name="admet_metabolism",
            value=None,
            label="ADMET prediction unavailable in demo mode",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="No ADMET model configured",
        ),
        PredictionResult(
            property_name="admet_excretion",
            value=None,
            label="ADMET prediction unavailable in demo mode",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="No ADMET model configured",
        ),
        PredictionResult(
            property_name="admet_toxicity",
            value=None,
            label="ADMET prediction unavailable in demo mode",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="No ADMET model configured",
        ),
    ]


def _query_admet_api(smiles: str) -> list[PredictionResult]:
    """
    Query an external ADMET API.
    Placeholder for future integration.
    """
    # This would connect to an external ADMET service
    # For now, return unavailable
    return get_admet_predictions.__wrapped__(smiles) if hasattr(get_admet_predictions, '__wrapped__') else []


# ---------------------------------------------------------------------------
# Combined prediction service
# ---------------------------------------------------------------------------

def get_all_predictions(smiles: str, include_admet: bool = True) -> list[PredictionResult]:
    """
    Get all available predictions for a molecule.
    Combines QSAR predictions with ADMET if available.
    """
    predictions = predict_all_properties(smiles)

    if include_admet:
        admet = get_admet_predictions(smiles)
        # Only include ADMET if they have actual values
        for pred in admet:
            if pred.value is not None:
                predictions.append(pred)

    return predictions


def get_prediction_status() -> dict:
    """Return the current status of prediction services."""
    return {
        "qsar_demo_mode": DEMO_MODE,
        "admet_enabled": ADMET_ENABLED,
        "available_properties": ["activity", "absorption", "solubility", "toxicity"],
        "note": (
            "Demonstration model — not clinically validated"
            if DEMO_MODE
            else "Trained QSAR models loaded"
        ),
    }
