#!/usr/bin/env bash
# Deploy API + Prometheus + Grafana to a local Kubernetes cluster.
# Works with Minikube (default) or Docker Desktop Kubernetes (TARGET=docker-desktop).
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET="${TARGET:-minikube}"

echo ">> Building image heart-api:latest for $TARGET"
if [ "$TARGET" = "minikube" ]; then
  eval "$(minikube docker-env)"      # build directly inside Minikube's Docker
fi
docker build -t heart-api:latest .

echo ">> Applying manifests"
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl -n heart create configmap grafana-dashboards \
  --from-file=monitoring/grafana/dashboards/ --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/monitoring/grafana.yaml

echo ">> Waiting for rollout"
kubectl -n heart rollout status deployment/heart-api --timeout=180s
kubectl -n heart rollout status deployment/prometheus --timeout=180s
kubectl -n heart rollout status deployment/grafana --timeout=180s
kubectl -n heart get pods,svc -o wide

cat <<EOF

Done. Next steps:
  Minikube:        run 'minikube tunnel' in another terminal, then
                   kubectl -n heart get svc heart-api   (EXTERNAL-IP)
                   or simply: minikube service heart-api -n heart --url
  Docker Desktop:  LoadBalancer is served on http://localhost:80
  Grafana:         kubectl -n heart port-forward svc/grafana 3000:3000
  Prometheus:      kubectl -n heart port-forward svc/prometheus 9090:9090
  Load traffic:    python scripts/load_test.py --url <API_URL> --n 300
EOF
