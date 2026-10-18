"""Inference helpers shared by the API and the CLI.

Usage: python -m heart.predict '{"age": 63, "sex": 1, ...}'
"""
import json
import sys
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from heart import config


@lru_cache(maxsize=1)
def load_model(path: str = str(config.MODEL_FILE)):
    return joblib.load(path)


def load_metadata() -> dict:
    if config.METADATA_FILE.exists():
        return json.loads(config.METADATA_FILE.read_text())
    return {}


def predict_records(records, model=None):
    """Predict for a list of dicts with raw feature values."""
    model = model or load_model()
    X = pd.DataFrame(records)
    for col in config.FEATURES:
        if col not in X:
            X[col] = None  # imputed by the pipeline
    X = X[config.FEATURES].copy()
    for col in config.NUMERIC_FEATURES + config.BINARY_FEATURES:
        X[col] = pd.to_numeric(X[col], errors="coerce")
    for col in config.CATEGORICAL_FEATURES:
        X[col] = X[col].astype(object).where(X[col].notna(), np.nan)
    proba = model.predict_proba(X)[:, 1]
    out = []
    for p in proba:
        label = int(p >= 0.5)
        out.append({
            "prediction": label,
            "label": "heart_disease" if label else "no_heart_disease",
            "probability_disease": round(float(p), 4),
            "confidence": round(float(max(p, 1 - p)), 4),
            "risk_band": ("high" if p >= 0.7 else
                          "moderate" if p >= 0.4 else "low"),
        })
    return out


if __name__ == "__main__":
    payload = json.loads(sys.argv[1])
    records = payload if isinstance(payload, list) else [payload]
    print(json.dumps(predict_records(records), indent=2))
