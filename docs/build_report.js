// Builds docs/MLOps_Assignment1_Report.docx  (node docs/build_report.js)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow,
  TableCell, WidthType, ShadingType, AlignmentType, LevelFormat, PageBreak,
  BorderStyle, Footer, PageNumber,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const W = 9026; // A4 text width in DXA with 1" margins
const FONT = "Calibri";

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  ...opts,
  children: Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: 22 })],
});
const r = (text, o = {}) => new TextRun({ text, font: FONT, size: 22, ...o });
const code = (text) => new TextRun({ text, font: "Consolas", size: 19 });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t })] });
const bullet = (children) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 }, children: typeof children === "string" ? [r(children)] : children });
const codeBlock = (lines) => lines.map((l, i) => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: "F3F4F6" },
  spacing: { after: i === lines.length - 1 ? 140 : 0 },
  indent: { left: 120 },
  children: [code(l)],
}));

function img(file, widthPx, caption) {
  const full = path.join(ROOT, file);
  const buf = fs.readFileSync(full);
  const w0 = buf.readUInt32BE(16), h0 = buf.readUInt32BE(20);
  const height = Math.round(widthPx * h0 / w0);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [new TextRun({ text: caption, italics: true, size: 18, font: FONT, color: "555555" })] }),
  ];
}

function placeholder(file, what) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.CLEAR, fill: "FFF4CC" },
    border: { top: { style: BorderStyle.DASHED, size: 6, color: "C9A227" }, bottom: { style: BorderStyle.DASHED, size: 6, color: "C9A227" },
              left: { style: BorderStyle.DASHED, size: 6, color: "C9A227" }, right: { style: BorderStyle.DASHED, size: 6, color: "C9A227" } },
    spacing: { before: 120, after: 200 },
    children: [new TextRun({ text: `[INSERT SCREENSHOT: screenshots/${file}]  `, bold: true, font: FONT, size: 20, color: "7A5C00" }),
               new TextRun({ text: what, font: FONT, size: 20, color: "7A5C00" })],
  });
}

function table(header, rows, widths, boldRow = -1) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFC5CE" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (t, i, isHead, bold) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: isHead ? { type: ShadingType.CLEAR, fill: "1F3A5F" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: String(t), font: FONT, size: 19,
      bold: isHead || bold, color: isHead ? "FFFFFF" : "222222" })] })],
  });
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, i, true)) }),
      ...rows.map((row, ri) => new TableRow({ children: row.map((t, i) => cell(t, i, false, ri === boldRow)) }))],
  });
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "models/model_metadata.json")));

const children = [
  // ---------- title page
  new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Machine Learning Operations (AIMLCZG523)", font: FONT, size: 28, color: "1F3A5F" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Assignment 01 — Heart Disease Risk Prediction", font: FONT, size: 44, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 },
    children: [new TextRun({ text: "End-to-end ML development, CI/CD and production deployment", font: FONT, size: 26, color: "555555" })] }),
  ...[["Name", "VIPIN VK"], ["BITS ID", "2025ae05835"], ["Repository", "https://github.com/2025ae05835/heart-mlops"],
      ["Deployed API / access", "Local Kubernetes (Minikube), not public: POST http://<EXTERNAL-IP>/predict after scripts/deploy_k8s.sh and minikube tunnel (Section 8, README section 5)"], ["Video walkthrough", "video/2025ae05835.mp4 in the repository"], ["Date", "October 2026"]]
    .map(([k, v]) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: `${k}: `, bold: true, font: FONT, size: 24 }), new TextRun({ text: v, font: FONT, size: 24 })] })),

  new Paragraph({ spacing: { before: 500, after: 120 }, children: [new TextRun({ text: "Contents", bold: true, font: FONT, size: 26, color: "1F3A5F" })] }),
  ...["1. Overview and architecture", "2. Setup and installation", "3. Data acquisition and cleaning", "4. Exploratory data analysis",
      "5. Feature engineering and model development", "6. Experiment tracking with MLflow", "7. Packaging, testing and CI/CD",
      "8. Containerisation and deployment", "9. Monitoring and logging", "10. Limitations and next steps", "11. Links"]
    .map((t) => new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [new TextRun({ text: t, font: FONT, size: 21 })] })),
  new Paragraph({ children: [new PageBreak()] }),

  // ---------- 1
  h1("1. Overview"),
  p("The goal is a classifier that estimates the probability that a patient has heart disease from 13 routine clinical measurements, delivered as a reproducible, tested, containerised and monitored REST API. Every stage — data, training, testing, packaging, deployment and monitoring — is scripted and runs from a clean checkout using requirements.txt."),
  table(["Requirement", "Implementation"], [
    ["Data + EDA", "heart.data (download/clean), heart.eda, notebooks/01_eda.ipynb"],
    ["Models + tuning", "LogReg, Random Forest, HistGradientBoosting; GridSearchCV, stratified 5-fold CV"],
    ["Experiment tracking", "MLflow: params, CV + hold-out metrics, plots, models, model registry"],
    ["Packaging", "Single sklearn Pipeline (preprocessing + model) → joblib + MLflow model"],
    ["CI/CD", "GitHub Actions: lint → test → train + quality gate → docker build/smoke → GHCR"],
    ["Serving", "FastAPI /predict (+ /predict/batch, /health, /metrics) in a non-root Docker image"],
    ["Deployment", "Kubernetes Deployment (2 replicas, probes, HPA), LoadBalancer + Ingress"],
    ["Monitoring", "Structured JSON request logs, Prometheus metrics, provisioned Grafana dashboard"],
  ], [2600, 6426]),
  gap(),
  h2("Architecture"),
  ...img("docs/architecture.png", 600, "Figure 1. System architecture"),

  // ---------- 2
  h1("2. Setup and installation"),
  p("Prerequisites: Python 3.11+ (3.12 used in CI and Docker), Git, Docker, and Minikube or Docker Desktop Kubernetes. The project was developed and verified in this environment:"),
  table(["Component", "Version / details"], [
    ["Lab VM", "Rocky Linux 9.5, 4 vCPU, 15 GB RAM (BITS Prayogshala)"],
    ["Python", "3.12.15 in a conda environment kept on the persistent workspace disk"],
    ["Docker", "28.0.1"],
    ["Kubernetes", "Minikube 1.35 (docker driver) running Kubernetes 1.32, kubectl 1.32"],
    ["CI", "GitHub Actions, ubuntu-latest runners, Python 3.12"],
    ["Source control", "Git; pushes from both the lab VM and a Windows laptop to one GitHub repository"],
  ], [2400, 6626]),
  gap(),
  ...codeBlock([
    "git clone https://github.com/2025ae05835/heart-mlops.git && cd heart-mlops",
    "python -m venv .venv && source .venv/bin/activate",
    "pip install -r requirements.txt",
    "export PYTHONPATH=src:.",
    "python -m heart.data --force   # download + clean",
    "python -m heart.eda            # figures",
    "python -m heart.train          # tune, compare, log to MLflow, save model",
    "pytest -v && flake8 src api test",
    "uvicorn api.main:app --port 8000",
  ]),
  p("A Makefile wraps these steps (make all). requirements.txt pins every version; the serving image uses the smaller requirements-serve.txt (no MLflow or plotting libraries), which keeps the image small and the attack surface low."),

  // ---------- 3
  h1("3. Data acquisition and cleaning"),
  p("Source: UCI Machine Learning Repository, Heart Disease dataset, Cleveland subset (processed.cleveland.data, 303 patients, 13 features + diagnosis). The download script fetches the official file. Because the UCI server is occasionally unreachable, a fallback downloads a public mirror of the same 303 records; that mirror uses a different integer coding for cp, restecg, slope, thal and an inverted target, so the code translates it back to the UCI coding (verified row-by-row and covered by a unit test)."),
  p("Cleaning decisions:"),
  bullet([r("Target: ", { bold: true }), r("the original num (0–4) is binarised to presence (num > 0) vs absence of disease.")]),
  bullet([r("Missing values: ", { bold: true }), r("ca (4 rows) and thal (2 rows) are '?' in the source. They are kept and imputed inside the model pipeline (median / most frequent) so training and serving apply identical logic.")]),
  bullet([r("Plausibility: ", { bold: true }), r("zero or negative blood pressure, cholesterol or heart rate are treated as missing rather than real values.")]),
  bullet([r("Readable categories: ", { bold: true }), r("nominal codes are mapped to labels (e.g. cp 4 → asymptomatic). This makes the API self-documenting and prevents the model from treating codes as ordered numbers.")]),
  bullet([r("Duplicates: ", { bold: true }), r("the official file contains no exact duplicates, so all 303 patients are kept (164 no disease, 139 disease).")]),

  // ---------- 4
  h1("4. Exploratory data analysis"),
  p("The classes are roughly balanced (54% / 46%), so accuracy is informative, but ROC-AUC is used for model selection because it is threshold-independent and reflects ranking of patients by risk."),
  ...img("reports/figures/01_class_balance.png", 260, "Figure 2. Class balance"),
  ...img("reports/figures/02_numeric_histograms.png", 600, "Figure 3. Numeric features by outcome"),
  p("Patients with disease have markedly lower maximum heart rate (thalach), higher exercise-induced ST depression (oldpeak) and more coloured vessels (ca). Cholesterol and resting blood pressure separate the classes only weakly."),
  ...img("reports/figures/03_categorical_disease_rate.png", 600, "Figure 4. Disease rate per category"),
  p("Asymptomatic chest pain (≈72% disease rate), reversible thalassemia defect, flat ST slope and exercise-induced angina are the strongest categorical signals."),
  ...img("reports/figures/04_correlation_heatmap.png", 470, "Figure 5. Correlation heatmap (one-hot encoded)"),
  table(["Feature", "Correlation with target", "Feature", "Correlation with target"], [
    ["cp_asymptomatic", "+0.52", "thal_normal", "−0.52"],
    ["thal_reversible_defect", "+0.48", "thalach", "−0.42"],
    ["ca", "+0.46", "slope_upsloping", "−0.39"],
    ["exang", "+0.43", "cp_non_anginal", "−0.32"],
    ["oldpeak", "+0.43", "cp_atypical_angina", "−0.25"],
  ], [2500, 2013, 2500, 2013]),
  gap(),
  p("No pair of input features is so strongly correlated that one should be dropped, so all 13 features are kept."),

  // ---------- 5
  h1("5. Feature engineering and model development"),
  h2("Preprocessing pipeline"),
  p("A scikit-learn ColumnTransformer handles three feature groups and is fitted inside each CV fold, which prevents information from the validation fold leaking into scaling or imputation:"),
  bullet("Numeric (age, trestbps, chol, thalach, oldpeak, ca): median imputation → StandardScaler."),
  bullet("Binary (sex, fbs, exang): most-frequent imputation, passed through."),
  bullet("Nominal (cp, restecg, slope, thal): most-frequent imputation → one-hot encoding with handle_unknown='ignore', so an unseen category at serving time does not crash the model."),
  h2("Models and tuning"),
  p("The data is split 80/20 (stratified, seed 42). Each candidate is tuned with GridSearchCV over stratified 5-fold CV on the training part, optimising ROC-AUC; the tuned configuration is then re-scored with the same folds on accuracy, precision, recall, F1 and ROC-AUC."),
  table(["Model", "Grid size", "Best parameters"], [
    ["Logistic Regression", "24", "C = 0.3, L2 (l1_ratio = 0), class_weight = balanced"],
    ["Random Forest", "48", "200 trees, max_depth = 5, min_samples_leaf = 3, max_features = sqrt"],
    ["HistGradientBoosting", "16", "learning_rate = 0.03, max_depth = 2, 100 iterations, L2 = 1.0"],
  ], [2400, 1100, 5526]),
  gap(),
  h2("Results"),
  table(["Model", "CV ROC-AUC", "CV Acc.", "CV F1", "Test ROC-AUC", "Test Acc.", "Test Recall"], [
    ["Logistic Regression", "0.907 ± 0.019", "0.855", "0.834", "0.961", "0.869", "0.929"],
    ["Random Forest", "0.902 ± 0.021", "0.814", "0.785", "0.955", "0.885", "0.929"],
    ["HistGradientBoosting", "0.894 ± 0.025", "0.834", "0.813", "0.948", "0.885", "0.893"],
  ], [2026, 1400, 1000, 1000, 1300, 1100, 1200], 0),
  gap(),
  ...img("reports/run_artifacts/roc_logistic_regression.png", 250, "Figure 6. Hold-out ROC curve, Logistic Regression"),
  ...img("reports/run_artifacts/importance_logistic_regression.png", 360, "Figure 7. Largest absolute coefficients, Logistic Regression"),
  h2("Model selection"),
  p("Logistic Regression has the best mean CV ROC-AUC (0.907) and the lowest variance across folds, and it also has the best hold-out ROC-AUC (0.961), so it was selected. Random Forest and Gradient Boosting reach slightly higher hold-out accuracy (0.885 vs 0.869), but with only 61 test patients that gap is a single patient, while ROC-AUC measures how well each model ranks every patient by risk. The three models are within about one standard deviation of each other, so the simplest model wins: its coefficients can be read directly (Figure 7): the largest belong to the number of coloured vessels, sex, the thalassemia result and asymptomatic chest pain, the same signals the EDA highlighted. class_weight = balanced favours recall, which reaches 0.929 on the hold-out. The selected configuration is finally refit on all 303 rows to produce the deployable model."),
  p("For a screening use case recall (catching true disease) matters more than precision; a natural next step is to lower the decision threshold below 0.5 and pick it from the precision-recall curve. The API already returns the raw probability and a risk band (low < 0.4 ≤ moderate < 0.7 ≤ high) so a clinician-facing client can apply its own threshold."),

  // ---------- 6
  h1("6. Experiment tracking with MLflow"),
  p("MLflow uses a local SQLite backend (mlflow.db), which also enables the model registry. Every model family is one run in experiment heart-disease, plus a final run for the refit model:"),
  bullet("Parameters: best hyperparameters, CV folds, test size, training rows; tags for model family, grid size and quick-mode."),
  bullet("Metrics: mean and standard deviation of CV accuracy, precision, recall, F1, ROC-AUC; hold-out metrics; training time."),
  bullet("Artifacts: ROC curve, confusion matrix, feature-importance chart, full GridSearchCV results CSV, model comparison table, model metadata."),
  bullet("Models: each tuned pipeline with signature and input example; the final model is registered as heart-disease-classifier (version per training run)."),
  p("MLflow 3 serialises scikit-learn models with skops instead of pickle. skops refuses to load object types it cannot verify, so the training code explicitly trusts only the three tree/dtype types produced by our own runs rather than switching back to unrestricted pickle."),
  p("Figure 8 shows the experiment after two separate training sessions. Every metric of the second session is identical to the first (for example CV ROC-AUC 0.90749 for Logistic Regression in both), which confirms that the pipeline is deterministic. The final_logistic_regression runs carry the registered model (heart-disease-classifier, versions 1 and 2) rather than metrics."),
  ...img("screenshots/01_mlflow_experiments.png", 560, "Figure 8. MLflow runs with CV and hold-out metrics (two identical training sessions)"),
  ...img("screenshots/02_mlflow_compare.png", 560, "Figure 9. MLflow compare view of the three tuned models"),
  ...img("screenshots/03_mlflow_artifacts.png", 500, "Figure 10. Artifacts logged with the Logistic Regression run"),

  // ---------- 7
  h1("7. Packaging, testing and CI/CD"),
  h2("Packaging and reproducibility"),
  bullet("models/heart_model.joblib holds the full Pipeline (imputers, scaler, encoder, classifier); the API never re-implements preprocessing."),
  bullet("models/model_metadata.json records model name, MLflow run id, parameters, metrics, feature list, training time and library versions."),
  bullet("All versions are pinned; fixed random seeds make CV splits and forests deterministic. Re-running the full training on a second machine from the GitHub repository reproduced every CV and hold-out score to three decimals."),
  h2("Unit tests (18, pytest)"),
  bullet("Data: UCI parsing and '?' handling, mirror-to-UCI mapping, label mapping, impossible values, duplicates, unknown categories."),
  bullet("Model: no NaNs after preprocessing, scaling, unseen categories, missing optional fields, output contract, better-than-chance AUC, save/load round trip."),
  bullet("API: /health, /predict response and request-id header, 422 on invalid input, batch endpoint, /metrics exposure. API tests use a small model trained on synthetic data so they do not depend on a prior training run."),
  ...img("screenshots/04_pytest_local.png", 540, "Figure 11. Lint and all 18 unit tests passing locally"),
  h2("GitHub Actions pipeline"),
  table(["Job", "What it does", "Artifacts"], [
    ["lint", "flake8 on src, api, test; errors annotated inline on the PR", "—"],
    ["test", "pytest -v with JUnit XML", "test-results"],
    ["train", "download → EDA → train; fails if CV ROC-AUC < 0.85", "model, reports, training.log, MLflow db"],
    ["docker", "build image, run it, curl /health, /predict, /metrics; push to GHCR on main", "prediction.json, container.log"],
  ], [1300, 4926, 2800]),
  gap(),
  p("Jobs are chained with needs, so any lint error, failing test or quality-gate miss stops the pipeline with a red run and a clear log."),
  ...img("screenshots/05_github_actions_run.png", 540, "Figure 12. Successful pipeline run on main: lint, test, train, docker (4 min 58 s)"),
  ...img("screenshots/06_github_actions_artifacts.png", 520, "Figure 13. Artifacts stored with the run"),
  p("To prove that the pipeline blocks bad code, a pull request with a deliberate style error was opened. The lint job failed after 6 seconds, the test, train and docker jobs were skipped, and GitHub marked the pull request as failing; it was closed without merging (Figure 14)."),
  ...img("screenshots/05b_pipeline_fails.png", 520, "Figure 14. Deliberate lint error in a pull request: pipeline fails, later jobs skipped"),

  // ---------- 8
  h1("8. Containerisation and deployment"),
  h2("Docker image"),
  p("Multi-stage build on python:3.12-slim: dependencies are installed into a virtualenv in a builder stage and copied into the runtime stage, which runs as a non-root user (uid 10001), exposes port 8000 and has a HEALTHCHECK on /health. One uvicorn worker per container keeps Prometheus counters consistent; scaling is done with replicas."),
  ...codeBlock([
    "docker build -t heart-api:latest .",
    "docker run --rm -p 8000:8000 heart-api:latest",
    "curl -X POST localhost:8000/predict -H 'Content-Type: application/json' -d @sample/patient.json",
    '{"prediction":1,"label":"heart_disease","probability_disease":0.9938,',
    ' "confidence":0.9938,"risk_band":"high","model_name":"logistic_regression","request_id":"..."}',
  ]),
  p("Input is validated with pydantic: numeric ranges (e.g. age 18–110, cholesterol 80–700) and allowed category values; violations return HTTP 422 with a field-level message. confidence is max(p, 1 − p)."),
  p("Running the image locally: the container reports healthy, /health returns the loaded model and its metrics, the high-risk and low-risk sample patients get 0.9938 and 0.0298, an invalid request gets HTTP 422, and every request is logged as one JSON line with its latency (Figure 15)."),
  ...img("screenshots/07_docker_build_run.png", 560, "Figure 15. Container test: health, two predictions, input validation and JSON logs"),
  h2("Kubernetes"),
  p("k8s/deployment.yaml creates namespace heart with a Deployment (2 replicas, rolling update with zero unavailable pods, CPU/memory requests and limits, readiness and liveness probes on /health, non-root security context), a LoadBalancer Service on port 80, and a HorizontalPodAutoscaler (2–5 replicas at 70% CPU). k8s/ingress.yaml optionally exposes the same service through NGINX Ingress at heart.local. scripts/deploy_k8s.sh builds the image inside Minikube and applies everything."),
  ...codeBlock([
    "minikube start --cpus 4 --memory 6g",
    "bash scripts/deploy_k8s.sh",
    "minikube tunnel                      # separate terminal",
    "kubectl -n heart get pods,svc",
    "curl -X POST http://<EXTERNAL-IP>/predict -H 'Content-Type: application/json' -d @sample/patient.json",
  ]),
  p("On Minikube, minikube tunnel assigns the LoadBalancer the external IP 10.96.111.167. Both API replicas, Prometheus and Grafana run in namespace heart, and /health and /predict answer through the LoadBalancer (Figure 16). The interactive Swagger UI at /docs is shown in Figure 17; note that the x-request-id header matches the request_id in the body, so a response can be traced to its log line."),
  ...img("screenshots/09_k8s_predict.png", 560, "Figure 16. Pods, services (LoadBalancer with external IP) and predictions through the LoadBalancer"),
  ...img("screenshots/10_swagger_ui.png", 470, "Figure 17. Swagger UI: POST /predict with HTTP 200 response"),

  // ---------- 9
  h1("9. Monitoring and logging"),
  p("Every request is logged to stdout as one JSON line (timestamp, request id, method, path, status, latency, client), and each prediction is logged with its probability and risk band. JSON logs can be read with kubectl logs and are ready for a log collector such as Loki or ELK. The request id is returned in the x-request-id header so a client error can be traced to a log line."),
  p("/metrics exposes Prometheus metrics: request counts by endpoint and status, a latency histogram, prediction counts by label and risk band, a histogram of predicted probabilities and a model-info gauge. In Kubernetes, Prometheus discovers the API pods through their prometheus.io annotations; Grafana is provisioned automatically with the datasource and a dashboard showing request rate, error rate, p50/p95/p99 latency and the distribution of predictions. A shift in the risk-band mix is a simple, label-free signal of data drift."),
  ...codeBlock([
    "python scripts/load_test.py --url http://<API_URL> --n 300   # 5% deliberately invalid",
    "kubectl -n heart port-forward svc/grafana 3000:3000",
  ]),
  p("Prometheus found both API pods automatically and scrapes each one separately (2/2 up, Figure 18), so counters are never mixed when the LoadBalancer spreads traffic. A load test of 1,500 requests, 5% of them deliberately invalid, produced the dashboard in Figure 19: 1,425 predictions, an error rate of 4.6% (the invalid requests, all rejected with HTTP 422) and a p95 latency of about 38 ms. The probability-distribution panel shows Prometheus histogram buckets, which are cumulative (each value counts predictions at or below that probability)."),
  ...img("screenshots/12_prometheus_targets.png", 560, "Figure 18. Prometheus targets: both heart-api pods discovered and UP"),
  ...img("screenshots/11_grafana_dashboard.png", 560, "Figure 19. Grafana dashboard during the load test"),
  ...img("screenshots/13_api_logs.png", 560, "Figure 20. Structured JSON request logs from both pods (kubectl logs)"),

  // ---------- 10
  h1("10. Limitations and next steps"),
  bullet("303 patients from a single hospital: performance estimates have wide uncertainty and may not transfer to other populations. The other UCI sites (Hungary, Switzerland, VA) could be used for external validation."),
  bullet("Decision threshold is fixed at 0.5; a recall-oriented threshold should be chosen with clinicians."),
  bullet("MLflow runs locally; a shared tracking server with object storage would support team use."),
  bullet("Monitoring covers service health and prediction distribution; ground-truth feedback would allow tracking real accuracy over time."),
  h1("11. Links"),
  bullet("Code repository: https://github.com/2025ae05835/heart-mlops"),
  bullet("Container image: ghcr.io/2025ae05835/heart-api:latest"),
  bullet("API access: local Minikube; run scripts/deploy_k8s.sh and minikube tunnel, then call http://<EXTERNAL-IP>/predict (Section 8)"),
  bullet("Video walkthrough: https://github.com/2025ae05835/heart-mlops/blob/main/video/2025ae05835.mp4"),
];

const doc = new Document({
  creator: "heart-mlops",
  title: "MLOps Assignment 1 - Heart Disease Risk Prediction",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: "1F3A5F" }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: "2E5A88" }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Page ", PageNumber.CURRENT], size: 18, color: "777777" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(path.join(ROOT, "docs/MLOps_Assignment1_Report.docx"), b);
  console.log("written", meta.model_name);
});
