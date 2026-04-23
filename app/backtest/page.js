import {
  formatNumber,
  formatProbability,
  formatReturn,
  getSp500BacktestData,
} from "../../lib/sp500-backtest-data";

export const dynamic = "force-dynamic";

const HORIZON_LABELS = {
  "5D": "5 jours",
  "21D": "21 jours",
  "63D": "63 jours",
};

const METRIC_COPY = [
  {
    key: "brier_score",
    label: "Brier score",
    hint: "Plus bas = meilleure calibration probabiliste.",
    formatter: (value) => formatNumber(value, 4),
  },
  {
    key: "log_loss",
    label: "Log loss",
    hint: "Pénalise davantage les probabilités très mal calibrées.",
    formatter: (value) => formatNumber(value, 4),
  },
  {
    key: "directional_accuracy",
    label: "Directional accuracy",
    hint: "Part des directions correctement anticipées.",
    formatter: (value) => formatProbability(value, 1),
  },
  {
    key: "return_mae",
    label: "Return MAE",
    hint: "Erreur absolue moyenne sur le rendement futur.",
    formatter: (value) => formatReturn(value, 2),
  },
  {
    key: "drawdown_mae",
    label: "Drawdown MAE",
    hint: "Erreur absolue moyenne sur le drawdown futur.",
    formatter: (value) => formatReturn(value, 2),
  },
  {
    key: "path_accuracy",
    label: "Path accuracy",
    hint: "Part des trajectoires correctement classées.",
    formatter: (value) => formatProbability(value, 1),
  },
];

export default async function BacktestPage() {
  const { forecast, backtest, source } = await getSp500BacktestData();
  const horizonEntries = Object.entries(backtest);

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
            <a className="button button-secondary" href="/dashboard">
              Voir le dashboard
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-hero">
        <div className="container">
          <p className="eyebrow">Northcurve Backtest</p>
          <div className="dashboard-headline">
            <div>
              <h1 className="dashboard-title">Backtest visuel du moteur S&amp;P 500.</h1>
              <p className="hero-text">
                Une première lecture front des calculs du pipeline SP500 V1, sur export Yahoo
                Finance `^GSPC`, avec probabilités, rendements attendus et métriques de test.
              </p>
            </div>

            <div className="dashboard-status-card">
              <span className="status-label">Source</span>
              <strong>{source === "pipeline" ? "Pipeline SP500 local" : "Fallback local"}</strong>
              <span className="status-label">Historique</span>
              <strong>
                {forecast.history_start && forecast.history_end
                  ? `${forecast.history_start} → ${forecast.history_end}`
                  : "Non disponible"}
              </strong>
              <span className="status-label">Fenêtre d'entraînement</span>
              <strong>{forecast.train_window_days ?? 2520} séances max</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-grid-section">
        <div className="container">
          <div className="backtest-overview-grid">
            <article className="backtest-summary-card">
              <span className="status-label">Actif</span>
              <h2>{forecast.asset_name}</h2>
              <div className="backtest-summary-list">
                <div>
                  <span>As of date</span>
                  <strong>{forecast.as_of_date ?? "--"}</strong>
                </div>
                <div>
                  <span>Input rows</span>
                  <strong>{forecast.input_rows ?? "--"}</strong>
                </div>
                <div>
                  <span>Neighbors</span>
                  <strong>{forecast.neighbors ?? "--"}</strong>
                </div>
                <div>
                  <span>Close</span>
                  <strong>{forecast.close ? Number(forecast.close).toFixed(2) : "--"}</strong>
                </div>
              </div>
            </article>

            {Object.entries(forecast.forecasts ?? {}).map(([horizon, result]) => (
              <article className="forecast-card" key={horizon}>
                <div className="forecast-card-top">
                  <div>
                    <p className="forecast-asset-code">Forecast</p>
                    <h2>{HORIZON_LABELS[horizon] ?? horizon}</h2>
                  </div>
                  <span className="forecast-horizon">{horizon}</span>
                </div>

                <div className="forecast-metric-large">
                  <span>Upside probability</span>
                  <strong>{formatProbability(result.upside_probability, 1)}</strong>
                </div>

                <div className="forecast-metrics">
                  <div>
                    <span>Expected return</span>
                    <strong>{formatReturn(result.expected_return, 2)}</strong>
                  </div>
                  <div>
                    <span>Expected drawdown</span>
                    <strong>{formatReturn(result.expected_drawdown, 2)}</strong>
                  </div>
                </div>

                <div className="forecast-footer">
                  <span className="confidence-pill confidence-low">
                    {result.neighbors_used ?? 0} analogues
                  </span>
                  <p>{result.path_label}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Walk-forward test</p>
            <h2>Métriques de backtest par horizon.</h2>
            <p>
              Les tests sont calculés en walk-forward, avec une fenêtre d'entraînement bornée
              pour garder un comportement plus stable et plus rapide à itérer.
            </p>
          </div>

          <div className="backtest-grid">
            {horizonEntries.map(([horizon, metrics]) => (
              <article className="backtest-card" key={horizon}>
                <div className="forecast-card-top">
                  <div>
                    <p className="forecast-asset-code">Backtest</p>
                    <h2>{HORIZON_LABELS[horizon] ?? horizon}</h2>
                  </div>
                  <span className="forecast-horizon">{metrics.samples ?? 0} samples</span>
                </div>

                <div className="backtest-metric-grid">
                  {METRIC_COPY.map((metric) => (
                    <div className="backtest-metric-tile" key={metric.key}>
                      <span>{metric.label}</span>
                      <strong>{metric.formatter(metrics[metric.key])}</strong>
                      <p>{metric.hint}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
