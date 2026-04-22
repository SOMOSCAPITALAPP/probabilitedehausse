# Northcurve Ingestion Plan

## Objective

Build a daily batch pipeline that:

1. fetches source series
2. stores raw observations
3. normalizes observations into a common structure
4. derives macro and cross-asset features
5. publishes daily forecasts

## Run Cadence

- `00:05 Europe/Paris` start ingestion
- `00:20` normalize and validate
- `00:35` compute derived series
- `00:50` compute features
- `01:10` run models
- `01:20` publish forecasts

## Source To Transformation Mapping

| series_key | source | original_series_code | frequency | transformation | notes |
| --- | --- | --- | --- | --- | --- |
| `SPX_CLOSE` | manual | `SPX_CLOSE` | daily | none | Daily close for S&P 500 |
| `NDX_CLOSE` | manual | `NDX_CLOSE` | daily | none | Daily close for Nasdaq 100 |
| `SX5E_CLOSE` | manual | `SX5E_CLOSE` | daily | none | Daily close for Euro Stoxx 50 |
| `US10Y_YIELD` | fred | `DGS10` | daily | none | Market-facing 10Y yield series |
| `EURUSD_CLOSE` | manual | `EURUSD_CLOSE` | daily | none | Daily close FX |
| `XAUUSD_CLOSE` | manual | `XAUUSD_CLOSE` | daily | none | Gold spot close |
| `CL1_CLOSE` | manual | `CL1_CLOSE` | daily | none | Front crude proxy |
| `BTCUSD_CLOSE` | manual | `BTCUSD_CLOSE` | daily | none | Bitcoin daily close |
| `US_CPI_YOY` | fred | `CPIAUCSL` | monthly | year-over-year percent change | Derived from headline CPI index |
| `US_CORE_CPI_YOY` | fred | `CPILFESL` | monthly | year-over-year percent change | Derived from core CPI index |
| `US_UNEMPLOYMENT` | fred | `UNRATE` | monthly | none | Published as percent |
| `US_FEDFUNDS` | fred | `FEDFUNDS` | monthly | none | Effective fed funds |
| `US_2Y_YIELD` | fred | `DGS2` | daily | none | Treasury yield |
| `US_10Y_YIELD_MACRO` | fred | `DGS10` | daily | none | Macro copy of 10Y |
| `US_2S10S_SPREAD` | derived | `US_2S10S_SPREAD` | daily | `US_10Y_YIELD_MACRO - US_2Y_YIELD` | Stored in basis points |
| `US_REAL_RATE_PROXY` | derived | `US_REAL_RATE_PROXY` | daily | `US_10Y_YIELD_MACRO - latest(US_CPI_YOY)` | Simple real-rate proxy |
| `US_IG_OAS` | fred | `BAMLC0A0CM` | daily | none | Investment-grade credit spread |
| `US_HY_OAS` | fred | `BAMLH0A0HYM2` | daily | none | High-yield credit spread |
| `DXY_INDEX` | manual | `DXY_INDEX` | daily | none | Dollar index |
| `VIX_INDEX` | manual | `VIX_INDEX` | daily | none | Equity volatility |
| `BRENT_WTI_SPREAD` | manual | `BRENT_WTI_SPREAD` | daily | none | Energy spread |
| `EU_HICP_YOY` | ecb | `ICP.M.U2.N.000000.4.ANR` | monthly | none | YoY series from ECB catalog |
| `ECB_DEPOSIT_RATE` | ecb | `ECBDFR` | daily | none | Policy rate |
| `EA_UNEMPLOYMENT` | eurostat | `TEILM020` | monthly | none | Euro area unemployment |

## Normalization Rules

- all dates stored in `date` as observation dates
- all numeric values stored in `numeric`
- daily source series stay daily
- monthly series are not forward-filled in storage
- forward-fill only happens in feature calculation where appropriate
- derived series are inserted into `normalized_series_values`
- quality flags:
  - `ok`
  - `missing_source_value`
  - `derived`
  - `stale`

## Feature Dependencies

### Rates

- `curve_2y10y` depends on:
  - `US_2Y_YIELD`
  - `US_10Y_YIELD_MACRO`

- `real_rate_level` depends on:
  - `US_10Y_YIELD_MACRO`
  - `US_CPI_YOY`

### Credit

- `credit_spread_level` depends on:
  - `US_HY_OAS`

- `credit_stress` depends on:
  - `US_HY_OAS`
  - `US_IG_OAS`

### FX / Risk

- `usd_trend` depends on:
  - `DXY_INDEX`

- `risk_vol_level` depends on:
  - `VIX_INDEX`

## Daily Pipeline

1. ingest source series into `raw_series_values`
2. normalize into `normalized_series_values`
3. refresh derived daily series
4. refresh feature views or materialized tables
5. build `daily_feature_snapshot`
6. run models and publish

## Validation Checks

- every required series has a fresh observation within expected lag
- no duplicate `(series_id, observation_date)` after normalization
- values parse as numeric
- daily series have no future dates
- derived series are regenerated after base series updates

## V1 Priority Set

The first feature-complete run should support:

- `SPX`
- `NDX`
- `SX5E`
- `US10Y`
- `EURUSD`
- `XAUUSD`
- `CL1`
- `BTCUSD`

with these macro drivers:

- inflation
- rates
- curve slope
- real rates
- credit spreads
- dollar
- volatility
