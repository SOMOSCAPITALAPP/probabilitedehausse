import {
  DASHBOARD_HORIZON_ORDER,
  assetCurrentVolatility,
  formatPercent,
  formatSignedPercent,
  getForecasts,
  groupForecastsByAsset,
  performanceTone,
  riskLabel,
} from "../../lib/forecast-data";
import {
  LOCALE_LABELS,
  buildLocaleHref,
  confidenceLabelForLocale,
  getLocale,
  horizonLabelForLocale,
  localeForDate,
  pageDictionary,
  riskLabelForLocale,
} from "../../lib/site-copy";
import DashboardSearch from "./DashboardSearch";

export const dynamic = "force-dynamic";

const SECTION_COPY = {
  fr: [
    ["equity_indices", "Indices actions", "Les grands indices actions globaux et régionaux."],
    ["rates", "Taux", "ETF taux et poches monétaires pour lire la valeur investissable des placements de taux."],
    ["fx", "Devises", "Paires de change et actifs de référence FX."],
    ["commodities", "Matières premières", "Or, énergie et principales matières premières."],
    ["crypto", "Crypto", "Actifs numériques suivis par le moteur."],
    ["volatility", "Volatilité", "Mesures de stress et de nervosité de marché."],
    ["equities", "Actions", "Actions mondiales suivies individuellement."],
  ],
  en: [
    ["equity_indices", "Equity indices", "Major global and regional equity indices."],
    ["rates", "Rates", "Rate ETFs and money-market sleeves to read investable fixed-income value."],
    ["fx", "FX", "Currency pairs and core FX assets."],
    ["commodities", "Commodities", "Gold, energy and key commodity exposures."],
    ["crypto", "Crypto", "Digital assets tracked by the engine."],
    ["volatility", "Volatility", "Stress and market volatility measures."],
    ["equities", "Equities", "Global single stocks followed one by one."],
  ],
  "pt-BR": [
    ["equity_indices", "Índices de ações", "Os grandes índices globais e regionais de ações."],
    ["rates", "Juros", "ETFs de juros e caixas monetários para ler o valor investível da renda fixa."],
    ["fx", "Câmbio", "Pares de moedas e ativos centrais de FX."],
    ["commodities", "Commodities", "Ouro, energia e principais commodities."],
    ["crypto", "Cripto", "Ativos digitais acompanhados pelo motor."],
    ["volatility", "Volatilidade", "Medidas de estresse e nervosismo de mercado."],
    ["equities", "Ações", "Ações globais acompanhadas individualmente."],
  ],
};

const DASHBOARD_COPY = {
  fr: {
    eyebrow: "Northcurve Dashboard",
    title: "Performance passée, probabilité future, sans bruit inutile.",
    text:
      "Chaque actif compare sa performance récente à sa norme historique. La probabilité de hausse est volontairement prudente, puis déclinée sur tous les horizons disponibles.",
    summaryAssets: "Actifs",
    summaryProbability: "Proba moyenne",
    summaryVol: "Vol actuelle moy.",
    summaryLow: "Probabilités basses",
    jumpLabel: "Navigation par classes d'actifs",
    rankingLink: "Top hausse / baisse",
    tableEyebrow: "Grille multi-actifs",
    tableTitle: "Une lecture dense mais propre.",
    tableText: "Le détail graphique à 1 an s'ouvre sur chaque fiche actif.",
    pathTitle: "Chemin parcouru",
    pathText:
      "Northcurve ne regarde pas seulement la performance finale. Le moteur mesure aussi le chemin parcouru, c'est-à-dire la somme des variations quotidiennes absolues. Cela permet de distinguer une hausse régulière d'une hausse très chaotique.",
    probTitle: "Probabilités",
    probText:
      "Les probabilités sont calculées horizon par horizon en comparant la performance trailing à sa moyenne historique et à sa volatilité historique. Plus l'actif est étiré, plus la probabilité future baisse.",
    tableHeaders: ["Horizon", "Perf.", "Norme", "Vol.", "Prob.", "Drawdown", "Risque", "Confiance"],
    openAsset: "Voir l'actif",
    empty: "--",
  },
  en: {
    eyebrow: "Northcurve Dashboard",
    title: "Past performance, future probability, without unnecessary noise.",
    text:
      "Each asset is compared with its historical norm. Upside probability is intentionally cautious and then mapped across all available horizons.",
    summaryAssets: "Assets",
    summaryProbability: "Average probability",
    summaryVol: "Avg current vol.",
    summaryLow: "Low probabilities",
    jumpLabel: "Jump by asset class",
    rankingLink: "Top upside / downside",
    tableEyebrow: "Multi-asset grid",
    tableTitle: "A dense but readable view.",
    tableText: "The one-year visual projection opens on each asset page.",
    pathTitle: "Path traveled",
    pathText:
      "Northcurve does not only look at terminal performance. It also measures the path traveled, meaning the sum of absolute daily moves. That separates a steady rise from a very chaotic one.",
    probTitle: "Probabilities",
    probText:
      "Probabilities are computed horizon by horizon by comparing trailing performance with historical mean and historical volatility. The more stretched the asset is, the lower future upside probability becomes.",
    tableHeaders: ["Horizon", "Perf.", "Norm", "Vol.", "Prob.", "Drawdown", "Risk", "Confidence"],
    openAsset: "Open asset",
    empty: "--",
  },
  "pt-BR": {
    eyebrow: "Northcurve Dashboard",
    title: "Desempenho passado, probabilidade futura, sem ruído desnecessário.",
    text:
      "Cada ativo é comparado com sua norma histórica. A probabilidade de alta é intencionalmente prudente e depois declinada em todos os horizontes disponíveis.",
    summaryAssets: "Ativos",
    summaryProbability: "Prob. média",
    summaryVol: "Vol. atual méd.",
    summaryLow: "Probabilidades baixas",
    jumpLabel: "Navegação por classe de ativo",
    rankingLink: "Top alta / baixa",
    tableEyebrow: "Grade multiativos",
    tableTitle: "Uma leitura densa, mas limpa.",
    tableText: "O detalhe gráfico de 1 ano abre em cada ficha do ativo.",
    pathTitle: "Caminho percorrido",
    pathText:
      "A Northcurve não olha apenas o desempenho final. O motor também mede o caminho percorrido, ou seja, a soma das variações diárias absolutas. Isso distingue uma alta regular de uma alta muito caótica.",
    probTitle: "Probabilidades",
    probText:
      "As probabilidades são calculadas horizonte por horizonte comparando o desempenho trailing com a média histórica e a volatilidade histórica. Quanto mais esticado estiver o ativo, menor será a probabilidade futura de alta.",
    tableHeaders: ["Horizonte", "Perf.", "Norma", "Vol.", "Prob.", "Drawdown", "Risco", "Confiança"],
    openAsset: "Ver ativo",
    empty: "--",
  },
};

function sourceLabel(source, locale) {
  if (source === "google_sheets") return "Google Sheets";
  if (source === "snapshot") return locale === "en" ? "Local snapshot" : locale === "pt-BR" ? "Snapshot local" : "Snapshot local";
  if (source === "postgres") return locale === "fr" ? "Postgres local" : locale === "pt-BR" ? "Postgres local" : "Local Postgres";
  return locale === "fr" ? "Mode démo" : locale === "pt-BR" ? "Modo demo" : "Demo mode";
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

function LanguageSwitch({ locale, pathname }) {
  return (
    <div className="locale-switch" aria-label="Language switch">
      {Object.entries(LOCALE_LABELS).map(([code, label]) => (
        <a
          key={code}
          href={buildLocaleHref(pathname, code)}
          className={`locale-chip ${locale === code ? "locale-chip-active" : ""}`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }) {
  const locale = getLocale(searchParams);
  const common = pageDictionary(locale);
  const copy = DASHBOARD_COPY[locale];
  const sectionTemplate = SECTION_COPY[locale];

  const { forecasts, source, updatedAt, diagnostics = [] } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);

  const sectionedAssets = sectionTemplate
    .map(([key, title, description]) => ({
      key,
      title,
      description,
      anchor: key,
      assets: assets.filter((asset) => assetSectionKey(asset) === key),
    }))
    .filter((section) => section.assets.length > 0);

  const avgProbability = avg(forecasts.map((item) => Number(item.upside_probability ?? 0)));
  const avgCurrentVol = avg(
    assets.map((asset) => assetCurrentVolatility(asset)).filter((value) => Number.isFinite(value)),
  );
  const lowProb = forecasts.filter((item) => Number(item.upside_probability ?? 0) <= 0.35).length;
  const assetSearchItems = assets.map((asset) => ({
    asset_code: asset.asset_code,
    asset_name: asset.asset_name,
    asset_class: asset.asset_class,
    source_symbol: asset.source_symbol,
    source_name: asset.source_name,
  }));
  const assetSearchHrefs = Object.fromEntries(
    assets.map((asset) => [asset.asset_code, buildLocaleHref(`/dashboard/${asset.asset_code}`, locale)]),
  );

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
            <LanguageSwitch locale={locale} pathname="/dashboard" />
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
              {diagnostics.length > 0 ? (
                <div>
                  <span className="status-label">{common.common.diagnostics}</span>
                  <strong>{diagnostics[0]}</strong>
                </div>
              ) : null}
            </aside>
          </div>

          <div className="dashboard-clean-summary">
            <article className="summary-card">
              <span className="status-label">{copy.summaryAssets}</span>
              <strong>{assets.length}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">{copy.summaryProbability}</span>
              <strong>{avgProbability === null ? "--" : formatPercent(avgProbability, 0)}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">{copy.summaryVol}</span>
              <strong>{avgCurrentVol === null ? "--" : formatPercent(avgCurrentVol, 1)}</strong>
            </article>
            <article className="summary-card">
              <span className="status-label">{copy.summaryLow}</span>
              <strong>{lowProb}</strong>
            </article>
          </div>

          <nav className="dashboard-jump-nav" aria-label={copy.jumpLabel}>
            <a
              href={buildLocaleHref("/classement", locale)}
              className="dashboard-jump-chip dashboard-jump-chip-accent"
            >
              {copy.rankingLink}
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
            <p className="eyebrow">{copy.tableEyebrow}</p>
            <h2>{copy.tableTitle}</h2>
            <p>{copy.tableText}</p>
          </div>

          <div className="methodology-grid dashboard-methodology-grid">
            <div className="methodology-panel">
              <h4>{copy.pathTitle}</h4>
              <p>{copy.pathText}</p>
            </div>
            <div className="methodology-panel">
              <h4>{copy.probTitle}</h4>
              <p>{copy.probText}</p>
            </div>
          </div>

          <DashboardSearch assets={assetSearchItems} locale={locale} buildHref={assetSearchHrefs} />

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
                      <a
                        className="button button-secondary compact-button"
                        href={buildLocaleHref(`/dashboard/${asset.asset_code}`, locale)}
                      >
                        {copy.openAsset}
                      </a>
                    </div>

                    <div className="asset-clean-table-wrap">
                      <table className="asset-clean-table">
                        <thead>
                          <tr>
                            {copy.tableHeaders.map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DASHBOARD_HORIZON_ORDER.map((horizon) => {
                            const item = asset.horizons[horizon];
                            if (!item) {
                              return (
                                <tr key={`${asset.asset_code}-${horizon}`}>
                                  <td>{horizonLabelForLocale(horizon, locale)}</td>
                                  <td colSpan={7} className="empty-cell">
                                    {copy.empty}
                                  </td>
                                </tr>
                              );
                            }

                            const risk = riskLabel(item.expected_drawdown);

                            return (
                              <tr key={`${asset.asset_code}-${horizon}`}>
                                <td>{horizonLabelForLocale(horizon, locale)}</td>
                                <td className={performanceTone(item.trailing_return)}>
                                  {formatSignedPercent(item.trailing_return, 1)}
                                </td>
                                <td>{formatSignedPercent(item.historical_mean, 1)}</td>
                                <td>{formatPercent(item.historical_vol, 1)}</td>
                                <td className={probabilityTone(item.upside_probability)}>
                                  {formatPercent(item.upside_probability, 1)}
                                </td>
                                <td>{formatSignedPercent(item.expected_drawdown, 1)}</td>
                                <td className={riskTone(risk)}>{riskLabelForLocale(risk, locale)}</td>
                                <td>
                                  <span className={`confidence-pill ${confidenceTone(item.confidence_label)}`}>
                                    {confidenceLabelForLocale(item.confidence_label, locale)}
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
