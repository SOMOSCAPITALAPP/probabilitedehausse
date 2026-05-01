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
  if (numeric >= 0.6) return "prob-positive";
  if (numeric <= 0.4) return "prob-negative";
  return "prob-neutral";
}

function outlookLabel(probability, expectedReturn) {
  const prob = Number(probability ?? 0);
  const exp = Number(expectedReturn ?? 0);
  if (exp > 0 && prob >= 0.6) return "favorable";
  if (exp > 0 && prob >= 0.5) return "constructive";
  if (exp <= 0 || prob < 0.45) return "defensive";
  return "mixed";
}

function outlookTone(label) {
  if (label === "favorable") return "outcome-favorable";
  if (label === "constructive") return "outcome-constructive";
  if (label === "defensive") return "outcome-defensive";
  return "outcome-mixed";
}

function statLabel(value) {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.5) return "au-dessus de la norme";
  if (numeric <= -0.5) return "au-dessous de la norme";
  return "proche de la norme";
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);

  const favorableHorizons = forecasts.filter(
    (item) => Number(item.expected_return ?? 0) > 0 && Number(item.upside_probability ?? 0) >= 0.6
  ).length;
  const stressedHorizons = forecasts.filter((item) => riskLabel(item.expected_drawdown) === "high").length;
  const averageProbability =
    forecasts.length > 0
      ? forecasts.reduce((sum, item) => sum + Number(item.upside_probability ?? 0), 0) / forecasts.length
      : null;
  const averageExpectedReturn =
    forecasts.length > 0
      ? forecasts.reduce((sum, item) => sum + Number(item.expected_return ?? 0), 0) / forecasts.length
      : null;

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
              <h1 className="dashboard-title">Ce que l’actif a déjà fait. Ce qu’il a encore des chances de faire.</h1>
              <p className="hero-text">
                La lecture est séparée en deux temps. D’abord, la performance réalisée sur chaque horizon.
                Ensuite, la probabilité de hausse future, le rendement espéré et le drawdown attendu selon la
                méthode statistique du moteur Northcurve.
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

          <div className="dashboard-summary-grid">
            <article className="summary-card">
              <span className="status-label">Actifs suivis</span>
              <strong>{assets.length}</strong>
              <p>Une lecture homogène, actif par actif, du très court terme au très long terme.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Horizons favorables</span>
              <strong>{favorableHorizons}</strong>
              <p>Les horizons où le moteur voit encore un couple rendement / probabilité acceptable.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Probabilité moyenne</span>
              <strong>{averageProbability === null ? "--" : formatPercent(averageProbability, 0)}</strong>
              <p>Lecture d’ensemble du biais directionnel actuel sur les horizons disponibles.</p>
            </article>
            <article className="summary-card">
              <span className="status-label">Rendement espéré moyen</span>
              <strong>{averageExpectedReturn === null ? "--" : formatSignedPercent(averageExpectedReturn, 1)}</strong>
              <p>{stressedHorizons} horizons présentent un risque de drawdown élevé à ce stade.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section dashboard-table-section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Past and forward</p>
            <h2>Lire le passé observé puis le futur probable, horizon par horizon.</h2>
            <p>
              Chaque bloc d’actif commence par les performances déjà réalisées, puis passe à la lecture
              probabiliste future. Un clic ouvre ensuite une page dédiée à l’actif avec tous les détails de
              calcul.
            </p>
          </div>

          <div className="asset-dashboard-list">
            {assets.map((asset) => (
              <article className="asset-dashboard-card" key={asset.asset_code}>
                <div className="asset-dashboard-header">
                  <div>
                    <p className="forecast-asset-code">{asset.asset_code}</p>
                    <h3>{asset.asset_name}</h3>
                    <p className="asset-row-note">
                      {asset.positive_horizons} horizon{asset.positive_horizons > 1 ? "s" : ""} avec rendement
                      espéré positif.
                    </p>
                  </div>

                  <div className="asset-dashboard-actions">
                    {asset.best_horizon ? (
                      <div className="asset-badge-stack">
                        <span className={`outcome-pill ${outlookTone(outlookLabel(asset.best_horizon.upside_probability, asset.best_horizon.expected_return))}`}>
                          Meilleur horizon: {horizonLabel(asset.best_horizon.horizon)}
                        </span>
                        <span className={`confidence-pill ${confidenceTone(asset.best_horizon.confidence_label)}`}>
                          {asset.best_horizon.confidence_label} confidence
                        </span>
                      </div>
                    ) : null}
                    <a className="button button-secondary" href={`/dashboard/${asset.asset_code}`}>
                      Ouvrir l’analyse
                    </a>
                  </div>
                </div>

                <div className="asset-panel-grid">
                  <section className="asset-panel">
                    <div className="asset-panel-heading">
                      <p className="eyebrow">Past performance</p>
                      <h4>Ce que l’actif a déjà délivré.</h4>
                    </div>

                    <div className="performance-strip">
                      {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                        const item = asset.horizons[horizon];
                        return (
                          <div className="performance-chip" key={`${asset.asset_code}-perf-${horizon}`}>
                            <span>{horizonLabel(horizon)}</span>
                            <strong className={item ? performanceTone(item.trailing_return) : ""}>
                              {item ? formatSignedPercent(item.trailing_return, horizon === "5D" ? 1 : 1) : "--"}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="asset-panel">
                    <div className="asset-panel-heading">
                      <p className="eyebrow">Forward outlook</p>
                      <h4>Ce que le modèle pense du prochain mouvement.</h4>
                    </div>

                    <div className="forward-grid">
                      {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                        const item = asset.horizons[horizon];
                        if (!item) {
                          return (
                            <div className="forward-card forward-card-empty" key={`${asset.asset_code}-future-${horizon}`}>
                              <span className="status-label">{horizonLabel(horizon)}</span>
                              <strong>--</strong>
                            </div>
                          );
                        }

                        const outlook = outlookLabel(item.upside_probability, item.expected_return);
                        const risk = riskLabel(item.expected_drawdown);

                        return (
                          <div className="forward-card" key={`${asset.asset_code}-future-${horizon}`}>
                            <div className="forward-card-top">
                              <span className="status-label">{horizonLabel(horizon)}</span>
                              <span className={`outcome-pill ${outlookTone(outlook)}`}>{outlook}</span>
                            </div>
                            <div className="forward-card-stat">
                              <span>Probabilité de hausse</span>
                              <strong className={probabilityTone(item.upside_probability)}>
                                {formatPercent(item.upside_probability, 1)}
                              </strong>
                            </div>
                            <div className="forward-card-metrics">
                              <div>
                                <span>Espérance</span>
                                <strong>{formatSignedPercent(item.expected_return, 1)}</strong>
                              </div>
                              <div>
                                <span>Drawdown</span>
                                <strong>{formatSignedPercent(item.expected_drawdown, 1)}</strong>
                              </div>
                              <div>
                                <span>Z-score</span>
                                <strong className={zScoreTone(item.z_score)}>{item.z_score?.toFixed(2) ?? "--"}</strong>
                              </div>
                              <div>
                                <span>Risque</span>
                                <strong className={riskTone(risk)}>{risk}</strong>
                              </div>
                            </div>
                            <p className="forward-card-note">
                              {statLabel(item.z_score)}. {item.path_label}.
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
