import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Réponses honnêtes : chaque phrase décrit ce que le site fait réellement aujourd'hui. */
const questions = [
  {
    q: 'Faut-il un compte pour chercher un logement ?',
    r: 'Non. Le catalogue est ouvert à tous. Un compte sert à publier des annonces et à retrouver son espace.',
  },
  {
    q: 'Qui peut publier une annonce ?',
    r: 'Les propriétaires. Chaque inscription crée d’abord un compte client : vous demandez ensuite le rôle de propriétaire et un administrateur examine la demande. Les rôles d’agent et d’administrateur ne se choisissent pas à l’inscription.',
  },
  {
    q: 'Combien de photos puis-je ajouter à une annonce ?',
    r: 'Jusqu’à 8 photos par annonce, en JPEG ou PNG, de 5 Mo au maximum chacune. À l’envoi, les photos sont ré-encodées : les informations cachées qu’elles contiennent, comme la position GPS, sont supprimées.',
  },
  {
    q: 'La recherche en une phrase, est-ce de l’intelligence artificielle ?',
    r: 'Non. Le site repère simplement le type de bien, le lieu, le budget et « louer » ou « acheter » dans votre phrase, directement dans votre navigateur, puis ouvre le catalogue avec ces filtres. Les critères reconnus s’affichent avant l’envoi pour que vous puissiez les vérifier.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    r: 'Les mots de passe ne sont jamais conservés en clair : ils sont chiffrés avec BCrypt. La connexion est bloquée quelques minutes après plusieurs échecs. Vos droits sont vérifiés par le serveur, jamais seulement par le site.',
  },
  {
    q: 'Puis-je réserver, payer ou écrire au propriétaire ?',
    r: 'Pas encore. La demande de visite, la messagerie, la carte des biens et le badge « annonce vérifiée » sont prévus mais ne sont pas disponibles : ils figurent dans la liste « À venir » de cette page.',
  },
]

export default function Faq() {
  const base = useId()
  const [ouverte, setOuverte] = useState<number | null>(null)

  return (
    <section className="border-t border-slate-200 bg-white py-16" aria-labelledby="titre-faq">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[1fr_1.7fr]">
        <div>
          <h2 id="titre-faq" className="font-titre text-3xl font-semibold sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-2 max-w-sm text-slate-600">Des réponses franches, y compris sur ce qui n’existe pas encore.</p>
        </div>
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {questions.map((item, i) => {
            const ouvert = ouverte === i
            const idBouton = `${base}-q${i}`
            const idReponse = `${base}-r${i}`
            return (
              <li key={item.q}>
                <h3>
                  <button
                    type="button"
                    id={idBouton}
                    aria-expanded={ouvert}
                    aria-controls={idReponse}
                    onClick={() => setOuverte(ouvert ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left text-lg font-medium transition-colors hover:text-emeraude-700"
                  >
                    {item.q}
                    <ChevronDown
                      aria-hidden
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${ouvert ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div id={idReponse} role="region" aria-labelledby={idBouton} hidden={!ouvert} className="pb-5 pr-9 text-slate-700">
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
