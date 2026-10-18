import numpy as np
import pandas as pd

from heart import config
from heart.data import clean, parse_mirror, parse_uci


def test_parse_uci_binarises_target_and_reads_missing(raw_uci_text):
    df = parse_uci(raw_uci_text)
    assert len(df) == 5
    assert "num" not in df.columns
    assert df["target"].tolist() == [0, 1, 1, 0, 0]
    assert df["ca"].isna().sum() == 1
    assert df["thal"].isna().sum() == 1


def test_parse_mirror_matches_uci_encoding():
    mirror = ("age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,"
              "slope,ca,thal,target\n"
              "63,1,3,145,233,1,0,150,0,2.3,0,0,1,1\n"
              "37,1,2,130,250,0,1,187,0,3.5,0,4,0,1\n")
    df = parse_mirror(mirror)
    row = df.iloc[0]
    assert (row.cp, row.restecg, row.slope, row.thal, row.target) == \
        (1, 2, 3, 6, 0)
    assert np.isnan(df.iloc[1].ca) and np.isnan(df.iloc[1].thal)


def test_clean_maps_labels_and_flags_impossible_values(raw_uci_text):
    df = clean(parse_uci(raw_uci_text))
    assert list(df.columns) == config.FEATURES + [config.TARGET]
    assert df.loc[0, "cp"] == "typical_angina"
    assert df.loc[1, "thal"] == "normal"
    assert pd.isna(df.loc[4, "chol"])  # cholesterol 0 is impossible
    assert set(df["target"].unique()) <= {0, 1}


def test_clean_removes_duplicates(raw_uci_text):
    raw = parse_uci(raw_uci_text)
    doubled = pd.concat([raw, raw])
    assert len(clean(doubled)) == len(raw)


def test_clean_unknown_category_becomes_missing(raw_uci_text):
    raw = parse_uci(raw_uci_text)
    raw.loc[0, "cp"] = 9
    assert pd.isna(clean(raw).loc[0, "cp"])
