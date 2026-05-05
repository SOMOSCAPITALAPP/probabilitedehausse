import {
  DASHBOARD_HORIZON_ORDER,
  assetAnnualMean,
  assetAverageVolatility,
  assetCurrentVolatility,
  buildAssetPathStudy,
  buildBetaScenarioAnalysis,
  buildBenchmarkRelativeStudy,
  buildHistoricalHorizonMetrics,
  buildMovingAverageTrend,
  findAssetForecast,
  formatPercent,
  formatSignedPercent,
  getAssetHistory,
  getForecasts,
  getReferenceBenchmarkPayload,
  getYahooAssetSnapshot,
  groupForecastsByAsset,
  performanceTone,
  riskLabel,
} from "../../../lib/forecast-data";
import {
  LOCALE_LABELS,
  benchmarkRelativeLabelForLocale,
  buildLocaleHref,
  confidenceLabelForLocale,
  getLocale,
  horizonLabelForLocale,
  localeForDate,
  pageDictionary,
  riskLabelForLocale,
  trendLabelForLocale,
} from "../../../lib/site-copy";

export const dynamic = "force-dynamic";

const PAGE_COPY = {
  fr: {
    eyebrow: "Fiche actif",
    notFoundTitle: "Actif introuvable.",
    notFoundText: "Aucune ligne disponible pour cet actif.",
    latestPrice: "Dernier cours",
    latestClose: "Dernier close daily",
    trend: "Tendance 50j / 200j",
    intro:
      "Cette fiche se lit en deux temps. D'abord les performances déjà réalisées et la lecture probabiliste par horizon. Ensuite seulement la projection visuelle à un an, construite à partir de la moyenne historique, de la volatilité moyenne, de la volatilité actuelle et du chemin quotidien observé sur la dernière année.",
    annualMean: "Moyenne 1 an",
    avgVol: "Vol moyenne",
    currentVol: "Vol actuelle",
    lastYearPerf: "Perf dernière année",
    marketProfile: "Profil de marché",
    benchmark: "Comportement sur 1 an vs",
    outperformance: "Surperformance",
    realizedBeta: "Bêta réalisé",
    upDays: "Jours de hausse du benchmark surperformés",
    downDays: "Jours de baisse du benchmark mieux résistés",
    scenario: "Interprétation scénario",
    oneMonth: "1 mois",
    oneYear: "1 an",
    shortRead: "Lecture bêta + signal court terme",
    longRead: "Lecture bêta + carry + profil global",
    horizonTable: "Table des horizons",
    tableHeaders: ["Horizon", "Perf.", "Perf. ann.", "Norme", "Vol.", "Prob.", "Drawdown", "Risque", "Confiance"],
    chart: "Projection quotidienne à 1 an",
    chartText:
      "Courbe verte : scénario prudent projeté. Droite bleue : moyenne historique linéaire. Faisceau sable : moyenne ± 2 écarts-types.",
    legendProjected: "Projection prudente à 1 an",
    legendMean: "Moyenne historique linéaire",
    legendBand: "Faisceau moyenne ± 2 écarts-types",
    readingPrinciples: "Principes de lecture",
    pathTitle: "Chemin parcouru",
    pathText:
      "La performance terminale ne suffit pas. Northcurve suit aussi le chemin parcouru, c'est-à-dire la somme des variations quotidiennes absolues sur la fenêtre. Deux actifs peuvent finir à +10% sur un an avec des signatures de risque très différentes.",
    probTitle: "Probabilités prudentes",
    probText:
      "La probabilité de hausse compare la performance trailing à sa moyenne historique et à sa volatilité historique sur chaque horizon. Plus un actif est étiré au-dessus de sa norme, relativement à sa volatilité historique, plus la probabilité future baisse.",
    multiTitle: "Lecture multi-horizons",
    multiText:
      "La table croise le passé observé et le futur probable. La colonne Perf mesure ce qui vient réellement de se produire. La colonne Norme rappelle la moyenne historique sur l'horizon.",
    projectionTitle: "Projection à un an",
    projectionText:
      "Le graphique final ne cherche pas à dessiner un prix exact. Il projette un indice base 100 avec une nervosité quotidienne proche de l'historique récent, puis l'oriente avec la moyenne historique et les probabilités déjà calculées.",
  },
  en: {
    eyebrow: "Asset page",
    notFoundTitle: "Asset not found.",
    notFoundText: "No row is available for this asset.",
    latestPrice: "Last price",
    latestClose: "Last daily close",
    trend: "50d / 200d trend",
    intro:
      "This page is read in two steps. First, already observed performance and the probabilistic reading by horizon. Second, the one-year visual projection built from historical mean, average volatility, current volatility and the daily path observed over the past year.",
    annualMean: "1Y mean",
    avgVol: "Average vol.",
    currentVol: "Current vol.",
    lastYearPerf: "Last year perf.",
    marketProfile: "Market profile",
    benchmark: "1-year behavior vs",
    outperformance: "Outperformance",
    realizedBeta: "Realized beta",
    upDays: "Up days vs benchmark outperformed",
    downDays: "Down days vs benchmark resisted better",
    scenario: "Scenario interpretation",
    oneMonth: "1 month",
    oneYear: "1 year",
    shortRead: "Beta + short-term signal",
    longRead: "Beta + carry + global profile",
    horizonTable: "Horizon table",
    tableHeaders: ["Horizon", "Perf.", "Ann. perf.", "Norm", "Vol.", "Prob.", "Drawdown", "Risk", "Confidence"],
    chart: "One-year daily projection",
    chartText:
      "Green line: projected cautious scenario. Blue line: linear historical mean. Sand band: mean ± 2 standard deviations.",
    legendProjected: "Cautious 1-year projection",
    legendMean: "Linear historical mean",
    legendBand: "Mean ± 2 standard deviation band",
    readingPrinciples: "Reading principles",
    pathTitle: "Path traveled",
    pathText:
      "Terminal performance is not enough. Northcurve also tracks the path traveled, meaning the sum of absolute daily moves over the window. Two assets can finish at +10% over one year with very different risk signatures.",
    probTitle: "Cautious probabilities",
    probText:
      "Upside probability compares trailing performance with historical mean and historical volatility on each horizon. The more stretched the asset is above its norm, relative to historical volatility, the lower the future upside probability becomes.",
    multiTitle: "Multi-horizon reading",
    multiText:
      "The table combines observed past and probable future. The Perf column shows what has actually just happened. The Norm column recalls the historical average on the same horizon.",
    projectionTitle: "One-year projection",
    projectionText:
      "The final chart does not try to predict an exact price. It projects a base-100 index with daily nervousness close to recent history, then tilts it with historical mean and the already computed probabilities.",
  },
  "pt-BR": {
    eyebrow: "Ficha do ativo",
    notFoundTitle: "Ativo não encontrado.",
    notFoundText: "Nenhuma linha está disponível para este ativo.",
    latestPrice: "Último preço",
    latestClose: "Último fechamento diário",
    trend: "Tendência 50d / 200d",
    intro:
      "Esta ficha é lida em duas etapas. Primeiro, o desempenho já observado e a leitura probabilística por horizonte. Depois, a projeção visual de 1 ano, construída a partir da média histórica, da volatilidade média, da volatilidade atual e do caminho diário observado no último ano.",
    annualMean: "Média 1 ano",
    avgVol: "Vol. média",
    currentVol: "Vol. atual",
    lastYearPerf: "Perf. último ano",
    marketProfile: "Perfil de mercado",
    benchmark: "Comportamento em 1 ano vs",
    outperformance: "Sobreperformance",
    realizedBeta: "Beta realizado",
    upDays: "Dias de alta vs benchmark superados",
    downDays: "Dias de baixa vs benchmark resistidos melhor",
    scenario: "Interpretação de cenário",
    oneMonth: "1 mês",
    oneYear: "1 ano",
    shortRead: "Beta + sinal de curto prazo",
    longRead: "Beta + carry + perfil global",
    horizonTable: "Tabela de horizontes",
    tableHeaders: ["Horizonte", "Perf.", "Perf. anual.", "Norma", "Vol.", "Prob.", "Drawdown", "Risco", "Confiança"],
    chart: "Projeção diária em 1 ano",
    chartText:
      "Curva verde: cenário prudente projetado. Linha azul: média histórica linear. Faixa areia: média ± 2 desvios-padrão.",
    legendProjected: "Projeção prudente em 1 ano",
    legendMean: "Média histórica linear",
    legendBand: "Faixa média ± 2 desvios-padrão",
    readingPrinciples: "Princípios de leitura",
    pathTitle: "Caminho percorrido",
    pathText:
      "O desempenho terminal não basta. A Northcurve também acompanha o caminho percorrido, isto é, a soma das variações diárias absolutas na janela. Dois ativos podem terminar em +10% em um ano com assinaturas de risco muito diferentes.",
    probTitle: "Probabilidades prudentes",
    probText:
      "A probabilidade de alta compara o desempenho trailing com a média histórica e a volatilidade histórica em cada horizonte. Quanto mais esticado o ativo estiver acima da sua norma, em relação à volatilidade histórica, menor será a probabilidade futura de alta.",
    multiTitle: "Leitura multi-horizontes",
    multiText:
      "A tabela cruza o passado observado e o futuro provável. A coluna Perf mostra o que realmente acabou de acontecer. A coluna Norma relembra a média histórica no mesmo horizonte.",
    projectionTitle: "Projeção em 1 ano",
    projectionText:
      "O gráfico final não tenta desenhar um preço exato. Ele projeta um índice base 100 com nervosismo diário próximo ao histórico recente, e depois o inclina com a média histórica e as probabilidades já calculadas.",
  },
};

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

function curvePath(points, width, height, padding, min, max) {
  const span = Math.max(0.0001, max - min);
  const coords = points.map((point) => {
    const x = padding + (point.day / 252) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
    return [x, y];
  });
  return coords.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function axisLabels(width, height, padding) {
  return {
    x0: padding,
    x1: width - padding,
    y0: height - padding,
    y1: padding,
  };
}

function chartTickValues(min, max, steps = 4) {
  const safeMin = Math.min(min, 100);
  const safeMax = Math.max(max, 100);
  const span = safeMax - safeMin;
  if (span <= 0.0001) return [safeMin, safeMax];
  return Array.from({ length: steps + 1 }, (_, index) => safeMin + (span * index) / steps);
}

function yForValue(value, height, padding, min, max) {
  const span = Math.max(0.0001, max - min);
  return height - padding - ((value - min) / span) * (height - padding * 2);
}

function xForDay(day, width, padding) {
  return padding + (day / 252) * (width - padding * 2);
}

function annualizedDisplay(historyItem) {
  if (!historyItem || historyItem.annualizedReturn === null || historyItem.annualizedReturn === undefined) {
    return "--";
  }
  return formatSignedPercent(historyItem.annualizedReturn, 1);
}

function formatLargeNumber(value) {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  if (numeric >= 1e12) return `${(numeric / 1e12).toFixed(3)}T`;
  if (numeric >= 1e9) return `${(numeric / 1e9).toFixed(3)}B`;
  if (numeric >= 1e6) return `${(numeric / 1e6).toFixed(3)}M`;
  return numeric.toFixed(2);
}

function formatDecimal(value, digits = 2) {
  if (value === null || value === undefined) return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toFixed(digits);
}

function formatDateLabel(value, locale) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(localeForDate(locale), { month: "short", day: "numeric", year: "numeric" });
}

function formatDividend(dividend, dividendYield) {
  if ((dividend === null || dividend === undefined) && (dividendYield === null || dividendYield === undefined)) {
    return "--";
  }
  const left = dividend === null || dividend === undefined ? "--" : formatDecimal(dividend, 2);
  const right = dividendYield === null || dividendYield === undefined ? "--" : formatPercent(dividendYield, 2);
  return `${left} (${right})`;
}

function formatPrice(value, currency = null, locale = "en") {
  if (value === null || value === undefined) return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  const formatted = new Intl.NumberFormat(localeForDate(locale), {
    minimumFractionDigits: numeric >= 1000 ? 0 : 2,
    maximumFractionDigits: numeric >= 1000 ? 0 : 2,
  }).format(numeric);
  return currency ? `${formatted} ${currency}` : formatted;
}

function scenarioBandTone(label) {
  if (label === "high-upside") return "scenario-band-positive";
  if (label === "constructive") return "scenario-band-constructive";
  if (label === "high-downside") return "scenario-band-negative";
  if (label === "fragile") return "scenario-band-fragile";
  return "scenario-band-balanced";
}

function trendTone(label) {
  if (label === "haussiere") return "trend-positive";
  if (label === "haussiere fragile") return "trend-fragile";
  if (label === "baissiere") return "trend-negative";
  return "trend-mixed";
}

function profileSummary(scenarioAnalysis, assetName, locale) {
  if (!scenarioAnalysis) return "";
  const beta = Number(scenarioAnalysis.beta ?? 1).toFixed(2);
  const yieldPct = Number(scenarioAnalysis.annualDividendYield ?? 0);

  if (locale === "en") {
    return `${assetName} shows a beta of ${beta}. Dividend carry contributes about ${formatPercent(
      yieldPct,
      2,
    )} annually when available.`;
  }
  if (locale === "pt-BR") {
    return `${assetName} apresenta beta de ${beta}. O carry de dividendos contribui com cerca de ${formatPercent(
      yieldPct,
      2,
    )} ao ano quando disponível.`;
  }
  return `${assetName} présente un bêta de ${beta}. Le carry dividende contribue à hauteur d'environ ${formatPercent(
    yieldPct,
    2,
  )} par an lorsqu'il est disponible.`;
}

function scenarioProfileLabel(beta, locale) {
  if (locale === "en") {
    if (beta >= 1.25) return "more cyclical than market";
    if (beta <= 0.85) return "more defensive than market";
    return "close to market profile";
  }
  if (locale === "pt-BR") {
    if (beta >= 1.25) return "mais cíclico que o mercado";
    if (beta <= 0.85) return "mais defensivo que o mercado";
    return "perfil próximo ao mercado";
  }
  if (beta >= 1.25) return "plus cyclique que le marché";
  if (beta <= 0.85) return "plus défensif que le marché";
  return "profil proche du marché";
}

function scenarioRowLabel(label, locale) {
  const translations = {
    "Si le marche baisse de 10%": {
      fr: "Si le marché baisse de 10%",
      en: "If the market falls 10%",
      "pt-BR": "Se o mercado cair 10%",
    },
    "Si le marche stagne": {
      fr: "Si le marché stagne",
      en: "If the market is flat",
      "pt-BR": "Se o mercado ficar estável",
    },
    "Si le marche monte de 10%": {
      fr: "Si le marché monte de 10%",
      en: "If the market rises 10%",
      "pt-BR": "Se o mercado subir 10%",
    },
    "Si le marche baisse de 20%": {
      fr: "Si le marché baisse de 20%",
      en: "If the market falls 20%",
      "pt-BR": "Se o mercado cair 20%",
    },
    "Si le marche monte de 20%": {
      fr: "Si le marché monte de 20%",
      en: "If the market rises 20%",
      "pt-BR": "Se o mercado subir 20%",
    },
  };

  return translations[label]?.[locale] || label;
}

function LanguageSwitch({ locale, assetCode }) {
  return (
    <div className="locale-switch" aria-label="Language switch">
      {Object.entries(LOCALE_LABELS).map(([code, label]) => (
        <a
          key={code}
          href={buildLocaleHref(`/dashboard/${assetCode}`, code)}
          className={`locale-chip ${locale === code ? "locale-chip-active" : ""}`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

export default async function AssetDashboardPage({ params, searchParams }) {
  const locale = getLocale(searchParams);
  const common = pageDictionary(locale);
  const copy = PAGE_COPY[locale];
  const assetCode = params.assetCode;

  const { forecasts, updatedAt } = await getForecasts();
  const assets = groupForecastsByAsset(forecasts);
  const asset = findAssetForecast(assets, assetCode);

  if (!asset) {
    return (
      <main className="dashboard-shell dashboard-clean-shell">
        <section className="section dashboard-clean-section">
          <div className="container">
            <p className="eyebrow">Northcurve</p>
            <h1 className="dashboard-clean-title">{copy.notFoundTitle}</h1>
            <p className="hero-text dashboard-clean-copy">{copy.notFoundText}</p>
            <a className="button button-secondary" href={buildLocaleHref("/dashboard", locale)}>
              {common.nav.return}
            </a>
          </div>
        </section>
      </main>
    );
  }

  const [historyRows, benchmarkPayload, yahooSnapshot] = await Promise.all([
    getAssetHistory(assetCode),
    getReferenceBenchmarkPayload(asset),
    getYahooAssetSnapshot(asset),
  ]);
  const historyMetrics = buildHistoricalHorizonMetrics(historyRows);
  const movingAverageTrend = buildMovingAverageTrend(historyRows);
  const scenarioAnalysis = buildBetaScenarioAnalysis(asset, yahooSnapshot);
  const benchmarkStudy = buildBenchmarkRelativeStudy(asset, historyRows, benchmarkPayload);
  const pathModel = buildAssetPathStudy(asset, historyRows);

  const width = 920;
  const height = 320;
  const padding = 26;
  const annualMean = pathModel?.meanAnnualReturn ?? assetAnnualMean(asset);
  const averageVol = pathModel?.averageVol ?? assetAverageVolatility(asset);
  const currentVol = pathModel?.currentVol ?? assetCurrentVolatility(asset);
  const latestClose = historyRows.length ? Number(historyRows[historyRows.length - 1]?.close ?? null) : null;
  const latestPrice = yahooSnapshot?.currentPrice ?? latestClose;
  const latestCurrency = yahooSnapshot?.currency ?? null;

  const allSeries = [
    ...(pathModel?.baseLine ?? []),
    ...(pathModel?.upperLine ?? []),
    ...(pathModel?.lowerLine ?? []),
    ...(pathModel?.projectedSeries ?? []),
  ];
  const valueMin = allSeries.length ? Math.min(...allSeries.map((point) => point.value), 100) : 80;
  const valueMax = allSeries.length ? Math.max(...allSeries.map((point) => point.value), 100) : 120;
  const axis = axisLabels(width, height, padding);
  const projectedPath = pathModel ? curvePath(pathModel.projectedSeries, width, height, padding, valueMin, valueMax) : "";
  const basePath = pathModel ? curvePath(pathModel.baseLine, width, height, padding, valueMin, valueMax) : "";
  const upperPath = pathModel ? curvePath(pathModel.upperLine, width, height, padding, valueMin, valueMax) : "";
  const lowerPath = pathModel ? curvePath(pathModel.lowerLine, width, height, padding, valueMin, valueMax) : "";
  const yTicks = chartTickValues(valueMin, valueMax, 4);
  const xTicks = [
    { day: 0, label: "0" },
    { day: 63, label: "3M" },
    { day: 126, label: "6M" },
    { day: 189, label: "9M" },
    { day: 252, label: "1Y" },
  ];

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
            <LanguageSwitch locale={locale} assetCode={assetCode} />
          </div>
        </div>
      </header>

      <section className="section dashboard-clean-hero">
        <div className="container">
          <p className="eyebrow">{copy.eyebrow}</p>
          <div className="dashboard-clean-top">
            <div>
              <p className="forecast-asset-code">{asset.asset_code}</p>
              <h1 className="dashboard-clean-title">{asset.asset_name}</h1>
              <div className="asset-hero-price-row">
                <div className="asset-hero-price-block">
                  <span>{copy.latestPrice}</span>
                  <strong>{formatPrice(latestPrice, latestCurrency, locale)}</strong>
                </div>
                {latestClose !== null ? (
                  <div className="asset-hero-price-block asset-hero-price-secondary">
                    <span>{copy.latestClose}</span>
                    <strong>{formatPrice(latestClose, latestCurrency, locale)}</strong>
                  </div>
                ) : null}
                {movingAverageTrend ? (
                  <div className={`asset-hero-price-block asset-trend-block ${trendTone(movingAverageTrend.label)}`}>
                    <span>{copy.trend}</span>
                    <strong>{trendLabelForLocale(movingAverageTrend.label, locale)}</strong>
                  </div>
                ) : null}
              </div>
              <p className="hero-text dashboard-clean-copy">{copy.intro}</p>
            </div>

            <aside className="dashboard-clean-status">
              <div>
                <span className="status-label">{common.common.updated}</span>
                <strong>{updatedAt ? new Date(updatedAt).toLocaleString(localeForDate(locale)) : "--"}</strong>
              </div>
              <div>
                <span className="status-label">{copy.annualMean}</span>
                <strong>{formatSignedPercent(annualMean, 1)}</strong>
              </div>
              <div>
                <span className="status-label">{copy.avgVol}</span>
                <strong>{formatPercent(averageVol, 1)}</strong>
              </div>
              <div>
                <span className="status-label">{copy.currentVol}</span>
                <strong>{formatPercent(currentVol, 1)}</strong>
              </div>
              <div>
                <span className="status-label">{copy.lastYearPerf}</span>
                <strong>{formatSignedPercent(pathModel?.lastYearReturn ?? 0, 1)}</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section dashboard-clean-section">
        <div className="container">
          {yahooSnapshot ? (
            <article className="asset-clean-card snapshot-card premium-profile-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>{copy.marketProfile}</h3>
                </div>
              </div>

              <div className="snapshot-grid">
                <div className="snapshot-item">
                  <span>Market Cap (intraday)</span>
                  <strong>{formatLargeNumber(yahooSnapshot.marketCap)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Beta (5Y Monthly)</span>
                  <strong>{formatDecimal(yahooSnapshot.beta, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>PE Ratio (TTM)</span>
                  <strong>{formatDecimal(yahooSnapshot.peRatio, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>EPS (TTM)</span>
                  <strong>{formatDecimal(yahooSnapshot.eps, 2)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Earnings Date (est.)</span>
                  <strong>{formatDateLabel(yahooSnapshot.earningsDate, locale)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Forward Dividend &amp; Yield</span>
                  <strong>{formatDividend(yahooSnapshot.forwardDividend, yahooSnapshot.dividendYield)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>Ex-Dividend Date</span>
                  <strong>{formatDateLabel(yahooSnapshot.exDividendDate, locale)}</strong>
                </div>
                <div className="snapshot-item">
                  <span>1y Target Est</span>
                  <strong>{formatDecimal(yahooSnapshot.targetPrice, 2)}</strong>
                </div>
              </div>
            </article>
          ) : null}

          {benchmarkStudy ? (
            <article className="asset-clean-card benchmark-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>{`${copy.benchmark} ${benchmarkStudy.benchmarkName}`}</h3>
                </div>
                <span className={`outcome-pill ${performanceTone(benchmarkStudy.excessReturn)}`}>
                  {benchmarkRelativeLabelForLocale(benchmarkStudy.relativeLabel, locale)}
                </span>
              </div>

              <div className="benchmark-grid">
                <div className="benchmark-item">
                  <span>{asset.asset_name}</span>
                  <strong className={performanceTone(benchmarkStudy.assetReturn)}>
                    {formatSignedPercent(benchmarkStudy.assetReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>{benchmarkStudy.benchmarkName}</span>
                  <strong className={performanceTone(benchmarkStudy.benchmarkReturn)}>
                    {formatSignedPercent(benchmarkStudy.benchmarkReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>{copy.outperformance}</span>
                  <strong className={performanceTone(benchmarkStudy.excessReturn)}>
                    {formatSignedPercent(benchmarkStudy.excessReturn, 1)}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>{copy.realizedBeta}</span>
                  <strong>{benchmarkStudy.realizedBeta ? formatDecimal(benchmarkStudy.realizedBeta, 2) : "--"}</strong>
                </div>
              </div>

              <div className="benchmark-grid benchmark-grid-secondary">
                <div className="benchmark-item">
                  <span>{copy.upDays}</span>
                  <strong>
                    {benchmarkStudy.upCaptureShare !== null ? formatPercent(benchmarkStudy.upCaptureShare, 0) : "--"}
                  </strong>
                </div>
                <div className="benchmark-item">
                  <span>{copy.downDays}</span>
                  <strong>
                    {benchmarkStudy.downCaptureShare !== null ? formatPercent(benchmarkStudy.downCaptureShare, 0) : "--"}
                  </strong>
                </div>
              </div>
            </article>
          ) : null}

          {scenarioAnalysis ? (
            <article className="asset-clean-card scenario-card">
              <div className="asset-clean-header">
                <div>
                  <p className="forecast-asset-code">{asset.asset_code}</p>
                  <h3>{copy.scenario}</h3>
                </div>
                <span className={`outcome-pill ${scenarioBandTone(scenarioAnalysis.probabilityBand)}`}>
                  {scenarioProfileLabel(Number(scenarioAnalysis.beta ?? 1), locale)}
                </span>
              </div>

              <p className="scenario-intro">{profileSummary(scenarioAnalysis, asset.asset_name, locale)}</p>

              <div className="scenario-grid">
                <div className="scenario-panel">
                  <div className="scenario-panel-top">
                    <span>{copy.oneMonth}</span>
                    <strong>{copy.shortRead}</strong>
                  </div>
                  <div className="scenario-list">
                    {scenarioAnalysis.oneMonthRows.map((row) => (
                      <div key={`1m-${row.label}`} className="scenario-row">
                        <span>{scenarioRowLabel(row.label, locale)}</span>
                        <strong className={performanceTone(row.probableReturn)}>
                          {formatSignedPercent(row.probableReturn, 1)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="scenario-panel">
                  <div className="scenario-panel-top">
                    <span>{copy.oneYear}</span>
                    <strong>{copy.longRead}</strong>
                  </div>
                  <div className="scenario-list">
                    {scenarioAnalysis.oneYearRows.map((row) => (
                      <div key={`1y-${row.label}`} className="scenario-row">
                        <span>{scenarioRowLabel(row.label, locale)}</span>
                        <strong className={performanceTone(row.probableReturn)}>
                          {formatSignedPercent(row.probableReturn, 1)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <article className="asset-clean-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>{copy.horizonTable}</h3>
              </div>
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
                    const historyItem = historyMetrics[horizon];

                    if (!item) {
                      return (
                        <tr key={`${asset.asset_code}-${horizon}`}>
                          <td>{horizonLabelForLocale(horizon, locale)}</td>
                          <td className={historyItem ? performanceTone(historyItem.trailingReturn) : "empty-cell"}>
                            {historyItem ? formatSignedPercent(historyItem.trailingReturn, 1) : "--"}
                          </td>
                          <td>{annualizedDisplay(historyItem)}</td>
                          <td colSpan={6} className="empty-cell">
                            --
                          </td>
                        </tr>
                      );
                    }

                    const risk = riskLabel(item.expected_drawdown);
                    const trailingValue = historyItem?.trailingReturn ?? item.trailing_return;

                    return (
                      <tr key={`${asset.asset_code}-${horizon}`}>
                        <td>{horizonLabelForLocale(horizon, locale)}</td>
                        <td className={performanceTone(trailingValue)}>{formatSignedPercent(trailingValue, 1)}</td>
                        <td>{annualizedDisplay(historyItem)}</td>
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

          <article className="asset-clean-card asset-curve-card asset-curve-card-bottom">
            <div className="asset-clean-header asset-curve-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>{copy.chart}</h3>
              </div>
              <p className="asset-curve-header-copy">{copy.chartText}</p>
            </div>

            <div className="asset-curve-shell">
              <svg viewBox={`0 0 ${width} ${height}`} className="asset-curve-chart" role="img" aria-label={copy.chart}>
                {yTicks.map((tick) => {
                  const y = yForValue(tick, height, padding, valueMin, valueMax);
                  return (
                    <g key={`y-${tick}`}>
                      <line x1={axis.x0} y1={y} x2={axis.x1} y2={y} className="curve-grid-line" />
                      <text x={axis.x0 - 10} y={y + 4} className="curve-tick-label curve-tick-label-y">
                        {tick.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                {xTicks.map((tick) => {
                  const x = xForDay(tick.day, width, padding);
                  return (
                    <g key={`x-${tick.day}`}>
                      <line x1={x} y1={axis.y1} x2={x} y2={axis.y0} className="curve-grid-line curve-grid-line-vertical" />
                      <text x={x} y={axis.y0 + 18} textAnchor="middle" className="curve-tick-label">
                        {tick.label}
                      </text>
                    </g>
                  );
                })}
                <line x1={axis.x0} y1={axis.y0} x2={axis.x1} y2={axis.y0} className="curve-axis" />
                <line x1={axis.x0} y1={axis.y1} x2={axis.x0} y2={axis.y0} className="curve-axis" />
                {pathModel ? (
                  <>
                    <path d={upperPath} className="curve-band-line" />
                    <path d={lowerPath} className="curve-band-line" />
                    <path d={basePath} className="curve-mean-line" />
                    <path d={projectedPath} className="curve-line" />
                  </>
                ) : null}
              </svg>
              <div className="asset-curve-legend">
                <span><i className="legend-line legend-line-projected" />{copy.legendProjected}</span>
                <span><i className="legend-line legend-line-mean" />{copy.legendMean}</span>
                <span><i className="legend-line legend-line-band" />{copy.legendBand}</span>
              </div>
            </div>
          </article>

          <article className="asset-clean-card methodology-card">
            <div className="asset-clean-header">
              <div>
                <p className="forecast-asset-code">{asset.asset_code}</p>
                <h3>{copy.readingPrinciples}</h3>
              </div>
            </div>

            <div className="methodology-grid">
              <div className="methodology-panel">
                <h4>{copy.pathTitle}</h4>
                <p>{copy.pathText}</p>
              </div>
              <div className="methodology-panel">
                <h4>{copy.probTitle}</h4>
                <p>{copy.probText}</p>
              </div>
              <div className="methodology-panel">
                <h4>{copy.multiTitle}</h4>
                <p>{copy.multiText}</p>
              </div>
              <div className="methodology-panel">
                <h4>{copy.projectionTitle}</h4>
                <p>{copy.projectionText}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
