"""
QSAR prediction service for Molecule Explorer.

Provides a modular interface for molecular property prediction.
Ships with a DEMO MODEL that produces illustrative (not clinical) values.

Includes a training script interface for later training real models
from CSV datasets using RandomForest + RDKit fingerprints.

All predictions are clearly labeled:
  "Demonstration model — not clinically validated"
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np

from app.chemistry.rdkit_utils import RDKIT_AVAILABLE, get_fingerprint_list
from app.models.schemas import PredictionConfidence, PredictionResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model registry — paths where trained models would live
# ---------------------------------------------------------------------------

MODEL_DIR = Path(os.getenv("MODEL_DIR", "./models"))

MODEL_PATHS = {
    "activity": MODEL_DIR / "activity_model.joblib",
    "absorption": MODEL_DIR / "absorption_model.joblib",
    "solubility": MODEL_DIR / "solubility_model.joblib",
    "toxicity": MODEL_DIR / "toxicity_model.joblib",
}

# In-memory cache for loaded models
_loaded_models: dict[str, object] = {}

DEMO_MODE = True  # Will be set to False if any real model is found


def _check_real_models():
    """Check if any trained models exist on disk."""
    global DEMO_MODE
    for name, path in MODEL_PATHS.items():
        if path.exists():
            try:
                import joblib
                _loaded_models[name] = joblib.load(path)
                logger.info("Loaded trained model: %s from %s", name, path)
                DEMO_MODE = False
            except Exception as exc:
                logger.error("Failed to load model %s: %s", name, exc)


# Try loading on module import
try:
    _check_real_models()
except Exception:
    pass


# ---------------------------------------------------------------------------
# Prediction functions
# ---------------------------------------------------------------------------

def predict_property(
    smiles: str,
    property_name: str,
) -> PredictionResult:
    """
    Predict a molecular property. Uses a trained model if available,
    otherwise returns a demo prediction.
    """
    # If we have a real model, use it
    if property_name in _loaded_models and RDKIT_AVAILABLE:
        return _predict_with_model(smiles, property_name)

    # Demo mode
    return _demo_prediction(smiles, property_name)


def predict_all_properties(smiles: str) -> list[PredictionResult]:
    """Predict all standard properties for a molecule."""
    properties = ["activity", "absorption", "solubility", "toxicity"]
    return [predict_property(smiles, prop) for prop in properties]


def _predict_with_model(smiles: str, property_name: str) -> PredictionResult:
    """Use a trained scikit-learn model for prediction."""
    try:
        model = _loaded_models[property_name]
        fp = get_fingerprint_list(smiles)
        X = np.array([fp])
        prediction = model.predict(X)[0]

        return PredictionResult(
            property_name=property_name,
            value=round(float(prediction), 4),
            unit=_get_unit(property_name),
            label="Prediction — not experimentally validated",
            confidence=PredictionConfidence.MEDIUM,
            method=f"RandomForest QSAR model ({property_name})",
        )
    except Exception as exc:
        logger.error("Model prediction failed for %s: %s", property_name, exc)
        return PredictionResult(
            property_name=property_name,
            value=None,
            label="Prediction failed",
            confidence=PredictionConfidence.UNAVAILABLE,
            method="Error in prediction pipeline",
        )


def _demo_prediction(smiles: str, property_name: str) -> PredictionResult:
    """
    Generate a demonstrative prediction using simple heuristics
    based on molecular descriptors. These are NOT real predictions.
    """
    # Use a deterministic hash of the SMILES to produce stable demo values
    hash_val = sum(ord(c) for c in smiles) % 1000

    demo_ranges = {
        "activity": (0.3, 0.9, "probability (0-1)"),
        "absorption": (20.0, 95.0, "% predicted oral absorption"),
        "solubility": (-6.0, 0.0, "log S (mol/L)"),
        "toxicity": (0.05, 0.8, "probability (0-1)"),
    }

    low, high, unit = demo_ranges.get(property_name, (0.0, 1.0, ""))
    # Produce a deterministic but varied value
    frac = (hash_val % 100) / 100.0
    value = round(low + frac * (high - low), 3)

    return PredictionResult(
        property_name=property_name,
        value=value,
        unit=unit,
        label="Prediction — not experimentally validated",
        confidence=PredictionConfidence.DEMO,
        method="Demonstration model — not clinically validated",
    )


def _get_unit(property_name: str) -> str:
    units = {
        "activity": "probability (0-1)",
        "absorption": "% predicted oral absorption",
        "solubility": "log S (mol/L)",
        "toxicity": "probability (0-1)",
    }
    return units.get(property_name, "")


# =========================================================================
# Training script interface
# =========================================================================

def train_model_from_csv(
    csv_path: str,
    smiles_column: str = "SMILES",
    target_column: str = "target",
    property_name: str = "activity",
    model_type: str = "regressor",  # "regressor" or "classifier"
    n_bits: int = 2048,
    test_size: float = 0.2,
    random_state: int = 42,
) -> dict:
    """
    Train a RandomForest model from a CSV dataset.

    Parameters
    ----------
    csv_path : str
        Path to CSV file with SMILES and target columns.
    smiles_column : str
        Name of the column containing SMILES strings.
    target_column : str
        Name of the column containing target values.
    property_name : str
        Name for the trained model (e.g. "activity").
    model_type : str
        "regressor" for continuous targets, "classifier" for binary.
    n_bits : int
        Fingerprint bit length.
    test_size : float
        Fraction of data for testing.
    random_state : int
        Random seed.

    Returns
    -------
    dict with training metrics and model path.
    """
    import pandas as pd
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
    from sklearn.metrics import (
        mean_absolute_error,
        mean_squared_error,
        r2_score,
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
    )

    # Load data
    df = pd.read_csv(csv_path)
    if smiles_column not in df.columns or target_column not in df.columns:
        raise ValueError(
            f"CSV must contain columns '{smiles_column}' and '{target_column}'. "
            f"Found: {list(df.columns)}"
        )

    # Generate fingerprints
    logger.info("Generating fingerprints for %d molecules...", len(df))
    fps = []
    targets = []
    for _, row in df.iterrows():
        smi = str(row[smiles_column])
        fp = get_fingerprint_list(smi, n_bits=n_bits)
        if fp and any(v != 0 for v in fp):
            fps.append(fp)
            targets.append(row[target_column])

    if len(fps) < 10:
        raise ValueError(
            f"Only {len(fps)} valid molecules found. Need at least 10."
        )

    X = np.array(fps)
    y = np.array(targets, dtype=float)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    # Train
    if model_type == "classifier":
        model = RandomForestClassifier(
            n_estimators=100, random_state=random_state, n_jobs=-1
        )
    else:
        model = RandomForestRegressor(
            n_estimators=100, random_state=random_state, n_jobs=-1
        )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # Metrics
    metrics = {}
    if model_type == "classifier":
        metrics = {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred, average="binary", zero_division=0), 4),
            "recall": round(recall_score(y_test, y_pred, average="binary", zero_division=0), 4),
            "f1": round(f1_score(y_test, y_pred, average="binary", zero_division=0), 4),
        }
    else:
        metrics = {
            "mae": round(mean_absolute_error(y_test, y_pred), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "r2": round(r2_score(y_test, y_pred), 4),
        }

    # Save model
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_PATHS[property_name]
    joblib.dump(model, model_path)

    logger.info("Model saved to %s. Metrics: %s", model_path, metrics)

    return {
        "property_name": property_name,
        "model_type": model_type,
        "model_path": str(model_path),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "metrics": metrics,
    }
