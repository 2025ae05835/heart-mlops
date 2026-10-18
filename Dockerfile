# ---- build stage: install wheels into a virtualenv -----------------------
FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements-serve.txt .
RUN pip install -r requirements-serve.txt

# ---- runtime stage: small image, non-root user ---------------------------
FROM python:3.12-slim
LABEL org.opencontainers.image.title="heart-disease-risk-api" \
      org.opencontainers.image.description="FastAPI service serving a heart disease classifier"
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/src:/app \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/models/heart_model.joblib
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY src/ src/
COPY api/ api/
COPY models/heart_model.joblib models/model_metadata.json models/
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"
# One worker per pod keeps Prometheus counters consistent; scale with replicas.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
