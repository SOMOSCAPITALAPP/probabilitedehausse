from __future__ import annotations

import datetime as dt
import math

from db import get_connection


HORIZONS = [
    ("1W", 0.35),
    ("1M", 0.75),
    ("3M", 1.25),
]


def logistic(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def confidence_label(score: float) -> str:
    if score >= 0.72:
        return "high"
    if score >= 0.58:
        return "medium"
    return "low"


def as_float(value):
    if value is None:
        return 0.0
    return float(value)


def path_label(score: float, vol_1m: float | None, drawdown_3m: float | None) -> str:
    vol_1m = vol_1m or 0.0
    drawdown_3m = drawdown_3m or 0.0
    if score >= 0.64 and vol_1m < 20:
        return "Steady uptrend"
    if score >= 0.58 and drawdown_3m < -4:
        return "Drawdown then recovery"
    if score >= 0.54:
        return "Consolidation then gradual rise"
    if score <= 0.42:
        return "Weak trend with downside risk"
    return "Range-bound with mixed drivers"


def fetch_latest_features(conn) -> list[dict]:
    import psycopg.rows

    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            """
            select
              dfs.*,
              a.code as asset_code,
              ag.code as asset_group
            from daily_feature_snapshot dfs
            join assets a
              on a.id = dfs.asset_id
            join asset_groups ag
              on ag.id = a.asset_group_id
            where dfs.as_of_date = (
              select max(as_of_date) from daily_feature_snapshot
            )
            order by a.code
            """
        )
        return cur.fetchall()


def ensure_registry(conn, horizon_code: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into model_registry (
              model_key,
              model_type,
              target_type,
              horizon_id,
              algorithm,
              version,
              config
            )
            values (
              %s,
              'heuristic_probability',
              'upside_probability',
              (select id from horizons where code = %s),
              'weighted_logistic_rules',
              'v1',
              '{}'::jsonb
            )
            on conflict (model_key) do update
            set version = excluded.version
            returning id
            """,
            (f"upside_probability_{horizon_code.lower()}_v1", horizon_code),
        )
        return cur.fetchone()[0]


def create_model_run(conn, model_id: int) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into model_runs (
              model_id,
              run_type,
              status,
              started_at,
              metrics
            )
            values (%s, 'inference', 'running', now(), '{}'::jsonb)
            returning id
            """,
            (model_id,),
        )
        return cur.fetchone()[0]


def score_asset(row: dict) -> float:
    group = row["asset_group"]
    mom_1w = as_float(row["mom_1w"])
    mom_1m = as_float(row["mom_1m"])
    mom_3m = as_float(row["mom_3m"])
    ma_50 = as_float(row["distance_ma_50d"])
    vol_1m = as_float(row["vol_1m"])
    curve = as_float(row["curve_2y10y"])
    credit = as_float(row["credit_spread_level"])
    usd = as_float(row["usd_trend"])
    regime = as_float(row["regime_score"])

    trend_score = 0.04 * mom_1w + 0.05 * mom_1m + 0.03 * mom_3m + 0.02 * ma_50
    risk_score = -0.015 * vol_1m + 0.08 * regime - max(0.0, (credit - 300.0) / 80.0)
    macro_score = 0.0

    if group in ("equity_index", "commodity", "crypto"):
        macro_score += 0.004 * curve
        macro_score += -0.05 * usd
    elif group == "fx":
        macro_score += -0.03 * usd
    elif group == "rates":
        macro_score += -0.003 * curve + -0.02 * (row["real_rate_level"] or 0.0)

    raw = trend_score + risk_score + macro_score
    return clamp(logistic(raw / 3.5), 0.05, 0.95)


def expected_return(row: dict, horizon_scale: float) -> float:
    base = 0.4 * as_float(row["mom_1m"]) + 0.25 * as_float(row["mom_3m"]) - 0.1 * as_float(row["vol_1m"])
    return round((base / 100.0) * horizon_scale, 4)


def expected_drawdown(row: dict, horizon_scale: float) -> float:
    vol = as_float(row["vol_1m"])
    drawdown = as_float(row["drawdown_3m"])
    value = -abs((0.18 * vol + 0.35 * abs(drawdown)) / 100.0) * max(0.7, horizon_scale)
    return round(value, 4)


def bull_case(row: dict, base_return: float, horizon_scale: float) -> float:
    vol = as_float(row["vol_1m"])
    upside = base_return + (vol / 100.0) * 0.18 * horizon_scale
    return round(upside, 4)


def publish_row(conn, payload: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into daily_model_outputs (
              model_run_id,
              model_id,
              asset_id,
              as_of_date,
              horizon_id,
              upside_probability,
              expected_return,
              bull_case_return,
              expected_drawdown,
              confidence_score,
              path_cluster,
              path_payload
            )
            values (
              %(model_run_id)s,
              %(model_id)s,
              %(asset_id)s,
              %(as_of_date)s,
              (select id from horizons where code = %(horizon_code)s),
              %(upside_probability)s,
              %(expected_return)s,
              %(bull_case_return)s,
              %(expected_drawdown)s,
              %(confidence_score)s,
              %(path_label)s,
              '{}'::jsonb
            )
            on conflict (model_id, asset_id, as_of_date, horizon_id) do update
            set upside_probability = excluded.upside_probability,
                expected_return = excluded.expected_return,
                bull_case_return = excluded.bull_case_return,
                expected_drawdown = excluded.expected_drawdown,
                confidence_score = excluded.confidence_score,
                path_cluster = excluded.path_cluster
            """,
            payload,
        )

        cur.execute(
            """
            update published_forecasts
            set is_current = false
            where asset_id = %(asset_id)s
              and horizon_id = (select id from horizons where code = %(horizon_code)s)
              and is_current = true
            """,
            payload,
        )

        cur.execute(
            """
            insert into published_forecasts (
              asset_id,
              as_of_date,
              horizon_id,
              upside_probability,
              expected_return,
              bull_case_return,
              expected_drawdown,
              confidence_score,
              confidence_label,
              path_label,
              path_summary,
              source_model_run_id,
              is_current
            )
            values (
              %(asset_id)s,
              %(as_of_date)s,
              (select id from horizons where code = %(horizon_code)s),
              %(upside_probability)s,
              %(expected_return)s,
              %(bull_case_return)s,
              %(expected_drawdown)s,
              %(confidence_score)s,
              %(confidence_label)s,
              %(path_label)s,
              %(path_summary)s,
              %(model_run_id)s,
              true
            )
            on conflict (asset_id, as_of_date, horizon_id) do update
            set upside_probability = excluded.upside_probability,
                expected_return = excluded.expected_return,
                bull_case_return = excluded.bull_case_return,
                expected_drawdown = excluded.expected_drawdown,
                confidence_score = excluded.confidence_score,
                confidence_label = excluded.confidence_label,
                path_label = excluded.path_label,
                path_summary = excluded.path_summary,
                source_model_run_id = excluded.source_model_run_id,
                is_current = true,
                published_at = now()
            """,
            payload,
        )


def main() -> None:
    print(f"Northcurve probabilistic model V1 run for {dt.date.today().isoformat()}")
    with get_connection() as conn:
        features = fetch_latest_features(conn)
        published = 0
        for horizon_code, horizon_scale in HORIZONS:
            model_id = ensure_registry(conn, horizon_code)
            model_run_id = create_model_run(conn, model_id)
            for row in features:
                probability = round(score_asset(row), 4)
                exp_return = expected_return(row, horizon_scale)
                exp_drawdown = expected_drawdown(row, horizon_scale)
                bull = bull_case(row, exp_return, horizon_scale)
                confidence = round(clamp(0.45 + abs(probability - 0.5) * 1.4, 0.4, 0.95), 4)
                label = path_label(probability, row["vol_1m"], row["drawdown_3m"])
                summary = (
                    f"{row['asset_code']} on {horizon_code}: "
                    f"{round(probability * 100)}% upside probability with {label.lower()}."
                )

                payload = {
                    "model_run_id": model_run_id,
                    "model_id": model_id,
                    "asset_id": row["asset_id"],
                    "asset_code": row["asset_code"],
                    "as_of_date": row["as_of_date"],
                    "horizon_code": horizon_code,
                    "upside_probability": probability,
                    "expected_return": exp_return,
                    "bull_case_return": bull,
                    "expected_drawdown": exp_drawdown,
                    "confidence_score": confidence,
                    "confidence_label": confidence_label(confidence),
                    "path_label": label,
                    "path_summary": summary,
                }
                publish_row(conn, payload)
                published += 1

            with conn.cursor() as cur:
                cur.execute(
                    """
                    update model_runs
                    set status = 'success',
                        finished_at = now(),
                        metrics = jsonb_build_object('rows_published', %s)
                    where id = %s
                    """,
                    (published, model_run_id),
                )
        conn.commit()
        print(f"forecast rows published: {published}")


if __name__ == "__main__":
    main()
