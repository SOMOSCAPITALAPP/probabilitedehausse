import {
  DASHBOARD_HORIZON_ORDER,
  assetAnnualMean,
  assetAverageVolatility,
  assetCurrentVolatility,
  buildAssetPathStudy,
  findAssetForecast,
  formatPercent,
  formatSignedPercent,
  getAssetHistory,
  getForecasts,
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
  const safeMin = Math.min(min, 0);
  const safeMax = Math.max(max, 0);
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

export default async function AssetDashboardPage({ params }) {
  const { assetCode } = params;
  const { forecasts, updatedAt } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const asset = findAssetForecast(assets, assetCode);
  const historyRows = await getAssetHistory(assetCode);

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

  const allSeries = [
    ...(pathModel?.baseLine ?? []),
    ...(pathModel?.upperLine ?? []),
    ...(pathModel?.lowerLine ?? []),
    ...(pathModel?.projectedSeries ?? []),
    ...(pathModel?.trailingSeries ?? []),
  ];
  const valueMin = allSeries.length ? Math.min(...allSeries.map((point) => point.value), 0) : -0.2;
  const valueMax = allSeries.length ? Math.max(...allSeries.map((point) => point.value), 0) : 0.2;
  const axis = axisLabels(width, height, padding);
  const projectedPath = pathModel ? curvePath(pathModel.projectedSeries, width, height, padding, valueMin, valueMax) : "";
  const basePath = pathModel ? curvePath(pathModel.baseLine, width, height, padding, valueMin, valueMax) : "";
  const upperPath = pathModel ? curvePath(pathModel.upperLine, width, height, padding, valueMin, valueMax) : "";
  const lowerPath = pathModel ? curvePath(pathModel.lowerLine, width, height, padding, valueMin, valueMax) : "";
  const trailingPath = pathModel ? curvePath(pathModel.trailingSeries, width, height, padding, valueMin, valueMax) : "";
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
              <p className="hero-text dashboard-clean-copy">
                Le graphique ci-dessous projette un chemin quotidien a 1 an. Il part de la moyenne historique,
                de la volatilite moyenne, d'une estimation de volatilite actuelle et des probabilites deja
                calculees sur les horizons 5 jours a 1 an.
              </p>
              <p className="hero-text dashboard-clean-copy">
                La courbe grise correspond au chemin reel de la derniere annee. La courbe verte epaisse
                correspond a la projection prudente sur l'annee a venir. La droite bleue pointillee est la
                moyenne historique lineaire, et les deux lignes sable tracent le faisceau moyenne ± 2
                ecarts-types.
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
          <article className="asset-clean-card asset-curve-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>Projection quotidienne a 1 an</h3>
              </div>
            </div>

            <div className="asset-curve-shell">
              <svg viewBox={`0 0 ${width} ${height}`} className="asset-curve-chart" role="img" aria-label="Projected 1-year path">
                {yTicks.map((tick) => {
                  const y = yForValue(tick, height, padding, valueMin, valueMax);
                  return (
                    <g key={`y-${tick}`}>
                      <line x1={axis.x0} y1={y} x2={axis.x1} y2={y} className="curve-grid-line" />
                      <text x={axis.x0 - 10} y={y + 4} className="curve-tick-label curve-tick-label-y">
                        {formatSignedPercent(tick, 0)}
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
                    <path d={trailingPath} className="curve-history-line" />
                    <path d={projectedPath} className="curve-line" />
                  </>
                ) : null}
              </svg>
              <div className="asset-curve-legend">
                <span><i className="legend-line legend-line-mean" />Moyenne historique lineaire</span>
                <span><i className="legend-line legend-line-band" />Faisceau moyenne ± 2 ecarts-types</span>
                <span><i className="legend-line legend-line-history" />Chemin reel de la derniere annee</span>
                <span><i className="legend-line legend-line-projected" />Projection prudente a 1 an</span>
              </div>
            </div>
          </article>

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
                    if (!item) {
                      return (
                        <tr key={`${asset.asset_code}-${horizon}`}>
                          <td>{horizonLabel(horizon)}</td>
                          <td colSpan={7} className="empty-cell">
                            --
                          </td>
                        </tr>
                      );
                    }

                    const risk = riskLabel(item.expected_drawdown);

                    return (
                      <tr key={`${asset.asset_code}-${horizon}`}>
                        <td>{horizonLabel(horizon)}</td>
                        <td className={performanceTone(item.trailing_return)}>
                          {formatSignedPercent(item.trailing_return, 1)}
                        </td>
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
        </div>
      </section>
    </main>
  );
}
