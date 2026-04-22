from __future__ import annotations

import csv
import pathlib

from db import (
    create_ingestion_run,
    fetch_series_config,
    finalize_ingestion_run,
    get_connection,
    upsert_raw_and_normalized,
)


MANUAL_SERIES = {
    "SPX_CLOSE": "data/manual/SPX_CLOSE.csv",
    "NDX_CLOSE": "data/manual/NDX_CLOSE.csv",
    "SX5E_CLOSE": "data/manual/SX5E_CLOSE.csv",
    "EURUSD_CLOSE": "data/manual/EURUSD_CLOSE.csv",
    "XAUUSD_CLOSE": "data/manual/XAUUSD_CLOSE.csv",
    "CL1_CLOSE": "data/manual/CL1_CLOSE.csv",
    "BTCUSD_CLOSE": "data/manual/BTCUSD_CLOSE.csv",
    "DXY_INDEX": "data/manual/DXY_INDEX.csv",
    "VIX_INDEX": "data/manual/VIX_INDEX.csv",
    "BRENT_WTI_SPREAD": "data/manual/BRENT_WTI_SPREAD.csv",
}


def read_manual_csv(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        print(f"missing manual series file: {path}")
        return []

    records = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            records.append(
                {
                    "observation_date": row["observation_date"],
                    "value": float(row["value"]),
                    "quality_flag": "ok",
                }
            )
    return records


def main() -> None:
    with get_connection() as conn:
        run_id = create_ingestion_run(conn, "manual")
        total_rows = 0
        try:
            for series_key, relative_path in MANUAL_SERIES.items():
                series_config = fetch_series_config(conn, series_key)
                if not series_config:
                    print(f"{series_key}: missing in series_catalog")
                    continue
                series_id, frequency = series_config
                path = pathlib.Path(relative_path)
                records = read_manual_csv(path)
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
