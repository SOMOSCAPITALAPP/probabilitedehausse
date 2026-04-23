from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "manual" / "SPX_CLOSE.csv"
OUTPUT_DIR = ROOT / "engine" / "sp500_v1" / "output"

HORIZONS = {
    "5D": 5,
    "21D": 21,
    "63D": 63,
}

FEATURE_COLUMNS = [
    "ret_1d",
    "mom_5d",
    "mom_21d",
    "mom_63d",
    "vol_21d",
    "drawdown_63d",
    "dist_ma_20d",
]

MIN_TRAIN_SIZE = 10
NEIGHBORS = 7
