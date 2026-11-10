import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { analyser, versCatalogue, type Transaction } from '../rechercheLibre'

const exemples = ['Studio à Ziguinchor sous 80 000 FCFA', 'Villa à vendre à Dakar', 'Terrain à acheter, 15 millions max']

/**
 * Grande zone de saisie de l'accueil : la personne décrit en une phrase ce qu'elle cherche,
 * le site reconnaît les critères (type, lieu, budget, louer/acheter) et ouvre le catalogue filtré.
 */
export default function RechercheLibre() {
  const navigate = useNavigate()
  const id = useId()
  const zone = useRef<HTMLTextAreaElement>(null)
  const [texte, setTexte] = useState('')
  const [choix, setChoix] = useState<Transaction>('LOCATION')
  const [message, setMessage] = useState<string | null>(null)

  const criteres = analyser(texte, choix)

  function envoyer(e?: FormEvent) {
    e?.preventDefault()
    const phrase = texte.trim()
    if (phrase && !criteres.trouve) {
      setMessage('Nous n’avons reconnu aucun critère. Essayez par exemple : « studio à Ziguinchor sous 80 000 FCFA ».')
      return
    }
    navigate(versCatalogue(criteres))
  }

  function auClavier(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyer()
    }
  }

  return (
    <div>
      <form
        onSubmit={envoyer}
        aria-label="Recherche en une phrase"
        className="rounded-2xl border border-slate-300 bg-white p-3 transition-colors focus-within:border-emeraude-600 focus-within:ring-4 focus-within:ring-emeraude-600/15 sm:p-4"
      >
        <label htmlFor={id} className="sr-only">
          Décrivez le logement que vous cherchez
        </label>
        <textarea
          id={id}
          ref={zone}
          rows={2}
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value)
            setMessage(null)
          }}
          onKeyDown={auClavier}
          placeholder="Décrivez le logement que vous cherchez : type, lieu, budget…"
          className="w-full resize-none rounded-2xl bg-transparent px-3 py-2 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div role="group" aria-label="Je veux" className="inline-flex rounded-xl bg-brume p-1 text-sm font-semibold">
            {(
              [
                ['LOCATION', 'Louer'],
                ['VENTE', 'Acheter'],
              ] as const
            ).map(([valeur, nom]) => (
              <button
                key={valeur}
                type="button"
                aria-pressed={choix === valeur}
                onClick={() => setChoix(valeur)}
                className={`rounded-lg px-4 py-1.5 transition-colors ${
                  choix === valeur ? 'bg-nuit-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {nom}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emeraude-700 px-5 py-2.5 font-semibold text-white transition-all hover:bg-emeraude-800 active:scale-[0.98]"
          >
            <Search aria-hidden className="h-4 w-4" />
            Rechercher
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {exemples.map((exemple) => (
          <button
            key={exemple}
            type="button"
            onClick={() => {
              setTexte(exemple)
              setMessage(null)
              zone.current?.focus()
            }}
            className="rounded-full bg-brume px-3.5 py-1.5 text-left text-sm font-medium text-nuit-900 transition-colors hover:bg-dore-100"
          >
            {exemple}
          </button>
        ))}
      </div>

      <div role="status" className="mt-3 min-h-6 text-sm text-slate-600">
        {message ? (
          <p>{message}</p>
        ) : texte.trim() && criteres.reconnus.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>Nous cherchons :</span>
            {criteres.reconnus.map((r) => (
              <span key={r} className="rounded-full bg-emeraude-50 px-2.5 py-0.5 font-medium text-emeraude-900">
                {r}
              </span>
            ))}
          </div>
        ) : (
          <p>Nous reconnaissons le type de bien, le lieu, le budget et « louer » ou « acheter ».</p>
        )}
      </div>
    </div>
  )
}
