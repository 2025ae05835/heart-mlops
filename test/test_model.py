import joblib
import numpy as np
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

from heart import config
from heart.features import build_pipeline, build_preprocessor
from heart.predict import predict_records
from heart.train import candidates


@pytest.fixture
def fitted(synthetic_clean):
    X, y = synthetic_clean[config.FEATURES], synthetic_clean[config.TARGET]
    return build_pipeline(LogisticRegression(max_iter=1000)).fit(X, y)


def test_preprocessor_output_has_no_nans(synthetic_clean):
    Xt = build_preprocessor().fit_transform(synthetic_clean[config.FEATURES])
    assert not np.isnan(Xt).any()
    # 6 numeric + 3 binary + one-hot (4 + 3 + 3 + 3)
    assert Xt.shape[1] == 6 + 3 + 13


def test_numeric_features_are_scaled(synthetic_clean):
    Xt = build_preprocessor().fit_transform(synthetic_clean[config.FEATURES])
    num = Xt[:, :len(config.NUMERIC_FEATURES)]
    assert np.allclose(num.mean(axis=0), 0, atol=1e-6)


def test_unseen_category_does_not_crash(fitted, sample_patient):
    sample_patient["cp"] = "brand_new_category"
    out = predict_records([sample_patient], fitted)
    assert 0 <= out[0]["probability_disease"] <= 1


def test_prediction_contract(fitted, sample_patient):
    out = predict_records([sample_patient, sample_patient], fitted)
    assert len(out) == 2
    r = out[0]
    assert set(r) == {"prediction", "label", "probability_disease",
                      "confidence", "risk_band"}
    assert r["prediction"] in (0, 1)
    assert 0.5 <= r["confidence"] <= 1
    assert r["risk_band"] in {"low", "moderate", "high"}


def test_missing_optional_fields_are_imputed(fitted, sample_patient):
    sample_patient.pop("ca")
    sample_patient["thal"] = None
    assert predict_records([sample_patient], fitted)[0]["prediction"] in (0, 1)


def test_model_beats_chance(synthetic_clean):
    X, y = synthetic_clean[config.FEATURES], synthetic_clean[config.TARGET]
    auc = cross_val_score(build_pipeline(LogisticRegression(max_iter=1000)),
                          X, y, cv=3, scoring="roc_auc").mean()
    assert auc > 0.7


def test_candidates_include_lr_and_rf():
    assert {"logistic_regression", "random_forest"} <= set(candidates())


def test_model_roundtrip(tmp_path, fitted, sample_patient):
    path = tmp_path / "m.joblib"
    joblib.dump(fitted, path)
    again = joblib.load(path)
    assert predict_records([sample_patient], again) == \
        predict_records([sample_patient], fitted)
