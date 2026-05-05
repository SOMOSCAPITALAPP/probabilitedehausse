from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import gspread
import pandas as pd
import yfinance as yf


PARIS_TZ = ZoneInfo("Europe/Paris")

ASSETS_HEADERS = [
    "asset_code",
    "asset_name",
    "asset_class",
    "source_symbol",
    "source_name",
    "target_sheet",
    "unit",
    "is_active",
]

DAILY_PRICES_HEADERS = [
    "date",
    "asset_code",
    "asset_name",
    "open",
    "high",
    "low",
    "close",
    "adj_close",
    "volume",
    "unit",
    "source",
    "fetched_at",
]

MACRO_DAILY_HEADERS = [
    "date",
    "series_code",
    "series_name",
    "value",
    "unit",
    "source",
    "fetched_at",
]


@dataclass
class AssetRow:
    asset_code: str
    asset_name: str
    asset_class: str
    source_symbol: str
    source_name: str
    target_sheet: str
    unit: str
    is_active: bool


def env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def bool_from_string(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"true", "1", "yes", "y"}


def now_iso() -> str:
    return datetime.now(PARIS_TZ).isoformat(timespec="seconds")


def google_client() -> gspread.Client:
    credentials_path = env("NC_GOOGLE_SERVICE_ACCOUNT_FILE")
    return gspread.service_account(filename=credentials_path)


def open_spreadsheet(client: gspread.Client):
    spreadsheet_id = env("NC_GOOGLE_SHEETS_SPREADSHEET_ID")
    return client.open_by_key(spreadsheet_id)


def ensure_worksheet(spreadsheet, title: str, headers: list[str], rows: int = 1000, cols: int = 20):
    try:
        worksheet = spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=title, rows=rows, cols=cols)

    current_headers = worksheet.row_values(1)
    if current_headers != headers:
        worksheet.update(values=[headers], range_name="1:1")
    return worksheet


def read_assets(worksheet) -> list[AssetRow]:
    records = worksheet.get_all_records()
    assets: list[AssetRow] = []
    for record in records:
        asset_code = str(record.get("asset_code", "")).strip()
        if not asset_code:
            continue
        assets.append(
            AssetRow(
                asset_code=asset_code,
                asset_name=str(record.get("asset_name", "")).strip(),
                asset_class=str(record.get("asset_class", "")).strip(),
                source_symbol=str(record.get("source_symbol", "")).strip(),
                source_name=str(record.get("source_name", "")).strip() or "yahoo",
                target_sheet=str(record.get("target_sheet", "")).strip() or "daily_prices",
                unit=str(record.get("unit", "")).strip(),
                is_active=bool_from_string(record.get("is_active")),
            )
        )
    return [asset for asset in assets if asset.is_active]


def fetch_history(symbol: str, lookback_days: str) -> pd.DataFrame:
    history = yf.download(
        tickers=symbol,
        period=lookback_days,
        interval="1d",
        auto_adjust=False,
        progress=False,
        multi_level_index=False,
    )
    if history is None or history.empty:
        return pd.DataFrame()
    history = history.reset_index()
    history.columns = [str(column) for column in history.columns]
    return history


def existing_keys(worksheet, key_columns: list[int]) -> set[tuple[str, ...]]:
    values = worksheet.get_all_values()
    if len(values) <= 1:
        return set()

    keys = set()
    for row in values[1:]:
        if not row:
            continue
        expanded = row + [""] * (max(key_columns) + 1 - len(row))
        keys.add(tuple(expanded[index].strip() for index in key_columns))
    return keys


def normalize_float(value) -> str:
    if pd.isna(value):
        return ""
    return str(float(value))


def normalize_volume(value) -> str:
    if pd.isna(value):
        return ""
    return str(int(float(value)))


def build_daily_row(asset: AssetRow, row: pd.Series, fetched_at: str) -> list[str]:
    date_value = pd.Timestamp(row["Date"]).date().isoformat()
    return [
        date_value,
        asset.asset_code,
        asset.asset_name,
        normalize_float(row.get("Open")),
        normalize_float(row.get("High")),
        normalize_float(row.get("Low")),
        normalize_float(row.get("Close")),
        normalize_float(row.get("Adj Close")),
        normalize_volume(row.get("Volume")),
        asset.unit,
        asset.source_name,
        fetched_at,
    ]


def build_macro_row(asset: AssetRow, row: pd.Series, fetched_at: str) -> list[str]:
    date_value = pd.Timestamp(row["Date"]).date().isoformat()
    return [
        date_value,
        asset.asset_code,
        asset.asset_name,
        normalize_float(row.get("Close")),
        asset.unit,
        asset.source_name,
        fetched_at,
    ]


def append_missing_rows(worksheet, rows: list[list[str]]) -> int:
    if not rows:
        return 0
    worksheet.append_rows(rows, value_input_option="USER_ENTERED")
    return len(rows)


def main() -> None:
    lookback_days = os.getenv("NC_YAHOO_LOOKBACK_DAYS", "10d")
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
    ensure_worksheet(
        spreadsheet,
        "forecasts",
        [
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
        ],
        rows=5000,
        cols=10,
    )

    assets = read_assets(assets_ws)
    fetched_at = now_iso()
    daily_keys = existing_keys(daily_ws, [0, 1])
    macro_keys = existing_keys(macro_ws, [0, 1])

    daily_rows_to_add: list[list[str]] = []
    macro_rows_to_add: list[list[str]] = []

    for asset in assets:
        history = fetch_history(asset.source_symbol, lookback_days)
        if history.empty:
            print(f"[skip] no data returned for {asset.asset_code} ({asset.source_symbol})")
            continue

        for _, row in history.iterrows():
            date_value = pd.Timestamp(row["Date"]).date().isoformat()
            if asset.target_sheet == "macro_daily":
                key = (date_value, asset.asset_code)
                if key in macro_keys:
                    continue
                macro_rows_to_add.append(build_macro_row(asset, row, fetched_at))
                macro_keys.add(key)
            else:
                key = (date_value, asset.asset_code)
                if key in daily_keys:
                    continue
                daily_rows_to_add.append(build_daily_row(asset, row, fetched_at))
                daily_keys.add(key)

    added_daily = append_missing_rows(daily_ws, daily_rows_to_add)
    added_macro = append_missing_rows(macro_ws, macro_rows_to_add)

    print("Northcurve Google Sheets update complete")
    print(f"- active assets: {len(assets)}")
    print(f"- rows added to daily_prices: {added_daily}")
    print(f"- rows added to macro_daily: {added_macro}")
    print(f"- fetched_at: {fetched_at}")


if __name__ == "__main__":
    main()
