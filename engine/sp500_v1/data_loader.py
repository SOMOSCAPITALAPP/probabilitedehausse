from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path


def parse_float(value: str | None) -> float | None:
    if value in (None, "", "null", "NULL", "N/A"):
        return None
    return float(value.replace(",", ""))


def normalize_simple_row(row: dict) -> dict:
    close = parse_float(row["value"])
    return {
        "date": dt.date.fromisoformat(row["observation_date"]),
        "open": close,
        "high": close,
        "low": close,
        "close": close,
        "adj_close": close,
        "volume": None,
    }


def normalize_yahoo_row(row: dict) -> dict | None:
    date_value = row.get("Date")
    if not date_value:
        return None

    close = parse_float(row.get("Close"))
    if close is None:
        return None

    adj_close = parse_float(row.get("Adj Close")) or close

    return {
        "date": dt.date.fromisoformat(date_value),
        "open": parse_float(row.get("Open")) or close,
        "high": parse_float(row.get("High")) or close,
        "low": parse_float(row.get("Low")) or close,
        "close": close,
        "adj_close": adj_close,
        "volume": parse_float(row.get("Volume")),
    }


def load_spx_series(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []

        is_simple = {"observation_date", "value"}.issubset(set(fieldnames))
        is_yahoo = {"Date", "Open", "High", "Low", "Close", "Adj Close", "Volume"}.issubset(set(fieldnames))

        if not is_simple and not is_yahoo:
            raise ValueError(
                "Unsupported SPX input format. Expected either "
                "`observation_date,value` or Yahoo columns "
                "`Date,Open,High,Low,Close,Adj Close,Volume`."
            )

        for row in reader:
            normalized = normalize_simple_row(row) if is_simple else normalize_yahoo_row(row)
            if normalized is not None:
                rows.append(normalized)

    rows.sort(key=lambda item: item["date"])
    return rows
