import { Link } from 'react-router-dom'

const titre = 'font-titre text-xl font-semibold text-nuit-900'

export default function MentionsLegales() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14"><div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-carte sm:p-10">
      <h1 className="font-titre text-4xl font-semibold text-nuit-900">Mentions légales</h1>
      <p className="mt-3 text-slate-600">Ce que vous devez savoir sur ce site, en toute franchise.</p>

      <div className="mt-10 space-y-9 leading-relaxed text-slate-700">
        <section aria-labelledby="ml-nature">
          <h2 id="ml-nature" className={titre}>Nature du site</h2>
          <p className="mt-2">
            ImmoSénégal est un projet de mémoire de Licence 3 Ingénierie Informatique, réalisé à l’Université Assane Seck de
            Ziguinchor (UASZ). C’est un projet pédagogique qui présente des parcours de location, de vente et de gestion immobilière. Les fonctionnalités de commission affichées dans l’application servent au suivi interne de l’agence ; elles ne prouvent pas qu’un paiement réel a été effectué.
          </p>
        </section>

        <section aria-labelledby="ml-annonces">
          <h2 id="ml-annonces" className={titre}>Annonces</h2>
          <p className="mt-2">
            Les annonces ordinaires publiées par un propriétaire apparaissent directement dans le catalogue. L’administration conserve des outils de contrôle a posteriori et peut intervenir en cas de signalement ou de non-respect des règles. Les informations d’une annonce engagent la personne qui la publie.
          </p>
        </section>

        <section aria-labelledby="ml-donnees">
          <h2 id="ml-donnees" className={titre}>Données personnelles</h2>
          <p className="mt-2">
            À l’inscription, le site conserve votre nom, votre adresse email, votre téléphone (facultatif) et votre mot de passe,
            qui n’est jamais stocké en clair. Un cookie technique, indispensable à la connexion, garde votre session ouverte. Le
            site n’utilise ni publicité ni traceur. Pour toute demande relative à vos données ou à votre compte, contactez le responsable du projet par le canal de contact communiqué lors de la présentation du projet.
          </p>
        </section>

        <section aria-labelledby="ml-hebergement">
          <h2 id="ml-hebergement" className={titre}>Hébergement</h2>
          <p className="mt-2">
            Le site est servi par Vercel, le serveur de l’application est hébergé chez Render et la base de données chez Neon.
          </p>
        </section>

        <section aria-labelledby="ml-contact">
          <h2 id="ml-contact" className={titre}>Contact</h2>
          <p className="mt-2">Ziguinchor, Sénégal. Les coordonnées institutionnelles du responsable du projet doivent être communiquées directement par celui-ci.</p>
        </section>
      </div>

      <p className="mt-12">
        <Link to="/" className="font-semibold text-emeraude-700 hover:underline">
          Retour à l’accueil
        </Link>
      </p>
    </div></div>
  )
}
