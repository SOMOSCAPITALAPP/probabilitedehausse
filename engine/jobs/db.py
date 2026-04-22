from __future__ import annotations

import os
from contextlib import contextmanager

import psycopg


def database_url() -> str:
    value = os.environ.get("NC_DATABASE_URL")
    if not value:
        raise RuntimeError("NC_DATABASE_URL is required")
    return value


@contextmanager
def get_connection():
    with psycopg.connect(database_url()) as conn:
        yield conn


def fetch_series_config(conn, series_key: str) -> tuple[int, str] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            select sc.id, sc.frequency
            from series_catalog sc
            where sc.series_key = %s
            """,
            (series_key,),
        )
        row = cur.fetchone()
        return row


def create_ingestion_run(conn, source_code: str, metadata: dict | None = None) -> int:
    metadata = metadata or {}
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into ingestion_runs (source_id, status, started_at, metadata)
            values (
              (select id from data_sources where code = %s),
              'running',
              now(),
              %s::jsonb
            )
            returning id
            """,
            (source_code, psycopg.types.json.Json(metadata)),
        )
        return cur.fetchone()[0]


def finalize_ingestion_run(conn, run_id: int, status: str, rows_fetched: int, error_message: str | None = None) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update ingestion_runs
            set status = %s,
                finished_at = now(),
                rows_fetched = %s,
                error_message = %s
            where id = %s
            """,
            (status, rows_fetched, error_message, run_id),
        )


def upsert_raw_and_normalized(
    conn,
    ingestion_run_id: int,
    series_id: int,
    frequency: str,
    records: list[dict],
) -> int:
    count = 0
    with conn.cursor() as cur:
        for record in records:
            cur.execute(
                """
                insert into raw_series_values (
                  ingestion_run_id,
                  series_id,
                  observation_date,
                  raw_value,
                  fetched_at,
                  raw_payload
                )
                values (%s, %s, %s, %s, now(), %s::jsonb)
                on conflict do nothing
                """,
                (
                    ingestion_run_id,
                    series_id,
                    record["observation_date"],
                    record["value"],
                    psycopg.types.json.Json(record),
                ),
            )
            cur.execute(
                """
                insert into normalized_series_values (
                  series_id,
                  observation_date,
                  value,
                  frequency,
                  quality_flag
                )
                values (%s, %s, %s, %s, %s)
                on conflict (series_id, observation_date) do update
                set value = excluded.value,
                    frequency = excluded.frequency,
                    quality_flag = excluded.quality_flag,
                    normalized_at = now()
                """,
                (
                    series_id,
                    record["observation_date"],
                    record["value"],
                    frequency,
                    record.get("quality_flag", "ok"),
                ),
            )
            count += 1
    return count
