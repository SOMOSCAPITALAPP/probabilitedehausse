import {
  PROBABILITY_RANK_HORIZONS,
  buildMovingAverageTrend,
  formatPercent,
  formatSignedPercent,
  getAssetHistory,
  getForecasts,
  groupForecastsByAsset,
} from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyTone(score) {
  if (score >= 0.62) return "prob-positive";
  if (score <= 0.38) return "prob-negative";
  return "prob-neutral";
}

function trendSummary(label) {
  if (label === "haussiere") {
    return "Le cours reste au-dessus de la moyenne 200 jours et la moyenne 50 jours confirme la tendance.";
  }
  if (label === "haussiere fragile") {
    return "Le cours reste au-dessus de la moyenne 200 jours, mais la moyenne 50 jours ne confirme pas encore pleinement.";
  }
  if (label === "baissiere") {
    return "Le cours reste sous la moyenne 200 jours et la moyenne 50 jours confirme la faiblesse.";
  }
  return "La lecture 50 jours et 200 jours reste de transition.";
}

function buildBullArguments(asset, trend) {
  const month = asset.horizons["21D"];
  const quarter = asset.horizons["63D"];
  const year = asset.horizons["1Y"];
  const argumentsList = [];

  if (trend?.label === "haussiere" || trend?.label === "haussiere fragile") {
    argumentsList.push(trendSummary(trend.label));
  }
  if (month && Number(month.upside_probability ?? 0) >= 0.55) {
    argumentsList.push(`Le signal à 1 mois ressort à ${formatPercent(month.upside_probability, 0)}, au-dessus de l'équilibre.`);
  }
  if (quarter && Number(quarter.upside_probability ?? 0) >= 0.55) {
    argumentsList.push(`Le scénario à 3 mois reste constructif avec ${formatPercent(quarter.upside_probability, 0)} de probabilité de hausse.`);
  }
  if (year && Number(year.upside_probability ?? 0) >= 0.55) {
    argumentsList.push(`L'horizon 1 an conserve un biais favorable à ${formatPercent(year.upside_probability, 0)}.`);
  }
  if (month && Number(month.trailing_return ?? 0) < Number(month.historical_mean ?? 0)) {
    argumentsList.push("La performance récente à 1 mois reste sous sa norme historique, ce qui laisse une marge de normalisation.");
  }
  if (quarter && Number(quarter.expected_drawdown ?? 0) > -0.08) {
    argumentsList.push("Le drawdown probabiliste à 3 mois reste contenu au regard des autres actifs.");
  }

  return argumentsList.slice(0, 4);
}

function buildBearArguments(asset, trend) {
  const month = asset.horizons["21D"];
  const quarter = asset.horizons["63D"];
  const year = asset.horizons["1Y"];
  const argumentsList = [];

  if (trend?.label === "baissiere" || trend?.label === "transition / mixed") {
    argumentsList.push(trendSummary(trend.label));
  }
  if (month && Number(month.upside_probability ?? 0) <= 0.45) {
    argumentsList.push(`Le signal à 1 mois ne donne que ${formatPercent(month.upside_probability, 0)} de probabilité de hausse.`);
  }
  if (quarter && Number(quarter.upside_probability ?? 0) <= 0.45) {
    argumentsList.push(`Le scénario à 3 mois reste défavorable avec seulement ${formatPercent(quarter.upside_probability, 0)} de probabilité de hausse.`);
  }
  if (year && Number(year.upside_probability ?? 0) <= 0.45) {
    argumentsList.push(`L'horizon 1 an reste prudent à ${formatPercent(year.upside_probability, 0)} seulement.`);
  }
  if (month && Number(month.trailing_return ?? 0) > Number(month.historical_mean ?? 0)) {
    argumentsList.push("La performance récente à 1 mois est déjà au-dessus de sa norme historique, ce qui réduit le potentiel immédiat.");
  }
  if (quarter && Number(quarter.expected_drawdown ?? 0) <= -0.08) {
    argumentsList.push("Le drawdown probabiliste à 3 mois reste marqué, ce qui dégrade le couple rendement-risque.");
  }

  return argumentsList.slice(0, 4);
}

function buildRankScore(asset) {
  const relevant = PROBABILITY_RANK_HORIZONS.map((horizon) => asset.horizons[horizon]).filter(Boolean);
  if (!relevant.length) return null;

  const avgProbability = average(relevant.map((item) => Number(item.upside_probability ?? 0.5))) ?? 0.5;
  const avgExpected = average(relevant.map((item) => Number(item.expected_return ?? 0))) ?? 0;
  const avgDrawdown = average(relevant.map((item) => Math.abs(Number(item.expected_drawdown ?? 0)))) ?? 0;
  const score = avgProbability + avgExpected * 0.9 - avgDrawdown * 0.45;

  return {
    score,
    avgProbability,
    avgExpected,
    avgDrawdown,
  };
}

function horizonValue(asset, horizon, key) {
  const row = asset.horizons[horizon];
  if (!row) return "--";
  return key === "probability"
    ? formatPercent(row.upside_probability, 0)
    : formatSignedPercent(row.expected_return, 1);
}

async function buildRankedAssets(assets) {
  const enriched = await Promise.all(
    assets.map(async (asset) => {
      const score = buildRankScore(asset);
      if (!score) return null;
      const historyRows = await getAssetHistory(asset.asset_code);
      const trend = buildMovingAverageTrend(historyRows);
      return {
        ...asset,
        rank_score: score.score,
        rank_probability: score.avgProbability,
        rank_expected: score.avgExpected,
        rank_drawdown: score.avgDrawdown,
        trend,
      };
    }),
  );

  return enriched.filter(Boolean);
}

function RankTable({ title, description, rows, mode }) {
  return (
    <article className="asset-clean-card conviction-card">
      <div className="asset-clean-header conviction-header">
        <div>
          <p className="forecast-asset-code">{mode === "bull" ? "Top 10 hausse" : "Top 10 baisse"}</p>
          <h3>{title}</h3>
        </div>
        <p className="conviction-copy">{description}</p>
      </div>

      <div className="conviction-table-wrap">
        <table className="conviction-table">
          <thead>
            <tr>
              <th>Actif</th>
              <th>Prob. moyenne</th>
              <th>1 mois</th>
              <th>3 mois</th>
              <th>1 an</th>
              <th>Arguments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => {
              const args = mode === "bull" ? buildBullArguments(asset, asset.trend) : buildBearArguments(asset, asset.trend);
              return (
                <tr key={`${mode}-${asset.asset_code}`}>
                  <td>
                    <div className="conviction-asset-cell">
                      <a href={`/dashboard/${asset.asset_code}`} className="conviction-asset-link">
                        {asset.asset_code}
                      </a>
                      <span>{asset.asset_name}</span>
                    </div>
                  </td>
                  <td className={classifyTone(asset.rank_probability)}>{formatPercent(asset.rank_probability, 0)}</td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{horizonValue(asset, "21D", "expected")}</strong>
                      <span>{horizonValue(asset, "21D", "probability")}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{horizonValue(asset, "63D", "expected")}</strong>
                      <span>{horizonValue(asset, "63D", "probability")}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{horizonValue(asset, "1Y", "expected")}</strong>
                      <span>{horizonValue(asset, "1Y", "probability")}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-arguments">
                      {args.map((argument, index) => (
                        <p key={`${asset.asset_code}-${index}`}>{argument}</p>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default async function ClassementPage() {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const rankedAssets = await buildRankedAssets(assets);

  const bullish = rankedAssets
    .slice()
    .sort((left, right) => right.rank_score - left.rank_score)
    .slice(0, 10);

  const bearish = rankedAssets
    .slice()
    .sort((left, right) => left.rank_score - right.rank_score)
    .slice(0, 10);

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
            <a className="button button-secondary" href="/dashboard">
              Retour
            </a>
          </div>
        </div>
      </header>

      <section className="section dashboard-clean-hero">
        <div className="container">
          <p className="eyebrow">Classement probabiliste</p>
          <div className="dashboard-clean-top">
            <div>
              <h1 className="dashboard-clean-title">Les actifs les plus favorables à la hausse et à la baisse.</h1>
              <p className="hero-text dashboard-clean-copy">
                Cette page classe les actifs selon leur lecture probabiliste combinée à 1 mois, 3 mois et 1 an.
                Chaque ligne affiche le niveau probable, la probabilité moyenne et les principaux arguments de lecture.
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
              <div>
                <span className="status-label">Actifs classés</span>
                <strong>{rankedAssets.length}</strong>
              </div>
              {diagnostics.length > 0 ? (
                <div>
                  <span className="status-label">Diagnostics</span>
                  <strong>{diagnostics[0]}</strong>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container conviction-layout">
          <RankTable
            title="Les 10 actifs les plus favorables pour une hausse"
            description="Scoring combiné sur les probabilités et niveaux attendus à 1 mois, 3 mois et 1 an."
            rows={bullish}
            mode="bull"
          />

          <RankTable
            title="Les 10 actifs les plus favorables pour une baisse"
            description="Classement inverse, orienté prudence, quand la probabilité de hausse devient la plus faible."
            rows={bearish}
            mode="bear"
          />
        </div>
      </section>
    </main>
  );
}
