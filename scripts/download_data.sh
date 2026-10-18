#!/usr/bin/env bash
# Downloads the UCI Heart Disease (Cleveland) data and writes the cleaned CSV.
#   raw   -> data/raw/heart_raw.csv
#   clean -> data/processed/heart_clean.csv
# Source: https://archive.ics.uci.edu/dataset/45/heart+disease
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHONPATH=src python -m heart.data --force
