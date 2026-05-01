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
                Chaque horizon compare la performance trailing actuelle a sa distribution historique.
                Plus le z-score est eleve, plus la probabilite future se contracte.
              </p>
            </div>

            <aside className="dashboard-clean-status">
              <div>
                <span className="status-label">Updated</span>
                <strong>{updatedAt ? new Date(updatedAt).toLocaleString("fr-FR") : "--"}</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container">
          <div className="asset-clean-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>{asset.asset_name}</h3>
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
                    <th>Z</th>
                    <th>Prob.</th>
                    <th>Drawdown</th>
                    <th>Risk</th>
                    <th>Conf.</th>
                    <th>Lecture</th>
                  </tr>
                </thead>
                <tbody>
                  {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                    const item = asset.horizons[horizon];
                    if (!item) {
                      return (
                        <tr key={`${asset.asset_code}-${horizon}`}>
                          <td>{horizonLabel(horizon)}</td>
                          <td colSpan={9} className="empty-cell">
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
                        <td className={zScoreTone(item.z_score)}>{item.z_score?.toFixed(2) ?? "--"}</td>
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
                        <td className="detail-subcopy">{regimeCopy(item.z_score)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
