from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path


def load_spx_series(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
      reader = csv.DictReader(handle)
      for row in reader:
          rows.append(
              {
                  "date": dt.date.fromisoformat(row["observation_date"]),
                  "close": float(row["value"]),
              }
          )
    rows.sort(key=lambda item: item["date"])
    return rows
