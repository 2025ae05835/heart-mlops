// Builds docs/MLOps_Assignment1_Report.docx  (node docs/build_report.js)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow,
  TableCell, WidthType, ShadingType, AlignmentType, LevelFormat, PageBreak,
  BorderStyle, Footer, PageNumber, TableOfContents,
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
  new Paragraph({ spacing: { before: 2200, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Machine Learning Operations (AIMLCZG523)", font: FONT, size: 28, color: "1F3A5F" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Assignment 01 — Heart Disease Risk Prediction", font: FONT, size: 44, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 },
    children: [new TextRun({ text: "End-to-end ML development, CI/CD and production deployment", font: FONT, size: 26, color: "555555" })] }),
  ...[["Name", "[Your full name]"], ["BITS ID", "[Your BITS ID]"], ["Repository", "https://github.com/<your-user>/heart-mlops"],
      ["Deployed API / access", "See Section 8"], ["Video walkthrough", "[link to recording]"], ["Date", "October 2026"]]
    .map(([k, v]) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: `${k}: `, bold: true, font: FONT, size: 24 }), new TextRun({ text: v, font: FONT, size: 24 })] })),
  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  p([r("Right-click the table above → Update Field to refresh page numbers after inserting screenshots.", { italics: true, size: 18, color: "777777" })]),
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
  p("Prerequisites: Python 3.11+ (3.12 used in CI and Docker), Git, Docker, and Minikube or Docker Desktop Kubernetes."),
  ...codeBlock([
    "git clone https://github.com/<your-user>/heart-mlops.git && cd heart-mlops",
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
  bullet([r("Duplicates: ", { bold: true }), r("one exact duplicate row was removed, leaving 302 rows (164 no disease, 138 disease).")]),

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
    ["cp_asymptomatic", "+0.52", "thal_normal", "−0.53"],
    ["thal_reversible_defect", "+0.49", "thalach", "−0.42"],
    ["ca", "+0.46", "slope_upsloping", "−0.39"],
    ["exang", "+0.44", "cp_non_anginal", "−0.31"],
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
    ["Logistic Regression", "24", "C = 0.1, L2, class_weight = balanced"],
    ["Random Forest", "48", "200 trees, max_depth = None, min_samples_leaf = 5, max_features = sqrt"],
    ["HistGradientBoosting", "16", "learning_rate = 0.03, max_depth = 2, 100 iterations, no L2"],
  ], [2400, 1100, 5526]),
  gap(),
  h2("Results"),
  table(["Model", "CV ROC-AUC", "CV Acc.", "CV F1", "Test ROC-AUC", "Test Acc.", "Test Recall"], [
    ["Logistic Regression", "0.909 ± 0.036", "0.830", "0.814", "0.921", "0.852", "0.821"],
    ["Random Forest", "0.917 ± 0.029", "0.842", "0.827", "0.889", "0.787", "0.714"],
    ["HistGradientBoosting", "0.895 ± 0.032", "0.822", "0.802", "0.896", "0.820", "0.714"],
  ], [2026, 1400, 1000, 1000, 1300, 1100, 1200], 1),
  gap(),
  ...img("reports/run_artifacts/roc_random_forest.png", 260, "Figure 6. Hold-out ROC curve, Random Forest"),
  h2("Model selection"),
  p("Random Forest has the best mean CV ROC-AUC and the lowest variance across folds, so it was selected. The 61-patient hold-out favours Logistic Regression, but with so few test patients one or two misclassifications move accuracy by 2–3 points; the five-fold CV estimate (on 241 patients) is the more reliable basis. The two models are within one standard deviation of each other, so Logistic Regression is a defensible, more interpretable alternative — this trade-off is recorded in MLflow for review. The selected configuration is finally refit on all 302 rows to produce the deployable model."),
  p("For a screening use case recall (catching true disease) matters more than precision; a natural next step is to lower the decision threshold below 0.5 and pick it from the precision-recall curve. The API already returns the raw probability and a risk band (low < 0.4 ≤ moderate < 0.7 ≤ high) so a clinician-facing client can apply its own threshold."),

  // ---------- 6
  h1("6. Experiment tracking with MLflow"),
  p("MLflow uses a local SQLite backend (mlflow.db), which also enables the model registry. Every model family is one run in experiment heart-disease, plus a final run for the refit model:"),
  bullet("Parameters: best hyperparameters, CV folds, test size, training rows; tags for model family, grid size and quick-mode."),
  bullet("Metrics: mean and standard deviation of CV accuracy, precision, recall, F1, ROC-AUC; hold-out metrics; training time."),
  bullet("Artifacts: ROC curve, confusion matrix, feature-importance chart, full GridSearchCV results CSV, model comparison table, model metadata."),
  bullet("Models: each tuned pipeline with signature and input example; the final model is registered as heart-disease-classifier (version per training run)."),
  p("MLflow 3 serialises scikit-learn models with skops instead of pickle. skops refuses to load object types it cannot verify, so the training code explicitly trusts only the three tree/dtype types produced by our own runs rather than switching back to unrestricted pickle."),
  placeholder("01_mlflow_experiments.png", "MLflow run list with metric columns"),
  placeholder("02_mlflow_compare.png", "MLflow compare view of the three runs"),

  // ---------- 7
  h1("7. Packaging, testing and CI/CD"),
  h2("Packaging and reproducibility"),
  bullet("models/heart_model.joblib holds the full Pipeline (imputers, scaler, encoder, classifier); the API never re-implements preprocessing."),
  bullet("models/model_metadata.json records model name, MLflow run id, parameters, metrics, feature list, training time and library versions."),
  bullet("All versions are pinned; fixed random seeds make CV splits and forests deterministic."),
  h2("Unit tests (18, pytest)"),
  bullet("Data: UCI parsing and '?' handling, mirror-to-UCI mapping, label mapping, impossible values, duplicates, unknown categories."),
  bullet("Model: no NaNs after preprocessing, scaling, unseen categories, missing optional fields, output contract, better-than-chance AUC, save/load round trip."),
  bullet("API: /health, /predict response and request-id header, 422 on invalid input, batch endpoint, /metrics exposure. API tests use a small model trained on synthetic data so they do not depend on a prior training run."),
  h2("GitHub Actions pipeline"),
  table(["Job", "What it does", "Artifacts"], [
    ["lint", "flake8 on src, api, test; errors annotated inline on the PR", "—"],
    ["test", "pytest -v with JUnit XML", "test-results"],
    ["train", "download → EDA → train; fails if CV ROC-AUC < 0.85", "model, reports, training.log, MLflow db"],
    ["docker", "build image, run it, curl /health, /predict, /metrics; push to GHCR on main", "prediction.json, container.log"],
  ], [1300, 4926, 2800]),
  gap(),
  p("Jobs are chained with needs, so any lint error, failing test or quality-gate miss stops the pipeline with a red run and a clear log."),
  placeholder("05_github_actions_run.png", "workflow run with all four jobs green"),
  placeholder("06_github_actions_artifacts.png", "artifacts listed at the bottom of the run"),

  // ---------- 8
  h1("8. Containerisation and deployment"),
  h2("Docker image"),
  p("Multi-stage build on python:3.12-slim: dependencies are installed into a virtualenv in a builder stage and copied into the runtime stage, which runs as a non-root user (uid 10001), exposes port 8000 and has a HEALTHCHECK on /health. One uvicorn worker per container keeps Prometheus counters consistent; scaling is done with replicas."),
  ...codeBlock([
    "docker build -t heart-api:latest .",
    "docker run --rm -p 8000:8000 heart-api:latest",
    "curl -X POST localhost:8000/predict -H 'Content-Type: application/json' -d @sample/patient.json",
    '{"prediction":1,"label":"heart_disease","probability_disease":0.9948,',
    ' "confidence":0.9948,"risk_band":"high","model_name":"random_forest","request_id":"3ff073d7f3f5"}',
  ]),
  p("Input is validated with pydantic: numeric ranges (e.g. age 18–110, cholesterol 80–700) and allowed category values; violations return HTTP 422 with a field-level message. confidence is max(p, 1 − p)."),
  placeholder("07_docker_build_run.png", "docker build, docker run and the curl response"),
  h2("Kubernetes"),
  p("k8s/deployment.yaml creates namespace heart with a Deployment (2 replicas, rolling update with zero unavailable pods, CPU/memory requests and limits, readiness and liveness probes on /health, non-root security context), a LoadBalancer Service on port 80, and a HorizontalPodAutoscaler (2–5 replicas at 70% CPU). k8s/ingress.yaml optionally exposes the same service through NGINX Ingress at heart.local. scripts/deploy_k8s.sh builds the image inside Minikube and applies everything."),
  ...codeBlock([
    "minikube start --cpus 4 --memory 6g",
    "bash scripts/deploy_k8s.sh",
    "minikube tunnel                      # separate terminal",
    "kubectl -n heart get pods,svc",
    "curl -X POST http://<EXTERNAL-IP>/predict -H 'Content-Type: application/json' -d @sample/patient.json",
  ]),
  placeholder("08_k8s_pods_svc.png", "pods Running and the LoadBalancer EXTERNAL-IP"),
  placeholder("09_k8s_predict.png", "prediction returned through the LoadBalancer / Ingress"),
  placeholder("10_swagger_ui.png", "Swagger UI /docs with an executed /predict call"),

  // ---------- 9
  h1("9. Monitoring and logging"),
  p("Every request is logged to stdout as one JSON line (timestamp, request id, method, path, status, latency, client), and each prediction is logged with its probability and risk band. JSON logs can be read with kubectl logs and are ready for a log collector such as Loki or ELK. The request id is returned in the x-request-id header so a client error can be traced to a log line."),
  p("/metrics exposes Prometheus metrics: request counts by endpoint and status, a latency histogram, prediction counts by label and risk band, a histogram of predicted probabilities and a model-info gauge. In Kubernetes, Prometheus discovers the API pods through their prometheus.io annotations; Grafana is provisioned automatically with the datasource and a dashboard showing request rate, error rate, p50/p95/p99 latency and the distribution of predictions. A shift in the risk-band mix is a simple, label-free signal of data drift."),
  ...codeBlock([
    "python scripts/load_test.py --url http://<API_URL> --n 300   # 5% deliberately invalid",
    "kubectl -n heart port-forward svc/grafana 3000:3000",
  ]),
  placeholder("11_grafana_dashboard.png", "Grafana dashboard after the load test"),
  placeholder("12_prometheus_targets.png", "Prometheus targets showing API pods UP"),
  placeholder("13_api_logs.png", "JSON request logs from kubectl logs"),

  // ---------- 10
  h1("10. Limitations and next steps"),
  bullet("303 patients from a single hospital: performance estimates have wide uncertainty and may not transfer to other populations. The other UCI sites (Hungary, Switzerland, VA) could be used for external validation."),
  bullet("Decision threshold is fixed at 0.5; a recall-oriented threshold should be chosen with clinicians."),
  bullet("MLflow runs locally; a shared tracking server with object storage would support team use."),
  bullet("Monitoring covers service health and prediction distribution; ground-truth feedback would allow tracking real accuracy over time."),
  h1("11. Links"),
  bullet("Code repository: https://github.com/<your-user>/heart-mlops"),
  bullet("Container image: ghcr.io/<your-user>/heart-api:latest"),
  bullet("API access: see Section 8 (Minikube LoadBalancer / Ingress)"),
  bullet("Video walkthrough: [link]"),
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
  features: { updateFields: true },
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
