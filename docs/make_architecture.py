"""Draws docs/architecture.png (run: python docs/make_architecture.py)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

fig, ax = plt.subplots(figsize=(14, 7.5))
ax.set_xlim(0, 14); ax.set_ylim(0, 7.5); ax.axis("off")
C = {"data": "#e9f5f3", "ml": "#fdf0e6", "ci": "#eef1fb", "run": "#f3eefb", "mon": "#fdf7e3"}

def box(x, y, w, h, title, body, color):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                fc=color, ec="#3d4451", lw=1.2))
    ax.text(x + w / 2, y + h - 0.25, title, ha="center", va="top", fontsize=10.5, weight="bold")
    ax.text(x + w / 2, y + h - 0.6, body, ha="center", va="top", fontsize=8.5, color="#333", linespacing=1.35)

def arrow(x1, y1, x2, y2, label="", lx=None, ly=None):
    ax.annotate("", (x2, y2), (x1, y1), arrowprops=dict(arrowstyle="-|>", color="#3d4451", lw=1.3))
    if label:
        ax.text(lx if lx is not None else (x1 + x2) / 2,
                ly if ly is not None else (y1 + y2) / 2 + 0.12, label, ha="center", fontsize=8, color="#555")

def group(x, y, w, h, label):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.15",
                                fc="none", ec="#9aa1ad", lw=1, ls="--"))
    ax.text(x + 0.15, y + h - 0.12, label, fontsize=9, color="#6b7280", va="top", style="italic")

group(0.2, 3.9, 6.6, 3.4, "Development / training")
box(0.4, 5.3, 1.9, 1.6, "UCI repository", "processed.cleveland\n.data (303 rows)", C["data"])
box(2.6, 5.3, 1.9, 1.6, "heart.data", "download, clean,\nreadable labels\n→ heart_clean.csv", C["data"])
box(4.8, 5.3, 1.8, 1.6, "heart.eda", "histograms, heatmap,\nclass balance", C["data"])
box(2.6, 4.05, 4.0, 1.05, "heart.train", "sklearn Pipeline (impute → scale / one-hot → model)\nGridSearchCV · 5-fold CV · LR / RF / HGB", C["ml"])
arrow(2.3, 6.1, 2.6, 6.1); arrow(4.5, 6.1, 4.8, 6.1); arrow(3.55, 5.3, 3.55, 5.1)

box(7.3, 5.7, 2.6, 1.5, "MLflow", "params · metrics · plots\nmodels · registry\n(sqlite + mlruns/)", C["ml"])
box(7.3, 3.95, 2.6, 1.4, "Model artefact", "heart_model.joblib\n+ model_metadata.json", C["ml"])
arrow(6.6, 4.9, 7.3, 6.0); ax.text(7.0, 5.25, "log\nruns", fontsize=8, color="#555", ha="center")
arrow(6.6, 4.45, 7.3, 4.55)

group(10.3, 3.9, 3.5, 3.4, "GitHub Actions (on push / PR)")
box(10.5, 4.1, 3.1, 2.75, "CI/CD pipeline",
    "1. lint (flake8)\n2. pytest (data, model, API)\n3. download + EDA + train\n4. quality gate AUC ≥ 0.85\n5. docker build + smoke test\n6. push image → GHCR\nartefacts uploaded each run", C["ci"])
arrow(9.9, 4.65, 10.5, 5.3); ax.text(10.1, 4.3, "git\npush", fontsize=8, color="#555", ha="center")

group(0.2, 0.2, 13.75, 3.4, "Kubernetes (Minikube / Docker Desktop / cloud) · namespace heart")
box(0.5, 0.5, 2.0, 2.6, "Client", "curl / Swagger UI\nload_test.py\nJSON patient", C["run"])
box(3.0, 1.9, 2.1, 1.2, "LoadBalancer\n/ Ingress", "", C["run"])
box(5.5, 0.5, 3.7, 2.6, "heart-api Deployment", "FastAPI + uvicorn, 2-5 replicas (HPA)\n/predict · /predict/batch\n/health (probes) · /metrics\nJSON request logs to stdout", C["run"])
arrow(2.5, 2.5, 3.0, 2.5, "HTTP"); arrow(5.1, 2.5, 5.5, 2.5)
box(10.0, 0.5, 1.75, 2.6, "Prometheus", "scrapes pods\nvia annotations", C["mon"])
box(12.05, 0.5, 1.75, 2.6, "Grafana", "traffic, errors,\nlatency p95,\nrisk-band drift", C["mon"])
arrow(9.2, 1.8, 10.0, 1.8, "scrape"); arrow(11.75, 1.8, 12.05, 1.8)
arrow(12.05, 4.1, 8.4, 3.1); ax.text(10.9, 3.35, "docker image (GHCR)", fontsize=8, color="#555", ha="center")
ax.set_title("Heart Disease Risk API — MLOps architecture", fontsize=14, weight="bold", pad=8)
fig.savefig("docs/architecture.png", dpi=150, bbox_inches="tight")
