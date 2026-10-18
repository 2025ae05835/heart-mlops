PY ?= python
export PYTHONPATH := src:.

.PHONY: install data eda train test lint serve mlflow docker-build docker-run compose k8s all

install:      ## install all dependencies
	$(PY) -m pip install -r requirements.txt
data:         ## download + clean dataset
	$(PY) -m heart.data --force
eda:          ## generate EDA figures
	$(PY) -m heart.eda
train:        ## train, tune & log to MLflow
	$(PY) -m heart.train
lint:
	flake8 src api test
test:
	pytest -v
serve:        ## run API locally on :8000
	uvicorn api.main:app --reload --port 8000
mlflow:       ## open MLflow UI on :5000
	mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5000
docker-build:
	docker build -t heart-api:latest .
docker-run:
	docker run --rm -p 8000:8000 heart-api:latest
compose:      ## API + Prometheus + Grafana
	docker compose up --build
k8s:          ## deploy to Minikube
	bash scripts/deploy_k8s.sh
all: install data eda train lint test docker-build
