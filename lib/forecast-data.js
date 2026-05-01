import { readFileSync, existsSync } from "fs";
import path from "path";
import { createSign } from "crypto";
import { Client } from "pg";

const DEMO_FORECASTS = [
  {
    asset_code: "SPX",
    asset_name: "S&P 500",
    horizon: "5D",
    horizon_days: 5,
    trailing_return: -0.012,
    historical_mean: 0.002,
    historical_vol: 0.021,
    z_score: -0.67,
    upside_probability: 0.551,
    expected_return: 0.0034,
    expected_drawdown: -0.0091,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "SPX",
    asset_name: "S&P 500",
    horizon: "21D",
    horizon_days: 21,
    trailing_return: 0.061,
    historical_mean: 0.008,
    historical_vol: 0.041,
    z_score: 1.29,
    upside_probability: 0.284,
    expected_return: -0.0078,
    expected_drawdown: -0.0254,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "SPX",
    asset_name: "S&P 500",
    horizon: "63D",
    horizon_days: 63,
    trailing_return: 0.093,
    historical_mean: 0.024,
    historical_vol: 0.082,
    z_score: 0.84,
    upside_probability: 0.463,
    expected_return: -0.0021,
    expected_drawdown: -0.0511,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "NDX",
    asset_name: "Nasdaq 100",
    horizon: "21D",
    horizon_days: 21,
    trailing_return: 0.072,
    historical_mean: 0.011,
    historical_vol: 0.058,
    z_score: 1.05,
    upside_probability: 0.338,
    expected_return: -0.0094,
    expected_drawdown: -0.0362,
    confidence_label: "low",
    path_label: "Range-bound with mixed drivers",
  },
  {
    asset_code: "BTCUSD",
    asset_name: "Bitcoin",
    horizon: "63D",
    horizon_days: 63,
    trailing_return: 0.148,
    historical_mean: 0.061,
    historical_vol: 0.211,
    z_score: 0.41,
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
  "5D": 1,
  "21D": 2,
  "63D": 3,
  "1Y": 4,
  "3Y": 5,
  "5Y": 6,
  "10Y": 7,
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
    fetchSheetRange(accessToken, id, "forecasts!A:R"),
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
      asset_name: row.asset_name || assetNames.get(row.asset_code) || row.asset_code,
      horizon: row.horizon,
      horizon_days: toNumber(row.horizon_days),
      trailing_return: toNumber(row.trailing_return),
      historical_mean: toNumber(row.historical_mean),
      historical_vol: toNumber(row.historical_vol),
      z_score: toNumber(row.z_score),
      upside_probability: toNumber(row.upside_probability),
      expected_return: toNumber(row.expected_return),
      expected_drawdown: toNumber(row.expected_drawdown),
      confidence_label: row.confidence_label || "low",
      path_label: row.path_label || "No path label",
      sample_size: toNumber(row.sample_size),
      neighbor_count: toNumber(row.neighbor_count),
      model_version: row.model_version || null,
      computed_at: row.computed_at || null,
    }))
    .sort(sortForecasts);

  return {
    forecasts: latestForecasts,
    source: "google_sheets",
    updatedAt: latestForecasts[0]?.computed_at ?? null,
  };
}

async function getPriceHistoryFromGoogleSheets(assetCode) {
  const id = spreadsheetId();
  const serviceAccount = loadServiceAccount();
  if (!id || !serviceAccount) {
    return [];
  }

  const accessToken = await fetchGoogleAccessToken(serviceAccount);
  const [dailyRows, macroRows] = await Promise.all([
    fetchSheetRange(accessToken, id, "daily_prices!A:L"),
    fetchSheetRange(accessToken, id, "macro_daily!A:G"),
  ]);

  const daily = rowsToObjects(dailyRows)
    .filter((row) => row.asset_code === assetCode)
    .map((row) => ({
      date: row.date,
      close: toNumber(row.close),
    }))
    .filter((row) => row.date && row.close !== null);

  if (daily.length) {
    daily.sort((left, right) => left.date.localeCompare(right.date));
    return daily;
  }

  const macro = rowsToObjects(macroRows)
    .filter((row) => row.series_code === assetCode)
    .map((row) => ({
      date: row.date,
      close: toNumber(row.value),
    }))
    .filter((row) => row.date && row.close !== null);

  macro.sort((left, right) => left.date.localeCompare(right.date));
  return macro;
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
  let diagnostics = [];

  try {
    const googleSheets = await getForecastsFromGoogleSheets();
    if (googleSheets?.forecasts?.length) {
      return {
        ...googleSheets,
        diagnostics,
      };
    }
    diagnostics.push("Google Sheets returned no forecast rows.");
  } catch (error) {
    console.error("Failed to load forecasts from Google Sheets:", error);
    diagnostics.push(`Google Sheets: ${error?.message || "unknown error"}`);
  }

  try {
    const postgres = await getForecastsFromPostgres();
    if (postgres?.forecasts?.length) {
      return {
        ...postgres,
        diagnostics,
      };
    }
    diagnostics.push("Postgres returned no forecast rows.");
  } catch (error) {
    console.error("Failed to load forecasts from Postgres:", error);
    diagnostics.push(`Postgres: ${error?.message || "unknown error"}`);
  }

  return {
    forecasts: DEMO_FORECASTS,
    source: "demo",
    updatedAt: null,
    diagnostics,
  };
}

export async function getAssetHistory(assetCode) {
  try {
    return await getPriceHistoryFromGoogleSheets(assetCode);
  } catch (error) {
    console.error("Failed to load asset history from Google Sheets:", error);
    return [];
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

export const DASHBOARD_HORIZON_ORDER = ["5D", "21D", "63D", "1Y", "3Y", "5Y", "10Y"];

export const HORIZON_COPY = {
  "5D": "5 jours",
  "21D": "21 jours",
  "63D": "63 jours",
  "1Y": "1 an",
  "3Y": "3 ans",
  "5Y": "5 ans",
  "10Y": "10 ans",
};

export function horizonLabel(horizon) {
  return HORIZON_COPY[horizon] || horizon;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function riskLabel(expectedDrawdown) {
  const drawdown = Math.abs(Number(expectedDrawdown ?? 0));
  if (drawdown >= 0.12) return "high";
  if (drawdown >= 0.05) return "medium";
  return "low";
}

export function outcomeLabel(forecast) {
  const probability = Number(forecast.upside_probability ?? 0);
  if (probability >= 0.65) {
    return "favorable";
  }
  if (probability >= 0.5) {
    return "constructive";
  }
  if (probability < 0.35) {
    return "defensive";
  }
  return "mixed";
}

export function performanceTone(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.1) return "perf-strong";
  if (numeric > 0) return "perf-positive";
  if (numeric <= -0.1) return "perf-weak";
  return "perf-negative";
}

export function zScoreTone(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 1.5) return "z-hot";
  if (numeric >= 0.5) return "z-warm";
  if (numeric <= -1.5) return "z-cold";
  if (numeric <= -0.5) return "z-cool";
  return "z-neutral";
}

export function assetAnnualMean(asset) {
  return (
    Number(asset?.horizons?.["1Y"]?.historical_mean ?? null) ||
    Number(asset?.horizons?.["63D"]?.historical_mean ?? null) ||
    average(
      DASHBOARD_HORIZON_ORDER.map((horizon) => Number(asset?.horizons?.[horizon]?.historical_mean ?? NaN)).filter((value) =>
        Number.isFinite(value)
      )
    ) ||
    0
  );
}

export function assetAverageVolatility(asset) {
  return (
    Number(asset?.horizons?.["1Y"]?.historical_vol ?? null) ||
    average(
      DASHBOARD_HORIZON_ORDER.map((horizon) => Number(asset?.horizons?.[horizon]?.historical_vol ?? NaN)).filter((value) =>
        Number.isFinite(value)
      )
    ) ||
    0
  );
}

export function assetCurrentVolatility(asset) {
  const rows = DASHBOARD_HORIZON_ORDER.map((horizon) => asset?.horizons?.[horizon]).filter(Boolean);
  const stretch = average(
    rows.map((item) => {
      const trailing = Number(item.trailing_return ?? 0);
      const mean = Number(item.historical_mean ?? 0);
      const vol = Math.max(0.0001, Number(item.historical_vol ?? 0));
      return Math.abs(trailing - mean) / vol;
    })
  );

  const baseVol = assetAverageVolatility(asset);
  if (!baseVol) return 0;
  return baseVol * clamp(0.7 + (stretch ?? 0) * 0.3, 0.75, 1.9);
}

function interpolateAnchors(anchors, day) {
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const left = anchors[index];
    const right = anchors[index + 1];
    if (day >= left.day && day <= right.day) {
      const span = right.day - left.day || 1;
      const ratio = (day - left.day) / span;
      return {
        cumulative: left.cumulative + (right.cumulative - left.cumulative) * ratio,
        probability: left.probability + (right.probability - left.probability) * ratio,
      };
    }
  }
  return anchors[anchors.length - 1];
}

export function buildProjectedPathSeries(asset) {
  const anchorHorizons = ["5D", "21D", "63D", "1Y"];
  const anchors = [{ day: 0, cumulative: 0, probability: 0.5 }];

  for (const horizon of anchorHorizons) {
    const item = asset?.horizons?.[horizon];
    if (!item) continue;
    const day = Number(item.horizon_days ?? 0);
    if (!day || day > 252) continue;
    const mean = Number(item.historical_mean ?? 0);
    const probability = Number(item.upside_probability ?? 0.5);
    const directionalBias = (probability - 0.5) * 2;
    const cumulative = mean * directionalBias;
    anchors.push({ day, cumulative, probability });
  }

  const annualMean = assetAnnualMean(asset);
  const averageVol = assetAverageVolatility(asset);
  const currentVol = assetCurrentVolatility(asset);

  if (!anchors.find((item) => item.day === 252)) {
    const annualProbability = Number(asset?.horizons?.["1Y"]?.upside_probability ?? average(asset.ordered_horizons?.map((row) => Number(row.upside_probability ?? 0.5))) ?? 0.5);
    anchors.push({
      day: 252,
      cumulative: annualMean * ((annualProbability - 0.5) * 2),
      probability: annualProbability,
    });
  }

  anchors.sort((left, right) => left.day - right.day);

  const dailyAmplitude = Math.max(0.003, currentVol / 16);
  const points = [];
  let previous = 0;
  let pathLength = 0;

  for (let day = 0; day <= 252; day += 1) {
    const interpolated = interpolateAnchors(anchors, day);
    const envelope = Math.sin((Math.PI * day) / 252);
    const wave =
      Math.sin(day / 8.5) * 0.65 +
      Math.sin(day / 17 + 0.8) * 0.35 +
      Math.cos(day / 29 + 0.2) * 0.2;
    const volatilityTilt = clamp(currentVol / Math.max(0.0001, averageVol || currentVol || 0.0001), 0.8, 1.8);
    const oscillation = envelope * dailyAmplitude * volatilityTilt * wave;
    const cumulative = interpolated.cumulative + oscillation;
    points.push({ day, cumulative, probability: interpolated.probability });
    if (day > 0) {
      pathLength += Math.abs(cumulative - previous);
    }
    previous = cumulative;
  }

  return {
    points,
    anchors,
    annualMean,
    averageVol,
    currentVol,
    pathLength,
  };
}

export function buildAssetPathStudy(asset, historyRows) {
  const closes = historyRows
    .map((row) => Number(row.close))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (closes.length < 260) {
    return null;
  }

  const dailyReturns = [];
  for (let index = 1; index < closes.length; index += 1) {
    dailyReturns.push(closes[index] / closes[index - 1] - 1);
  }

  const windows = [];
  for (let end = 252; end < closes.length; end += 1) {
    const startClose = closes[end - 252];
    const endClose = closes[end];
    const annualReturn = endClose / startClose - 1;
    const dailySlice = dailyReturns.slice(end - 251, end + 1);
    const pathLength = dailySlice.reduce((sum, value) => sum + Math.abs(value), 0);
    windows.push({ annualReturn, pathLength });
  }

  const meanAnnualReturn = average(windows.map((item) => item.annualReturn)) || 0;
  const annualStd =
    Math.sqrt(
      average(
        windows.map((item) => {
          const delta = item.annualReturn - meanAnnualReturn;
          return delta * delta;
        })
      ) || 0
    ) || 0;
  const meanHistoricalPath = average(windows.map((item) => item.pathLength)) || 0;

  const lastYearReturns = dailyReturns.slice(-252);
  const lastYearPath = lastYearReturns.reduce((sum, value) => sum + Math.abs(value), 0);
  const lastYearStart = closes[closes.length - 253];
  const lastYearEnd = closes[closes.length - 1];
  const lastYearReturn = lastYearEnd / lastYearStart - 1;

  const averageVol = assetAverageVolatility(asset);
  const currentVol = assetCurrentVolatility(asset);
  const annualProbability = Number(asset?.horizons?.["1Y"]?.upside_probability ?? 0.5);

  const projectedTerminal = meanAnnualReturn * ((annualProbability - 0.5) * 2);
  const targetPathLength = Math.max(
    meanHistoricalPath,
    meanHistoricalPath *
      clamp(
        0.95 +
          (currentVol / Math.max(0.0001, averageVol || currentVol || 0.0001)) * 0.45 +
          Math.abs(projectedTerminal - meanAnnualReturn) * 1.25,
        0.95,
        2.8
      )
  );

  const baseLine = Array.from({ length: 253 }, (_, day) => ({
    day,
    value: meanAnnualReturn * (day / 252),
  }));
  const upperLine = Array.from({ length: 253 }, (_, day) => ({
    day,
    value: (meanAnnualReturn + 2 * annualStd) * (day / 252),
  }));
  const lowerLine = Array.from({ length: 253 }, (_, day) => ({
    day,
    value: (meanAnnualReturn - 2 * annualStd) * (day / 252),
  }));

  function fitSeriesInsideBeam(series, referenceLine, targetLength = null) {
    const deviations = series.map((point, index) => {
      const base = referenceLine[index]?.value ?? 0;
      const upper = upperLine[index]?.value ?? base;
      const lower = lowerLine[index]?.value ?? base;
      const allowed = Math.max(0.0001, Math.min(upper - base, base - lower) * 0.92);
      return {
        day: point.day,
        base,
        rawDeviation: point.value - base,
        allowed,
      };
    });

    let scale = 1;
    for (const item of deviations) {
      const raw = Math.abs(item.rawDeviation);
      if (raw <= 0.000001) continue;
      scale = Math.min(scale, item.allowed / raw);
    }

    let fitted = deviations.map((item) => ({
      day: item.day,
      value: item.base + item.rawDeviation * scale,
    }));

    if (targetLength) {
      const currentLength = fitted.reduce((sum, point, index) => {
        if (index === 0) return 0;
        return sum + Math.abs(point.value - fitted[index - 1].value);
      }, 0);

      if (currentLength > 0) {
        let maxExtraScale = 1;
        for (const item of deviations) {
          const raw = Math.abs(item.rawDeviation * scale);
          if (raw <= 0.000001) continue;
          maxExtraScale = Math.min(maxExtraScale, item.allowed / raw);
        }

        const desired = targetLength / currentLength;
        const finalScale = Math.max(0.75, Math.min(maxExtraScale, desired));
        fitted = deviations.map((item) => ({
          day: item.day,
          value: item.base + item.rawDeviation * scale * finalScale,
        }));
      }
    }

    return fitted;
  }

  function toIndexedSeries(series) {
    return series.map((point) => ({
      day: point.day,
      value: 100 * (1 + point.value),
    }));
  }

  const biasAnchors = [{ day: 0, cumulative: 0, probability: 0.5 }];
  for (const horizon of ["5D", "21D", "63D", "1Y"]) {
    const row = asset?.horizons?.[horizon];
    if (!row) continue;
    const day = Number(row.horizon_days ?? 0);
    if (!day || day > 252) continue;
    const probability = Number(row.upside_probability ?? 0.5);
    biasAnchors.push({
      day,
      cumulative: clamp((probability - 0.5) * 2, -0.95, 0.95),
      probability,
    });
  }
  if (!biasAnchors.find((anchor) => anchor.day === 252)) {
    biasAnchors.push({
      day: 252,
      cumulative: clamp((annualProbability - 0.5) * 2, -0.95, 0.95),
      probability: annualProbability,
    });
  }
  biasAnchors.sort((left, right) => left.day - right.day);

  const pathScale = targetPathLength / Math.max(0.0001, lastYearPath);
  const scaledTemplateReturns = lastYearReturns.map((value) => value * pathScale);
  const scaledAbsoluteReturns = lastYearReturns.map((value) => Math.abs(value) * pathScale);

  let projectedDailyReturns = scaledTemplateReturns.map((value, index) => {
    const day = index + 1;
    const bias = interpolateAnchors(biasAnchors, day).cumulative;
    const amplitude = scaledAbsoluteReturns[index] ?? Math.abs(value);
    return value + amplitude * bias * 0.55;
  });

  const initialTerminal = projectedDailyReturns.reduce((sum, value) => sum + value, 0);
  const firstAdjustment = (projectedTerminal - initialTerminal) / projectedDailyReturns.length;
  projectedDailyReturns = projectedDailyReturns.map((value) => value + firstAdjustment);

  const adjustedPathLength = projectedDailyReturns.reduce((sum, value) => sum + Math.abs(value), 0);
  if (adjustedPathLength < targetPathLength) {
    const boost = targetPathLength / Math.max(0.0001, adjustedPathLength);
    projectedDailyReturns = projectedDailyReturns.map((value) => value * boost);
  }

  const adjustedTerminal = projectedDailyReturns.reduce((sum, value) => sum + value, 0);
  const secondAdjustment = (projectedTerminal - adjustedTerminal) / projectedDailyReturns.length;
  projectedDailyReturns = projectedDailyReturns.map((value) => value + secondAdjustment);

  let cumulativeProjected = 0;
  let projectedSeries = [{ day: 0, value: 0 }];
  for (let index = 0; index < projectedDailyReturns.length; index += 1) {
    cumulativeProjected += projectedDailyReturns[index];
    projectedSeries.push({ day: index + 1, value: cumulativeProjected });
  }
  projectedSeries = fitSeriesInsideBeam(projectedSeries, baseLine, targetPathLength);

  const trailingSeries = [{ day: 0, value: 100 }];
  let indexedLevel = 100;
  for (let index = 0; index < lastYearReturns.length; index += 1) {
    indexedLevel *= 1 + lastYearReturns[index];
    trailingSeries.push({ day: index + 1, value: indexedLevel });
  }

  return {
    meanAnnualReturn,
    annualStd,
    meanHistoricalPath,
    lastYearPath,
    lastYearReturn,
    targetPathLength,
    baseLine: toIndexedSeries(baseLine),
    upperLine: toIndexedSeries(upperLine),
    lowerLine: toIndexedSeries(lowerLine),
    projectedSeries: toIndexedSeries(projectedSeries),
    trailingSeries,
    averageVol,
    currentVol,
  };
}

export function payoffRatio(forecast) {
  const expectedReturn = Number(forecast.expected_return ?? 0);
  const expectedDrawdown = Math.abs(Number(forecast.expected_drawdown ?? 0));
  if (!expectedDrawdown) {
    return null;
  }
  return expectedReturn / expectedDrawdown;
}

export function groupForecastsByAsset(forecasts) {
  const assetMap = new Map();

  for (const forecast of forecasts) {
    if (!assetMap.has(forecast.asset_code)) {
      assetMap.set(forecast.asset_code, {
        asset_code: forecast.asset_code,
        asset_name: forecast.asset_name,
        horizons: {},
      });
    }

    const asset = assetMap.get(forecast.asset_code);
    asset.horizons[forecast.horizon] = {
      ...forecast,
      risk_label: riskLabel(forecast.expected_drawdown),
      outcome_label: outcomeLabel(forecast),
      payoff_ratio: payoffRatio(forecast),
    };
  }

  const assets = Array.from(assetMap.values()).map((asset) => {
    const ordered = DASHBOARD_HORIZON_ORDER.map((horizon) => asset.horizons[horizon]).filter(Boolean);
    const positiveHorizons = ordered.filter((item) => Number(item.expected_return ?? 0) > 0).length;
    const defensiveHorizons = ordered.filter((item) => item.outcome_label === "defensive").length;
    const avgProbability =
      ordered.length > 0
        ? ordered.reduce((sum, item) => sum + Number(item.upside_probability ?? 0), 0) / ordered.length
        : null;

    return {
      ...asset,
      ordered_horizons: ordered,
      positive_horizons: positiveHorizons,
      defensive_horizons: defensiveHorizons,
      average_probability: avgProbability,
      best_horizon:
        ordered
          .slice()
          .sort((left, right) => Number(right.expected_return ?? 0) - Number(left.expected_return ?? 0))[0] || null,
    };
  });

  assets.sort((left, right) => {
    const rightScore = (right.average_probability ?? 0) - right.defensive_horizons * 0.05;
    const leftScore = (left.average_probability ?? 0) - left.defensive_horizons * 0.05;
    return rightScore - leftScore;
  });

  return assets;
}

export function findAssetForecast(assets, assetCode) {
  return assets.find((asset) => asset.asset_code === assetCode) || null;
}
