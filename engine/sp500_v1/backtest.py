from __future__ import annotations

import math

from config import FEATURE_COLUMNS, MIN_TRAIN_SIZE, NEIGHBORS, TRAIN_WINDOW
from model import find_neighbors, summarize_neighbors


def log_loss(probability: float, actual: bool) -> float:
    eps = 1e-8
    probability = max(eps, min(1.0 - eps, probability))
    return -(math.log(probability) if actual else math.log(1.0 - probability))


def run_walk_forward_backtest(dataset: list[dict], horizons: dict[str, int]) -> dict:
    summary: dict[str, dict] = {}

    for horizon_name in horizons:
        predictions = []
        for idx in range(MIN_TRAIN_SIZE, len(dataset)):
            current = dataset[idx]
            if horizon_name not in current["labels"]:
                continue

            train = [
                row
                for row in dataset[max(0, idx - TRAIN_WINDOW):idx]
                if horizon_name in row["labels"]
            ]
            if len(train) < MIN_TRAIN_SIZE:
                continue

            neighbors = find_neighbors(train, current, FEATURE_COLUMNS, NEIGHBORS)
            forecast = summarize_neighbors(neighbors, horizon_name)
            if forecast["upside_probability"] is None:
                continue

            actual = current["labels"][horizon_name]
            predictions.append(
                {
                    "probability": forecast["upside_probability"],
                    "actual_up": actual["upside_binary"],
                    "expected_return": forecast["expected_return"],
                    "actual_return": actual["future_return"],
                    "expected_drawdown": forecast["expected_drawdown"],
                    "actual_drawdown": actual["future_max_drawdown"],
                    "path_label": forecast["path_label"],
                    "actual_path_label": actual["path_label"],
                }
            )

        if not predictions:
            summary[horizon_name] = {"samples": 0}
            continue

        brier = sum((pred["probability"] - (1.0 if pred["actual_up"] else 0.0)) ** 2 for pred in predictions) / len(predictions)
        ll = sum(log_loss(pred["probability"], pred["actual_up"]) for pred in predictions) / len(predictions)
        accuracy = sum((pred["probability"] >= 0.5) == pred["actual_up"] for pred in predictions) / len(predictions)
        mae_return = sum(abs(pred["expected_return"] - pred["actual_return"]) for pred in predictions) / len(predictions)
        mae_drawdown = sum(abs(pred["expected_drawdown"] - pred["actual_drawdown"]) for pred in predictions) / len(predictions)
        path_accuracy = sum(pred["path_label"] == pred["actual_path_label"] for pred in predictions) / len(predictions)

        summary[horizon_name] = {
            "samples": len(predictions),
            "brier_score": round(brier, 6),
            "log_loss": round(ll, 6),
            "directional_accuracy": round(accuracy, 4),
            "return_mae": round(mae_return, 6),
            "drawdown_mae": round(mae_drawdown, 6),
            "path_accuracy": round(path_accuracy, 4),
            "train_window_days": TRAIN_WINDOW,
            "neighbors": NEIGHBORS,
        }

    return summary
