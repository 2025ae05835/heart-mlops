# Screenshots to capture

Save each as PNG with the file name below; the report refers to these names.

| File | What to capture |
|---|---|
| 01_mlflow_experiments.png | MLflow UI, experiment `heart-disease`, all runs listed with metrics columns |
| 02_mlflow_compare.png | MLflow "Compare" view of the 3 model runs (ROC-AUC chart) |
| 03_mlflow_artifacts.png | One run's Artifacts tab showing plots/ROC curve |
| 04_pytest_local.png | Terminal: `pytest -v` all passed |
| 05_github_actions_run.png | GitHub Actions run, all jobs green |
| 06_github_actions_artifacts.png | Same run, Artifacts section at the bottom |
| 07_docker_build_run.png | Terminal: `docker build` finished + `docker run` + curl /predict response |
| 08_k8s_pods_svc.png | Terminal: `kubectl -n heart get pods,svc` (pods Running, EXTERNAL-IP set) |
| 09_k8s_predict.png | curl to the LoadBalancer/Ingress URL returning a prediction |
| 10_swagger_ui.png | Browser: `/docs` page with a /predict call executed |
| 11_grafana_dashboard.png | Grafana dashboard after running `scripts/load_test.py` |
| 12_prometheus_targets.png | Prometheus Status → Targets, heart-api pods UP |
| 13_api_logs.png | `kubectl -n heart logs deploy/heart-api` showing JSON request logs |
