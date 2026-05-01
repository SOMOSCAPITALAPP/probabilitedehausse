import {
  DASHBOARD_HORIZON_ORDER,
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
  horizonLabel,
  performanceTone,
  riskLabel,
  zScoreTone,
} from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
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

function probabilityTone(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.65) return "prob-positive";
  if (numeric <= 0.35) return "prob-negative";
  return "prob-neutral";
}

function outlookTone(value) {
  if (value >= 0.65) return "outcome-favorable";
  if (value <= 0.35) return "outcome-defensive";
  return "outcome-mixed";
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);

  const averageProbability =
    forecasts.length > 0
      ? forecasts.reduce((sum, item) => sum + Number(item.upside_probability ?? 0), 0) / forecasts.length
      : null;
  const stretchedHorizons = forecasts.filter((item) => Math.abs(Number(item.z_score ?? 0)) >= 1).length;
  const lowProbabilityHorizons = forecasts.filter((item) => Number(item.upside_probability ?? 0) <= 0.35).length;

  return (
    <main className="dashboard-shell">
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

      <section className="section dashboard-hero dashboard-hero-compact">
        <div className="container">
          <p className="eyebrow">Northcurve Dashboard</p>
          <div className="dashboard-headline dashboard-headline-compact">
            <div>
              <h1 className="dashboard-title dashboard-title-compact">Passé observe, probabilite future, horizon par horizon.</h1>
              <p className="hero-text compact-copy">
                Le moteur utilise une lecture prudente: la probabilite de hausse est la queue d'une loi normale
                construite sur la moyenne et la volatilite historiques de l'horizon considere.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Data source</span>
              <strong>{sourceLabel(source)}</strong>
              <span className="status-label">Updated at</span>
              <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "Demo mode"}</strong>
              {diagnostics.length > 0 ? (
                <>
                  <span className="status-label">Diagnostics</span>
                  <strong>{diagnostics[0]}</strong>
                </>
              ) : null}
            </div>
          </div>

          <div className="dashboard-summary-grid dashboard-summary-grid-compact">
            <article className="summary-card">
              <span className="status-label">Actifs</span>
              <strong>{assets.length}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Probabilite moyenne</span>
              <strong>{averageProbability === null ? "--" : formatPercent(averageProbability, 0)}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Horizons etires</span>
              <strong>{stretchedHorizons}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">Probabilites basses</span>
              <strong>{lowProbabilityHorizons}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="section dashboard-table-section dashboard-table-section-compact">
        <div className="container">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Asset view</p>
            <h2>Une lecture simple a parcourir.</h2>
            <p>D'abord ce que l'actif a deja fait. Ensuite ce que le modele juge encore probable.</p>
          </div>

          <div className="asset-dashboard-list compact-list">
            {assets.map((asset) => (
              <article className="asset-dashboard-card compact-card" key={asset.asset_code}>
                <div className="asset-dashboard-header compact-header">
                  <div>
                    <p className="forecast-asset-code">{asset.asset_code}</p>
                    <h3>{asset.asset_name}</h3>
                  </div>
                  <a className="button button-secondary compact-button" href={`/dashboard/${asset.asset_code}`}>
                    Analyse detaillee
                  </a>
                </div>

                <div className="asset-mini-section">
                  <div className="asset-mini-heading">
                    <span>Performance passee</span>
                  </div>
                  <div className="mini-horizon-grid">
                    {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                      const item = asset.horizons[horizon];
                      return (
                        <div className="mini-horizon-card" key={`${asset.asset_code}-perf-${horizon}`}>
                          <span>{horizonLabel(horizon)}</span>
                          <strong className={item ? performanceTone(item.trailing_return) : ""}>
                            {item ? formatSignedPercent(item.trailing_return, 1) : "--"}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="asset-mini-section">
                  <div className="asset-mini-heading">
                    <span>Probabilite future</span>
                  </div>
                  <div className="mini-horizon-grid">
                    {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                      const item = asset.horizons[horizon];
                      if (!item) {
                        return (
                          <div className="mini-horizon-card mini-horizon-card-muted" key={`${asset.asset_code}-future-${horizon}`}>
                            <span>{horizonLabel(horizon)}</span>
                            <strong>--</strong>
                          </div>
                        );
                      }

                      const risk = riskLabel(item.expected_drawdown);
                      return (
                        <div className="mini-horizon-card mini-horizon-card-future" key={`${asset.asset_code}-future-${horizon}`}>
                          <div className="mini-horizon-top">
                            <span>{horizonLabel(horizon)}</span>
                            <span className={`mini-state ${outlookTone(item.upside_probability)}`}>{formatPercent(item.upside_probability, 0)}</span>
                          </div>
                          <strong className={probabilityTone(item.upside_probability)}>{formatPercent(item.upside_probability, 1)}</strong>
                          <div className="mini-metrics">
                            <div>
                              <span>Norme</span>
                              <em>{formatSignedPercent(item.historical_mean, 1)}</em>
                            </div>
                            <div>
                              <span>Z</span>
                              <em className={zScoreTone(item.z_score)}>{item.z_score?.toFixed(2) ?? "--"}</em>
                            </div>
                            <div>
                              <span>Risk</span>
                              <em className={riskTone(risk)}>{risk}</em>
                            </div>
                            <div>
                              <span>Conf.</span>
                              <em className={confidenceTone(item.confidence_label)}>{item.confidence_label}</em>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
