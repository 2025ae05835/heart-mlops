"""FastAPI model-serving app.

Endpoints
  GET  /            service info
  GET  /health      liveness/readiness (model loaded?)
  POST /predict     single patient -> prediction + confidence
  POST /predict/batch
  GET  /metrics     Prometheus metrics
"""
import json
import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from prometheus_client import (CONTENT_TYPE_LATEST, Counter, Gauge,
                               Histogram, generate_latest)
from starlette.responses import Response

from api.schemas import (BatchRequest, BatchResponse, Patient,
                         PredictResponse)
from heart import config
from heart.predict import load_metadata, load_model, predict_records


# ---------- structured JSON logging --------------------------------------
class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {"ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
                   "level": record.levelname, "logger": record.name,
                   "msg": record.getMessage()}
        payload.update(getattr(record, "extra_fields", {}))
        return json.dumps(payload)


handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log = logging.getLogger("heart-api")
log.handlers = [handler]
log.setLevel(os.getenv("LOG_LEVEL", "INFO"))
log.propagate = False

# ---------- Prometheus metrics -------------------------------------------
REQUESTS = Counter("heart_api_requests_total", "HTTP requests",
                   ["method", "endpoint", "status"])
LATENCY = Histogram("heart_api_request_latency_seconds", "Request latency",
                    ["endpoint"],
                    buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5))
PREDICTIONS = Counter("heart_api_predictions_total", "Predictions made",
                      ["label", "risk_band"])
PROBA = Histogram("heart_api_prediction_probability",
                  "Predicted probability of disease",
                  buckets=[i / 10 for i in range(11)])
MODEL_INFO = Gauge("heart_api_model_info", "Loaded model",
                   ["model_name", "trained_at"])

STATE = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    path = os.getenv("MODEL_PATH", str(config.MODEL_FILE))
    STATE["model"] = load_model(path)
    STATE["meta"] = load_metadata()
    name = STATE["meta"].get("model_name", "unknown")
    MODEL_INFO.labels(name, STATE["meta"].get("trained_at", "")).set(1)
    fields = {"model": name, "path": path}
    log.info("model loaded", extra={"extra_fields": fields})
    yield
    STATE.clear()


app = FastAPI(title="Heart Disease Risk API", version="1.0.0",
              lifespan=lifespan)


@app.middleware("http")
async def log_and_measure(request: Request, call_next):
    rid = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
    request.state.request_id = rid
    start = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["x-request-id"] = rid
        return response
    finally:
        elapsed = time.perf_counter() - start
        path = request.url.path
        if path != "/metrics":
            REQUESTS.labels(request.method, path, str(status)).inc()
            LATENCY.labels(path).observe(elapsed)
            log.info("request", extra={"extra_fields": {
                "request_id": rid, "method": request.method, "path": path,
                "status": status, "latency_ms": round(elapsed * 1000, 2),
                "client": request.client.host if request.client else None}})


def _model_name():
    return STATE.get("meta", {}).get("model_name", "unknown")


def _record(results):
    for r in results:
        PREDICTIONS.labels(r["label"], r["risk_band"]).inc()
        PROBA.observe(r["probability_disease"])


@app.get("/")
def root():
    return {"service": "heart-disease-risk-api", "version": app.version,
            "model": _model_name(), "docs": "/docs"}


@app.get("/health")
def health():
    if "model" not in STATE:
        raise HTTPException(503, "model not loaded")
    return {"status": "ok", "model": _model_name(),
            "metrics": STATE["meta"].get("metrics", {})}


@app.post("/predict", response_model=PredictResponse)
def predict(patient: Patient, request: Request):
    result = predict_records([patient.model_dump()], STATE["model"])[0]
    _record([result])
    log.info("prediction", extra={"extra_fields": {
        "request_id": request.state.request_id, **result}})
    return {**result, "model_name": _model_name(),
            "request_id": request.state.request_id}


@app.post("/predict/batch", response_model=BatchResponse)
def predict_batch(batch: BatchRequest, request: Request):
    results = predict_records([p.model_dump() for p in batch.patients],
                              STATE["model"])
    _record(results)
    return {"model_name": _model_name(),
            "request_id": request.state.request_id, "results": results}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
