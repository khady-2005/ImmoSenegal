import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Réponses honnêtes : chaque phrase décrit ce que le site fait réellement aujourd'hui. */
const questions = [
  {
    q: 'Faut-il un compte pour chercher un logement ?',
    r: 'Non. Vous pouvez parcourir le catalogue et effectuer des recherches sans compte. La connexion est nécessaire pour accéder aux espaces et démarches réservés aux utilisateurs inscrits.',
  },
  {
    q: 'Qui peut publier une annonce ?',
    r: 'Seuls les propriétaires autorisés et les administrateurs peuvent publier. Un compte client ne donne pas automatiquement le droit d’ajouter un bien ; l’accès à la publication est soumis à autorisation.',
  },
  {
    q: 'Que sont les annonces marquées « Exemple » ?',
    r: 'Ce sont des annonces fictives utilisées pour présenter le fonctionnement de la plateforme. Les biens et les photos sont illustratifs : il ne s’agit pas d’offres immobilières réelles.',
  },
  {
    q: 'Combien de photos puis-je ajouter à une annonce ?',
    r: 'Jusqu’à 8 photos par annonce, en JPEG ou PNG, de 5 Mo au maximum chacune. À l’envoi, les photos sont ré-encodées : les informations cachées qu’elles contiennent, comme la position GPS, sont supprimées.',
  },
  {
    q: 'La recherche en une phrase, est-ce de l’intelligence artificielle ?',
    r: 'La recherche analyse les mots de votre phrase pour repérer des critères comme le type de bien, la localité, le budget et la location ou l’achat. Les critères détectés peuvent être vérifiés avant d’afficher le catalogue filtré.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    r: 'Les mots de passe ne sont jamais conservés en clair : ils sont chiffrés avec BCrypt. La connexion est bloquée quelques minutes après plusieurs échecs. Vos droits sont vérifiés par le serveur, jamais seulement par le site.',
  },
  {
    q: 'Puis-je réserver, payer ou écrire au propriétaire ?',
    r: 'Les demandes de visite, les réservations et la messagerie ne sont pas encore disponibles dans la version actuelle. Le catalogue permet de découvrir les annonces et de consulter leurs fiches selon les droits d’accès.',
  },
]

export default function Faq() {
  const base = useId()
  const [ouverte, setOuverte] = useState<number | null>(null)

  return (
    <section className="bg-[#fbfaf7] py-16 sm:py-20" aria-labelledby="titre-faq">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.8fr_1.7fr] lg:gap-14">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emeraude-700">Besoin de précisions ?</p>
          <h2 id="titre-faq" className="font-titre text-3xl font-semibold text-nuit-900 sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-slate-600">Retrouvez ici les informations essentielles pour utiliser ImmoSénégal en toute clarté.</p>
        </div>
        <ul className="space-y-3">
          {questions.map((item, i) => {
            const ouvert = ouverte === i
            const idBouton = `${base}-q${i}`
            const idReponse = `${base}-r${i}`
            return (
              <li key={item.q} className="overflow-hidden rounded-2xl border border-[#e9e3d8] bg-white px-5 shadow-[0_8px_24px_-20px_rgba(7,20,42,0.35)] sm:px-6">
                <h3>
                  <button
                    type="button"
                    id={idBouton}
                    aria-expanded={ouvert}
                    aria-controls={idReponse}
                    onClick={() => setOuverte(ouvert ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-nuit-900 transition-colors hover:text-emeraude-700 sm:text-lg"
                  >
                    {item.q}
                    <ChevronDown
                      aria-hidden
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${ouvert ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div id={idReponse} role="region" aria-labelledby={idBouton} hidden={!ouvert} className="pb-5 pr-9 leading-relaxed text-slate-600">
                  {item.r}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
