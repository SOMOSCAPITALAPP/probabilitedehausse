import { formatPercent, formatSignedPercent, getForecasts } from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

function confidenceTone(label) {
  if (label === "high") return "confidence-high";
  if (label === "medium") return "confidence-medium";
  return "confidence-low";
}

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt } = await getForecasts();

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
              <h1 className="dashboard-title">Probabilistic outlook by asset and horizon.</h1>
              <p className="hero-text">
                A first working view of the Northcurve engine, powered by local published forecasts
                when Postgres is connected and by demo data otherwise.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Data source</span>
              <strong>{sourceLabel(source)}</strong>
              <span className="status-label">Updated at</span>
              <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "Demo mode"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-grid-section">
        <div className="container">
          <div className="dashboard-grid">
            {forecasts.map((forecast) => (
              <article className="forecast-card" key={`${forecast.asset_code}-${forecast.horizon}`}>
                <div className="forecast-card-top">
                  <div>
                    <p className="forecast-asset-code">{forecast.asset_code}</p>
                    <h2>{forecast.asset_name}</h2>
                  </div>
                  <span className="forecast-horizon">{forecast.horizon}</span>
                </div>

                <div className="forecast-metric-large">
                  <span>Upside probability</span>
                  <strong>{formatPercent(forecast.upside_probability, 1)}</strong>
                </div>

                <div className="forecast-metrics">
                  <div>
                    <span>Expected return</span>
                    <strong>{formatSignedPercent(forecast.expected_return, 1)}</strong>
                  </div>
                  <div>
                    <span>Expected drawdown</span>
                    <strong>{formatSignedPercent(forecast.expected_drawdown, 1)}</strong>
                  </div>
                </div>

                <div className="forecast-footer">
                  <span className={`confidence-pill ${confidenceTone(forecast.confidence_label)}`}>
                    {forecast.confidence_label} confidence
                  </span>
                  <p>{forecast.path_label}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
