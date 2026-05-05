import {
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
} from "../../lib/forecast-data";
import {
  LOCALE_LABELS,
  buildLocaleHref,
  getLocale,
  localeForDate,
  pageDictionary,
} from "../../lib/site-copy";

export const dynamic = "force-dynamic";

const FILTERS = {
  fr: [
    ["all", "Tous"],
    ["equity_indices", "Indices actions"],
    ["rates", "Taux"],
    ["fx", "Devises"],
    ["commodities", "Matières premières"],
    ["crypto", "Crypto"],
    ["volatility", "Volatilité"],
    ["equities", "Actions"],
  ],
  en: [
    ["all", "All"],
    ["equity_indices", "Equity indices"],
    ["rates", "Rates"],
    ["fx", "FX"],
    ["commodities", "Commodities"],
    ["crypto", "Crypto"],
    ["volatility", "Volatility"],
    ["equities", "Equities"],
  ],
  "pt-BR": [
    ["all", "Todos"],
    ["equity_indices", "Índices de ações"],
    ["rates", "Juros"],
    ["fx", "Câmbio"],
    ["commodities", "Commodities"],
    ["crypto", "Cripto"],
    ["volatility", "Volatilidade"],
    ["equities", "Ações"],
  ],
};

const SORTS = {
  fr: [
    ["combined", "Combiné"],
    ["21D", "1 mois"],
    ["63D", "3 mois"],
    ["1Y", "1 an"],
  ],
  en: [
    ["combined", "Combined"],
    ["21D", "1 month"],
    ["63D", "3 months"],
    ["1Y", "1 year"],
  ],
  "pt-BR": [
    ["combined", "Combinado"],
    ["21D", "1 mês"],
    ["63D", "3 meses"],
    ["1Y", "1 ano"],
  ],
};

const COPY = {
  fr: {
    eyebrow: "Classement probabiliste",
    title: "Les actifs les plus favorables à la hausse et à la baisse.",
    text:
      "Cette page classe les actifs selon une lecture combinée à 1 mois, 3 mois et 1 an. Chaque ligne rappelle les niveaux probables et les principaux arguments de lecture.",
    classFilter: "Classe d'actifs",
    mainSort: "Tri principal",
    ranked: "Actifs classés",
    topBull: "Les 10 actifs les plus favorables pour une hausse",
    topBear: "Les 10 actifs les plus favorables pour une baisse",
    bullDesc: "Lecture la plus favorable sur la combinaison choisie, avec niveaux attendus à 1 mois, 3 mois et 1 an.",
    bearDesc: "Lecture inverse, orientée prudence, quand le signal de hausse devient le plus faible sur l'horizon choisi.",
    headers: ["Actif", "Signal", "1 mois", "3 mois", "1 an", "Arguments"],
  },
  en: {
    eyebrow: "Probabilistic ranking",
    title: "The assets that look most favorable for upside and downside.",
    text:
      "This page ranks assets using a combined 1-month, 3-month and 1-year reading. Each row highlights expected levels and the main reading arguments.",
    classFilter: "Asset class",
    mainSort: "Primary sort",
    ranked: "Ranked assets",
    topBull: "Top 10 assets most favorable for upside",
    topBear: "Top 10 assets most favorable for downside",
    bullDesc: "Best reading on the selected combination, with expected levels at 1 month, 3 months and 1 year.",
    bearDesc: "Inverse reading, focused on caution, when upside probability becomes the weakest on the selected horizon.",
    headers: ["Asset", "Signal", "1 month", "3 months", "1 year", "Arguments"],
  },
  "pt-BR": {
    eyebrow: "Ranking probabilístico",
    title: "Os ativos mais favoráveis para alta e para baixa.",
    text:
      "Esta página classifica os ativos com base em uma leitura combinada de 1 mês, 3 meses e 1 ano. Cada linha mostra os níveis prováveis e os principais argumentos de leitura.",
    classFilter: "Classe de ativo",
    mainSort: "Ordenação principal",
    ranked: "Ativos classificados",
    topBull: "Top 10 ativos mais favoráveis para alta",
    topBear: "Top 10 ativos mais favoráveis para baixa",
    bullDesc: "Melhor leitura na combinação escolhida, com níveis esperados em 1 mês, 3 meses e 1 ano.",
    bearDesc: "Leitura inversa, orientada pela prudência, quando o sinal de alta fica mais fraco no horizonte escolhido.",
    headers: ["Ativo", "Sinal", "1 mês", "3 meses", "1 ano", "Argumentos"],
  },
};

function sourceLabel(source, locale) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "snapshot") return locale === "en" ? "Local snapshot" : locale === "pt-BR" ? "Snapshot local" : "Snapshot local";
  if (source === "postgres") return locale === "en" ? "Local Postgres" : "Postgres local";
  return locale === "fr" ? "Mode démo" : locale === "pt-BR" ? "Modo demo" : "Demo mode";
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

function buildRankedAssets(assets) {
  return assets
    .map((asset) => {
      const combined = buildCombinedScore(asset);
      if (!combined) return null;
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
      };
    })
    .filter(Boolean);
}

function sortRankedAssets(assets, sortKey, direction = "desc") {
  const getScore = (asset) => {
    if (sortKey === "combined") return asset.rank_score;
    return asset.horizon_scores?.[sortKey]?.score ?? null;
  };

  return assets
    .filter((asset) => getScore(asset) !== null)
    .sort((left, right) => {
      const leftScore = getScore(left);
      const rightScore = getScore(right);
      return direction === "desc" ? rightScore - leftScore : leftScore - rightScore;
    });
}

function signalProbability(asset, sortKey) {
  if (sortKey === "combined") return asset.rank_probability;
  return asset.horizon_scores?.[sortKey]?.probability ?? 0.5;
}

function buildArguments(asset, mode, locale) {
  const month = asset.horizons["21D"];
  const quarter = asset.horizons["63D"];
  const year = asset.horizons["1Y"];
  const rows = [];

  const add = (fr, en, pt) => {
    rows.push({ fr, en, "pt-BR": pt }[locale]);
  };

  if (mode === "bull") {
    if (month && Number(month.upside_probability ?? 0) >= 0.55) {
      add(
        `Le 1 mois ressort à ${formatPercent(month.upside_probability, 0)} de probabilité de hausse.`,
        `The 1-month horizon prints ${formatPercent(month.upside_probability, 0)} upside probability.`,
        `O horizonte de 1 mês mostra ${formatPercent(month.upside_probability, 0)} de probabilidade de alta.`,
      );
    }
    if (quarter && Number(quarter.expected_drawdown ?? 0) > -0.08) {
      add(
        "Le drawdown probable à 3 mois reste contenu.",
        "Probable 3-month drawdown remains contained.",
        "O drawdown provável em 3 meses continua contido.",
      );
    }
    if (year && Number(year.upside_probability ?? 0) >= 0.55) {
      add(
        `Le 1 an garde un biais favorable à ${formatPercent(year.upside_probability, 0)}.`,
        `The 1-year view keeps a favorable bias at ${formatPercent(year.upside_probability, 0)}.`,
        `A visão de 1 ano mantém um viés favorável em ${formatPercent(year.upside_probability, 0)}.`,
      );
    }
  } else {
    if (month && Number(month.upside_probability ?? 0) <= 0.45) {
      add(
        `Le 1 mois ne donne que ${formatPercent(month.upside_probability, 0)} de probabilité de hausse.`,
        `The 1-month horizon shows only ${formatPercent(month.upside_probability, 0)} upside probability.`,
        `O horizonte de 1 mês mostra apenas ${formatPercent(month.upside_probability, 0)} de probabilidade de alta.`,
      );
    }
    if (quarter && Number(quarter.expected_drawdown ?? 0) <= -0.08) {
      add(
        "Le drawdown probable à 3 mois reste marqué.",
        "Probable 3-month drawdown remains pronounced.",
        "O drawdown provável em 3 meses continua relevante.",
      );
    }
    if (year && Number(year.upside_probability ?? 0) <= 0.45) {
      add(
        `Le 1 an reste prudent à ${formatPercent(year.upside_probability, 0)} seulement.`,
        `The 1-year horizon stays cautious at only ${formatPercent(year.upside_probability, 0)}.`,
        `O horizonte de 1 ano continua prudente com apenas ${formatPercent(year.upside_probability, 0)}.`,
      );
    }
  }

  return rows.slice(0, 4);
}

function buildHref(locale, classFilter, sortKey) {
  const params = {};
  if (classFilter && classFilter !== "all") params.class = classFilter;
  if (sortKey && sortKey !== "combined") params.sort = sortKey;
  return buildLocaleHref("/classement", locale, params);
}

function LanguageSwitch({ locale, classFilter, sortKey }) {
  return (
    <div className="locale-switch" aria-label="Language switch">
      {Object.entries(LOCALE_LABELS).map(([code, label]) => (
        <a
          key={code}
          href={buildHref(code, classFilter, sortKey)}
          className={`locale-chip ${locale === code ? "locale-chip-active" : ""}`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function RankTable({ title, description, rows, mode, sortKey, copy, locale }) {
  return (
    <article className="asset-clean-card conviction-card">
      <div className="asset-clean-header conviction-header">
        <div>
          <p className="forecast-asset-code">{title}</p>
          <h3>{title}</h3>
        </div>
        <p className="conviction-copy">{description}</p>
      </div>

      <div className="conviction-table-wrap">
        <table className="conviction-table">
          <thead>
            <tr>
              {copy.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => {
              const signal = signalProbability(asset, sortKey);
              return (
                <tr key={`${mode}-${asset.asset_code}`}>
                  <td>
                    <div className="conviction-asset-cell">
                      <a
                        href={buildLocaleHref(`/dashboard/${asset.asset_code}`, locale)}
                        className="conviction-asset-link"
                      >
                        {asset.asset_code}
                      </a>
                      <span>{asset.asset_name}</span>
                    </div>
                  </td>
                  <td className={classifyTone(signal)}>{formatPercent(signal, 0)}</td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{formatSignedPercent(asset.horizons["21D"]?.expected_return, 1)}</strong>
                      <span>{formatPercent(asset.horizons["21D"]?.upside_probability, 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{formatSignedPercent(asset.horizons["63D"]?.expected_return, 1)}</strong>
                      <span>{formatPercent(asset.horizons["63D"]?.upside_probability, 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-horizon-cell">
                      <strong>{formatSignedPercent(asset.horizons["1Y"]?.expected_return, 1)}</strong>
                      <span>{formatPercent(asset.horizons["1Y"]?.upside_probability, 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="conviction-arguments">
                      {buildArguments(asset, mode, locale).map((argument, index) => (
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
  const resolvedSearchParams =
    searchParams && typeof searchParams.then === "function" ? await searchParams : searchParams;
  const locale = getLocale(resolvedSearchParams);
  const common = pageDictionary(locale);
  const copy = COPY[locale];
  const filters = FILTERS[locale];
  const sorts = SORTS[locale];

  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const rankedAssets = buildRankedAssets(assets);

  const rawClass = resolvedSearchParams?.class;
  const rawSort = resolvedSearchParams?.sort;
  const classFilter = filters.some(([key]) => key === rawClass) ? rawClass : "all";
  const sortKey = sorts.some(([key]) => key === rawSort) ? rawSort : "combined";

  const filteredAssets =
    classFilter === "all" ? rankedAssets : rankedAssets.filter((asset) => asset.section_key === classFilter);
  const bullish = sortRankedAssets(filteredAssets.slice(), sortKey, "desc").slice(0, 10);
  const bearish = sortRankedAssets(filteredAssets.slice(), sortKey, "asc").slice(0, 10);

  return (
    <main className="dashboard-shell dashboard-clean-shell">
      <header className="site-header">
        <div className="container nav-row">
          <a className="brand" href={buildLocaleHref("/", locale)}>
            Northcurve
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href={buildLocaleHref("/", locale)}>{common.nav.home}</a>
            <a href={buildLocaleHref("/dashboard", locale)}>{common.nav.dashboard}</a>
            <a href={buildLocaleHref("/classement", locale)}>{common.nav.ranking}</a>
          </nav>

          <div className="nav-actions">
            <LanguageSwitch locale={locale} classFilter={classFilter} sortKey={sortKey} />
          </div>
        </div>
      </header>

      <section className="section dashboard-clean-hero">
        <div className="container">
          <p className="eyebrow">{copy.eyebrow}</p>
          <div className="dashboard-clean-top">
            <div>
              <h1 className="dashboard-clean-title">{copy.title}</h1>
              <p className="hero-text dashboard-clean-copy">{copy.text}</p>
            </div>

            <aside className="dashboard-clean-status">
              <div>
                <span className="status-label">{common.common.source}</span>
                <strong>{sourceLabel(source, locale)}</strong>
              </div>
              <div>
                <span className="status-label">{common.common.updated}</span>
                <strong>
                  {updatedAt ? new Date(updatedAt).toLocaleString(localeForDate(locale)) : common.common.demoMode}
                </strong>
              </div>
              <div>
                <span className="status-label">{copy.ranked}</span>
                <strong>{filteredAssets.length}</strong>
              </div>
              {diagnostics.length > 0 ? (
                <div>
                  <span className="status-label">{common.common.diagnostics}</span>
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
              <span className="status-label">{copy.classFilter}</span>
              <div className="dashboard-jump-nav conviction-filter-nav">
                {filters.map(([key, label]) => (
                  <a
                    key={key}
                    href={buildHref(locale, key, sortKey)}
                    className={`dashboard-jump-chip ${classFilter === key ? "dashboard-jump-chip-accent" : ""}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div className="conviction-filter-group">
              <span className="status-label">{copy.mainSort}</span>
              <div className="dashboard-jump-nav conviction-filter-nav">
                {sorts.map(([key, label]) => (
                  <a
                    key={key}
                    href={buildHref(locale, classFilter, key)}
                    className={`dashboard-jump-chip ${sortKey === key ? "dashboard-jump-chip-accent" : ""}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <RankTable
            title={copy.topBull}
            description={copy.bullDesc}
            rows={bullish}
            mode="bull"
            sortKey={sortKey}
            copy={copy}
            locale={locale}
          />

          <RankTable
            title={copy.topBear}
            description={copy.bearDesc}
            rows={bearish}
            mode="bear"
            sortKey={sortKey}
            copy={copy}
            locale={locale}
          />
        </div>
      </section>
    </main>
  );
}
