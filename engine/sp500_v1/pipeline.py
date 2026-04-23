from __future__ import annotations

import json
from pathlib import Path

from backtest import run_walk_forward_backtest
from config import DATA_PATH, FEATURE_COLUMNS, HORIZONS, NEIGHBORS, OUTPUT_DIR, TRAIN_WINDOW
from data_loader import load_spx_series
from feature_engineering import build_dataset
from model import find_neighbors, summarize_neighbors


def make_latest_forecast(rows: list[dict], dataset: list[dict]) -> dict:
    latest = dataset[-1]
    forecasts = {}

    for horizon_name in HORIZONS:
        train = [
            row
            for row in dataset[max(0, len(dataset) - TRAIN_WINDOW - 1):-1]
            if horizon_name in row["labels"]
        ]
        neighbors = find_neighbors(train, latest, FEATURE_COLUMNS, NEIGHBORS)
        forecast = summarize_neighbors(neighbors, horizon_name)
        forecasts[horizon_name] = {
            "upside_probability": round(forecast["upside_probability"], 4) if forecast["upside_probability"] is not None else None,
            "expected_return": round(forecast["expected_return"], 4) if forecast["expected_return"] is not None else None,
            "expected_drawdown": round(forecast["expected_drawdown"], 4) if forecast["expected_drawdown"] is not None else None,
            "path_label": forecast["path_label"],
            "neighbors_used": len(neighbors),
        }

    return {
        "asset": "SPX",
        "asset_name": "S&P 500",
        "input_source": str(DATA_PATH),
        "history_start": rows[0]["date"].isoformat(),
        "history_end": rows[-1]["date"].isoformat(),
        "input_rows": len(rows),
        "train_window_days": TRAIN_WINDOW,
        "neighbors": NEIGHBORS,
        "as_of_date": latest["date"].isoformat(),
        "close": latest["close"],
        "features": {
            key: (round(latest[key], 6) if isinstance(latest[key], float) else latest[key])
            for key in FEATURE_COLUMNS
        },
        "forecasts": forecasts,
    }


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    ensure_output_dir(OUTPUT_DIR)
    rows = load_spx_series(DATA_PATH)
    dataset = build_dataset(rows, HORIZONS)
    latest_forecast = make_latest_forecast(rows, dataset)
    backtest_summary = run_walk_forward_backtest(dataset, HORIZONS)

    write_json(OUTPUT_DIR / "latest_forecast.json", latest_forecast)
    write_json(OUTPUT_DIR / "backtest_summary.json", backtest_summary)

    print("Northcurve S&P 500 pipeline complete")
    print(f"- input rows: {len(rows)}")
    print(f"- dataset rows: {len(dataset)}")
    print(f"- latest forecast: {(OUTPUT_DIR / 'latest_forecast.json')}")
    print(f"- backtest summary: {(OUTPUT_DIR / 'backtest_summary.json')}")


if __name__ == "__main__":
    main()
