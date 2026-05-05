import {
  buildMovingAverageTrend,
  formatPercent,
  formatSignedPercent,
  getAssetHistory,
  getForecasts,
  groupForecastsByAsset,
} from "../../lib/forecast-data";

export const dynamic = "force-dynamic";

const CLASS_FILTERS = [
  { key: "all", label: "Tous" },
  { key: "equity_indices", label: "Indices actions" },
  { key: "rates", label: "Taux" },
  { key: "fx", label: "Devises" },
  { key: "commodities", label: "Matieres premieres" },
  { key: "crypto", label: "Crypto" },
  { key: "volatility", label: "Volatilite" },
  { key: "equities", label: "Actions" },
];

const SORT_OPTIONS = [
  { key: "combined", label: "Combine" },
  { key: "21D", label: "1 mois" },
  { key: "63D", label: "3 mois" },
  { key: "1Y", label: "1 an" },
];

function sourceLabel(source) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "postgres") return "Local Postgres";
  return "Demo fallback";
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function assetSectionKey(asset) {
  const assetClass = String(asset.asset_class || "").toLowerCase();

  if (assetClass === "equity_index" || assetClass === "sector_index") return "equity_indices";
  if (assetClass === "rates" || assetClass === "bond_etf" || assetClass === "money_market_etf") return "rates";
  if (assetClass === "fx") return "fx";
  if (assetClass === "commodity") return "commodities";
  if (assetClass === "crypto") return "crypto";
  if (assetClass === "volatility") return "volatility";
  if (assetClass === "equity_single") return "equities";
  return "equity_indices";
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
    argumentsList.push(`Le signal a 1 mois ressort a ${formatPercent(month.upside_probability, 0)}, au-dessus de l'equilibre.`);
  }
  if (quarter && Number(quarter.upside_probability ?? 0) >= 0.55) {
    argumentsList.push(`Le scenario a 3 mois reste constructif avec ${formatPercent(quarter.upside_probability, 0)} de probabilite de hausse.`);
  }
  if (year && Number(year.upside_probability ?? 0) >= 0.55) {
    argumentsList.push(`L'horizon 1 an conserve un biais favorable a ${formatPercent(year.upside_probability, 0)}.`);
  }
  if (month && Number(month.trailing_return ?? 0) < Number(month.historical_mean ?? 0)) {
    argumentsList.push("La performance recente a 1 mois reste sous sa norme historique, ce qui laisse une marge de normalisation.");
  }
  if (quarter && Number(quarter.expected_drawdown ?? 0) > -0.08) {
    argumentsList.push("Le drawdown probabiliste a 3 mois reste contenu au regard des autres actifs.");
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
    argumentsList.push(`Le signal a 1 mois ne donne que ${formatPercent(month.upside_probability, 0)} de probabilite de hausse.`);
  }
  if (quarter && Number(quarter.upside_probability ?? 0) <= 0.45) {
    argumentsList.push(`Le scenario a 3 mois reste defavorable avec seulement ${formatPercent(quarter.upside_probability, 0)} de probabilite de hausse.`);
  }
  if (year && Number(year.upside_probability ?? 0) <= 0.45) {
    argumentsList.push(`L'horizon 1 an reste prudent a ${formatPercent(year.upside_probability, 0)} seulement.`);
  }
  if (month && Number(month.trailing_return ?? 0) > Number(month.historical_mean ?? 0)) {
    argumentsList.push("La performance recente a 1 mois est deja au-dessus de sa norme historique, ce qui reduit le potentiel immediat.");
  }
  if (quarter && Number(quarter.expected_drawdown ?? 0) <= -0.08) {
    argumentsList.push("Le drawdown probabiliste a 3 mois reste marque, ce qui degrade le couple rendement-risque.");
  }

  return argumentsList.slice(0, 4);
}

function buildCombinedScore(asset) {
  const relevant = ["21D", "63D", "1Y"].map((horizon) => asset.horizons[horizon]).filter(Boolean);
  if (!relevant.length) return null;

  const avgProbability = average(relevant.map((item) => Number(item.upside_probability ?? 0.5))) ?? 0.5;
  const avgExpected = average(relevant.map((item) => Number(item.expected_return ?? 0))) ?? 0;
  const avgDrawdown = average(relevant.map((item) => Math.abs(Number(item.expected_drawdown ?? 0)))) ?? 0;

  return {
    score: avgProbability + avgExpected * 0.9 - avgDrawdown * 0.45,
    probability: avgProbability,
  };
}

function buildHorizonScore(asset, horizon) {
  const row = asset.horizons[horizon];
  if (!row) return null;

  const probability = Number(row.upside_probability ?? 0.5);
  const expected = Number(row.expected_return ?? 0);
  const drawdown = Math.abs(Number(row.expected_drawdown ?? 0));

  return {
    score: probability + expected * 0.9 - drawdown * 0.45,
    probability,
  };
}

function horizonValue(asset, horizon, key) {
  const row = asset.horizons[horizon];
  if (!row) return "--";
  return key === "probability"
    ? formatPercent(row.upside_probability, 0)
    : formatSignedPercent(row.expected_return, 1);
}

function buildHref(classFilter, sortKey) {
  const params = new URLSearchParams();
  if (classFilter && classFilter !== "all") params.set("class", classFilter);
  if (sortKey && sortKey !== "combined") params.set("sort", sortKey);
  const query = params.toString();
  return query ? `/classement?${query}` : "/classement";
}

async function buildRankedAssets(assets) {
  const enriched = await Promise.all(
    assets.map(async (asset) => {
      const combined = buildCombinedScore(asset);
      if (!combined) return null;

      const historyRows = await getAssetHistory(asset.asset_code);
      const trend = buildMovingAverageTrend(historyRows);

      return {
        ...asset,
        section_key: assetSectionKey(asset),
        rank_score: combined.score,
        rank_probability: combined.probability,
        horizon_scores: {
          "21D": buildHorizonScore(asset, "21D"),
          "63D": buildHorizonScore(asset, "63D"),
          "1Y": buildHorizonScore(asset, "1Y"),
        },
        trend,
      };
    }),
  );

  return enriched.filter(Boolean);
}

function sortRankedAssets(assets, sortKey, direction = "desc") {
  const scoreFor = (asset) => {
    if (sortKey === "combined") return asset.rank_score;
    return asset.horizon_scores?.[sortKey]?.score ?? null;
  };

  return assets
    .filter((asset) => scoreFor(asset) !== null)
    .sort((left, right) => {
      const leftScore = scoreFor(left);
      const rightScore = scoreFor(right);
      return direction === "desc" ? rightScore - leftScore : leftScore - rightScore;
    });
}

function signalProbability(asset, sortKey) {
  if (sortKey === "combined") return asset.rank_probability;
  return asset.horizon_scores?.[sortKey]?.probability ?? 0.5;
}

function RankTable({ title, description, rows, mode, sortKey }) {
  const sortLabel = SORT_OPTIONS.find((item) => item.key === sortKey)?.label || sortKey;

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
              <th>{sortKey === "combined" ? "Prob. moyenne" : `Signal ${sortLabel}`}</th>
              <th>1 mois</th>
              <th>3 mois</th>
              <th>1 an</th>
              <th>Arguments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => {
              const args = mode === "bull" ? buildBullArguments(asset, asset.trend) : buildBearArguments(asset, asset.trend);
              const signal = signalProbability(asset, sortKey);

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
                  <td className={classifyTone(signal)}>{formatPercent(signal, 0)}</td>
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

export default async function ClassementPage({ searchParams }) {
  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const rankedAssets = await buildRankedAssets(assets);

  const rawClass = searchParams?.class;
  const rawSort = searchParams?.sort;
  const classFilter = CLASS_FILTERS.some((item) => item.key === rawClass) ? rawClass : "all";
  const sortKey = SORT_OPTIONS.some((item) => item.key === rawSort) ? rawSort : "combined";

  const filteredAssets =
    classFilter === "all"
      ? rankedAssets
      : rankedAssets.filter((asset) => asset.section_key === classFilter);

  const bullish = sortRankedAssets(filteredAssets.slice(), sortKey, "desc").slice(0, 10);
  const bearish = sortRankedAssets(filteredAssets.slice(), sortKey, "asc").slice(0, 10);

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
              <h1 className="dashboard-clean-title">Les actifs les plus favorables a la hausse et a la baisse.</h1>
              <p className="hero-text dashboard-clean-copy">
                Cette page classe les actifs selon leur lecture probabiliste combinee a 1 mois, 3 mois et 1 an.
                Chaque ligne affiche le niveau probable, la probabilite moyenne et les principaux arguments de lecture.
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
                <span className="status-label">Actifs classes</span>
                <strong>{filteredAssets.length}</strong>
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
          <div className="asset-clean-card conviction-filters-card">
            <div className="conviction-filter-group">
              <span className="status-label">Classe d'actifs</span>
              <div className="dashboard-jump-nav conviction-filter-nav">
                {CLASS_FILTERS.map((item) => (
                  <a
                    key={item.key}
                    href={buildHref(item.key, sortKey)}
                    className={`dashboard-jump-chip ${classFilter === item.key ? "dashboard-jump-chip-accent" : ""}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="conviction-filter-group">
              <span className="status-label">Tri principal</span>
              <div className="dashboard-jump-nav conviction-filter-nav">
                {SORT_OPTIONS.map((item) => (
                  <a
                    key={item.key}
                    href={buildHref(classFilter, item.key)}
                    className={`dashboard-jump-chip ${sortKey === item.key ? "dashboard-jump-chip-accent" : ""}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <RankTable
            title="Les 10 actifs les plus favorables pour une hausse"
            description="Lecture la plus favorable sur la combinaison choisie, avec niveaux attendus a 1 mois, 3 mois et 1 an."
            rows={bullish}
            mode="bull"
            sortKey={sortKey}
          />

          <RankTable
            title="Les 10 actifs les plus favorables pour une baisse"
            description="Lecture inverse, orientee prudence, quand le signal de hausse devient le plus faible sur l'horizon choisi."
            rows={bearish}
            mode="bear"
            sortKey={sortKey}
          />
        </div>
      </section>
    </main>
  );
}
