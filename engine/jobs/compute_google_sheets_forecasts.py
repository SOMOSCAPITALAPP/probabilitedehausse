from __future__ import annotations

from datetime import datetime
from pathlib import Path
import math
import sys
from zoneinfo import ZoneInfo

import pandas as pd

JOBS_DIR = Path(__file__).resolve().parent
ROOT_DIR = JOBS_DIR.parents[1]
for candidate in (str(JOBS_DIR), str(ROOT_DIR)):
    if candidate not in sys.path:
        sys.path.insert(0, candidate)

from update_google_sheets_history import (
    AssetRow,
    ASSETS_HEADERS,
    DAILY_PRICES_HEADERS,
    MACRO_DAILY_HEADERS,
    ensure_worksheet,
    existing_keys,
    google_client,
    open_spreadsheet,
    read_assets,
)

from engine.sp500_v1.config import FEATURE_COLUMNS, HORIZONS, NEIGHBORS, TRAIN_WINDOW
from engine.sp500_v1.feature_engineering import build_dataset
from engine.sp500_v1.model import find_neighbors, summarize_neighbors


PARIS_TZ = ZoneInfo("Europe/Paris")
FORECAST_HEADERS = [
    "run_date",
    "asset_code",
    "horizon",
    "upside_probability",
    "expected_return",
    "expected_drawdown",
    "path_label",
    "confidence_label",
    "model_version",
    "computed_at",
]
MODEL_VERSION = "google_sheets_v1"


def now_paris() -> datetime:
    return datetime.now(PARIS_TZ)


def now_iso() -> str:
    return now_paris().isoformat(timespec="seconds")


def run_date() -> str:
    return now_paris().date().isoformat()


def worksheet_dataframe(worksheet) -> pd.DataFrame:
    records = worksheet.get_all_records()
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)


def rewrite_forecasts_for_run_date(worksheet, today: str, new_rows: list[list[str]]) -> int:
    values = worksheet.get_all_values()
    headers = values[0] if values else FORECAST_HEADERS
    preserved_rows = []

    for row in values[1:]:
        if not row:
            continue
        run_value = row[0].strip() if len(row) > 0 else ""
        if run_value != today:
            preserved_rows.append((row + [""] * len(headers))[: len(headers)])

    final_rows = [headers] + preserved_rows + new_rows
    worksheet.clear()
    worksheet.update(range_name=f"A1:J{len(final_rows)}", values=final_rows)
    return len(new_rows)


def normalize_numeric(value):
    if value in ("", None):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_market_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    if frame.empty:
        return rows

    normalized = frame.copy()
    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce")
    normalized = normalized.dropna(subset=["date", "close"])
    normalized = normalized.sort_values("date")

    for _, row in normalized.iterrows():
        close = normalize_numeric(row.get("close"))
        if close is None:
            continue

        open_value = normalize_numeric(row.get("open")) or close
        high_value = normalize_numeric(row.get("high")) or close
        low_value = normalize_numeric(row.get("low")) or close
        adj_close = normalize_numeric(row.get("adj_close")) or close
        volume = normalize_numeric(row.get("volume"))

        rows.append(
            {
                "date": row["date"].date(),
                "open": open_value,
                "high": high_value,
                "low": low_value,
                "close": close,
                "adj_close": adj_close,
                "volume": volume,
            }
        )

    return rows


def build_macro_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    if frame.empty:
        return rows

    normalized = frame.copy()
    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce")
    normalized = normalized.dropna(subset=["date", "value"])
    normalized = normalized.sort_values("date")

    for _, row in normalized.iterrows():
        value = normalize_numeric(row.get("value"))
        if value is None:
            continue

        rows.append(
            {
                "date": row["date"].date(),
                "open": value,
                "high": value,
                "low": value,
                "close": value,
                "adj_close": value,
                "volume": None,
            }
        )

    return rows


def confidence_label(history_length: int, labeled_samples: int) -> str:
    if history_length >= 2520 and labeled_samples >= 1260:
        return "high"
    if history_length >= 1260 and labeled_samples >= 504:
        return "medium"
    return "low"


def neighbor_dispersion(neighbors: list[dict], horizon_name: str) -> tuple[float | None, float | None]:
    labels = [row["labels"][horizon_name] for row in neighbors if horizon_name in row["labels"]]
    if len(labels) < 2:
        return None, None

    returns = [label["future_return"] for label in labels]
    drawdowns = [label["future_max_drawdown"] for label in labels]

    mean_return = sum(returns) / len(returns)
    mean_drawdown = sum(drawdowns) / len(drawdowns)

    return_std = math.sqrt(sum((value - mean_return) ** 2 for value in returns) / len(returns))
    drawdown_std = math.sqrt(sum((value - mean_drawdown) ** 2 for value in drawdowns) / len(drawdowns))
    return return_std, drawdown_std


def refined_confidence_label(
    history_length: int,
    labeled_samples: int,
    neighbors: list[dict],
    horizon_name: str,
    upside_probability: float,
) -> str:
    base = confidence_label(history_length, labeled_samples)
    return_std, drawdown_std = neighbor_dispersion(neighbors, horizon_name)

    if base == "high":
        if return_std is None or drawdown_std is None:
            return "medium"
        if return_std > 0.06 or drawdown_std > 0.05:
            return "medium"
        if 0.45 <= upside_probability <= 0.55:
            return "medium"
        return "high"

    if base == "medium":
        if return_std is not None and drawdown_std is not None and return_std < 0.03 and drawdown_std < 0.03:
            if upside_probability <= 0.35 or upside_probability >= 0.65:
                return "medium"
        return "medium"

    return "low"


def forecast_rows_for_asset(asset: AssetRow, history_rows: list[dict], computed_at: str, today: str) -> list[list[str]]:
    if len(history_rows) < 90:
        return []

    dataset = build_dataset(history_rows, HORIZONS)
    if not dataset:
        return []

    latest = dataset[-1]
    output_rows: list[list[str]] = []

    for horizon_name in HORIZONS:
        train_rows = [
            row
            for row in dataset[max(0, len(dataset) - TRAIN_WINDOW - 1):-1]
            if horizon_name in row["labels"]
        ]
        neighbors = find_neighbors(train_rows, latest, FEATURE_COLUMNS, NEIGHBORS)
        forecast = summarize_neighbors(neighbors, horizon_name)
        if forecast["upside_probability"] is None:
            continue

        output_rows.append(
            [
                today,
                asset.asset_code,
                horizon_name,
                str(round(forecast["upside_probability"], 6)),
                str(round(forecast["expected_return"], 6)),
                str(round(forecast["expected_drawdown"], 6)),
                forecast["path_label"],
                refined_confidence_label(
                    len(history_rows),
                    len(train_rows),
                    neighbors,
                    horizon_name,
                    forecast["upside_probability"],
                ),
                MODEL_VERSION,
                computed_at,
            ]
        )

    return output_rows


def main() -> None:
    client = google_client()
    spreadsheet = open_spreadsheet(client)

    assets_ws = ensure_worksheet(spreadsheet, "assets", ASSETS_HEADERS, rows=200, cols=len(ASSETS_HEADERS))
    daily_ws = ensure_worksheet(
        spreadsheet,
        "daily_prices",
        DAILY_PRICES_HEADERS,
        rows=5000,
        cols=len(DAILY_PRICES_HEADERS),
    )
    macro_ws = ensure_worksheet(
        spreadsheet,
        "macro_daily",
        MACRO_DAILY_HEADERS,
        rows=5000,
        cols=len(MACRO_DAILY_HEADERS),
    )
    forecasts_ws = ensure_worksheet(
        spreadsheet,
        "forecasts",
        FORECAST_HEADERS,
        rows=5000,
        cols=len(FORECAST_HEADERS),
    )

    assets = read_assets(assets_ws)
    daily_frame = worksheet_dataframe(daily_ws)
    macro_frame = worksheet_dataframe(macro_ws)
    computed_at = now_iso()
    today = run_date()
    rows_to_add: list[list[str]] = []
    assets_forecasted = 0

    for asset in assets:
        if asset.target_sheet == "macro_daily":
            asset_frame = macro_frame[macro_frame["series_code"] == asset.asset_code] if not macro_frame.empty else pd.DataFrame()
            history_rows = build_macro_rows(asset_frame)
        else:
            asset_frame = daily_frame[daily_frame["asset_code"] == asset.asset_code] if not daily_frame.empty else pd.DataFrame()
            history_rows = build_market_rows(asset_frame)

        forecast_rows = forecast_rows_for_asset(asset, history_rows, computed_at, today)
        if not forecast_rows:
            print(f"[skip] insufficient history for {asset.asset_code}")
            continue

        for row in forecast_rows:
            rows_to_add.append(row)

        if forecast_rows:
            assets_forecasted += 1

    rows_written = rewrite_forecasts_for_run_date(forecasts_ws, today, rows_to_add)

    print("Northcurve Google Sheets forecasts complete")
    print(f"- active assets: {len(assets)}")
    print(f"- assets forecasted: {assets_forecasted}")
    print(f"- rows written to forecasts: {rows_written}")
    print(f"- computed_at: {computed_at}")


if __name__ == "__main__":
    main()
