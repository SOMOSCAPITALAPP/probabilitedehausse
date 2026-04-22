from __future__ import annotations

import datetime as dt

from materialize_feature_snapshot import main as materialize_snapshot
from run_probabilistic_model_v1 import main as run_model_v1


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
    materialize_snapshot()
    run_model_v1()


if __name__ == "__main__":
    main()
