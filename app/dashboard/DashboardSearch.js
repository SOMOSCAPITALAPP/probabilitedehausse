"use client";

import { useMemo, useState } from "react";

const SECTOR_LABELS = {
  fr: {
    all: "Tous les secteurs",
    technology: "Technologie",
    financials: "Finance",
    energy: "Energie",
    health_care: "Sante",
    industrials: "Industriels",
    consumer_staples: "Consommation defensive",
    consumer_discretionary: "Consommation discretionnaire",
    materials: "Materiaux",
    utilities: "Utilities",
    real_estate: "Immobilier",
    communication_services: "Communication services",
  },
  en: {
    all: "All sectors",
    technology: "Technology",
    financials: "Financials",
    energy: "Energy",
    health_care: "Health care",
    industrials: "Industrials",
    consumer_staples: "Consumer staples",
    consumer_discretionary: "Consumer discretionary",
    materials: "Materials",
    utilities: "Utilities",
    real_estate: "Real estate",
    communication_services: "Communication services",
  },
  "pt-BR": {
    all: "Todos os setores",
    technology: "Tecnologia",
    financials: "Financeiro",
    energy: "Energia",
    health_care: "Saude",
    industrials: "Industriais",
    consumer_staples: "Consumo defensivo",
    consumer_discretionary: "Consumo discricionario",
    materials: "Materiais",
    utilities: "Utilities",
    real_estate: "Imobiliario",
    communication_services: "Servicos de comunicacao",
  },
};

const COPY = {
  fr: {
    eyebrow: "Recherche",
    title: "Trouver rapidement une valeur",
    text: "Tape un nom, un ticker ou filtre par secteur.",
    inputLabel: "Titre financier",
    inputPlaceholder: "Ex. Broadcom, AVGO, energie...",
    sectorLabel: "Secteur",
    resultCount: "resultats",
    empty: "Aucun actif ne correspond a cette recherche.",
    open: "Ouvrir",
  },
  en: {
    eyebrow: "Search",
    title: "Find a security quickly",
    text: "Type a name, ticker, or filter by sector.",
    inputLabel: "Security",
    inputPlaceholder: "E.g. Broadcom, AVGO, energy...",
    sectorLabel: "Sector",
    resultCount: "results",
    empty: "No asset matches this search.",
    open: "Open",
  },
  "pt-BR": {
    eyebrow: "Busca",
    title: "Encontrar um ativo rapidamente",
    text: "Digite um nome, ticker, ou filtre por setor.",
    inputLabel: "Ativo",
    inputPlaceholder: "Ex. Broadcom, AVGO, energia...",
    sectorLabel: "Setor",
    resultCount: "resultados",
    empty: "Nenhum ativo corresponde a esta busca.",
    open: "Abrir",
  },
};

const SECTOR_OPTIONS = [
  "all",
  "technology",
  "financials",
  "energy",
  "health_care",
  "industrials",
  "consumer_staples",
  "consumer_discretionary",
  "materials",
  "utilities",
  "real_estate",
  "communication_services",
];

const SECTOR_BY_CODE = {
  XLK: "technology",
  NVDA: "technology",
  AAPL: "technology",
  MSFT: "technology",
  AVGO: "technology",
  ORCL: "technology",
  CSCO: "technology",
  CRM: "technology",
  ASML_AS: "technology",
  SAP_DE: "technology",
  ADBE: "technology",
  INTU: "technology",
  QCOM: "technology",
  TXN: "technology",
  IBM: "technology",
  "2330_TW": "technology",
  "2454_TW": "technology",
  "8035_T": "technology",
  INFY_NS: "technology",
  TCS_NS: "technology",
  CSU_TO: "technology",

  XLF: "financials",
  BRK_B: "financials",
  JPM: "financials",
  V: "financials",
  MA: "financials",
  BAC: "financials",
  "1398_HK": "financials",
  MMC: "financials",
  SPGI: "financials",
  MCO: "financials",
  CBA_AX: "financials",
  RY_TO: "financials",

  XLE: "energy",
  XOM: "energy",
  SHEL_L: "energy",
  "2222_SR": "energy",
  CVX: "energy",
  "0857_HK": "energy",
  TTE_PA: "energy",

  XLV: "health_care",
  LLY: "health_care",
  JNJ: "health_care",
  ABBV: "health_care",
  AZN_L: "health_care",
  UNH: "health_care",
  ROG_SW: "health_care",
  NOVN_SW: "health_care",
  NVO: "health_care",
  TMO: "health_care",
  ISRG: "health_care",
  AMGN: "health_care",
  SAN_PA: "health_care",
  CSL_AX: "health_care",

  XLI: "industrials",
  CAT: "industrials",
  GE: "industrials",
  GEV: "industrials",
  RTX: "industrials",
  ETN: "industrials",
  SU_PA: "industrials",
  "7203_T": "industrials",
  UNP: "industrials",
  SIE_DE: "industrials",
  DG_PA: "industrials",
  "6098_T": "industrials",
  ASHTY: "industrials",

  XLP: "consumer_staples",
  COST: "consumer_staples",
  WMT: "consumer_staples",
  PG: "consumer_staples",
  KO: "consumer_staples",
  PM: "consumer_staples",
  PEP: "consumer_staples",
  NESN_SW: "consumer_staples",
  ULVR_L: "consumer_staples",

  XLY: "consumer_discretionary",
  AMZN: "consumer_discretionary",
  TSLA: "consumer_discretionary",
  HD: "consumer_discretionary",
  "7203_T": "consumer_discretionary",
  BABA: "consumer_discretionary",
  MCD: "consumer_discretionary",
  MC_PA: "consumer_discretionary",
  OR_PA: "consumer_discretionary",
  "6758_T": "consumer_discretionary",

  XLB: "materials",
  LIN: "materials",
  BHP: "materials",
  RIO: "materials",
  SCCO: "materials",
  NEM: "materials",
  AIR_PA: "materials",
  "4063_T": "materials",

  XLU: "utilities",
  NEE: "utilities",
  IBDSF: "utilities",
  ENLAY: "utilities",
  CEG: "utilities",
  SO: "utilities",

  XLRE: "real_estate",
  WELL: "real_estate",
  PLD: "real_estate",
  EQIX: "real_estate",
  AMT: "real_estate",
  DLR: "real_estate",

  XLC: "communication_services",
  GOOGL: "communication_services",
  META: "communication_services",
  TCEHY: "communication_services",
  NFLX: "communication_services",
  "0941_HK": "communication_services",
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function sectorForAsset(asset) {
  return SECTOR_BY_CODE[asset.asset_code] || null;
}

export default function DashboardSearch({ assets, locale, buildHref }) {
  const copy = COPY[locale] || COPY.fr;
  const sectorLabels = SECTOR_LABELS[locale] || SECTOR_LABELS.fr;
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");

  const results = useMemo(() => {
    const normalizedQuery = normalize(query);

    return assets
      .map((asset) => ({
        ...asset,
        sector: sectorForAsset(asset),
      }))
      .filter((asset) => {
        if (sector !== "all" && asset.sector !== sector) {
          return false;
        }

        if (!normalizedQuery) {
          return asset.sector || sector === "all";
        }

        const haystack = [
          asset.asset_code,
          asset.asset_name,
          asset.source_symbol,
          asset.source_name,
          asset.sector ? sectorLabels[asset.sector] : "",
        ]
          .map(normalize)
          .join(" ");

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 18);
  }, [assets, query, sector, sectorLabels]);

  return (
    <section className="dashboard-search-card" aria-labelledby="dashboard-search-title">
      <div className="dashboard-search-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h3 id="dashboard-search-title">{copy.title}</h3>
          <p>{copy.text}</p>
        </div>
        <strong>
          {results.length} {copy.resultCount}
        </strong>
      </div>

      <div className="dashboard-search-controls">
        <label>
          <span>{copy.inputLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.inputPlaceholder}
          />
        </label>
        <label>
          <span>{copy.sectorLabel}</span>
          <select value={sector} onChange={(event) => setSector(event.target.value)}>
            {SECTOR_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {sectorLabels[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {results.length > 0 ? (
        <div className="dashboard-search-results">
          {results.map((asset) => (
            <a key={asset.asset_code} href={buildHref[asset.asset_code]} className="dashboard-search-result">
              <span>
                <strong>{asset.asset_code}</strong>
                <small>{asset.asset_name}</small>
              </span>
              <em>{asset.sector ? sectorLabels[asset.sector] : asset.asset_class}</em>
            </a>
          ))}
        </div>
      ) : (
        <p className="dashboard-search-empty">{copy.empty}</p>
      )}
    </section>
  );
}
