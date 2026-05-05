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

const CLASS_SECTIONS = [
  {
    key: "equity_indices",
    title: "Indices actions",
    anchor: "indices-actions",
    description: "Les grands indices actions globaux et regionaux.",
  },
  {
    key: "rates",
    title: "Taux",
    anchor: "taux",
    description: "ETFs taux et poches monetaires pour lire la valeur investissable des placements de taux.",
  },
  {
    key: "fx",
    title: "Devises",
    anchor: "devises",
    description: "Paires de change et proxies FX.",
  },
  {
    key: "commodities",
    title: "Matieres premieres",
    anchor: "matieres-premieres",
    description: "Or, energie et autres expositions matieres premieres.",
  },
  {
    key: "crypto",
    title: "Crypto",
    anchor: "crypto",
    description: "Actifs numeriques suivis par le moteur.",
  },
  {
    key: "volatility",
    title: "Volatilite",
    anchor: "volatilite",
    description: "Mesures de stress et de nervosite de marche.",
  },
  {
    key: "equities",
    title: "Actions",
    anchor: "actions",
    description: "Titres individuels, classes ensuite par fiche detail.",
  },
];

function assetSectionKey(asset) {
  const assetClass = String(asset.asset_class || "").toLowerCase();

  if (assetClass === "equity_index") return "equity_indices";
  if (assetClass === "rates" || assetClass === "bond_etf" || assetClass === "money_market_etf") return "rates";
  if (assetClass === "fx") return "fx";
  if (assetClass === "commodity") return "commodities";
  if (assetClass === "crypto") return "crypto";
  if (assetClass === "volatility") return "volatility";
  if (assetClass === "equity_single") return "equities";
  if (assetClass === "sector_index") return "equity_indices";
  return "equity_indices";
}

export default async function DashboardPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const sectionedAssets = CLASS_SECTIONS.map((section) => ({
    ...section,
    assets: assets.filter((asset) => assetSectionKey(asset) === section.key),
  })).filter((section) => section.assets.length > 0);

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
            <a href="/classement">Classement</a>
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

          <nav className="dashboard-jump-nav" aria-label="Navigation par classes d'actifs">
            <a href="/classement" className="dashboard-jump-chip dashboard-jump-chip-accent">
              Top hausse / baisse
            </a>
            {sectionedAssets.map((section) => (
              <a key={section.key} href={`#${section.anchor}`} className="dashboard-jump-chip">
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container">
          <div className="section-heading compact-heading">
            <p className="eyebrow">Asset table</p>
            <h2>Une grille dense mais propre.</h2>
            <p>Le detail graphique a 1 an s'ouvre sur chaque page actif.</p>
          </div>

          <div className="methodology-grid dashboard-methodology-grid">
            <div className="methodology-panel">
              <h4>Chemin parcouru</h4>
              <p>
                Northcurve ne regarde pas seulement la performance finale. Le moteur mesure aussi le chemin
                parcouru, c'est-a-dire la somme des variations quotidiennes absolues. Cette notion permet de
                distinguer une hausse reguliere d'une hausse tres chaotique, meme si les deux finissent au
                meme niveau.
              </p>
            </div>
            <div className="methodology-panel">
              <h4>Probabilites</h4>
              <p>
                Les probabilites sont calculees horizon par horizon en comparant la performance trailing a sa
                moyenne historique et a sa volatilite historique. Plus l'actif est etire par rapport a sa
                norme, plus la probabilite future baisse. Le choix de Northcurve est volontairement prudent.
              </p>
            </div>
          </div>

          {sectionedAssets.map((section) => (
            <div className="dashboard-section-block" key={section.key} id={section.anchor}>
              <div className="dashboard-section-heading">
                <div>
                  <p className="eyebrow">{section.title}</p>
                  <h3>{section.title}</h3>
                </div>
                <p>{section.description}</p>
              </div>

              <div className="dashboard-clean-list">
                {section.assets.map((asset) => (
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
          ))}
        </div>
      </section>
    </main>
  );
}
