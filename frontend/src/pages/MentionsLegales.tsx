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
            Ziguinchor (UASZ). C’est un site à but pédagogique : il ne vend rien et ne perçoit aucune commission.
          </p>
        </section>

        <section aria-labelledby="ml-annonces">
          <h2 id="ml-annonces" className={titre}>Annonces</h2>
          <p className="mt-2">
            Chaque annonce est examinée par un administrateur avant sa publication. Les annonces marquées « Exemple » sont des
            démonstrations : ces biens n’existent pas et leurs photos sont illustratives. Les informations d’une annonce engagent
            la personne qui la publie.
          </p>
        </section>

        <section aria-labelledby="ml-donnees">
          <h2 id="ml-donnees" className={titre}>Données personnelles</h2>
          <p className="mt-2">
            À l’inscription, le site conserve votre nom, votre adresse email, votre téléphone (facultatif) et votre mot de passe,
            qui n’est jamais stocké en clair. Un cookie technique, indispensable à la connexion, garde votre session ouverte. Le
            site n’utilise ni publicité ni traceur. Pour demander la suppression de votre compte, utilisez le contact ci-dessous.
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
          <p className="mt-2">Ziguinchor, Sénégal. Un formulaire de contact arrive prochainement.</p>
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
