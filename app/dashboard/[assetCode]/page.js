import {
  DASHBOARD_HORIZON_ORDER,
  buildHistoricalHorizonMetrics,
  assetAnnualMean,
  assetAverageVolatility,
  assetCurrentVolatility,
  buildAssetPathStudy,
  buildBetaScenarioAnalysis,
  buildBenchmarkRelativeStudy,
  buildMovingAverageTrend,
  findAssetForecast,
  formatPercent,
  formatSignedPercent,
  getAssetHistory,
  getForecasts,
  getReferenceBenchmarkPayload,
  getYahooAssetSnapshot,
  groupForecastsByAsset,
  horizonLabel,
  performanceTone,
  riskLabel,
} from "../../../lib/forecast-data";

export const dynamic = "force-dynamic";

function probabilityTone(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.65) return "prob-positive";
  if (numeric <= 0.35) return "prob-negative";
  return "prob-neutral";
}

function confidenceTone(label) {
  if (label === "high") return "confidence-high";
  if (label === "medium") return "confidence-medium";
  return "confidence-low";
}

function riskTone(label) {
  if (label === "high") return "risk-high";
  if (label === "medium") return "risk-medium";
  return "risk-low";
}

function curvePath(points, width, height, padding, min, max) {
  const span = Math.max(0.0001, max - min);

  const coords = points.map((point) => {
    const x = padding + (point.day / 252) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return [x, y];
  });

  return coords.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function axisLabels(width, height, padding) {
  return {
    x0: padding,
    x1: width - padding,
    y0: height - padding,
    y1: padding,
  };
}

function chartTickValues(min, max, steps = 4) {
  const safeMin = Math.min(min, 100);
  const safeMax = Math.max(max, 100);
  const span = safeMax - safeMin;

  if (span <= 0.0001) {
    return [safeMin, safeMax];
  }

  return Array.from({ length: steps + 1 }, (_, index) => safeMin + (span * index) / steps);
}

function yForValue(value, height, padding, min, max) {
  const span = Math.max(0.0001, max - min);
  return height - padding - ((value - min) / span) * (height - padding * 2);
}

function xForDay(day, width, padding) {
  return padding + (day / 252) * (width - padding * 2);
}

function annualizedDisplay(historyItem) {
  if (!historyItem || historyItem.annualizedReturn === null || historyItem.annualizedReturn === undefined) {
    return "--";
  }
  return formatSignedPercent(historyItem.annualizedReturn, 1);
}

function formatLargeNumber(value) {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  if (numeric >= 1e12) return `${(numeric / 1e12).toFixed(3)}T`;
  if (numeric >= 1e9) return `${(numeric / 1e9).toFixed(3)}B`;
  if (numeric >= 1e6) return `${(numeric / 1e6).toFixed(3)}M`;
  return numeric.toFixed(2);
}

function formatDecimal(value, digits = 2) {
  if (value === null || value === undefined) return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toFixed(digits);
}

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDividend(dividend, dividendYield) {
  if ((dividend === null || dividend === undefined) && (dividendYield === null || dividendYield === undefined)) {
    return "--";
  }
  const left = dividend === null || dividend === undefined ? "--" : formatDecimal(dividend, 2);
  const right = dividendYield === null || dividendYield === undefined ? "--" : formatPercent(dividendYield, 2);
  return `${left} (${right})`;
}

function formatPrice(value, currency = null) {
  if (value === null || value === undefined) return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: numeric >= 1000 ? 0 : 2,
    maximumFractionDigits: numeric >= 1000 ? 0 : 2,
  }).format(numeric);
  return currency ? `${formatted} ${currency}` : formatted;
}

function scenarioBandTone(label) {
  if (label === "high-upside") return "scenario-band-positive";
  if (label === "constructive") return "scenario-band-constructive";
  if (label === "high-downside") return "scenario-band-negative";
  if (label === "fragile") return "scenario-band-fragile";
  return "scenario-band-balanced";
}

function trendTone(label) {
  if (label === "haussiere") return "trend-positive";
  if (label === "haussiere fragile") return "trend-fragile";
  if (label === "baissiere") return "trend-negative";
  return "trend-mixed";
}

export default async function AssetDashboardPage({ params }) {
  const { assetCode } = params;
  const { forecasts, updatedAt } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const asset = findAssetForecast(assets, assetCode);
  const historyRows = await getAssetHistory(assetCode);
  const benchmarkPayload = await getReferenceBenchmarkPayload(asset);
  const historyMetrics = buildHistoricalHorizonMetrics(historyRows);
  const movingAverageTrend = buildMovingAverageTrend(historyRows);
  const yahooSnapshot = await getYahooAssetSnapshot(asset);
  const scenarioAnalysis = buildBetaScenarioAnalysis(asset, yahooSnapshot);
  const benchmarkStudy = buildBenchmarkRelativeStudy(asset, historyRows, benchmarkPayload);

  if (!asset) {
    return (
      <main className="dashboard-shell dashboard-clean-shell">
        <section className="section dashboard-clean-section">
          <div className="container">
            <p className="eyebrow">Northcurve</p>
            <h1 className="dashboard-clean-title">Actif introuvable.</h1>
            <p className="hero-text dashboard-clean-copy">Aucune ligne disponible pour cet actif.</p>
            <a className="button button-secondary" href="/dashboard">
              Retour au dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }

  const pathModel = buildAssetPathStudy(asset, historyRows);
  const width = 920;
  const height = 320;
  const padding = 26;
  const annualMean = pathModel?.meanAnnualReturn ?? assetAnnualMean(asset);
  const averageVol = pathModel?.averageVol ?? assetAverageVolatility(asset);
  const currentVol = pathModel?.currentVol ?? assetCurrentVolatility(asset);
  const latestClose = historyRows.length ? Number(historyRows[historyRows.length - 1]?.close ?? null) : null;
  const latestPrice = yahooSnapshot?.currentPrice ?? latestClose;
  const latestCurrency = yahooSnapshot?.currency ?? null;

  const allSeries = [
    ...(pathModel?.baseLine ?? []),
    ...(pathModel?.upperLine ?? []),
    ...(pathModel?.lowerLine ?? []),
    ...(pathModel?.projectedSeries ?? []),
  ];
  const valueMin = allSeries.length ? Math.min(...allSeries.map((point) => point.value), 100) : 80;
  const valueMax = allSeries.length ? Math.max(...allSeries.map((point) => point.value), 100) : 120;
  const axis = axisLabels(width, height, padding);
  const projectedPath = pathModel ? curvePath(pathModel.projectedSeries, width, height, padding, valueMin, valueMax) : "";
  const basePath = pathModel ? curvePath(pathModel.baseLine, width, height, padding, valueMin, valueMax) : "";
  const upperPath = pathModel ? curvePath(pathModel.upperLine, width, height, padding, valueMin, valueMax) : "";
  const lowerPath = pathModel ? curvePath(pathModel.lowerLine, width, height, padding, valueMin, valueMax) : "";
  const yTicks = chartTickValues(valueMin, valueMax, 4);
  const xTicks = [
    { day: 0, label: "0" },
    { day: 63, label: "3M" },
    { day: 126, label: "6M" },
    { day: 189, label: "9M" },
    { day: 252, label: "1Y" },
  ];

  return (
    <main className="dashboard-shell dashboard-clean-shell">
      <header className="site-header">
        <div className="container nav-row">
          <a className="brand" href="/">
            Northcurve
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="/">Landing</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/backtest">Backtest</a>
          </nav>

          <div className="nav-actions">
            <a className="button button-secondary" href="/dashboard">
              Retour
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-clean-hero">
        <div className="container">
          <p className="eyebrow">Asset detail</p>
          <div className="dashboard-clean-top">
            <div>
              <p className="forecast-asset-code">{asset.asset_code}</p>
              <h1 className="dashboard-clean-title">{asset.asset_name}</h1>
              <div className="asset-hero-price-row">
                <div className="asset-hero-price-block">
                  <span>Dernier cours</span>
                  <strong>{formatPrice(latestPrice, latestCurrency)}</strong>
                </div>
                {latestClose !== null ? (
                  <div className="asset-hero-price-block asset-hero-price-secondary">
                    <span>Dernier close daily</span>
                    <strong>{formatPrice(latestClose, latestCurrency)}</strong>
                  </div>
                ) : null}
                {movingAverageTrend ? (
                  <div className={`asset-hero-price-block asset-trend-block ${trendTone(movingAverageTrend.label)}`}>
                    <span>Tendance 50j / 200j</span>
                    <strong>{movingAverageTrend.label}</strong>
                  </div>
                ) : null}
              </div>
              <p className="hero-text dashboard-clean-copy">
                Cette fiche se lit en deux temps. D'abord les performances déjà réalisées et la lecture
                probabiliste par horizon. Ensuite seulement la projection visuelle à un an, construite à
                partir de la moyenne historique, de la volatilité moyenne, de la volatilité actuelle et du
                chemin quotidien observé sur la dernière année.
              </p>
            </div>

            <aside className="dashboard-clean-status">
              <div>
                <span className="status-label">Updated</span>
                <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "--"}</strong>
              </div>
              <div>
                <span className="status-label">Moyenne 1 an</span>
                <strong>{formatSignedPercent(annualMean, 1)}</strong>
              </div>
              <div>
                <span className="status-label">Vol moyenne</span>
                <strong>{formatPercent(averageVol, 1)}</strong>
              </div>
              <div>
                <span className="status-label">Vol actuelle</span>
                <strong>{formatPercent(currentVol, 1)}</strong>
              </div>
              <div>
                <span className="status-label">Perf derniere annee</span>
                <strong>{formatSignedPercent(pathModel?.lastYearReturn ?? 0, 1)}</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container">
          {yahooSnapshot ? (
            <article className="asset-clean-card snapshot-card premium-profile-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>Market profile</h3>
                </div>
              </div>

              <div className="snapshot-grid">
                <div className="snapshot-item">
                  <span>Market Cap (intraday)</span>
                  <strong>{formatLargeNumber(yahooSnapshot.marketCap)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Beta (5Y Monthly)</span>
                  <strong>{formatDecimal(yahooSnapshot.beta, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>PE Ratio (TTM)</span>
                  <strong>{formatDecimal(yahooSnapshot.peRatio, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>EPS (TTM)</span>
                  <strong>{formatDecimal(yahooSnapshot.eps, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Earnings Date (est.)</span>
                  <strong>{formatDateLabel(yahooSnapshot.earningsDate)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Forward Dividend &amp; Yield</span>
                  <strong>{formatDividend(yahooSnapshot.forwardDividend, yahooSnapshot.dividendYield)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Ex-Dividend Date</span>
                  <strong>{formatDateLabel(yahooSnapshot.exDividendDate)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>1y Target Est</span>
                  <strong>{formatDecimal(yahooSnapshot.targetPrice, 2)}</strong>
                </div>
              </div>
            </article>
          ) : null}

          {benchmarkStudy ? (
            <article className="asset-clean-card benchmark-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>Comportement sur 1 an vs S&amp;P 500</h3>
                </div>
                <span className={`outcome-pill ${performanceTone(benchmarkStudy.excessReturn)}`}>
                  {benchmarkStudy.relativeLabel}
                </span>
              </div>

              <div className="benchmark-grid">
                <div className="benchmark-item">
                  <span>{asset.asset_name}</span>
                  <strong className={performanceTone(benchmarkStudy.assetReturn)}>
                    {formatSignedPercent(benchmarkStudy.assetReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>{benchmarkStudy.benchmarkName}</span>
                  <strong className={performanceTone(benchmarkStudy.benchmarkReturn)}>
                    {formatSignedPercent(benchmarkStudy.benchmarkReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>Surperformance</span>
                  <strong className={performanceTone(benchmarkStudy.excessReturn)}>
                    {formatSignedPercent(benchmarkStudy.excessReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>Beta realise</span>
                  <strong>{benchmarkStudy.realizedBeta ? formatDecimal(benchmarkStudy.realizedBeta, 2) : "--"}</strong>
                </div>
              </div>

              <div className="benchmark-grid benchmark-grid-secondary">
                <div className="benchmark-item">
                  <span>Jours de hausse du SPX surperformes</span>
                  <strong>
                    {benchmarkStudy.upCaptureShare !== null ? formatPercent(benchmarkStudy.upCaptureShare, 0) : "--"}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>Jours de baisse du SPX mieux resistes</span>
                  <strong>
                    {benchmarkStudy.downCaptureShare !== null ? formatPercent(benchmarkStudy.downCaptureShare, 0) : "--"}
                  </strong>
                </div>
              </div>
            </article>
          ) : null}

          {scenarioAnalysis ? (
            <article className="asset-clean-card scenario-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>Interpretation scenario</h3>
                </div>
                <span className={`outcome-pill ${scenarioBandTone(scenarioAnalysis.probabilityBand)}`}>
                  {scenarioAnalysis.profile}
                </span>
              </div>

              <p className="scenario-intro">{scenarioAnalysis.commentary}</p>

              <div className="scenario-grid">
                <div className="scenario-panel">
                  <div className="scenario-panel-top">
                    <span>1 mois</span>
                    <strong>Lecture beta + signal court terme</strong>
                  </div>
                  <div className="scenario-list">
                    {scenarioAnalysis.oneMonthRows.map((row) => (
                      <div key={`1m-${row.label}`} className="scenario-row">
                        <span>{row.label}</span>
                        <strong className={performanceTone(row.probableReturn)}>
                          {formatSignedPercent(row.probableReturn, 1)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="scenario-panel">
                  <div className="scenario-panel-top">
                    <span>1 an</span>
                    <strong>Lecture beta + carry + profil global</strong>
                  </div>
                  <div className="scenario-list">
                    {scenarioAnalysis.oneYearRows.map((row) => (
                      <div key={`1y-${row.label}`} className="scenario-row">
                        <span>{row.label}</span>
                        <strong className={performanceTone(row.probableReturn)}>
                          {formatSignedPercent(row.probableReturn, 1)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <article className="asset-clean-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>Table des horizons</h3>
              </div>
            </div>

            <div className="asset-clean-table-wrap">
              <table className="asset-clean-table">
                <thead>
                  <tr>
                    <th>Horizon</th>
                    <th>Perf</th>
                    <th>Perf ann.</th>
                    <th>Norme</th>
                    <th>Vol</th>
                    <th>Prob.</th>
                    <th>Drawdown</th>
                    <th>Risk</th>
                    <th>Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                    const item = asset.horizons[horizon];
                    const historyItem = historyMetrics[horizon];

                    if (!item) {
                      return (
                        <tr key={`${asset.asset_code}-${horizon}`}>
                          <td>{horizonLabel(horizon)}</td>
                          <td className={historyItem ? performanceTone(historyItem.trailingReturn) : "empty-cell"}>
                            {historyItem ? formatSignedPercent(historyItem.trailingReturn, 1) : "--"}
                          </td>
                          <td>{annualizedDisplay(historyItem)}</td>
                          <td colSpan={6} className="empty-cell">--</td>
                        </tr>
                      );
                    }

                    const risk = riskLabel(item.expected_drawdown);
                    const trailingValue = historyItem?.trailingReturn ?? item.trailing_return;

                    return (
                      <tr key={`${asset.asset_code}-${horizon}`}>
                        <td>{horizonLabel(horizon)}</td>
                        <td className={performanceTone(trailingValue)}>
                          {formatSignedPercent(trailingValue, 1)}
                        </td>
                        <td>{annualizedDisplay(historyItem)}</td>
                        <td>{formatSignedPercent(item.historical_mean, 1)}</td>
                        <td>{formatPercent(item.historical_vol, 1)}</td>
                        <td className={probabilityTone(item.upside_probability)}>
                          {formatPercent(item.upside_probability, 1)}
                        </td>
                        <td>{formatSignedPercent(item.expected_drawdown, 1)}</td>
                        <td className={riskTone(risk)}>{risk}</td>
                        <td>
                          <span className={`confidence-pill ${confidenceTone(item.confidence_label)}`}>
                            {item.confidence_label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="asset-clean-card asset-curve-card asset-curve-card-bottom">
            <div className="asset-clean-header asset-curve-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>Projection quotidienne a 1 an</h3>
              </div>
              <p className="asset-curve-header-copy">
                Courbe verte: scénario prudent projeté. Droite bleue: moyenne historique linéaire.
                Faisceau sable: moyenne plus ou moins 2 écarts-types.
              </p>
            </div>

            <div className="asset-curve-shell">
              <svg viewBox={`0 0 ${width} ${height}`} className="asset-curve-chart" role="img" aria-label="Projected 1-year path">
                {yTicks.map((tick) => {
                  const y = yForValue(tick, height, padding, valueMin, valueMax);
                  return (
                    <g key={`y-${tick}`}>
                      <line x1={axis.x0} y1={y} x2={axis.x1} y2={y} className="curve-grid-line" />
                      <text x={axis.x0 - 10} y={y + 4} className="curve-tick-label curve-tick-label-y">
                        {tick.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                {xTicks.map((tick) => {
                  const x = xForDay(tick.day, width, padding);
                  return (
                    <g key={`x-${tick.day}`}>
                      <line x1={x} y1={axis.y1} x2={x} y2={axis.y0} className="curve-grid-line curve-grid-line-vertical" />
                      <text x={x} y={axis.y0 + 18} textAnchor="middle" className="curve-tick-label">
                        {tick.label}
                      </text>
                    </g>
                  );
                })}
                <line x1={axis.x0} y1={axis.y0} x2={axis.x1} y2={axis.y0} className="curve-axis" />
                <line x1={axis.x0} y1={axis.y1} x2={axis.x0} y2={axis.y0} className="curve-axis" />
                {pathModel ? (
                  <>
                    <path d={upperPath} className="curve-band-line" />
                    <path d={lowerPath} className="curve-band-line" />
                    <path d={basePath} className="curve-mean-line" />
                    <path d={projectedPath} className="curve-line" />
                  </>
                ) : null}
              </svg>
              <div className="asset-curve-legend">
                <span><i className="legend-line legend-line-projected" />Projection prudente a 1 an</span>
                <span><i className="legend-line legend-line-mean" />Moyenne historique lineaire</span>
                <span><i className="legend-line legend-line-band" />Faisceau moyenne plus ou moins 2 ecarts-types</span>
              </div>
            </div>
          </article>

          <article className="asset-clean-card methodology-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>Principes de lecture</h3>
              </div>
            </div>

            <div className="methodology-grid">
              <div className="methodology-panel">
                <h4>Chemin parcouru</h4>
                <p>
                  La performance terminale ne suffit pas. Northcurve suit aussi le chemin parcouru, c'est-a-dire
                  la somme des variations quotidiennes absolues sur la fenetre. Deux actifs peuvent finir a
                  plus 10 pour cent sur un an avec des signatures de risque tres differentes. Cette notion sert
                  a calibrer la nervosite visuelle et la largeur du scenario projete.
                </p>
              </div>

              <div className="methodology-panel">
                <h4>Probabilites prudentes</h4>
                <p>
                  La probabilite de hausse compare la performance trailing a sa moyenne historique et a sa
                  volatilite historique sur chaque horizon. Plus un actif est etire au-dessus de sa norme,
                  relativement a sa volatilite historique, plus la probabilite future baisse. Le cadre retenu
                  ici est volontairement conservateur pour penaliser les extensions de marche.
                </p>
              </div>

              <div className="methodology-panel">
                <h4>Lecture multi-horizons</h4>
                <p>
                  La table croise le passe observe et le futur probable. La colonne Perf mesure ce qui vient
                  reellement de se produire. La colonne Norme rappelle la moyenne historique sur l'horizon.
                  La probabilite est ensuite une lecture seche et prudente de l'ecart entre les deux.
                </p>
              </div>

              <div className="methodology-panel">
                <h4>Projection a un an</h4>
                <p>
                  Le graphique de fin ne cherche pas a dessiner un prix exact. Il projette un indice base 100
                  avec une nervosite quotidienne proche de l'historique recent, puis l'oriente avec la moyenne
                  historique et les probabilites deja calculees sur les horizons courts et intermediaires.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
