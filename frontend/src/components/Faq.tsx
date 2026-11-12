import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Réponses honnêtes : chaque phrase décrit ce que le site fait réellement aujourd'hui. */
const questions = [
  {
    q: 'Faut-il un compte pour chercher un logement ?',
    r: 'Oui. Vous devez vous connecter pour accéder au catalogue et parcourir toutes les annonces. Si vous n’avez pas encore de compte, vous pouvez en créer un gratuitement depuis la page de connexion.',
  },
  {
    q: 'Qui peut publier une annonce ?',
    r: 'Seuls les propriétaires autorisés et les administrateurs peuvent publier. Un compte client ne donne pas automatiquement le droit d’ajouter un bien ; l’accès à la publication est soumis à autorisation.',
  },
  {
    q: 'Les annonces présentées sur la plateforme sont-elles toutes disponibles ?',
    r: 'Certaines annonces peuvent servir à illustrer le fonctionnement de la plateforme dans le cadre du projet. Vérifiez toujours les informations et la disponibilité d’un bien auprès de son propriétaire avant toute démarche.',
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
    r: 'Les clients connectés peuvent envoyer des demandes de visite et suivre leur traitement depuis leur espace. Les réservations et la messagerie ne sont pas encore disponibles dans la version actuelle.',
  },
]

export default function Faq() {
  const base = useId()
  const [ouverte, setOuverte] = useState<number | null>(null)

  return (
    <section className="bg-transparent py-14 sm:py-18" aria-labelledby="titre-faq">
      <div className="mx-auto grid max-w-6xl gap-7 rounded-[2rem] bg-[#102b49] px-5 py-8 text-white shadow-carte-haut sm:px-8 sm:py-10 lg:grid-cols-[0.8fr_1.7fr] lg:gap-14">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emeraude-300">Besoin de précisions ?</p>
          <h2 id="titre-faq" className="font-titre text-3xl font-semibold text-white sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-nuit-100">Retrouvez ici les informations essentielles pour utiliser ImmoSénégal en toute clarté.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {questions.map((item, i) => {
            const ouvert = ouverte === i
            const idBouton = `${base}-q${i}`
            const idReponse = `${base}-r${i}`
            return (
              <li key={item.q} className="overflow-hidden rounded-xl border border-white/20 bg-[#173b63] px-4 shadow-sm transition hover:bg-white/15 sm:px-5">
                <h3>
                  <button
                    type="button"
                    id={idBouton}
                    aria-expanded={ouvert}
                    aria-controls={idReponse}
                    onClick={() => setOuverte(ouvert ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-white transition-colors hover:text-emeraude-300 sm:text-base"
                  >
                    {item.q}
                    <ChevronDown
                      aria-hidden
                      className={`h-5 w-5 shrink-0 text-dore-300 transition-transform ${ouvert ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div id={idReponse} role="region" aria-labelledby={idBouton} hidden={!ouvert} className="pb-4 pr-6 text-sm leading-relaxed text-nuit-100">
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
