import json

import joblib
import pytest
from fastapi.testclient import TestClient
from sklearn.linear_model import LogisticRegression

from heart import config
from heart.features import build_pipeline


@pytest.fixture
def client(tmp_path, monkeypatch, synthetic_clean):
    """API wired to a small model trained on synthetic data, so the tests
    do not depend on the real training run."""
    X, y = synthetic_clean[config.FEATURES], synthetic_clean[config.TARGET]
    model = build_pipeline(LogisticRegression(max_iter=1000)).fit(X, y)
    path = tmp_path / "model.joblib"
    joblib.dump(model, path)
    meta = tmp_path / "meta.json"
    meta.write_text(json.dumps({"model_name": "test_lr"}))
    monkeypatch.setenv("MODEL_PATH", str(path))
    monkeypatch.setattr(config, "METADATA_FILE", meta)

    from heart.predict import load_model
    load_model.cache_clear()
    from api.main import app
    with TestClient(app) as c:
        yield c
    load_model.cache_clear()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model"] == "test_lr"


def test_predict_returns_prediction_and_confidence(client, sample_patient):
    r = client.post("/predict", json=sample_patient)
    assert r.status_code == 200
    body = r.json()
    assert body["prediction"] in (0, 1)
    assert 0.5 <= body["confidence"] <= 1
    assert r.headers["x-request-id"] == body["request_id"]


def test_predict_rejects_invalid_input(client, sample_patient):
    sample_patient["age"] = 400
    assert client.post("/predict", json=sample_patient).status_code == 422
    sample_patient["age"] = 50
    sample_patient["cp"] = "unknown"
    assert client.post("/predict", json=sample_patient).status_code == 422


def test_batch(client, sample_patient):
    r = client.post("/predict/batch",
                    json={"patients": [sample_patient] * 3})
    assert r.status_code == 200
    assert len(r.json()["results"]) == 3


def test_metrics_exposed(client, sample_patient):
    client.post("/predict", json=sample_patient)
    text = client.get("/metrics").text
    assert "heart_api_requests_total" in text
    assert "heart_api_predictions_total" in text
