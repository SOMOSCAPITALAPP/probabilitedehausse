from __future__ import annotations

import math


def standardize(training_rows: list[dict], feature_columns: list[str]) -> tuple[dict, dict]:
    means: dict[str, float] = {}
    stds: dict[str, float] = {}

    for column in feature_columns:
        values = [float(row[column]) for row in training_rows if row[column] is not None]
        if not values:
            means[column] = 0.0
            stds[column] = 1.0
            continue
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / max(1, len(values))
        std = math.sqrt(variance) or 1.0
        means[column] = mean
        stds[column] = std

    return means, stds


def euclidean_distance(row_a: dict, row_b: dict, means: dict, stds: dict, feature_columns: list[str]) -> float:
    total = 0.0
    valid = 0
    for column in feature_columns:
        a = row_a.get(column)
        b = row_b.get(column)
        if a is None or b is None:
            continue
        scaled = (float(a) - float(b)) / stds[column]
        total += scaled * scaled
        valid += 1

    if valid == 0:
        return float("inf")
    return math.sqrt(total)


def find_neighbors(
    training_rows: list[dict],
    target_row: dict,
    feature_columns: list[str],
    k: int,
) -> list[dict]:
    means, stds = standardize(training_rows, feature_columns)
    scored = []
    for row in training_rows:
        distance = euclidean_distance(row, target_row, means, stds, feature_columns)
        if math.isfinite(distance):
            scored.append((distance, row))
    scored.sort(key=lambda item: item[0])
    return [row for _, row in scored[:k]]


def summarize_neighbors(neighbors: list[dict], horizon_name: str) -> dict:
    labels = [row["labels"][horizon_name] for row in neighbors if horizon_name in row["labels"]]
    if not labels:
        return {
            "upside_probability": None,
            "expected_return": None,
            "expected_drawdown": None,
            "path_label": "insufficient_history",
        }

    upside_probability = sum(1 for label in labels if label["upside_binary"]) / len(labels)
    expected_return = sum(label["future_return"] for label in labels) / len(labels)
    expected_drawdown = sum(label["future_max_drawdown"] for label in labels) / len(labels)

    path_counts: dict[str, int] = {}
    for label in labels:
        path = label["path_label"]
        path_counts[path] = path_counts.get(path, 0) + 1
    path_label = sorted(path_counts.items(), key=lambda item: (-item[1], item[0]))[0][0]

    return {
        "upside_probability": upside_probability,
        "expected_return": expected_return,
        "expected_drawdown": expected_drawdown,
        "path_label": path_label,
    }
