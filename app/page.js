import {
  LOCALE_LABELS,
  buildLocaleHref,
  getLocale,
  pageDictionary,
} from "../lib/site-copy";

const LANDING_COPY = {
  fr: {
    nav: {
      product: "Produit",
      methodology: "Méthodologie",
      universe: "Univers",
      faq: "FAQ",
    },
    hero: {
      eyebrow: "Northcurve | Probabilistic Market Intelligence",
      title: "La probabilité de hausse des grands actifs mondiaux, horizon par horizon.",
      text:
        "Chaque jour, Northcurve compare la performance récente d'un actif à sa norme historique pour produire une lecture probabiliste prudente, multi-horizons, exploitable immédiatement.",
      primary: "Voir le dashboard",
      secondary: "Voir le classement",
      proof: "Indices actions, taux, devises, matières premières, crypto, volatilité, actions mondiales.",
      badges: ["Multi-horizons", "Mise à jour quotidienne", "Cross-asset", "Lecture prudente"],
    },
    preview: {
      title: "Lecture du jour",
      updated: "Actualisé chaque nuit à Paris",
      cardTitle: "Ce que Northcurve affiche",
      bullets: [
        "Une probabilité de hausse par horizon.",
        "Une norme historique et une volatilité historique.",
        "Un drawdown probable pour lire le risque de parcours.",
        "Une fiche actif détaillée avec benchmark, scénarios et projection.",
      ],
    },
    sections: {
      problemTitle: "Le marché donne beaucoup de prix. Il donne rarement un cadre de décision.",
      problemText:
        "Northcurve ne cherche pas à montrer plus de bruit. Le produit cherche à hiérarchiser les actifs, à rappeler leur norme historique et à lire où la probabilité devient favorable ou défavorable.",
      methodologyTitle: "Une méthodologie lisible avant d'être compliquée.",
      methodologyText:
        "Le cœur du modèle compare la performance trailing à sa moyenne historique et à sa volatilité historique. Plus un actif est tendu par rapport à sa norme, plus la probabilité de hausse future baisse. Le parti pris est volontairement prudent.",
      universeTitle: "Un univers multi-actifs homogène.",
      universeText:
        "Le même cadre s'applique aux indices actions, aux taux investissables, aux devises, aux matières premières, à la crypto, à la volatilité et aux actions mondiales.",
      faqTitle: "Questions fréquentes",
    },
    faq: [
      {
        q: "À quelle fréquence les données sont-elles mises à jour ?",
        a: "Une actualisation quotidienne est lancée automatiquement autour de minuit, heure de Paris.",
      },
      {
        q: "Que signifie la probabilité de hausse ?",
        a: "C'est une lecture prudente de l'écart entre la performance récente et la norme historique de l'actif, calculée horizon par horizon.",
      },
      {
        q: "Que voit-on ensuite sur la fiche actif ?",
        a: "Les performances passées, les niveaux probabilistes futurs, la lecture relative au benchmark et une projection quotidienne à un an.",
      },
    ],
  },
  en: {
    nav: {
      product: "Product",
      methodology: "Methodology",
      universe: "Coverage",
      faq: "FAQ",
    },
    hero: {
      eyebrow: "Northcurve | Probabilistic Market Intelligence",
      title: "The upside probability of major global assets, horizon by horizon.",
      text:
        "Every day, Northcurve compares recent asset performance with its historical norm to produce a cautious, multi-horizon probabilistic view that can be used immediately.",
      primary: "Open dashboard",
      secondary: "Open ranking",
      proof: "Equity indices, rates, FX, commodities, crypto, volatility, global equities.",
      badges: ["Multi-horizon", "Daily refresh", "Cross-asset", "Cautious framework"],
    },
    preview: {
      title: "Daily reading",
      updated: "Refreshed nightly in Paris time",
      cardTitle: "What Northcurve displays",
      bullets: [
        "An upside probability for each horizon.",
        "A historical mean and a historical volatility.",
        "A probable drawdown to read path risk.",
        "A detailed asset page with benchmark, scenarios and projection.",
      ],
    },
    sections: {
      problemTitle: "Markets give plenty of prices. They rarely provide a decision framework.",
      problemText:
        "Northcurve is not designed to add more noise. It is designed to rank assets, remind you of their historical norm and show where probability becomes favorable or unfavorable.",
      methodologyTitle: "A methodology that stays readable before it becomes complex.",
      methodologyText:
        "The core model compares trailing performance with the asset's historical mean and historical volatility. The more stretched an asset is versus its norm, the lower its future upside probability becomes. The stance is intentionally cautious.",
      universeTitle: "A consistent multi-asset universe.",
      universeText:
        "The same framework is applied to equity indices, investable rates, currencies, commodities, crypto, volatility and global stocks.",
      faqTitle: "Frequently asked questions",
    },
    faq: [
      {
        q: "How often are the data refreshed?",
        a: "A daily update runs automatically around midnight Paris time.",
      },
      {
        q: "What does upside probability mean?",
        a: "It is a cautious reading of the gap between recent performance and the asset's historical norm, computed horizon by horizon.",
      },
      {
        q: "What does the asset page add?",
        a: "Past performance, future probabilistic levels, benchmark-relative behavior and a one-year daily projection.",
      },
    ],
  },
  "pt-BR": {
    nav: {
      product: "Produto",
      methodology: "Metodologia",
      universe: "Cobertura",
      faq: "FAQ",
    },
    hero: {
      eyebrow: "Northcurve | Probabilistic Market Intelligence",
      title: "A probabilidade de alta dos grandes ativos globais, horizonte por horizonte.",
      text:
        "Todos os dias, a Northcurve compara o desempenho recente de um ativo com sua norma histórica para produzir uma leitura probabilística prudente, multi-horizontes e utilizável de imediato.",
      primary: "Abrir dashboard",
      secondary: "Abrir ranking",
      proof: "Índices de ações, juros, câmbio, commodities, cripto, volatilidade e ações globais.",
      badges: ["Multi-horizontes", "Atualização diária", "Cross-asset", "Leitura prudente"],
    },
    preview: {
      title: "Leitura do dia",
      updated: "Atualizado todas as noites no horário de Paris",
      cardTitle: "O que a Northcurve mostra",
      bullets: [
        "Uma probabilidade de alta por horizonte.",
        "Uma média histórica e uma volatilidade histórica.",
        "Um drawdown provável para ler o risco do caminho.",
        "Uma página detalhada do ativo com benchmark, cenários e projeção.",
      ],
    },
    sections: {
      problemTitle: "O mercado entrega muitos preços. Raramente entrega um quadro de decisão.",
      problemText:
        "A Northcurve não quer mostrar mais ruído. O produto quer hierarquizar ativos, lembrar a norma histórica deles e mostrar onde a probabilidade fica favorável ou desfavorável.",
      methodologyTitle: "Uma metodologia que continua legível antes de ficar complexa.",
      methodologyText:
        "O núcleo do modelo compara o desempenho trailing com a média histórica e a volatilidade histórica do ativo. Quanto mais esticado o ativo estiver em relação à sua norma, menor será a probabilidade futura de alta. O viés é intencionalmente prudente.",
      universeTitle: "Um universo multiativos homogêneo.",
      universeText:
        "O mesmo quadro vale para índices de ações, juros investíveis, moedas, commodities, cripto, volatilidade e ações globais.",
      faqTitle: "Perguntas frequentes",
    },
    faq: [
      {
        q: "Com que frequência os dados são atualizados?",
        a: "Uma atualização diária roda automaticamente por volta da meia-noite no horário de Paris.",
      },
      {
        q: "O que significa probabilidade de alta?",
        a: "É uma leitura prudente da diferença entre o desempenho recente e a norma histórica do ativo, calculada horizonte por horizonte.",
      },
      {
        q: "O que a página do ativo acrescenta?",
        a: "Desempenho passado, níveis probabilísticos futuros, leitura relativa ao benchmark e uma projeção diária para um ano.",
      },
    ],
  },
};

function LanguageSwitch({ locale, path = "/" }) {
  return (
    <div className="locale-switch" aria-label="Language switch">
      {Object.entries(LOCALE_LABELS).map(([code, label]) => (
        <a
          key={code}
          href={buildLocaleHref(path, code)}
          className={`locale-chip ${locale === code ? "locale-chip-active" : ""}`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

export default function HomePage({ searchParams }) {
  const locale = getLocale(searchParams);
  const base = pageDictionary(locale);
  const copy = LANDING_COPY[locale];

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="container nav-row">
          <a className="brand" href="#hero">
            Northcurve
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#product">{copy.nav.product}</a>
            <a href="#methodology">{copy.nav.methodology}</a>
            <a href="#universe">{copy.nav.universe}</a>
            <a href="#faq">{copy.nav.faq}</a>
            <a href={buildLocaleHref("/dashboard", locale)}>{base.nav.dashboard}</a>
            <a href={buildLocaleHref("/classement", locale)}>{base.nav.ranking}</a>
          </nav>

          <div className="nav-actions">
            <LanguageSwitch locale={locale} />
            <a className="button button-secondary" href={buildLocaleHref("/dashboard", locale)}>
              {base.nav.dashboard}
            </a>
          </div>
        </div>
      </header>

      <section id="hero" className="section hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{copy.hero.eyebrow}</p>
            <h1>{copy.hero.title}</h1>
            <p className="hero-text">{copy.hero.text}</p>

            <div className="hero-actions">
              <a className="button button-primary" href={buildLocaleHref("/dashboard", locale)}>
                {copy.hero.primary}
              </a>
              <a className="button button-secondary" href={buildLocaleHref("/classement", locale)}>
                {copy.hero.secondary}
              </a>
            </div>

            <p className="hero-proof">{copy.hero.proof}</p>
            <ul className="badge-list">
              {copy.hero.badges.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="preview-wrap">
            <article className="preview-card">
              <div className="preview-topline">
                <span>{copy.preview.title}</span>
                <span>{copy.preview.updated}</span>
              </div>

              <div className="preview-title-row">
                <div>
                  <p className="preview-kicker">Northcurve</p>
                  <h2>{copy.preview.cardTitle}</h2>
                </div>
              </div>

              <div className="metric-grid">
                {copy.preview.bullets.map((item) => (
                  <div key={item}>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="product" className="section">
        <div className="container narrow">
          <div className="section-heading">
            <p className="eyebrow">{copy.nav.product}</p>
            <h2>{copy.sections.problemTitle}</h2>
            <p>{copy.sections.problemText}</p>
          </div>
        </div>
      </section>

      <section id="methodology" className="section">
        <div className="container narrow">
          <div className="section-heading">
            <p className="eyebrow">{copy.nav.methodology}</p>
            <h2>{copy.sections.methodologyTitle}</h2>
            <p>{copy.sections.methodologyText}</p>
          </div>
        </div>
      </section>

      <section id="universe" className="section">
        <div className="container narrow">
          <div className="section-heading">
            <p className="eyebrow">{copy.nav.universe}</p>
            <h2>{copy.sections.universeTitle}</h2>
            <p>{copy.sections.universeText}</p>
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container faq-grid">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>{copy.sections.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {copy.faq.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
