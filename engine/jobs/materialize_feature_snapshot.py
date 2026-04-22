from __future__ import annotations

import datetime as dt
import math

from db import get_connection


PRICE_SERIES = (
    "SPX_CLOSE",
    "NDX_CLOSE",
    "SX5E_CLOSE",
    "EURUSD_CLOSE",
    "XAUUSD_CLOSE",
    "CL1_CLOSE",
    "BTCUSD_CLOSE",
)


def momentum(values: list[float], lookback: int) -> float | None:
    if len(values) <= lookback or values[-lookback - 1] == 0:
        return None
    return ((values[-1] / values[-lookback - 1]) - 1.0) * 100.0


def realized_vol(returns: list[float], lookback: int) -> float | None:
    if len(returns) < lookback:
        return None
    window = returns[-lookback:]
    mean = sum(window) / len(window)
    variance = sum((value - mean) ** 2 for value in window) / len(window)
    return math.sqrt(variance) * math.sqrt(252.0) * 100.0


def drawdown(values: list[float], lookback: int) -> float | None:
    if len(values) < lookback:
        return None
    window = values[-lookback:]
    peak = max(window)
    if peak == 0:
        return None
    return ((values[-1] / peak) - 1.0) * 100.0


def moving_average_distance(values: list[float], lookback: int) -> float | None:
    if len(values) < lookback:
        return None
    average = sum(values[-lookback:]) / lookback
    if average == 0:
        return None
    return ((values[-1] / average) - 1.0) * 100.0


def safe_get(mapping: dict, key: str):
    return mapping.get(key)


def as_float(value):
    if value is None:
        return None
    return float(value)


def classify_regime(macro_row: dict) -> tuple[str, float]:
    risk_penalty = 0.0
    curve = as_float(macro_row.get("curve_2s10s_bp"))
    hy_gap = as_float(macro_row.get("hy_ig_gap"))
    vix = as_float(macro_row.get("vix_level"))
    usd = as_float(macro_row.get("usd_trend_1m_pct"))

    if curve is not None:
        risk_penalty += max(0.0, -curve / 100.0)
    if hy_gap is not None:
        risk_penalty += max(0.0, (hy_gap - 200.0) / 100.0)
    if vix is not None:
        risk_penalty += max(0.0, (vix - 20.0) / 10.0)
    if usd is not None:
        risk_penalty += max(0.0, usd / 5.0)

    regime_score = max(-5.0, min(5.0, 2.5 - risk_penalty))
    regime_code = "risk_on" if regime_score >= 1.0 else "balanced" if regime_score >= -0.5 else "risk_off"
    return regime_code, regime_score


def upsert_daily_asset_prices(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into daily_asset_prices (
              asset_id,
              price_date,
              close,
              source_id
            )
            select
              sc.asset_id,
              nsv.observation_date,
              nsv.value,
              sc.source_id
            from normalized_series_values nsv
            join series_catalog sc
              on sc.id = nsv.series_id
            where sc.series_key = any(%s)
              and sc.asset_id is not null
            on conflict (asset_id, price_date) do update
            set close = excluded.close,
                source_id = excluded.source_id
            """,
            (list(PRICE_SERIES),),
        )

        cur.execute(
            """
            with ordered as (
              select
                id,
                asset_id,
                price_date,
                close,
                lag(close) over (partition by asset_id order by price_date) as prev_close
              from daily_asset_prices
            )
            update daily_asset_prices dap
            set return_1d = case
              when ordered.prev_close is null or ordered.prev_close = 0 then null
              else ((ordered.close / ordered.prev_close) - 1.0) * 100.0
            end
            from ordered
            where ordered.id = dap.id
            """
        )


def create_feature_run(conn, as_of_date: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into feature_runs (
              as_of_date,
              status,
              started_at,
              feature_set_version,
              metadata
            )
            values (%s, 'running', now(), 'v1', '{}'::jsonb)
            on conflict (as_of_date, feature_set_version) do update
            set status = 'running',
                started_at = now(),
                finished_at = null,
                error_message = null
            returning id
            """,
            (as_of_date,),
        )
        return cur.fetchone()[0]


def load_macro_by_date(conn) -> dict:
    with conn.cursor(row_factory=dict_row_factory()) as cur:
        cur.execute("select * from v_macro_feature_snapshot")
        return {row["observation_date"]: row for row in cur.fetchall()}


def dict_row_factory():
    import psycopg.rows

    return psycopg.rows.dict_row


def fetch_assets(conn) -> list[dict]:
    with conn.cursor(row_factory=dict_row_factory()) as cur:
        cur.execute(
            """
            select
              a.id,
              a.code,
              ag.code as asset_group
            from assets a
            join asset_groups ag
              on ag.id = a.asset_group_id
            where a.is_active = true
            order by a.code
            """
        )
        return cur.fetchall()


def fetch_prices_for_asset(conn, asset_id: int) -> list[dict]:
    with conn.cursor(row_factory=dict_row_factory()) as cur:
        cur.execute(
            """
            select price_date, close, return_1d
            from daily_asset_prices
            where asset_id = %s
            order by price_date
            """,
            (asset_id,),
        )
        return cur.fetchall()


def upsert_snapshot_row(conn, row: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into daily_feature_snapshot (
              feature_run_id,
              asset_id,
              as_of_date,
              mom_1w,
              mom_1m,
              mom_3m,
              vol_1m,
              vol_3m,
              drawdown_3m,
              distance_ma_50d,
              inflation_trend,
              real_rate_level,
              curve_2y10y,
              credit_spread_level,
              usd_trend,
              gold_trend,
              oil_trend,
              regime_code,
              regime_score,
              feature_payload
            )
            values (
              %(feature_run_id)s,
              %(asset_id)s,
              %(as_of_date)s,
              %(mom_1w)s,
              %(mom_1m)s,
              %(mom_3m)s,
              %(vol_1m)s,
              %(vol_3m)s,
              %(drawdown_3m)s,
              %(distance_ma_50d)s,
              %(inflation_trend)s,
              %(real_rate_level)s,
              %(curve_2y10y)s,
              %(credit_spread_level)s,
              %(usd_trend)s,
              %(gold_trend)s,
              %(oil_trend)s,
              %(regime_code)s,
              %(regime_score)s,
              %(feature_payload)s::jsonb
            )
            on conflict (asset_id, as_of_date, feature_run_id) do update
            set mom_1w = excluded.mom_1w,
                mom_1m = excluded.mom_1m,
                mom_3m = excluded.mom_3m,
                vol_1m = excluded.vol_1m,
                vol_3m = excluded.vol_3m,
                drawdown_3m = excluded.drawdown_3m,
                distance_ma_50d = excluded.distance_ma_50d,
                inflation_trend = excluded.inflation_trend,
                real_rate_level = excluded.real_rate_level,
                curve_2y10y = excluded.curve_2y10y,
                credit_spread_level = excluded.credit_spread_level,
                usd_trend = excluded.usd_trend,
                gold_trend = excluded.gold_trend,
                oil_trend = excluded.oil_trend,
                regime_code = excluded.regime_code,
                regime_score = excluded.regime_score,
                feature_payload = excluded.feature_payload
            """,
            row,
        )


def main() -> None:
    as_of_date = dt.date.today().isoformat()
    print(f"Northcurve feature materialization for {as_of_date}")

    with get_connection() as conn:
        upsert_daily_asset_prices(conn)
        feature_run_id = create_feature_run(conn, as_of_date)
        macro_by_date = load_macro_by_date(conn)
        assets = fetch_assets(conn)

        gold_mom = None
        oil_mom = None
        with conn.cursor(row_factory=dict_row_factory()) as cur:
            cur.execute(
                """
                select a.code, dfs.mom_1m
                from daily_feature_snapshot dfs
                join assets a on a.id = dfs.asset_id
                where dfs.as_of_date = (
                  select max(as_of_date) from daily_feature_snapshot
                )
                and a.code in ('XAUUSD', 'CL1')
                """
            )
            for row in cur.fetchall():
                if row["code"] == "XAUUSD":
                    gold_mom = row["mom_1m"]
                elif row["code"] == "CL1":
                    oil_mom = row["mom_1m"]

        rows_created = 0
        for asset in assets:
            price_rows = fetch_prices_for_asset(conn, asset["id"])
            if len(price_rows) < 22:
                continue

            dates = [row["price_date"] for row in price_rows]
            closes = [float(row["close"]) for row in price_rows]
            returns = [float(row["return_1d"]) for row in price_rows if row["return_1d"] is not None]
            latest_date = dates[-1]
            macro = macro_by_date.get(latest_date, {})
            regime_code, regime_score = classify_regime(macro)

            row = {
                "feature_run_id": feature_run_id,
                "asset_id": asset["id"],
                "as_of_date": latest_date,
                "mom_1w": momentum(closes, 5),
                "mom_1m": momentum(closes, 21),
                "mom_3m": momentum(closes, 63),
                "vol_1m": realized_vol(returns, 21),
                "vol_3m": realized_vol(returns, 63),
                "drawdown_3m": drawdown(closes, min(63, len(closes))),
                "distance_ma_50d": moving_average_distance(closes, min(50, len(closes))),
                "inflation_trend": as_float(safe_get(macro, "real_rate_proxy")),
                "real_rate_level": as_float(safe_get(macro, "real_rate_proxy")),
                "curve_2y10y": as_float(safe_get(macro, "curve_2s10s_bp")),
                "credit_spread_level": as_float(safe_get(macro, "hy_oas")),
                "usd_trend": as_float(safe_get(macro, "usd_trend_1m_pct")),
                "gold_trend": as_float(gold_mom),
                "oil_trend": as_float(oil_mom),
                "regime_code": regime_code,
                "regime_score": regime_score,
                "feature_payload": "{}",
            }
            upsert_snapshot_row(conn, row)
            rows_created += 1

        with conn.cursor() as cur:
            cur.execute(
                """
                update feature_runs
                set status = 'success',
                    finished_at = now(),
                    metadata = jsonb_build_object('rows_created', %s)
                where id = %s
                """,
                (rows_created, feature_run_id),
            )
        conn.commit()
        print(f"feature rows materialized: {rows_created}")


if __name__ == "__main__":
    main()
