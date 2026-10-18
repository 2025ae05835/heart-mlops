import numpy as np
import pandas as pd
import pytest

from heart import config


@pytest.fixture
def raw_uci_text():
    """Five rows in the official UCI format, incl. '?' missing markers."""
    return (
        "63.0,1.0,1.0,145.0,233.0,1.0,2.0,150.0,0.0,2.3,3.0,0.0,6.0,0\n"
        "67.0,1.0,4.0,160.0,286.0,0.0,2.0,108.0,1.0,1.5,2.0,3.0,3.0,2\n"
        "67.0,1.0,4.0,120.0,229.0,0.0,2.0,129.0,1.0,2.6,2.0,2.0,7.0,1\n"
        "37.0,1.0,3.0,130.0,250.0,0.0,0.0,187.0,0.0,3.5,3.0,?,3.0,0\n"
        "41.0,0.0,2.0,130.0,0.0,0.0,2.0,172.0,0.0,1.4,1.0,0.0,?,0\n"
    )


@pytest.fixture
def synthetic_clean():
    """Small, realistic clean dataset for fast model tests."""
    rng = np.random.default_rng(0)
    n = 120
    target = rng.integers(0, 2, n)
    df = pd.DataFrame({
        "age": rng.integers(30, 78, n),
        "trestbps": rng.normal(130, 15, n).round(),
        "chol": rng.normal(245, 45, n).round(),
        "thalach": 165 - 25 * target + rng.normal(0, 15, n),
        "oldpeak": np.abs(0.6 + 1.2 * target + rng.normal(0, 0.8, n)),
        "ca": rng.integers(0, 4, n).astype(float),
        "sex": rng.integers(0, 2, n),
        "fbs": rng.integers(0, 2, n),
        "exang": (target & rng.integers(0, 2, n)),
        "cp": rng.choice(list(config.CP_LABELS.values()), n),
        "restecg": rng.choice(list(config.RESTECG_LABELS.values()), n),
        "slope": rng.choice(list(config.SLOPE_LABELS.values()), n),
        "thal": rng.choice(list(config.THAL_LABELS.values()), n),
        "target": target,
    })
    df.loc[[3, 7], "ca"] = np.nan
    df.loc[[5], "thal"] = np.nan
    return df


@pytest.fixture
def sample_patient():
    return {"age": 58, "sex": 1, "cp": "asymptomatic", "trestbps": 140,
            "chol": 260, "fbs": 0, "restecg": "lv_hypertrophy",
            "thalach": 120, "exang": 1, "oldpeak": 2.4, "slope": "flat",
            "ca": 2, "thal": "reversible_defect"}
