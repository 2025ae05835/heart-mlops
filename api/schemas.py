"""Request/response schemas with clinical-range validation."""
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Patient(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {
        "age": 58, "sex": 1, "cp": "asymptomatic", "trestbps": 140,
        "chol": 260, "fbs": 0, "restecg": "lv_hypertrophy",
        "thalach": 120, "exang": 1, "oldpeak": 2.4, "slope": "flat",
        "ca": 2, "thal": "reversible_defect"}})

    age: int = Field(..., ge=18, le=110, description="Age in years")
    sex: Literal[0, 1] = Field(..., description="1 = male, 0 = female")
    cp: Literal["typical_angina", "atypical_angina", "non_anginal",
                "asymptomatic"] = Field(..., description="Chest pain type")
    trestbps: float = Field(..., ge=60, le=250,
                            description="Resting blood pressure (mm Hg)")
    chol: float = Field(..., ge=80, le=700,
                        description="Serum cholesterol (mg/dl)")
    fbs: Literal[0, 1] = Field(..., description="Fasting sugar > 120 mg/dl")
    restecg: Literal["normal", "st_t_abnormality", "lv_hypertrophy"]
    thalach: float = Field(..., ge=50, le=250,
                           description="Max heart rate achieved")
    exang: Literal[0, 1] = Field(..., description="Exercise induced angina")
    oldpeak: float = Field(..., ge=0, le=10,
                           description="ST depression induced by exercise")
    slope: Literal["upsloping", "flat", "downsloping"]
    ca: Optional[int] = Field(None, ge=0, le=3,
                              description="Major vessels coloured (0-3)")
    thal: Optional[Literal["normal", "fixed_defect", "reversible_defect"]] \
        = None


class BatchRequest(BaseModel):
    patients: List[Patient] = Field(..., min_length=1, max_length=500)


class Prediction(BaseModel):
    prediction: int
    label: str
    probability_disease: float
    confidence: float
    risk_band: str


class PredictResponse(Prediction):
    model_name: str
    request_id: str


class BatchResponse(BaseModel):
    model_name: str
    request_id: str
    results: List[Prediction]
