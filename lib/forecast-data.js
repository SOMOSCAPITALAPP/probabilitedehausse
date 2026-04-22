import { Client } from "pg";

const DEMO_FORECASTS = [
  {
    asset_code: "SPX",
    asset_name: "S&P 500",
    horizon: "1M",
    upside_probability: 0.5255,
    expected_return: 0.0104,
    expected_drawdown: -0.0059,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers"
  },
  {
    asset_code: "NDX",
    asset_name: "Nasdaq 100",
    horizon: "3M",
    upside_probability: 0.5233,
    expected_return: 0.0156,
    expected_drawdown: -0.0073,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers"
  },
  {
    asset_code: "EURUSD",
    asset_name: "EUR/USD",
    horizon: "1M",
    upside_probability: 0.5192,
    expected_return: 0.0061,
    expected_drawdown: -0.0015,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers"
  },
  {
    asset_code: "XAUUSD",
    asset_name: "Gold",
    horizon: "3M",
    upside_probability: 0.5238,
    expected_return: 0.016,
    expected_drawdown: -0.0078,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers"
  },
  {
    asset_code: "BTCUSD",
    asset_name: "Bitcoin",
    horizon: "3M",
    upside_probability: 0.5379,
    expected_return: 0.0252,
    expected_drawdown: -0.0463,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers"
  }
];

function databaseUrl() {
  return process.env.NC_DATABASE_URL || process.env.DATABASE_URL || "";
}

export async function getForecasts() {
  const connectionString = databaseUrl();
  if (!connectionString) {
    return {
      forecasts: DEMO_FORECASTS,
      source: "demo",
      updatedAt: null
    };
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    const result = await client.query(`
      select
        a.code as asset_code,
        a.name as asset_name,
        h.code as horizon,
        pf.upside_probability,
        pf.expected_return,
        pf.expected_drawdown,
        pf.confidence_label,
        pf.path_label,
        pf.published_at
      from published_forecasts pf
      join assets a on a.id = pf.asset_id
      join horizons h on h.id = pf.horizon_id
      where pf.is_current = true
      order by a.code, h.sort_order
    `);

    return {
      forecasts: result.rows,
      source: "postgres",
      updatedAt: result.rows[0]?.published_at ?? null
    };
  } catch (error) {
    console.error("Failed to load forecasts from Postgres:", error);
    return {
      forecasts: DEMO_FORECASTS,
      source: "demo",
      updatedAt: null
    };
  } finally {
    await client.end().catch(() => {});
  }
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined) {
    return "--";
  }
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(value, digits = 1) {
  if (value === null || value === undefined) {
    return "--";
  }
  const numeric = Number(value) * 100;
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(digits)}%`;
}
