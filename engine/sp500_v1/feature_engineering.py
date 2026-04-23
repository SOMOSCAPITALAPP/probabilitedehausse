from __future__ import annotations

import math


def pct_change(current: float, previous: float) -> float | None:
    if previous in (None, 0):
        return None
    return ((current / previous) - 1.0) * 100.0


def rolling_mean(values: list[float], lookback: int) -> float | None:
    if len(values) < lookback:
        return None
    return sum(values[-lookback:]) / lookback


def rolling_vol(returns: list[float], lookback: int) -> float | None:
    if len(returns) < lookback:
        return None
    window = returns[-lookback:]
    mean = sum(window) / lookback
    variance = sum((value - mean) ** 2 for value in window) / lookback
    return math.sqrt(variance) * math.sqrt(252.0)


def rolling_drawdown(values: list[float], lookback: int) -> float | None:
    if len(values) < lookback:
        return None
    window = values[-lookback:]
    peak = max(window)
    if peak == 0:
        return None
    return (values[-1] / peak) - 1.0


def future_max_drawdown(values: list[float]) -> float:
    peak = values[0]
    worst = 0.0
    for value in values:
        if value > peak:
            peak = value
        drawdown = (value / peak) - 1.0
        if drawdown < worst:
            worst = drawdown
    return worst


def classify_path(values: list[float]) -> str:
    final_return = (values[-1] / values[0]) - 1.0
    max_dd = future_max_drawdown(values)
    midpoint = values[len(values) // 2]
    midpoint_return = (midpoint / values[0]) - 1.0

    if final_return > 0 and max_dd > -0.03 and midpoint_return > 0:
        return "steady_uptrend"
    if final_return > 0 and max_dd <= -0.03:
        return "drawdown_then_recovery"
    if final_return > 0 and midpoint_return <= 0:
        return "range_then_rise"
    if final_return <= 0 and max_dd < -0.05:
        return "persistent_drawdown"
    return "range_bound"


def true_range(current_high: float, current_low: float, previous_close: float | None) -> float:
    if previous_close is None:
        return current_high - current_low
    return max(
        current_high - current_low,
        abs(current_high - previous_close),
        abs(current_low - previous_close),
    )


def build_dataset(rows: list[dict], horizons: dict[str, int]) -> list[dict]:
    dataset: list[dict] = []
    closes: list[float] = []
    returns: list[float] = []
    true_ranges: list[float] = []
    volumes: list[float] = []

    for idx, row in enumerate(rows):
        close = row["close"]
        closes.append(close)

        previous_close = rows[idx - 1]["close"] if idx > 0 else None
        returns.append(((close / previous_close) - 1.0) * 100.0 if previous_close else 0.0)
        true_ranges.append(true_range(row["high"], row["low"], previous_close))
        if row["volume"] is not None:
            volumes.append(float(row["volume"]))

        ret_1d = returns[-1] if idx > 0 else None
        mom_5d = pct_change(closes[-1], closes[-6]) if len(closes) >= 6 else None
        mom_21d = pct_change(closes[-1], closes[-22]) if len(closes) >= 22 else None
        mom_63d = pct_change(closes[-1], closes[-64]) if len(closes) >= 64 else None
        vol_21d = rolling_vol(returns[1:], 21) if len(returns) > 21 else None
        drawdown_63d = rolling_drawdown(closes, 63)
        ma_20 = rolling_mean(closes, 20)
        dist_ma_20d = ((close / ma_20) - 1.0) * 100.0 if ma_20 not in (None, 0) else None

        intraday_range_pct = ((row["high"] - row["low"]) / close) * 100.0 if close else None
        gap_open_pct = pct_change(row["open"], previous_close) if previous_close else None
        atr_14d = rolling_mean(true_ranges, 14)
        atr_14d_pct = ((atr_14d / close) * 100.0) if atr_14d not in (None, 0) and close else None
        close_in_range = ((close - row["low"]) / (row["high"] - row["low"])) if row["high"] != row["low"] else 0.5

        volume_ratio_20d = None
        if row["volume"] is not None and len(volumes) >= 20:
            avg_volume = sum(volumes[-20:]) / 20
            if avg_volume:
                volume_ratio_20d = float(row["volume"]) / avg_volume

        sample = {
            "date": row["date"],
            "open": row["open"],
            "high": row["high"],
            "low": row["low"],
            "close": close,
            "adj_close": row["adj_close"],
            "volume": row["volume"],
            "ret_1d": ret_1d,
            "mom_5d": mom_5d,
            "mom_21d": mom_21d,
            "mom_63d": mom_63d,
            "vol_21d": vol_21d,
            "drawdown_63d": drawdown_63d,
            "dist_ma_20d": dist_ma_20d,
            "intraday_range_pct": intraday_range_pct,
            "gap_open_pct": gap_open_pct,
            "atr_14d_pct": atr_14d_pct,
            "close_in_range": close_in_range,
            "volume_ratio_20d": volume_ratio_20d,
            "labels": {},
        }

        for horizon_name, horizon_days in horizons.items():
            if idx + horizon_days >= len(rows):
                continue
            future_slice = [item["close"] for item in rows[idx : idx + horizon_days + 1]]
            final_return = (future_slice[-1] / future_slice[0]) - 1.0
            sample["labels"][horizon_name] = {
                "upside_binary": final_return > 0,
                "future_return": final_return,
                "future_max_drawdown": future_max_drawdown(future_slice),
                "path_label": classify_path(future_slice),
            }

        dataset.append(sample)

    return dataset
