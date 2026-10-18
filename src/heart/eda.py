"""Exploratory data analysis: writes figures + a summary to reports/.

Usage: python -m heart.eda
"""
import json
import logging

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402
import seaborn as sns  # noqa: E402

from heart import config  # noqa: E402
from heart.data import load_clean  # noqa: E402

log = logging.getLogger(__name__)

PALETTE = {0: "#2a9d8f", 1: "#e76f51"}
LABELS = {0: "No disease", 1: "Disease"}


def _save(fig, name):
    config.FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = config.FIGURES_DIR / name
    fig.savefig(path, dpi=140, bbox_inches="tight")
    plt.close(fig)
    log.info("saved %s", path)
    return path


def class_balance(df):
    counts = df[config.TARGET].map(LABELS).value_counts()
    fig, ax = plt.subplots(figsize=(5, 4))
    bars = ax.bar(counts.index, counts.values,
                  color=[PALETTE[0], PALETTE[1]])
    for b in bars:
        ax.annotate(f"{int(b.get_height())} "
                    f"({b.get_height() / len(df):.0%})",
                    (b.get_x() + b.get_width() / 2, b.get_height()),
                    ha="center", va="bottom")
    ax.set_title("Class balance")
    ax.set_ylabel("Patients")
    ax.spines[["top", "right"]].set_visible(False)
    return _save(fig, "01_class_balance.png")


def numeric_histograms(df):
    cols = config.NUMERIC_FEATURES
    fig, axes = plt.subplots(2, 3, figsize=(14, 7))
    for ax, col in zip(axes.ravel(), cols):
        for t in (0, 1):
            ax.hist(df.loc[df.target == t, col].dropna(), bins=20,
                    alpha=0.6, color=PALETTE[t], label=LABELS[t])
        ax.set_title(col)
        ax.spines[["top", "right"]].set_visible(False)
    axes[0, 0].legend()
    fig.suptitle("Numeric feature distributions by outcome", y=1.01)
    fig.tight_layout()
    return _save(fig, "02_numeric_histograms.png")


def categorical_rates(df):
    cols = config.CATEGORICAL_FEATURES + config.BINARY_FEATURES
    fig, axes = plt.subplots(2, 4, figsize=(16, 7))
    for ax, col in zip(axes.ravel(), cols):
        rate = df.groupby(col)[config.TARGET].mean().sort_values()
        ax.barh(rate.index.astype(str), rate.values, color="#264653")
        ax.set_xlim(0, 1)
        ax.set_title(f"{col}: disease rate")
        ax.spines[["top", "right"]].set_visible(False)
    axes.ravel()[-1].axis("off")
    fig.tight_layout()
    return _save(fig, "03_categorical_disease_rate.png")


def correlation_heatmap(df):
    enc = pd.get_dummies(df, columns=config.CATEGORICAL_FEATURES,
                         dtype=float)
    corr = enc.corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(13, 11))
    sns.heatmap(corr, cmap="RdBu_r", center=0, vmin=-1, vmax=1,
                square=True, linewidths=0.3, ax=ax,
                cbar_kws={"shrink": 0.7})
    ax.set_title("Correlation heatmap (one-hot encoded)")
    _save(fig, "04_correlation_heatmap.png")
    return corr[config.TARGET].drop(config.TARGET).sort_values()


def boxplots(df):
    fig, axes = plt.subplots(1, 3, figsize=(13, 4))
    for ax, col in zip(axes, ["thalach", "oldpeak", "age"]):
        sns.boxplot(data=df, x=df.target.map(LABELS), y=col, ax=ax,
                    hue=df.target.map(LABELS),
                    palette=[PALETTE[0], PALETTE[1]], legend=False)
        ax.set_xlabel("")
        ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    return _save(fig, "05_key_feature_boxplots.png")


def missing_values(df):
    miss = df.isna().sum()
    miss = miss[miss > 0]
    fig, ax = plt.subplots(figsize=(5, 3))
    ax.bar(miss.index, miss.values, color="#e9c46a")
    ax.set_title("Missing values per column (imputed in pipeline)")
    ax.spines[["top", "right"]].set_visible(False)
    return _save(fig, "00_missing_values.png")


def main():
    df = load_clean()
    missing_values(df)
    class_balance(df)
    numeric_histograms(df)
    categorical_rates(df)
    target_corr = correlation_heatmap(df)
    boxplots(df)
    summary = {
        "rows": int(len(df)),
        "missing": {k: int(v) for k, v in df.isna().sum().items() if v},
        "class_balance": df.target.value_counts().to_dict(),
        "top_correlations_with_target": target_corr.round(3).to_dict(),
        "describe": df.describe().round(2).to_dict(),
    }
    out = config.FIGURES_DIR.parent / "eda_summary.json"
    out.write_text(json.dumps(summary, indent=2, default=str))
    log.info("EDA summary -> %s", out)
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    main()
