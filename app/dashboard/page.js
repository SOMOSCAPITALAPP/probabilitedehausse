import {
  DASHBOARD_HORIZON_ORDER,
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
} from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

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

function outcomeTone(label) {
  if (label === "favorable") return "outcome-favorable";
  if (label === "constructive") return "outcome-constructive";
  if (label === "defensive") return "outcome-defensive";
  return "outcome-mixed";
}

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
}

function horizonLabel(horizon) {
  if (horizon === "5D") return "5 jours";
  if (horizon === "21D") return "21 jours";
  if (horizon === "63D") return "63 jours";
  return horizon;
}

function payoffDisplay(value) {
  if (value === null || value === undefined) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}x`;
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);

  const favorableCount = forecasts.filter((item) => Number(item.expected_return ?? 0) > 0 && Number(item.upside_probability ?? 0) >= 0.6).length;
  const defensiveCount = forecasts.filter((item) => Number(item.expected_return ?? 0) <= 0 || Number(item.upside_probability ?? 0) < 0.45).length;
  const averageDrawdown =
    forecasts.length > 0
      ? forecasts.reduce((sum, item) => sum + Math.abs(Number(item.expected_drawdown ?? 0)), 0) / forecasts.length
      : null;
  const topAssets = assets.slice(0, 4);

  return (
    <main className="dashboard-shell">
      <header className="site-header">
        <div className="container nav-row">
          <a className="brand" href="/">
            Northcurve
          </a>

          <nav className="desktop-nav" aria-label="Navigation principale">
            <a href="/">Landing</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/backtest">Backtest</a>
          </nav>

          <div className="nav-actions">
            <a className="button button-secondary" href="/">
              Retour au site
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-hero">
        <div className="container">
          <p className="eyebrow">Northcurve Dashboard</p>
          <div className="dashboard-headline">
            <div>
              <h1 className="dashboard-title">Lire le risque et le potentiel sur tous les horizons.</h1>
              <p className="hero-text">
                Pour chaque actif, le tableau ci-dessous montre ce qu’il peut rapporter, le risque
                de drawdown associé, et si la configuration reste favorable, constructive ou
                défensive selon l’horizon.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Data source</span>
              <strong>{sourceLabel(source)}</strong>
              <span className="status-label">Updated at</span>
              <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "Demo mode"}</strong>
              {source === "demo" && diagnostics.length > 0 ? (
                <>
                  <span className="status-label">Diagnostics</span>
                  <strong>{diagnostics[0]}</strong>
                </>
              ) : null}
            </div>
          </div>

          <div className="dashboard-summary-grid">
            <article className="summary-card">
              <span className="status-label">Actifs suivis</span>
              <strong>{assets.length}</strong>
              <p>Actifs actuellement couverts dans la lecture multi-horizons.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Horizons favorables</span>
              <strong>{favorableCount}</strong>
              <p>Cas où le potentiel attendu reste positif avec une probabilité plus solide.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Horizons défensifs</span>
              <strong>{defensiveCount}</strong>
              <p>Cas où le couple rendement / probabilité devient peu attractif.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Drawdown moyen</span>
              <strong>{averageDrawdown === null ? "--" : formatPercent(averageDrawdown, 1)}</strong>
              <p>Risque moyen de parcours attendu sur l’ensemble des horizons affichés.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section dashboard-table-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Multi-horizon table</p>
            <h2>Quel horizon peut vraiment faire gagner de l’argent ?</h2>
            <p>
              Chaque ligne regroupe les trois horizons d’un même actif. L’objectif est de repérer
              vite où le rendement attendu reste positif, où le drawdown devient trop élevé, et où
              la lecture devient défensive.
            </p>
          </div>

          <div className="asset-table-shell">
            <div className="asset-table">
              <div className="asset-table-header">
                <div>Actif</div>
                {DASHBOARD_HORIZON_ORDER.map((horizon) => (
                  <div key={horizon}>{horizonLabel(horizon)}</div>
                ))}
              </div>

              {assets.map((asset) => (
                <div className="asset-table-row" key={asset.asset_code}>
                  <div className="asset-table-asset">
                    <p className="forecast-asset-code">{asset.asset_code}</p>
                    <h3>{asset.asset_name}</h3>
                    <p className="asset-row-note">
                      {asset.positive_horizons} horizon{asset.positive_horizons > 1 ? "s" : ""} positif
                      {asset.defensive_horizons > 0 ? `, ${asset.defensive_horizons} defensif` : ""}
                    </p>
                  </div>

                  {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                    const item = asset.horizons[horizon];
                    if (!item) {
                      return (
                        <div className="asset-horizon-cell asset-horizon-empty" key={`${asset.asset_code}-${horizon}`}>
                          --
                        </div>
                      );
                    }

                    return (
                      <div className="asset-horizon-cell" key={`${asset.asset_code}-${horizon}`}>
                        <div className="asset-cell-top">
                          <span className={`outcome-pill ${outcomeTone(item.outcome_label)}`}>{item.outcome_label}</span>
                          <span className={`confidence-pill ${confidenceTone(item.confidence_label)}`}>
                            {item.confidence_label}
                          </span>
                        </div>
                        <div className="asset-cell-main">
                          <span>Probabilité</span>
                          <strong>{formatPercent(item.upside_probability, 1)}</strong>
                        </div>
                        <div className="asset-cell-metrics">
                          <div>
                            <span>Rendement</span>
                            <strong>{formatSignedPercent(item.expected_return, 1)}</strong>
                          </div>
                          <div>
                            <span>Drawdown</span>
                            <strong>{formatSignedPercent(item.expected_drawdown, 1)}</strong>
                          </div>
                          <div>
                            <span>Risque</span>
                            <strong className={`risk-text ${riskTone(item.risk_label)}`}>{item.risk_label}</strong>
                          </div>
                          <div>
                            <span>Payoff</span>
                            <strong>{payoffDisplay(item.payoff_ratio)}</strong>
                          </div>
                        </div>
                        <p className="asset-cell-path">{item.path_label}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-grid-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Best current setups</p>
            <h2>Les actifs les plus constructifs du moment.</h2>
          </div>

          <div className="dashboard-grid">
            {topAssets.map((asset) => {
              const lead = asset.ordered_horizons[0];
              return (
                <article className="forecast-card" key={asset.asset_code}>
                  <div className="forecast-card-top">
                    <div>
                      <p className="forecast-asset-code">{asset.asset_code}</p>
                      <h2>{asset.asset_name}</h2>
                    </div>
                    <span className="forecast-horizon">
                      {asset.average_probability ? formatPercent(asset.average_probability, 0) : "--"} avg
                    </span>
                  </div>

                  <div className="forecast-metric-large">
                    <span>Positive horizons</span>
                    <strong>{asset.positive_horizons}/3</strong>
                  </div>

                  {lead ? (
                    <>
                      <div className="forecast-metrics">
                        <div>
                          <span>Lead horizon</span>
                          <strong>{horizonLabel(lead.horizon)}</strong>
                        </div>
                        <div>
                          <span>Lead return</span>
                          <strong>{formatSignedPercent(lead.expected_return, 1)}</strong>
                        </div>
                      </div>

                      <div className="forecast-footer">
                        <span className={`outcome-pill ${outcomeTone(lead.outcome_label)}`}>{lead.outcome_label}</span>
                        <p>{lead.path_label}</p>
                      </div>
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
