"""Send realistic random traffic to the API (for monitoring demos).

Usage: python scripts/load_test.py --url http://localhost:8000 --n 300
"""
import argparse
import json
import random
import time
import urllib.error
import urllib.request

CP = ["typical_angina", "atypical_angina", "non_anginal", "asymptomatic"]
RESTECG = ["normal", "st_t_abnormality", "lv_hypertrophy"]
SLOPE = ["upsloping", "flat", "downsloping"]
THAL = ["normal", "fixed_defect", "reversible_defect"]


def random_patient():
    return {
        "age": random.randint(30, 77), "sex": random.randint(0, 1),
        "cp": random.choice(CP), "trestbps": random.randint(95, 190),
        "chol": random.randint(150, 400), "fbs": random.randint(0, 1),
        "restecg": random.choice(RESTECG),
        "thalach": random.randint(90, 200), "exang": random.randint(0, 1),
        "oldpeak": round(random.uniform(0, 4.5), 1),
        "slope": random.choice(SLOPE), "ca": random.randint(0, 3),
        "thal": random.choice(THAL),
    }


def post(url, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--invalid-rate", type=float, default=0.05,
                    help="share of deliberately invalid requests (422s)")
    ap.add_argument("--sleep", type=float, default=0.05)
    args = ap.parse_args()
    codes = {}
    for _ in range(args.n):
        p = random_patient()
        if random.random() < args.invalid_rate:
            p["age"] = 999
        code = post(args.url.rstrip("/") + "/predict", p)
        codes[code] = codes.get(code, 0) + 1
        time.sleep(args.sleep)
    print("status codes:", codes)


if __name__ == "__main__":
    main()
