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
  if (numeric >= 0.6) return "prob-positive";
  if (numeric <= 0.4) return "prob-negative";
  return "prob-neutral";
}

function regimeLabel(zScore) {
  const numeric = Number(zScore ?? 0);
  if (numeric >= 1.5) return "fortement étiré au-dessus de sa norme";
  if (numeric >= 0.5) return "au-dessus de sa norme historique";
  if (numeric <= -1.5) return "fortement étiré au-dessous de sa norme";
  if (numeric <= -0.5) return "au-dessous de sa norme historique";
  return "proche de sa norme historique";
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
            <p className="eyebrow">Northcurve Dashboard</p>
            <h1 className="dashboard-title">Actif introuvable.</h1>
            <p className="hero-text">Aucune lecture n’est disponible pour cet actif dans le dernier run.</p>
            <a className="button button-secondary" href="/dashboard">
              Retour au dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }

  const horizonRows = DASHBOARD_HORIZON_ORDER.map((horizon) => asset.horizons[horizon]).filter(Boolean);
  const bestProbability = horizonRows.reduce(
    (best, item) => (Number(item.upside_probability ?? 0) > Number(best?.upside_probability ?? -1) ? item : best),
    null
  );
  const worstDrawdown = horizonRows.reduce(
    (worst, item) =>
      Math.abs(Number(item.expected_drawdown ?? 0)) > Math.abs(Number(worst?.expected_drawdown ?? 0)) ? item : worst,
    null
  );

  return (
    <main className="dashboard-shell asset-detail-shell">
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
            <a className="button button-secondary" href="/dashboard">
              Retour au dashboard
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-hero">
        <div className="container">
          <p className="eyebrow">Asset view</p>
          <div className="dashboard-headline">
            <div>
              <p className="forecast-asset-code">{asset.asset_code}</p>
              <h1 className="dashboard-title">{asset.asset_name}</h1>
              <p className="hero-text">
                Cette page sépare la performance déjà observée de la probabilité future. Pour chaque horizon,
                Northcurve affiche la performance trailing, la moyenne historique, la volatilité historique, le
                z-score actuel, puis la probabilité de hausse et le drawdown attendu.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Updated at</span>
              <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "--"}</strong>
              <span className="status-label">Meilleure probabilité</span>
              <strong>
                {bestProbability ? `${horizonLabel(bestProbability.horizon)} · ${formatPercent(bestProbability.upside_probability, 1)}` : "--"}
              </strong>
              <span className="status-label">Risque maximal</span>
              <strong>
                {worstDrawdown ? `${horizonLabel(worstDrawdown.horizon)} · ${formatSignedPercent(worstDrawdown.expected_drawdown, 1)}` : "--"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section asset-detail-section">
        <div className="container">
          <div className="asset-detail-grid">
            <section className="asset-panel">
              <div className="asset-panel-heading">
                <p className="eyebrow">Observed performance</p>
                <h2>Performance réalisée</h2>
                <p>Ce que l’actif a déjà produit sur chaque horizon glissant.</p>
              </div>

              <div className="performance-strip performance-strip-stacked">
                {horizonRows.map((item) => (
                  <div className="performance-chip performance-chip-detailed" key={`${asset.asset_code}-perf-${item.horizon}`}>
                    <span>{horizonLabel(item.horizon)}</span>
                    <strong className={performanceTone(item.trailing_return)}>
                      {formatSignedPercent(item.trailing_return, 1)}
                    </strong>
                    <small>{regimeLabel(item.z_score)}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="asset-panel">
              <div className="asset-panel-heading">
                <p className="eyebrow">Calculation logic</p>
                <h2>Référence statistique</h2>
                <p>Chaque horizon compare la performance trailing actuelle à sa norme de long terme.</p>
              </div>

              <div className="asset-method-stack">
                {horizonRows.map((item) => (
                  <div className="method-card" key={`${asset.asset_code}-method-${item.horizon}`}>
                    <div className="method-card-top">
                      <strong>{horizonLabel(item.horizon)}</strong>
                      <span className={`confidence-pill ${confidenceTone(item.confidence_label)}`}>
                        {item.confidence_label} confidence
                      </span>
                    </div>
                    <div className="method-metrics">
                      <div>
                        <span>Moyenne hist.</span>
                        <strong>{formatSignedPercent(item.historical_mean, 1)}</strong>
                      </div>
                      <div>
                        <span>Volatilité hist.</span>
                        <strong>{formatPercent(item.historical_vol, 1)}</strong>
                      </div>
                      <div>
                        <span>Z-score</span>
                        <strong className={zScoreTone(item.z_score)}>{item.z_score?.toFixed(2) ?? "--"}</strong>
                      </div>
                      <div>
                        <span>Échantillon</span>
                        <strong>{item.sample_size ?? "--"}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="section-heading asset-forward-heading">
            <p className="eyebrow">Forward probabilities</p>
            <h2>Probabilité future et risque de parcours</h2>
            <p>
              Ici, le modèle projette le prochain rendement à horizon équivalent en fonction du z-score actuel,
              puis convertit cette espérance conditionnelle en probabilité de hausse.
            </p>
          </section>

          <div className="asset-forward-table">
            <div className="asset-forward-header">
              <div>Horizon</div>
              <div>Probabilité</div>
              <div>Espérance</div>
              <div>Drawdown</div>
              <div>Risque</div>
              <div>Trajectoire</div>
            </div>

            {horizonRows.map((item) => {
              const risk = riskLabel(item.expected_drawdown);
              return (
                <div className="asset-forward-row" key={`${asset.asset_code}-row-${item.horizon}`}>
                  <div>
                    <strong>{horizonLabel(item.horizon)}</strong>
                  </div>
                  <div>
                    <strong className={probabilityTone(item.upside_probability)}>{formatPercent(item.upside_probability, 1)}</strong>
                  </div>
                  <div>
                    <strong>{formatSignedPercent(item.expected_return, 1)}</strong>
                  </div>
                  <div>
                    <strong>{formatSignedPercent(item.expected_drawdown, 1)}</strong>
                  </div>
                  <div>
                    <strong className={riskTone(risk)}>{risk}</strong>
                  </div>
                  <div>
                    <span>{item.path_label}</span>
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
