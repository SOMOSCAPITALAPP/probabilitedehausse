import { readFileSync, existsSync } from "fs";
import path from "path";
import { createSign } from "crypto";
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
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "NDX",
    asset_name: "Nasdaq 100",
    horizon: "3M",
    upside_probability: 0.5233,
    expected_return: 0.0156,
    expected_drawdown: -0.0073,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "EURUSD",
    asset_name: "EUR/USD",
    horizon: "1M",
    upside_probability: 0.5192,
    expected_return: 0.0061,
    expected_drawdown: -0.0015,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "XAUUSD",
    asset_name: "Gold",
    horizon: "3M",
    upside_probability: 0.5238,
    expected_return: 0.016,
    expected_drawdown: -0.0078,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "BTCUSD",
    asset_name: "Bitcoin",
    horizon: "3M",
    upside_probability: 0.5379,
    expected_return: 0.0252,
    expected_drawdown: -0.0463,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
];

const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const LOCAL_ENGINE_ENV_PATH = path.join(process.cwd(), "engine", ".env");

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function parseDotEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    values[key.trim()] = rest.join("=").trim();
  }
  return values;
}

function envValue(name) {
  return process.env[name] || parseDotEnvFile(LOCAL_ENGINE_ENV_PATH)[name] || "";
}

function databaseUrl() {
  return process.env.NC_DATABASE_URL || process.env.DATABASE_URL || envValue("NC_DATABASE_URL") || "";
}

function spreadsheetId() {
  return process.env.NC_GOOGLE_SHEETS_SPREADSHEET_ID || envValue("NC_GOOGLE_SHEETS_SPREADSHEET_ID") || "";
}

function loadServiceAccount() {
  const inlineJson = process.env.NC_GOOGLE_SERVICE_ACCOUNT_JSON || envValue("NC_GOOGLE_SERVICE_ACCOUNT_JSON");
  if (inlineJson) {
    return JSON.parse(inlineJson);
  }

  const filePath = process.env.NC_GOOGLE_SERVICE_ACCOUNT_FILE || envValue("NC_GOOGLE_SERVICE_ACCOUNT_FILE");
  if (!filePath || !existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function createJwt(serviceAccount) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");

  return `${unsignedToken}.${signature}`;
}

async function fetchGoogleAccessToken(serviceAccount) {
  const assertion = createJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Google access token: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

async function fetchSheetRange(accessToken, id, range) {
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodedRange}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Google Sheet range ${range}: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload.values || [];
}

function rowsToObjects(rows) {
  if (!rows.length) {
    return [];
  }
  const [headers, ...body] = rows;
  return body.map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index] ?? "";
    });
    return object;
  });
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const HORIZON_ORDER = {
  "1W": 1,
  "5D": 2,
  "1M": 3,
  "21D": 4,
  "3M": 5,
  "63D": 6,
  "6M": 7,
  "12M": 8,
  "3Y": 9,
  "5Y": 10,
};

function sortForecasts(a, b) {
  if (a.asset_code !== b.asset_code) {
    return a.asset_code.localeCompare(b.asset_code);
  }
  return (HORIZON_ORDER[a.horizon] ?? 999) - (HORIZON_ORDER[b.horizon] ?? 999);
}

async function getForecastsFromGoogleSheets() {
  const id = spreadsheetId();
  const serviceAccount = loadServiceAccount();
  if (!id || !serviceAccount) {
    return null;
  }

  const accessToken = await fetchGoogleAccessToken(serviceAccount);
  const [assetsRows, forecastsRows] = await Promise.all([
    fetchSheetRange(accessToken, id, "assets!A:H"),
    fetchSheetRange(accessToken, id, "forecasts!A:J"),
  ]);

  const assets = rowsToObjects(assetsRows);
  const forecasts = rowsToObjects(forecastsRows);
  if (!forecasts.length) {
    return {
      forecasts: [],
      source: "google_sheets",
      updatedAt: null,
    };
  }

  const assetNames = new Map(assets.map((row) => [row.asset_code, row.asset_name]));
  const latestRunDate = forecasts.reduce((max, row) => (row.run_date > max ? row.run_date : max), "");

  const latestForecasts = forecasts
    .filter((row) => row.run_date === latestRunDate)
    .map((row) => ({
      asset_code: row.asset_code,
      asset_name: assetNames.get(row.asset_code) || row.asset_code,
      horizon: row.horizon,
      upside_probability: toNumber(row.upside_probability),
      expected_return: toNumber(row.expected_return),
      expected_drawdown: toNumber(row.expected_drawdown),
      confidence_label: row.confidence_label || "low",
      path_label: row.path_label || "No path label",
      computed_at: row.computed_at || null,
    }))
    .sort(sortForecasts);

  return {
    forecasts: latestForecasts,
    source: "google_sheets",
    updatedAt: latestForecasts[0]?.computed_at ?? null,
  };
}

async function getForecastsFromPostgres() {
  const connectionString = databaseUrl();
  if (!connectionString) {
    return null;
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
      updatedAt: result.rows[0]?.published_at ?? null,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getForecasts() {
  try {
    const googleSheets = await getForecastsFromGoogleSheets();
    if (googleSheets?.forecasts?.length) {
      return googleSheets;
    }
  } catch (error) {
    console.error("Failed to load forecasts from Google Sheets:", error);
  }

  try {
    const postgres = await getForecastsFromPostgres();
    if (postgres?.forecasts?.length) {
      return postgres;
    }
  } catch (error) {
    console.error("Failed to load forecasts from Postgres:", error);
  }

  return {
    forecasts: DEMO_FORECASTS,
    source: "demo",
    updatedAt: null,
  };
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
