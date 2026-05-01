import {
  DASHBOARD_HORIZON_ORDER,
  findAssetForecast,
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
  horizonLabel,
  performanceTone,
  riskLabel,
  zScoreTone,
} from "../../../lib/forecast-data";

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

function probabilityTone(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.65) return "prob-positive";
  if (numeric <= 0.35) return "prob-negative";
  return "prob-neutral";
}

function regimeCopy(zScore) {
  const numeric = Number(zScore ?? 0);
  if (numeric >= 1.5) return "tres au-dessus de sa norme";
  if (numeric >= 0.5) return "au-dessus de sa norme";
  if (numeric <= -1.5) return "tres au-dessous de sa norme";
  if (numeric <= -0.5) return "au-dessous de sa norme";
  return "proche de sa norme";
}

export default async function AssetDashboardPage({ params }) {
  const { assetCode } = params;
  const { forecasts, updatedAt } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const asset = findAssetForecast(assets, assetCode);

  if (!asset) {
    return (
      <main className="dashboard-shell">
        <section className="section">
          <div className="container">
            <p className="eyebrow">Northcurve</p>
            <h1 className="dashboard-title dashboard-title-compact">Actif introuvable.</h1>
            <p className="hero-text compact-copy">Aucune ligne n'est disponible pour cet actif dans le dernier run.</p>
            <a className="button button-secondary" href="/dashboard">
              Retour au dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }

  const horizonRows = DASHBOARD_HORIZON_ORDER.map((horizon) => asset.horizons[horizon]).filter(Boolean);

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
            <a className="button button-secondary" href="/dashboard">
              Retour
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-hero dashboard-hero-compact">
        <div className="container">
          <p className="eyebrow">Asset detail</p>
          <div className="dashboard-headline dashboard-headline-compact">
            <div>
              <p className="forecast-asset-code">{asset.asset_code}</p>
              <h1 className="dashboard-title dashboard-title-compact">{asset.asset_name}</h1>
              <p className="hero-text compact-copy">
                Ici la probabilite de hausse est volontairement prudente. Plus la performance trailing est au-dessus
                de sa norme historique, plus la probabilite future se contracte.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Updated at</span>
              <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "--"}</strong>
              <span className="status-label">Horizons disponibles</span>
              <strong>{horizonRows.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-table-section dashboard-table-section-compact">
        <div className="container">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Horizon table</p>
            <h2>Lecture complete de l'actif.</h2>
            <p>Performance observee, norme historique, z-score, probabilite future et risque de drawdown.</p>
          </div>

          <div className="detail-table-shell">
            <div className="detail-table detail-table-header">
              <div>Horizon</div>
              <div>Perf</div>
              <div>Norme</div>
              <div>Vol</div>
              <div>Z-score</div>
              <div>Probabilite</div>
              <div>Drawdown</div>
              <div>Confiance</div>
            </div>

            {horizonRows.map((item) => {
              const risk = riskLabel(item.expected_drawdown);
              return (
                <div className="detail-table" key={`${asset.asset_code}-${item.horizon}`}>
                  <div>
                    <strong>{horizonLabel(item.horizon)}</strong>
                  </div>
                  <div>
                    <strong className={performanceTone(item.trailing_return)}>{formatSignedPercent(item.trailing_return, 1)}</strong>
                  </div>
                  <div>
                    <strong>{formatSignedPercent(item.historical_mean, 1)}</strong>
                  </div>
                  <div>
                    <strong>{formatPercent(item.historical_vol, 1)}</strong>
                  </div>
                  <div>
                    <strong className={zScoreTone(item.z_score)}>{item.z_score?.toFixed(2) ?? "--"}</strong>
                    <span className="detail-subcopy">{regimeCopy(item.z_score)}</span>
                  </div>
                  <div>
                    <strong className={probabilityTone(item.upside_probability)}>{formatPercent(item.upside_probability, 1)}</strong>
                  </div>
                  <div>
                    <strong className={riskTone(risk)}>{formatSignedPercent(item.expected_drawdown, 1)}</strong>
                  </div>
                  <div>
                    <span className={`confidence-pill ${confidenceTone(item.confidence_label)}`}>{item.confidence_label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
