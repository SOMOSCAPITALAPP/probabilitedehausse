const valueCards = [
  {
    title: "Probabilité de hausse",
    text: "Une estimation claire de la probabilité de progression selon plusieurs horizons."
  },
  {
    title: "Potentiel de performance",
    text: "Un scénario central, prudent et favorable pour calibrer l'upside."
  },
  {
    title: "Risque de trajectoire",
    text: "Le drawdown probable et l'instabilité attendue avant la cible."
  },
  {
    title: "Chemin attendu",
    text: "La trajectoire la plus plausible entre aujourd'hui et l'horizon choisi."
  }
];

const miniPoints = [
  {
    title: "Trop de signaux",
    text: "Les données abondent, mais restent fragmentées."
  },
  {
    title: "Peu de hiérarchie",
    text: "Les tableaux de bord disent rarement quoi privilégier."
  },
  {
    title: "Pas de scénario",
    text: "La trajectoire probable reste le plus souvent absente."
  }
];

const keyPoints = [
  "Une direction probable",
  "Une amplitude attendue",
  "Un risque de parcours",
  "Une trajectoire centrale"
];

const methodSteps = [
  {
    number: "01",
    title: "Lecture du régime",
    text: "Nous analysons les conditions macro et de marché qui structurent le contexte actuel."
  },
  {
    number: "02",
    title: "Contextes comparables",
    text: "Nous identifions des configurations historiques proches pour encadrer les issues possibles."
  },
  {
    number: "03",
    title: "Distribution par horizon",
    text: "Nous produisons une probabilité de hausse, un potentiel, un risque de trajet et un scénario central."
  }
];

const coverageItems = [
  "Indices actions",
  "Taux souverains",
  "Devises majeures",
  "Or et matières premières clés",
  "Bitcoin et actifs numériques majeurs",
  "ETF globaux"
];

const horizonItems = [
  "1 semaine",
  "1 mois",
  "3 mois",
  "6 mois",
  "12 mois",
  "3 ans",
  "5 ans"
];

const benefits = [
  {
    title: "Identifier plus vite les opportunités",
    text: "Repérez les actifs aux probabilités les plus favorables."
  },
  {
    title: "Comparer l'upside entre horizons",
    text: "Choisissez le bon horizon, pas seulement le bon actif."
  },
  {
    title: "Anticiper le risque de chemin",
    text: "Évaluez les retracements probables avant l'objectif."
  },
  {
    title: "Mieux calibrer timing et patience",
    text: "Adaptez attentes, taille et horizon de décision."
  },
  {
    title: "Suivre les changements de régime",
    text: "Gardez une lecture stable dans un contexte de marché mouvant."
  }
];

const faqs = [
  {
    q: "Est-ce un outil de trading en temps réel ?",
    a: "Non. La plateforme est conçue pour une mise à jour quotidienne et une lecture multi-horizons."
  },
  {
    q: "Que signifie la probabilité de hausse ?",
    a: "C'est une estimation probabiliste conditionnelle fondée sur le contexte de marché et des régimes historiques comparables."
  },
  {
    q: "Affichez-vous seulement une direction ?",
    a: "Non. Nous affichons aussi le potentiel de performance, le risque de trajectoire et le scénario central attendu."
  },
  {
    q: "Quels actifs sont couverts ?",
    a: "Les principaux indices, taux, devises, matières premières, crypto-actifs majeurs et ETF globaux."
  },
  {
    q: "Est-ce un conseil en investissement ?",
    a: "Non. Il s'agit d'un outil d'analyse et d'aide à la décision."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="container nav-row">
          <a className="brand" href="#hero">
            Northcurve
          </a>

          <nav className="desktop-nav" aria-label="Navigation principale">
            <a href="#value-props">Produit</a>
            <a href="#methodology">Méthodologie</a>
            <a href="#coverage">Univers</a>
            <a href="#faq">FAQ</a>
            <a href="/dashboard">Dashboard</a>
          </nav>

          <div className="nav-actions">
            <a className="link-secondary" href="#final-cta">
              Connexion
            </a>
            <a className="button button-primary" href="#final-cta">
              Demander un accès
            </a>
          </div>
        </div>
      </header>

      <section id="hero" className="section hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Northcurve | Probabilistic Market Intelligence</p>
            <h1>
              La probabilité de hausse des grands actifs mondiaux, horizon par
              horizon.
            </h1>
            <p className="hero-text">
              Chaque jour, nous estimons pour les principaux actifs financiers la
              probabilité de progression, le potentiel de performance et la
              trajectoire de marché la plus probable selon l&apos;horizon choisi.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#final-cta">
                Demander un accès
              </a>
                <a className="button button-secondary" href="/dashboard">
                  Voir le dashboard
                </a>
                <a className="button button-secondary" href="#preview">
                Voir la démo
              </a>
            </div>

            <p className="hero-proof">
              Indices, taux, devises, matières premières, crypto, ETF.
            </p>

            <ul className="badge-list">
              <li>Multi-horizons</li>
              <li>Mise à jour quotidienne</li>
              <li>Cross-asset</li>
              <li>Scénarios probabilistes</li>
            </ul>
          </div>

          <div id="preview" className="preview-wrap">
            <article className="preview-card">
              <div className="preview-topline">
                <span>Lecture du jour</span>
                <span>Mis à jour aujourd&apos;hui</span>
              </div>

              <div className="preview-title-row">
                <div>
                  <p className="preview-kicker">Actif</p>
                  <h2>S&amp;P 500</h2>
                </div>
                <div className="confidence-pill">Confiance élevée</div>
              </div>

              <div className="chip-row">
                <span className="chip active">1M</span>
                <span className="chip">3M</span>
                <span className="chip">12M</span>
              </div>

              <div className="probability-grid">
                <div>
                  <span>1 mois</span>
                  <strong>58%</strong>
                </div>
                <div>
                  <span>3 mois</span>
                  <strong>64%</strong>
                </div>
                <div>
                  <span>12 mois</span>
                  <strong>71%</strong>
                </div>
              </div>

              <div className="path-chart" aria-hidden="true">
                <div className="path-glow" />
                <svg viewBox="0 0 500 180" role="img">
                  <path
                    d="M 0 140 C 60 152, 92 162, 132 148 S 220 116, 270 120 S 355 94, 410 84 S 468 54, 500 30"
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#a3b8ff" />
                      <stop offset="60%" stopColor="#79e7c6" />
                      <stop offset="100%" stopColor="#ffd17a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="path-caption">
                  Consolidation courte, puis reprise progressive
                </div>
              </div>

              <div className="metric-grid">
                <div>
                  <span>Upside central</span>
                  <strong>+4,2%</strong>
                </div>
                <div>
                  <span>Scénario haut</span>
                  <strong>+9,1%</strong>
                </div>
                <div>
                  <span>Drawdown probable</span>
                  <strong>-3,4%</strong>
                </div>
                <div>
                  <span>Niveau de confiance</span>
                  <strong>Élevé</strong>
                </div>
              </div>

              <p className="preview-note">
                Exemple de présentation. Chiffres illustratifs.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="problem" className="section">
        <div className="container narrow">
          <div className="section-heading">
            <p className="eyebrow">Pourquoi maintenant</p>
            <h2>
              Les marchés ne manquent pas d&apos;indicateurs. Ils manquent de
              réponses.
            </h2>
            <p>
              Le problème n&apos;est plus l&apos;accès à la donnée. Le problème
              est de savoir quelles sont les chances qu&apos;un actif
              progresse, jusqu&apos;où il peut aller, et quel chemin il risque
              d&apos;emprunter pour y parvenir.
            </p>
          </div>

          <div className="mini-grid">
            {miniPoints.map((item) => (
              <article className="mini-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="value-props" className="section">
        <div className="container">
          <div className="section-heading center">
            <p className="eyebrow">Sortie produit</p>
            <h2>Une lecture immédiatement exploitable.</h2>
          </div>

          <div className="card-grid">
            {valueCards.map((item) => (
              <article className="feature-card" key={item.title}>
                <div className="feature-icon" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="difference" className="section">
        <div className="container split-grid">
          <div className="section-heading">
            <p className="eyebrow">Positionnement</p>
            <h2>
              Un moteur de scénarios, pas un tableau de bord
              d&apos;indicateurs.
            </h2>
            <p>
              Nous ne cherchons pas à montrer davantage de signaux. Nous
              transformons des dynamiques macro et de marché en scénarios
              probabilistes cohérents, par actif et par horizon.
            </p>
          </div>

          <div className="key-grid">
            {keyPoints.map((point) => (
              <div className="key-tile" key={point}>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="methodology" className="section">
        <div className="container">
          <div className="section-heading narrow">
            <p className="eyebrow">Méthodologie</p>
            <h2>Une approche probabiliste, rigoureuse par construction.</h2>
            <p>
              Notre moteur combine signaux de marché, variables macroéconomiques,
              régimes historiques comparables et dynamiques cross-asset afin
              d&apos;estimer des scénarios conditionnels plausibles.
            </p>
            <p className="supporting-note">
              Pas de certitude promise. Une lecture structurée des scénarios
              plausibles.
            </p>
          </div>

          <div className="steps-grid">
            {methodSteps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="coverage" className="section">
        <div className="container">
          <div className="section-heading center">
            <p className="eyebrow">Univers couvert</p>
            <h2>Les grands actifs mondiaux, au même niveau de lecture.</h2>
            <p>
              Une seule grille de lecture pour comparer les opportunités entre
              classes d&apos;actifs et horizons.
            </p>
          </div>

          <div className="coverage-grid">
            {coverageItems.map((item) => (
              <article className="coverage-item" key={item}>
                {item}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="horizons" className="section">
        <div className="container narrow center">
          <div className="section-heading center">
            <p className="eyebrow">Horizons</p>
            <h2>Du tactique au structurel.</h2>
            <p>
              Une mise à jour quotidienne pour suivre les actifs sur plusieurs
              horizons de décision.
            </p>
          </div>

          <div className="horizon-track">
            {horizonItems.map((item) => (
              <span className="horizon-chip" key={item}>
                {item}
              </span>
            ))}
          </div>

          <p className="supporting-note">
            Une lecture cohérente du court au long terme.
          </p>
        </div>
      </section>

      <section id="benefits" className="section">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Bénéfices</p>
            <h2>Ce que la plateforme permet de faire.</h2>
          </div>

          <div className="benefit-list">
            {benefits.map((item) => (
              <article className="benefit-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container faq-grid">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Questions fréquentes</h2>
            <p>
              Les réponses aux principales questions sur le produit, la
              méthodologie et l&apos;usage.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="final-cta" className="section">
        <div className="container cta-grid">
          <div className="section-heading">
            <p className="eyebrow">Accès</p>
            <h2>Une lecture plus claire des marchés mondiaux.</h2>
            <p>
              Chaque jour, identifiez où les probabilités sont les plus
              favorables, quel upside reste disponible, et quel chemin de marché
              semble le plus plausible.
            </p>
          </div>

          <form className="signup-form">
            <h3>Demander un accès</h3>
            <p className="form-intro">
              Recevez les prochaines informations d&apos;ouverture et une démo
              du produit.
            </p>

            <div className="form-grid">
              <label>
                <span>Prénom</span>
                <input type="text" placeholder="Votre prénom" />
              </label>
              <label>
                <span>Nom</span>
                <input type="text" placeholder="Votre nom" />
              </label>
            </div>

            <label>
              <span>Email professionnel</span>
              <input type="email" placeholder="vous@entreprise.com" />
            </label>

            <label>
              <span>Société</span>
              <input type="text" placeholder="Nom de votre société" />
            </label>

            <label>
              <span>Profil</span>
              <select defaultValue="">
                <option value="" disabled>
                  Sélectionner
                </option>
                <option>Investisseur privé</option>
                <option>Conseiller / allocataire</option>
                <option>Family office</option>
                <option>Analyste / recherche</option>
                <option>Institution</option>
              </select>
            </label>

            <label>
              <span>Message</span>
              <textarea placeholder="Ce que vous souhaitez suivre ou évaluer" />
            </label>

            <label className="checkbox">
              <input type="checkbox" />
              <span>J&apos;accepte d&apos;être contacté au sujet de l&apos;accès au produit.</span>
            </label>

            <button className="button button-primary" type="submit">
              Envoyer la demande
            </button>

            <p className="form-note">
              Informations fournies à titre analytique uniquement. Aucun contenu
              ne constitue un conseil en investissement.
            </p>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <a className="brand" href="#hero">
              Northcurve
            </a>
            <p>Lecture probabiliste des grands actifs mondiaux.</p>
          </div>

          <div className="footer-column">
            <h3>Produit</h3>
            <a href="#value-props">Vue d&apos;ensemble</a>
            <a href="#methodology">Méthodologie</a>
            <a href="#coverage">Univers couvert</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="footer-column">
            <h3>Entreprise</h3>
            <a href="#final-cta">Accès</a>
            <a href="#faq">Contact</a>
            <a href="#final-cta">Confidentialité</a>
            <a href="#final-cta">Mentions légales</a>
          </div>
        </div>

        <div className="container footer-bottom">
          <p>
            Les informations présentées sur cette plateforme sont fournies à des
            fins informatives et analytiques uniquement. Elles ne constituent ni
            une recommandation personnalisée, ni un conseil en investissement.
          </p>
        </div>
      </footer>
    </main>
  );
}
