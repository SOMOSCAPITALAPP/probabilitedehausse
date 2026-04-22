from __future__ import annotations

import datetime as dt
import json
import os
import urllib.parse
import urllib.request

from db import (
    create_ingestion_run,
    fetch_series_config,
    finalize_ingestion_run,
    get_connection,
    upsert_raw_and_normalized,
)


FRED_SERIES = {
    "US_CPI_YOY": {"code": "CPIAUCSL", "transformation": "yoy_percent"},
    "US_CORE_CPI_YOY": {"code": "CPILFESL", "transformation": "yoy_percent"},
    "US_UNEMPLOYMENT": {"code": "UNRATE", "transformation": "none"},
    "US_FEDFUNDS": {"code": "FEDFUNDS", "transformation": "none"},
    "US_2Y_YIELD": {"code": "DGS2", "transformation": "none"},
    "US_10Y_YIELD_MACRO": {"code": "DGS10", "transformation": "none"},
    "US_IG_OAS": {"code": "BAMLC0A0CM", "transformation": "none"},
    "US_HY_OAS": {"code": "BAMLH0A0HYM2", "transformation": "none"},
}


def fred_observations_url(series_code: str, api_key: str) -> str:
    params = urllib.parse.urlencode(
        {
            "series_id": series_code,
            "api_key": api_key,
            "file_type": "json",
        }
    )
    return f"https://api.stlouisfed.org/fred/series/observations?{params}"


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_numeric(value: str) -> float | None:
    if value in (".", "", None):
        return None
    return float(value)


def yoy_percent(observations: list[dict]) -> list[dict]:
    result = []
    numeric_rows = []
    for row in observations:
        value = parse_numeric(row["value"])
        numeric_rows.append(
            {"date": row["date"], "value": value}
        )

    for idx, row in enumerate(numeric_rows):
        if idx < 12 or row["value"] is None:
            continue
        previous = numeric_rows[idx - 12]["value"]
        if previous in (None, 0):
            continue
        transformed = ((row["value"] / previous) - 1.0) * 100.0
        result.append(
            {
                "observation_date": row["date"],
                "value": transformed,
                "quality_flag": "ok",
            }
        )
    return result


def passthrough(observations: list[dict]) -> list[dict]:
    result = []
    for row in observations:
        value = parse_numeric(row["value"])
        if value is None:
            continue
        result.append(
            {
                "observation_date": row["date"],
                "value": value,
                "quality_flag": "ok",
            }
        )
    return result


def transform(series_key: str, payload: dict, transformation: str) -> list[dict]:
    observations = payload.get("observations", [])
    if transformation == "yoy_percent":
        return yoy_percent(observations)
    return passthrough(observations)


def main() -> None:
    api_key = os.environ.get("NC_FRED_API_KEY")
    if not api_key:
        raise RuntimeError("NC_FRED_API_KEY is required")

    as_of_date = os.environ.get("NC_AS_OF_DATE", dt.date.today().isoformat())
    print(f"Northcurve FRED ingestion run for {as_of_date}")

    with get_connection() as conn:
        run_id = create_ingestion_run(conn, "fred", {"as_of_date": as_of_date})
        total_rows = 0
        try:
            for series_key, config in FRED_SERIES.items():
                series_config = fetch_series_config(conn, series_key)
                if not series_config:
                    print(f"{series_key}: missing in series_catalog")
                    continue
                series_id, frequency = series_config
                url = fred_observations_url(config["code"], api_key)
                payload = fetch_json(url)
                records = transform(series_key, payload, config["transformation"])
                inserted = upsert_raw_and_normalized(conn, run_id, series_id, frequency, records)
                total_rows += inserted
                print(f"{series_key}: {inserted} records persisted")
            finalize_ingestion_run(conn, run_id, "success", total_rows)
            conn.commit()
        except Exception as exc:
            finalize_ingestion_run(conn, run_id, "failed", total_rows, str(exc))
            conn.commit()
            raise


if __name__ == "__main__":
    main()
