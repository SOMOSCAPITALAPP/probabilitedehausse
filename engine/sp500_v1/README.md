# Northcurve S&P 500 Pipeline V1

This module builds a first end-to-end probabilistic pipeline for the S&P 500 using daily Yahoo-style historical data.

## Scope

It includes:

- dataset loading from a local CSV
- feature engineering
- forward labels for multiple horizons
- walk-forward backtesting
- probability estimation from historical analogs
- expected return and expected drawdown estimation
- path classification
- JSON output for the latest forecast and backtest summary

## Input

Default input file:

`data/manual/SPX_CLOSE.csv`

Expected columns:

- `observation_date`
- `value`

You can replace the sample file with a richer Yahoo export as long as you adapt the loader.

## Run

```bash
python engine/sp500_v1/pipeline.py
```

## Output

Generated files:

- `engine/sp500_v1/output/latest_forecast.json`
- `engine/sp500_v1/output/backtest_summary.json`

## Horizons

- `5D`
- `21D`
- `63D`

## Method

The V1 model uses historical analogs:

1. compute market state features
2. find nearest historical states in the training window
3. infer:
   - upside probability
   - expected return
   - expected drawdown
   - path label

This is intentionally simple, robust, and auditable.
