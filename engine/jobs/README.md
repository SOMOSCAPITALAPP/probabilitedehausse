# Northcurve Jobs

## Jobs Included

- `ingest_fred.py`
- `ingest_manual_series.py`
- `materialize_feature_snapshot.py`
- `run_probabilistic_model_v1.py`
- `run_daily_pipeline.py`

## Expected Environment Variables

- `NC_FRED_API_KEY`
- `NC_DATABASE_URL`
- `NC_AS_OF_DATE`

## Suggested Scheduling

- `00:05 Europe/Paris` run `ingest_fred.py`
- `00:10 Europe/Paris` run `ingest_manual_series.py`
- `00:20 Europe/Paris` run `materialize_feature_snapshot.py`
- `00:30 Europe/Paris` run `run_probabilistic_model_v1.py`
- `00:35 Europe/Paris` run `run_daily_pipeline.py` only as a wrapper if preferred

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
```
