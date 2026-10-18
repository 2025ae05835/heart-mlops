"""Central project configuration: paths, feature lists and constants."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = ROOT / "models"
FIGURES_DIR = ROOT / "reports" / "figures"

RAW_FILE = RAW_DIR / "heart_raw.csv"
CLEAN_FILE = PROCESSED_DIR / "heart_clean.csv"
MODEL_FILE = MODELS_DIR / "heart_model.joblib"
METADATA_FILE = MODELS_DIR / "model_metadata.json"

# Official UCI source (Cleveland subset, the one used in almost all literature).
UCI_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "heart-disease/processed.cleveland.data"
)
# Fallback mirror (same 303 patients, but re-encoded; see data.py for the mapping).
MIRROR_URL = (
    "https://raw.githubusercontent.com/kb22/Heart-Disease-Prediction/"
    "master/dataset.csv"
)

UCI_COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num",
]

TARGET = "target"

# Continuous measurements -> imputed with median + standard-scaled.
NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]
# Binary flags -> passed through (imputed with most frequent).
BINARY_FEATURES = ["sex", "fbs", "exang"]
# Nominal categories stored as readable labels -> one-hot encoded.
CATEGORICAL_FEATURES = ["cp", "restecg", "slope", "thal"]

FEATURES = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES

# Readable labels for the UCI integer codes.
CP_LABELS = {1: "typical_angina", 2: "atypical_angina",
             3: "non_anginal", 4: "asymptomatic"}
RESTECG_LABELS = {0: "normal", 1: "st_t_abnormality", 2: "lv_hypertrophy"}
SLOPE_LABELS = {1: "upsloping", 2: "flat", 3: "downsloping"}
THAL_LABELS = {3: "normal", 6: "fixed_defect", 7: "reversible_defect"}

RANDOM_STATE = 42
CV_FOLDS = 5
TEST_SIZE = 0.2
