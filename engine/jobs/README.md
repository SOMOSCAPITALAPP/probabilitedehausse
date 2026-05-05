# Northcurve Jobs

## Jobs Included

- `ingest_fred.py`
- `ingest_manual_series.py`
- `materialize_feature_snapshot.py`
- `run_probabilistic_model_v1.py`
- `run_daily_pipeline.py`
- `update_google_sheets_history.py`
- `compute_google_sheets_forecasts.py`
- `run_daily_google_sheets_pipeline.py`

## Expected Environment Variables

- `NC_FRED_API_KEY`
- `NC_DATABASE_URL`
- `NC_AS_OF_DATE`
- `NC_GOOGLE_SERVICE_ACCOUNT_FILE`
- `NC_GOOGLE_SHEETS_SPREADSHEET_ID`
- `NC_YAHOO_LOOKBACK_DAYS`

## Suggested Scheduling

- `00:05 Europe/Paris` run `ingest_fred.py`
- `00:10 Europe/Paris` run `ingest_manual_series.py`
- `00:20 Europe/Paris` run `materialize_feature_snapshot.py`
- `00:30 Europe/Paris` run `run_probabilistic_model_v1.py`
- `00:35 Europe/Paris` run `run_daily_pipeline.py` only as a wrapper if preferred
- `00:10 Europe/Paris` run `run_daily_google_sheets_pipeline.py` for the Google Sheets workflow

## Automated Daily Run

The repository now includes:

- `.github/workflows/daily-google-sheets-pipeline.yml`

This workflow checks the current `Europe/Paris` time every hour and only runs the Google Sheets pipeline during the `00h` Paris window, which keeps the schedule aligned even when daylight saving time changes.

### Required GitHub Secrets

- `NC_GOOGLE_SERVICE_ACCOUNT_JSON`
- `NC_GOOGLE_SHEETS_SPREADSHEET_ID`

### What the workflow runs

```bash
python engine/jobs/run_daily_google_sheets_pipeline.py
```

## Current State

These jobs are starter skeletons.

They already:

- define the series to ingest
- fetch and transform source payloads
- shape normalized records
- write raw and normalized observations into PostgreSQL

## Setup

Install engine dependencies:

```bash
pip install -r engine/requirements.txt
```

Required environment variables:

```bash
export NC_DATABASE_URL=postgresql://...
export NC_FRED_API_KEY=...
export NC_GOOGLE_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
export NC_GOOGLE_SHEETS_SPREADSHEET_ID=your_google_sheet_id
export NC_YAHOO_LOOKBACK_DAYS=10d
```

## Google Sheets Workflow

Daily Google Sheets workflow:

```bash
python engine/jobs/run_daily_google_sheets_pipeline.py
```

This wrapper will:

- update `daily_prices` and `macro_daily`
- compute fresh forecasts from the stored history
- write results into the `forecasts` tab
