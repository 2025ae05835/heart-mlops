"""Data acquisition and cleaning.

Usage:
    python -m heart.data            # download (if needed) + clean
    python -m heart.data --force    # re-download
"""
import argparse
import logging
import urllib.request
from io import StringIO

import numpy as np
import pandas as pd

from heart import config

log = logging.getLogger(__name__)

# Mirror file uses a different encoding of the same Cleveland records.
# Mapping verified row-by-row against the official UCI file.
_MIRROR_TO_UCI = {
    "cp": {0: 4, 1: 2, 2: 3, 3: 1},
    "restecg": {0: 2, 1: 0, 2: 1},
    "slope": {0: 3, 1: 2, 2: 1},
    "thal": {0: np.nan, 1: 6, 2: 3, 3: 7},
    "ca": {0: 0, 1: 1, 2: 2, 3: 3, 4: np.nan},
}


def _fetch(url: str, timeout: int = 30) -> str:
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read().decode("utf-8-sig")


def parse_uci(text: str) -> pd.DataFrame:
    """Parse the official processed.cleveland.data file ('?' = missing)."""
    df = pd.read_csv(StringIO(text), header=None, names=config.UCI_COLUMNS,
                     na_values="?")
    df["target"] = (df.pop("num") > 0).astype(int)
    return df


def parse_mirror(text: str) -> pd.DataFrame:
    """Parse the re-encoded mirror and convert it back to UCI codes."""
    df = pd.read_csv(StringIO(text))
    for col, mapping in _MIRROR_TO_UCI.items():
        df[col] = df[col].map(mapping)
    # In the mirror, target=1 means *no* disease; flip to UCI meaning.
    df["target"] = 1 - df["target"]
    return df[config.UCI_COLUMNS[:-1] + ["target"]]


def download(force: bool = False) -> pd.DataFrame:
    """Download raw data in UCI encoding and cache to data/raw."""
    config.RAW_DIR.mkdir(parents=True, exist_ok=True)
    if config.RAW_FILE.exists() and not force:
        log.info("Using cached raw file %s", config.RAW_FILE)
        return pd.read_csv(config.RAW_FILE)
    try:
        log.info("Downloading from UCI: %s", config.UCI_URL)
        df = parse_uci(_fetch(config.UCI_URL))
        source = "uci"
    except Exception as exc:  # network blocked, UCI down, ...
        log.warning("UCI download failed (%s); using mirror", exc)
        df = parse_mirror(_fetch(config.MIRROR_URL))
        source = "mirror"
    df.to_csv(config.RAW_FILE, index=False)
    log.info("Saved %d rows from %s to %s", len(df), source, config.RAW_FILE)
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Clean raw UCI-coded data.

    * drops exact duplicate rows
    * coerces numeric types, removes physiologically impossible values
      (e.g. resting BP or cholesterol of 0) by setting them to NaN
    * maps nominal codes to readable labels (unknown codes -> NaN)
    Missing values are *kept* and imputed inside the model pipeline so that
    the exact same logic is applied at training and serving time.
    """
    df = df.copy().drop_duplicates().reset_index(drop=True)
    for col in config.UCI_COLUMNS[:-1] + ["target"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ["trestbps", "chol", "thalach"]:
        df.loc[df[col] <= 0, col] = np.nan
    df.loc[df["oldpeak"] < 0, "oldpeak"] = np.nan

    df["cp"] = df["cp"].map(config.CP_LABELS)
    df["restecg"] = df["restecg"].map(config.RESTECG_LABELS)
    df["slope"] = df["slope"].map(config.SLOPE_LABELS)
    df["thal"] = df["thal"].map(config.THAL_LABELS)

    df = df.dropna(subset=["target"])
    df["target"] = df["target"].astype(int)
    return df[config.FEATURES + [config.TARGET]]


def load_clean() -> pd.DataFrame:
    if not config.CLEAN_FILE.exists():
        main([])
    return pd.read_csv(config.CLEAN_FILE)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="re-download even if cached")
    args = parser.parse_args(argv)
    raw = download(force=args.force)
    df = clean(raw)
    config.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(config.CLEAN_FILE, index=False)
    log.info("Clean dataset: %d rows, %d missing cells -> %s",
             len(df), int(df.isna().sum().sum()), config.CLEAN_FILE)
    return df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    main()
