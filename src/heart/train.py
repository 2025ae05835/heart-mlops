"""Train, tune and compare classifiers with MLflow tracking.

Every candidate model is tuned with GridSearchCV (stratified 5-fold CV,
optimising ROC-AUC). Each model is one MLflow run with its parameters,
CV + hold-out metrics, plots and the fitted pipeline. The best model by CV
ROC-AUC is saved to models/ (joblib) and registered in MLflow.

Usage:
    python -m heart.train                  # full grid
    python -m heart.train --quick          # small grid (CI)
"""
import argparse
import json
import logging
import os
import platform
import time

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import mlflow  # noqa: E402
import mlflow.sklearn  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import sklearn  # noqa: E402
from mlflow.models import infer_signature  # noqa: E402
from sklearn.ensemble import (HistGradientBoostingClassifier,  # noqa: E402
                              RandomForestClassifier)
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (ConfusionMatrixDisplay, RocCurveDisplay,  # noqa
                             accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import (GridSearchCV,  # noqa: E402
                                     StratifiedKFold, cross_validate,
                                     train_test_split)

from heart import config  # noqa: E402
from heart.data import load_clean  # noqa: E402
from heart.features import build_pipeline  # noqa: E402

log = logging.getLogger(__name__)

# MLflow 3 stores sklearn models with skops (safer than pickle); these
# types are produced by our own training run, so they are trusted.
SKOPS_TRUSTED = [
    "numpy.dtype",
    "sklearn.tree._tree.Tree",
    "sklearn.ensemble._hist_gradient_boosting.predictor.TreePredictor",
]

SCORING = {
    "accuracy": "accuracy",
    "precision": "precision",
    "recall": "recall",
    "f1": "f1",
    "roc_auc": "roc_auc",
}


def candidates(quick: bool = False):
    """Model name -> (estimator, param grid)."""
    rs = config.RANDOM_STATE
    if quick:
        return {
            "logistic_regression": (
                LogisticRegression(max_iter=2000),
                {"model__C": [0.1, 1.0]}),
            "random_forest": (
                RandomForestClassifier(random_state=rs, n_jobs=-1),
                {"model__n_estimators": [100], "model__max_depth": [4]}),
        }
    return {
        "logistic_regression": (
            LogisticRegression(max_iter=5000, solver="liblinear"),
            {"model__C": [0.01, 0.03, 0.1, 0.3, 1.0, 3.0],
             "model__penalty": ["l1", "l2"],
             "model__class_weight": [None, "balanced"]}),
        "random_forest": (
            RandomForestClassifier(random_state=rs, n_jobs=-1),
            {"model__n_estimators": [200, 400],
             "model__max_depth": [3, 5, 8, None],
             "model__min_samples_leaf": [1, 3, 5],
             "model__max_features": ["sqrt", 0.5]}),
        "hist_gradient_boosting": (
            HistGradientBoostingClassifier(random_state=rs),
            {"model__learning_rate": [0.03, 0.1],
             "model__max_depth": [2, 3],
             "model__max_iter": [100, 200],
             "model__l2_regularization": [0.0, 1.0]}),
    }


def holdout_metrics(model, X, y):
    proba = model.predict_proba(X)[:, 1]
    pred = (proba >= 0.5).astype(int)
    return {
        "test_accuracy": accuracy_score(y, pred),
        "test_precision": precision_score(y, pred, zero_division=0),
        "test_recall": recall_score(y, pred),
        "test_f1": f1_score(y, pred),
        "test_roc_auc": roc_auc_score(y, proba),
    }


def save_plots(name, model, X_test, y_test, search, outdir):
    paths = []
    fig, ax = plt.subplots(figsize=(5, 4))
    RocCurveDisplay.from_estimator(model, X_test, y_test, ax=ax, name=name)
    ax.plot([0, 1], [0, 1], "--", color="grey")
    ax.set_title(f"ROC curve (hold-out) - {name}")
    p = outdir / f"roc_{name}.png"
    fig.savefig(p, dpi=120, bbox_inches="tight")
    plt.close(fig)
    paths.append(p)

    fig, ax = plt.subplots(figsize=(4.5, 4))
    ConfusionMatrixDisplay.from_estimator(
        model, X_test, y_test, ax=ax, cmap="Blues",
        display_labels=["No disease", "Disease"], colorbar=False)
    ax.set_title(f"Confusion matrix - {name}")
    p = outdir / f"confusion_{name}.png"
    fig.savefig(p, dpi=120, bbox_inches="tight")
    plt.close(fig)
    paths.append(p)

    imp = feature_importance(model)
    if imp is not None:
        top = imp.head(15)[::-1]
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.barh(top.index, top.values, color="#264653")
        ax.set_title(f"Top features - {name}")
        p = outdir / f"importance_{name}.png"
        fig.savefig(p, dpi=120, bbox_inches="tight")
        plt.close(fig)
        paths.append(p)

    cvres = pd.DataFrame(search.cv_results_)
    p = outdir / f"cv_results_{name}.csv"
    cvres.to_csv(p, index=False)
    paths.append(p)
    return paths


def feature_importance(model):
    names = model.named_steps["prep"].get_feature_names_out()
    est = model.named_steps["model"]
    if hasattr(est, "coef_"):
        vals = np.abs(est.coef_[0])
    elif hasattr(est, "feature_importances_"):
        vals = est.feature_importances_
    else:
        return None
    return pd.Series(vals, index=names).sort_values(ascending=False)


def run(quick: bool = False, experiment: str = "heart-disease"):
    df = load_clean()
    X, y = df[config.FEATURES], df[config.TARGET]
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=config.TEST_SIZE, stratify=y,
        random_state=config.RANDOM_STATE)
    cv = StratifiedKFold(config.CV_FOLDS, shuffle=True,
                         random_state=config.RANDOM_STATE)

    if not os.environ.get("MLFLOW_TRACKING_URI"):
        mlflow.set_tracking_uri(f"sqlite:///{config.ROOT / 'mlflow.db'}")
    mlflow.set_experiment(experiment)
    tmp = config.ROOT / "reports" / "run_artifacts"
    tmp.mkdir(parents=True, exist_ok=True)
    results = []

    for name, (est, grid) in candidates(quick).items():
        with mlflow.start_run(run_name=name) as run_:
            t0 = time.time()
            search = GridSearchCV(build_pipeline(est), grid, cv=cv,
                                  scoring="roc_auc", n_jobs=-1, refit=True)
            search.fit(X_tr, y_tr)
            best = search.best_estimator_

            # Re-evaluate the tuned config on all metrics with the same folds
            cvs = cross_validate(best, X_tr, y_tr, cv=cv, scoring=SCORING)
            cv_metrics = {f"cv_{k}_mean": float(np.mean(cvs[f"test_{k}"]))
                          for k in SCORING}
            cv_metrics.update({f"cv_{k}_std": float(np.std(cvs[f"test_{k}"]))
                               for k in SCORING})
            test_metrics = holdout_metrics(best, X_te, y_te)

            mlflow.set_tags({"model_family": name,
                             "grid_size": len(search.cv_results_["params"]),
                             "quick_mode": quick})
            mlflow.log_params({k.replace("model__", ""): v
                               for k, v in search.best_params_.items()})
            mlflow.log_params({"cv_folds": config.CV_FOLDS,
                               "test_size": config.TEST_SIZE,
                               "n_train": len(X_tr)})
            mlflow.log_metrics({**cv_metrics, **test_metrics,
                                "train_seconds": time.time() - t0})
            for p in save_plots(name, best, X_te, y_te, search, tmp):
                mlflow.log_artifact(str(p), artifact_path="plots")
            mlflow.sklearn.log_model(
                best, name="model",
                signature=infer_signature(X_tr, best.predict_proba(X_tr)),
                input_example=X_tr.head(3),
                skops_trusted_types=SKOPS_TRUSTED)

            results.append({"name": name, "run_id": run_.info.run_id,
                            "best_params": search.best_params_,
                            **cv_metrics, **test_metrics, "model": best})
            log.info("%-24s CV ROC-AUC %.3f | test ROC-AUC %.3f acc %.3f",
                     name, cv_metrics["cv_roc_auc_mean"],
                     test_metrics["test_roc_auc"],
                     test_metrics["test_accuracy"])

    # Select by cross-validated ROC-AUC (hold-out is only for reporting)
    winner = max(results, key=lambda r: r["cv_roc_auc_mean"])
    log.info("Selected model: %s", winner["name"])

    # Refit selected config on ALL data for the deployable artefact
    final = winner["model"]
    final.fit(X, y)
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final, config.MODEL_FILE)

    meta = {
        "model_name": winner["name"],
        "mlflow_run_id": winner["run_id"],
        "best_params": winner["best_params"],
        "metrics": {k: round(v, 4) for k, v in winner.items()
                    if k.startswith(("cv_", "test_"))},
        "features": config.FEATURES,
        "trained_rows": int(len(X)),
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sklearn_version": sklearn.__version__,
        "python_version": platform.python_version(),
    }
    config.METADATA_FILE.write_text(json.dumps(meta, indent=2, default=str))

    comparison = pd.DataFrame([{k: v for k, v in r.items()
                                if k not in ("model", "best_params")}
                               for r in results])
    comp_path = config.ROOT / "reports" / "model_comparison.csv"
    comparison.round(4).to_csv(comp_path, index=False)

    with mlflow.start_run(run_name=f"final_{winner['name']}"):
        mlflow.set_tag("stage", "final_refit_all_data")
        mlflow.log_params({k.replace("model__", ""): v
                           for k, v in winner["best_params"].items()})
        mlflow.log_artifact(str(comp_path))
        mlflow.log_artifact(str(config.METADATA_FILE))
        mlflow.sklearn.log_model(
            final, name="model",
            registered_model_name="heart-disease-classifier",
            signature=infer_signature(X, final.predict_proba(X)),
            input_example=X.head(3),
            skops_trusted_types=SKOPS_TRUSTED)
    return comparison, meta


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true",
                        help="tiny grid for CI smoke-training")
    parser.add_argument("--experiment", default="heart-disease")
    args = parser.parse_args(argv)
    comparison, meta = run(args.quick, args.experiment)
    print(comparison.drop(columns=["run_id"]).round(3).to_string(index=False))
    print(f"\nSaved {meta['model_name']} -> {config.MODEL_FILE}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    main()
