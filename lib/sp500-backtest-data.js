import { readFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "engine", "sp500_v1", "output");
const FORECAST_PATH = path.join(OUTPUT_DIR, "latest_forecast.json");
const BACKTEST_PATH = path.join(OUTPUT_DIR, "backtest_summary.json");

const FALLBACK_FORECAST = {
  asset: "SPX",
  asset_name: "S&P 500",
  as_of_date: null,
  history_start: null,
  history_end: null,
  input_rows: 0,
  train_window_days: 2520,
  neighbors: 7,
  close: null,
  forecasts: {
    "5D": {
      upside_probability: 0.56,
      expected_return: 0.0048,
      expected_drawdown: -0.0092,
      path_label: "range_then_rise",
      neighbors_used: 7,
    },
    "21D": {
      upside_probability: 0.6,
      expected_return: 0.0174,
      expected_drawdown: -0.025,
      path_label: "steady_uptrend",
      neighbors_used: 7,
    },
    "63D": {
      upside_probability: 0.64,
      expected_return: 0.0385,
      expected_drawdown: -0.053,
      path_label: "drawdown_then_recovery",
      neighbors_used: 7,
    },
  },
};

const FALLBACK_BACKTEST = {
  "5D": {
    samples: 0,
    brier_score: null,
    log_loss: null,
    directional_accuracy: null,
    return_mae: null,
    drawdown_mae: null,
    path_accuracy: null,
    train_window_days: 2520,
    neighbors: 7,
  },
  "21D": {
    samples: 0,
    brier_score: null,
    log_loss: null,
    directional_accuracy: null,
    return_mae: null,
    drawdown_mae: null,
    path_accuracy: null,
    train_window_days: 2520,
    neighbors: 7,
  },
  "63D": {
    samples: 0,
    brier_score: null,
    log_loss: null,
    directional_accuracy: null,
    return_mae: null,
    drawdown_mae: null,
    path_accuracy: null,
    train_window_days: 2520,
    neighbors: 7,
  },
};

async function readJson(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getSp500BacktestData() {
  const [forecast, backtest] = await Promise.all([readJson(FORECAST_PATH), readJson(BACKTEST_PATH)]);

  return {
    forecast: forecast ?? FALLBACK_FORECAST,
    backtest: backtest ?? FALLBACK_BACKTEST,
    source: forecast && backtest ? "pipeline" : "fallback",
  };
}

export function formatProbability(value, digits = 1) {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 3) {
  if (value === null || value === undefined) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

export function formatReturn(value, digits = 1) {
  if (value === null || value === undefined) {
    return "--";
  }
  const numeric = Number(value) * 100;
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(digits)}%`;
}
