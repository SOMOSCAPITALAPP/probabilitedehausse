export const SUPPORTED_LOCALES = ["fr", "en", "pt-BR"];

export const LOCALE_LABELS = {
  fr: "FR",
  en: "EN",
  "pt-BR": "PT-BR",
};

export function normalizeLocale(value) {
  if (!value) return "fr";
  const input = String(value).trim();
  if (input.toLowerCase() === "pt" || input.toLowerCase() === "pt-br") return "pt-BR";
  if (input.toLowerCase() === "en") return "en";
  return "fr";
}

export function getLocale(searchParams) {
  const raw = searchParams?.lang;
  if (Array.isArray(raw)) {
    return normalizeLocale(raw[0]);
  }
  return normalizeLocale(raw);
}

export function buildLocaleHref(pathname, locale, params = {}) {
  const resolvedLocale = normalizeLocale(locale);
  const query = new URLSearchParams();

  if (resolvedLocale !== "fr") {
    query.set("lang", resolvedLocale);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || key === "lang") {
      return;
    }
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function localeForDate(locale) {
  if (locale === "pt-BR") return "pt-BR";
  if (locale === "en") return "en-US";
  return "fr-FR";
}

export function pageDictionary(locale) {
  const current = normalizeLocale(locale);

  return {
    fr: {
      nav: {
        home: "Accueil",
        dashboard: "Dashboard",
        ranking: "Classement",
        requestAccess: "Demander un accès",
        return: "Retour",
      },
      common: {
        source: "Source",
        updated: "Mis à jour",
        diagnostics: "Diagnostic",
        demoMode: "Mode démo",
        assets: "Actifs",
        monthly: "1 mois",
        quarterly: "3 mois",
        yearly: "1 an",
      },
    },
    en: {
      nav: {
        home: "Home",
        dashboard: "Dashboard",
        ranking: "Ranking",
        requestAccess: "Request access",
        return: "Back",
      },
      common: {
        source: "Source",
        updated: "Updated",
        diagnostics: "Diagnostics",
        demoMode: "Demo mode",
        assets: "Assets",
        monthly: "1 month",
        quarterly: "3 months",
        yearly: "1 year",
      },
    },
    "pt-BR": {
      nav: {
        home: "Início",
        dashboard: "Dashboard",
        ranking: "Ranking",
        requestAccess: "Pedir acesso",
        return: "Voltar",
      },
      common: {
        source: "Fonte",
        updated: "Atualizado",
        diagnostics: "Diagnóstico",
        demoMode: "Modo demo",
        assets: "Ativos",
        monthly: "1 mês",
        quarterly: "3 meses",
        yearly: "1 ano",
      },
    },
  }[current];
}

export function horizonLabelForLocale(horizon, locale) {
  const labels = {
    fr: {
      "5D": "5 jours",
      "21D": "21 jours",
      "63D": "63 jours",
      "1Y": "1 an",
      "3Y": "3 ans",
      "5Y": "5 ans",
      "10Y": "10 ans",
    },
    en: {
      "5D": "5 days",
      "21D": "21 days",
      "63D": "63 days",
      "1Y": "1 year",
      "3Y": "3 years",
      "5Y": "5 years",
      "10Y": "10 years",
    },
    "pt-BR": {
      "5D": "5 dias",
      "21D": "21 dias",
      "63D": "63 dias",
      "1Y": "1 ano",
      "3Y": "3 anos",
      "5Y": "5 anos",
      "10Y": "10 anos",
    },
  };

  return labels[normalizeLocale(locale)][horizon] || horizon;
}

export function riskLabelForLocale(label, locale) {
  const normalized = String(label || "").toLowerCase();
  const labels = {
    fr: { low: "faible", medium: "moyen", high: "élevé" },
    en: { low: "low", medium: "medium", high: "high" },
    "pt-BR": { low: "baixo", medium: "médio", high: "alto" },
  };
  return labels[normalizeLocale(locale)][normalized] || normalized;
}

export function confidenceLabelForLocale(label, locale) {
  const normalized = String(label || "").toLowerCase();
  const labels = {
    fr: { low: "faible", medium: "moyenne", high: "élevée" },
    en: { low: "low", medium: "medium", high: "high" },
    "pt-BR": { low: "baixa", medium: "média", high: "alta" },
  };
  return labels[normalizeLocale(locale)][normalized] || normalized;
}

export function trendLabelForLocale(label, locale) {
  const labels = {
    fr: {
      haussiere: "haussière",
      "haussiere fragile": "haussière fragile",
      "transition / mixed": "transition",
      baissiere: "baissière",
    },
    en: {
      haussiere: "bullish",
      "haussiere fragile": "fragile bullish",
      "transition / mixed": "transition",
      baissiere: "bearish",
    },
    "pt-BR": {
      haussiere: "altista",
      "haussiere fragile": "altista frágil",
      "transition / mixed": "transição",
      baissiere: "baixista",
    },
  };

  return labels[normalizeLocale(locale)][String(label || "")] || label || "--";
}

export function benchmarkRelativeLabelForLocale(label, locale) {
  const labels = {
    fr: {
      "surperformance nette": "surperformance nette",
      "leger avantage": "léger avantage",
      "sous-performance marquee": "sous-performance marquée",
      "leger retard": "léger retard",
    },
    en: {
      "surperformance nette": "clear outperformance",
      "leger avantage": "slight edge",
      "sous-performance marquee": "marked underperformance",
      "leger retard": "slight lag",
    },
    "pt-BR": {
      "surperformance nette": "forte sobreperformance",
      "leger avantage": "leve vantagem",
      "sous-performance marquee": "subperformance marcada",
      "leger retard": "leve atraso",
    },
  };

  return labels[normalizeLocale(locale)][String(label || "")] || label || "--";
}

