import {
  DASHBOARD_HORIZON_ORDER,
  assetCurrentVolatility,
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
  horizonLabel,
  performanceTone,
  riskLabel,
} from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
}

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

function avg(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);

  const avgProbability = avg(forecasts.map((item) => Number(item.upside_probability ?? 0)));
  const avgCurrentVol = avg(assets.map((asset) => assetCurrentVolatility(asset)).filter((value) => Number.isFinite(value)));
  const lowProb = forecasts.filter((item) => Number(item.upside_probability ?? 0) <= 0.35).length;

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
            <a className="button button-secondary" href="/">
              Retour
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-clean-hero">
        <div className="container">
          <p className="eyebrow">Northcurve Dashboard</p>
          <div className="dashboard-clean-top">
            <div>
              <h1 className="dashboard-clean-title">Performance passee, probabilite future, sans bruit inutile.</h1>
              <p className="hero-text dashboard-clean-copy">
                Chaque actif compare sa performance recente a sa norme historique. La probabilite de hausse
                est volontairement prudente, puis declinée sur tous les horizons disponibles.
              </p>
            </div>

            <aside className="dashboard-clean-status">
              <div>
                <span className="status-label">Source</span>
                <strong>{sourceLabel(source)}</strong>
              </div>
              <div>
                <span className="status-label">Updated</span>
                <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "Demo mode"}</strong>
              </div>
              {diagnostics.length > 0 ? (
                <div>
                  <span className="status-label">Diagnostics</span>
                  <strong>{diagnostics[0]}</strong>
                </div>
              ) : null}
            </aside>
          </div>

          <div className="dashboard-clean-summary">
            <article className="summary-card">
              <span className="status-label">Actifs</span>
              <strong>{assets.length}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Proba moyenne</span>
              <strong>{avgProbability === null ? "--" : formatPercent(avgProbability, 0)}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Vol actuelle moy.</span>
              <strong>{avgCurrentVol === null ? "--" : formatPercent(avgCurrentVol, 1)}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Probabilites basses</span>
              <strong>{lowProb}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Asset table</p>
            <h2>Une grille dense mais propre.</h2>
            <p>Le detail graphique a 1 an s'ouvre sur chaque page actif.</p>
          </div>

          <div className="dashboard-clean-list">
            {assets.map((asset) => (
              <article className="asset-clean-card" key={asset.asset_code}>
                <div className="asset-clean-header">
                  <div>
                    <p className="forecast-asset-code">{asset.asset_code}</p>
                    <h3>{asset.asset_name}</h3>
                  </div>
                  <a className="button button-secondary compact-button" href={`/dashboard/${asset.asset_code}`}>
                    Voir l'actif
                  </a>
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
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
