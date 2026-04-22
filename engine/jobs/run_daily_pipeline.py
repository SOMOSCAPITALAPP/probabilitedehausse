from __future__ import annotations

import datetime as dt


PIPELINE_STEPS = [
    "validate normalized source freshness",
    "refresh derived macro series",
    "refresh macro feature views",
    "materialize daily feature snapshot",
    "run direction, return, and drawdown models",
    "publish current forecasts",
]


def main() -> None:
    as_of_date = dt.date.today().isoformat()
    print(f"Northcurve daily pipeline for {as_of_date}")
    for step in PIPELINE_STEPS:
        print(f"- {step}")

    # TODO: Replace with SQL execution or orchestration calls.


if __name__ == "__main__":
    main()
