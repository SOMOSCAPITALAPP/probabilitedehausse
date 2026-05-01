from __future__ import annotations

from dataclasses import dataclass
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
    google_client,
    open_spreadsheet,
    read_assets,
)

from engine.sp500_v1.feature_engineering import classify_path, future_max_drawdown


PARIS_TZ = ZoneInfo("Europe/Paris")
MODEL_VERSION = "gaussian_tail_v3"
HORIZON_SPECS = [
    ("5D", 5),
    ("21D", 21),
    ("63D", 63),
    ("1Y", 252),
    ("3Y", 756),
    ("5Y", 1260),
    ("10Y", 2520),
]
FORECAST_HEADERS = [
    "run_date",
    "asset_code",
    "asset_name",
    "horizon",
    "horizon_days",
    "trailing_return",
    "historical_mean",
    "historical_vol",
    "z_score",
    "expected_return",
    "upside_probability",
    "expected_drawdown",
    "confidence_label",
    "path_label",
    "sample_size",
    "neighbor_count",
    "model_version",
    "computed_at",
]


@dataclass
class HorizonForecast:
    horizon_code: str
    horizon_days: int
    trailing_return: float
    historical_mean: float
    historical_vol: float
    z_score: float
    expected_return: float
    upside_probability: float
    expected_drawdown: float
    confidence_label: str
    path_label: str
    sample_size: int
    neighbor_count: int


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
    worksheet.update(range_name=f"A1:R{len(final_rows)}", values=final_rows)
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


def normal_cdf(value: float) -> float:
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def mean_std(series: pd.Series) -> tuple[float, float]:
    mean = float(series.mean())
    std = float(series.std(ddof=0))
    return mean, std


def future_drawdown_from_slice(values: list[float]) -> float:
    return float(future_max_drawdown(values))


def build_horizon_frame(history_rows: list[dict], horizon_days: int) -> pd.DataFrame:
    if len(history_rows) <= horizon_days * 2:
        return pd.DataFrame()

    closes = pd.Series([row["close"] for row in history_rows], dtype="float64")
    dates = pd.Series([row["date"] for row in history_rows])

    trailing = closes / closes.shift(horizon_days) - 1.0
    future = closes.shift(-horizon_days) / closes - 1.0

    future_drawdowns = []
    future_paths = []
    for index in range(len(closes)):
        if index + horizon_days >= len(closes):
            future_drawdowns.append(None)
            future_paths.append(None)
            continue
        future_slice = closes.iloc[index : index + horizon_days + 1].tolist()
        future_drawdowns.append(future_drawdown_from_slice(future_slice))
        future_paths.append(classify_path(future_slice))

    frame = pd.DataFrame(
        {
            "date": dates,
            "close": closes,
            "trailing_return": trailing,
            "future_return": future,
            "future_drawdown": future_drawdowns,
            "future_path_label": future_paths,
        }
    ).dropna(subset=["trailing_return"])

    if frame.empty:
        return frame

    historical_mean, historical_vol = mean_std(frame["trailing_return"])
    if historical_vol <= 0:
        return pd.DataFrame()

    frame["historical_mean"] = historical_mean
    frame["historical_vol"] = historical_vol
    frame["z_score"] = (frame["trailing_return"] - historical_mean) / historical_vol
    return frame


def choose_neighbor_count(sample_size: int) -> int:
    return max(20, min(80, int(math.sqrt(sample_size) * 1.5)))


def confidence_label(
    sample_size: int,
    z_score: float,
) -> str:
    if sample_size >= 2500 and abs(z_score) >= 1.0:
        return "high"
    if sample_size >= 1000:
        return "medium"
    return "low"


def infer_path_label(neighbor_frame: pd.DataFrame) -> str:
    counts = {}
    for label in neighbor_frame["future_path_label"]:
        counts[label] = counts.get(label, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def compute_horizon_forecast(asset: AssetRow, history_rows: list[dict], horizon_code: str, horizon_days: int) -> HorizonForecast | None:
    frame = build_horizon_frame(history_rows, horizon_days)
    if frame.empty or len(frame) < max(120, horizon_days * 2):
        return None

    current_trailing = float(frame.iloc[-1]["trailing_return"])
    historical_mean = float(frame.iloc[-1]["historical_mean"])
    historical_vol = float(frame.iloc[-1]["historical_vol"])
    z_current = float(frame.iloc[-1]["z_score"])

    training_frame = frame.dropna(subset=["future_return", "future_drawdown", "future_path_label"]).copy()
    if len(training_frame) < max(100, horizon_days):
        return None

    expected_return = historical_mean
    upside_probability = 1.0 - normal_cdf(z_current)

    neighbor_count = choose_neighbor_count(len(training_frame))
    training_frame["z_distance"] = (training_frame["z_score"] - z_current).abs()
    neighbor_frame = training_frame.nsmallest(neighbor_count, "z_distance")

    expected_drawdown = float(neighbor_frame["future_drawdown"].median())
    path_label = infer_path_label(neighbor_frame)
    confidence = confidence_label(len(training_frame), z_current)

    return HorizonForecast(
        horizon_code=horizon_code,
        horizon_days=horizon_days,
        trailing_return=current_trailing,
        historical_mean=historical_mean,
        historical_vol=historical_vol,
        z_score=z_current,
        expected_return=float(expected_return),
        upside_probability=float(max(0.0, min(1.0, upside_probability))),
        expected_drawdown=expected_drawdown,
        confidence_label=confidence,
        path_label=path_label,
        sample_size=len(training_frame),
        neighbor_count=len(neighbor_frame),
    )


def forecast_rows_for_asset(asset: AssetRow, history_rows: list[dict], computed_at: str, today: str) -> list[list[str]]:
    output_rows: list[list[str]] = []
    if len(history_rows) < 252:
        return output_rows

    for horizon_code, horizon_days in HORIZON_SPECS:
        forecast = compute_horizon_forecast(asset, history_rows, horizon_code, horizon_days)
        if forecast is None:
            continue

        output_rows.append(
            [
                today,
                asset.asset_code,
                asset.asset_name,
                forecast.horizon_code,
                str(forecast.horizon_days),
                str(round(forecast.trailing_return, 6)),
                str(round(forecast.historical_mean, 6)),
                str(round(forecast.historical_vol, 6)),
                str(round(forecast.z_score, 6)),
                str(round(forecast.expected_return, 6)),
                str(round(forecast.upside_probability, 6)),
                str(round(forecast.expected_drawdown, 6)),
                forecast.confidence_label,
                forecast.path_label,
                str(forecast.sample_size),
                str(forecast.neighbor_count),
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
    rows_to_write: list[list[str]] = []
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

        rows_to_write.extend(forecast_rows)
        assets_forecasted += 1

    rows_written = rewrite_forecasts_for_run_date(forecasts_ws, today, rows_to_write)

    print("Northcurve Google Sheets forecasts complete")
    print(f"- active assets: {len(assets)}")
    print(f"- assets forecasted: {assets_forecasted}")
    print(f"- rows written to forecasts: {rows_written}")
    print(f"- computed_at: {computed_at}")


if __name__ == "__main__":
    main()
