import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import RechercheLibre from './RechercheLibre'
import { lieuVersFiltre, type Transaction } from '../rechercheLibre'

/** Raccourcis : de simples liens vers le catalogue filtré (aucune annonce ni chiffre inventés). */
const suggestions = [
  { nom: 'Studios à Ziguinchor', vers: '/catalogue?transaction=LOCATION&type=STUDIO&ville=Ziguinchor' },
  { nom: 'Appartements à Dakar', vers: '/catalogue?transaction=LOCATION&type=APPARTEMENT&ville=Dakar' },
  { nom: 'Villas à Saly', vers: '/catalogue?transaction=VENTE&type=VILLA&ville=Saly' },
  { nom: 'Terrains à Thiès', vers: '/catalogue?transaction=VENTE&type=TERRAIN&ville=Thi%C3%A8s' },
]

const champ =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[0.95rem] text-encre placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-emeraude-600'
const etiquette = 'mb-1.5 block text-sm font-medium text-slate-700'

function Bascule({ valeur, changer }: { valeur: Transaction; changer: (t: Transaction) => void }) {
  return (
    <div role="group" aria-label="Je veux" className="inline-flex w-full rounded-xl bg-brume p-1 text-[0.95rem] font-semibold">
      {(
        [
          ['LOCATION', 'Louer'],
          ['VENTE', 'Acheter'],
        ] as const
      ).map(([v, nom]) => (
        <button
          key={v}
          type="button"
          aria-pressed={valeur === v}
          onClick={() => changer(v)}
          className={`flex-1 rounded-lg px-4 py-2 transition-all ${
            valeur === v ? 'bg-nuit-900 text-white shadow-sm' : 'text-slate-600 hover:text-nuit-900'
          }`}
        >
          {nom}
        </button>
      ))}
    </div>
  )
}

function FormulaireFiltres() {
  const navigate = useNavigate()
  const id = useId()
  const [transaction, setTransaction] = useState<Transaction>('LOCATION')
  const [type, setType] = useState('')
  const [lieu, setLieu] = useState('')
  const [prixMin, setPrixMin] = useState('')
  const [prixMax, setPrixMax] = useState('')

  function soumettre(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams({ transaction })
    if (type) params.set('type', type)
    for (const [cle, valeur] of Object.entries(lieuVersFiltre(lieu))) params.set(cle, valeur)
    if (Number(prixMin) > 0) params.set('prixMin', String(Number(prixMin)))
    if (Number(prixMax) > 0) params.set('prixMax', String(Number(prixMax)))
    navigate(`/catalogue?${params.toString()}`)
  }

  return (
    <form
      onSubmit={soumettre}
      aria-label="Recherche de logement"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[11rem_1fr_1.25fr_1fr_1fr_auto] lg:items-end"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <span className={etiquette} id={`${id}-veux`}>
          Je veux
        </span>
        <Bascule valeur={transaction} changer={setTransaction} />
      </div>
      <div>
        <label htmlFor={`${id}-type`} className={etiquette}>
          Type de bien
        </label>
        <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value)} className={champ}>
          <option value="">Tous les types</option>
          <option value="MAISON">Maison</option>
          <option value="APPARTEMENT">Appartement</option>
          <option value="STUDIO">Studio</option>
          <option value="VILLA">Villa</option>
          <option value="TERRAIN">Terrain</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-lieu`} className={etiquette}>
          Ville ou quartier
        </label>
        <input
          id={`${id}-lieu`}
          type="text"
          value={lieu}
          onChange={(e) => setLieu(e.target.value)}
          placeholder="Ex. Dakar, Kandé"
          autoComplete="off"
          className={champ}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:col-span-2 lg:contents">
      <div>
        <label htmlFor={`${id}-min`} className={etiquette}>
          Budget min. (FCFA)
        </label>
        <input
          id={`${id}-min`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={prixMin}
          onChange={(e) => setPrixMin(e.target.value)}
          placeholder="Aucun"
          className={champ}
        />
      </div>
      <div>
        <label htmlFor={`${id}-max`} className={etiquette}>
          Budget max. (FCFA)
        </label>
        <input
          id={`${id}-max`}
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={prixMax}
          onChange={(e) => setPrixMax(e.target.value)}
          placeholder="Aucun"
          className={champ}
        />
      </div>
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-emeraude-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emeraude-800 hover:shadow-md active:scale-[0.98] sm:col-span-2 lg:col-span-1"
      >
        <Search aria-hidden className="h-5 w-5" />
        Rechercher
      </button>
    </form>
  )
}

/**
 * Le grand panneau de recherche de l'accueil : des filtres précis, ou une phrase libre que le site décompose en filtres.
 * Les deux mènent au catalogue, avec les critères dans l'adresse.
 */
export default function RecherchePanneau() {
  const [onglet, setOnglet] = useState<'filtres' | 'phrase'>('filtres')
  const idOnglets = useId()

  return (
    <div className="rounded-3xl bg-white p-5 text-encre shadow-carte-haut ring-1 ring-black/5 sm:p-7">
      <div role="tablist" aria-label="Façon de chercher" className="mb-5 flex gap-1 border-b border-slate-200">
        {(
          [
            ['filtres', 'Par critères'],
            ['phrase', 'En une phrase'],
          ] as const
        ).map(([valeur, nom]) => (
          <button
            key={valeur}
            id={`${idOnglets}-${valeur}`}
            role="tab"
            type="button"
            aria-selected={onglet === valeur}
            aria-controls={`${idOnglets}-panneau`}
            onClick={() => setOnglet(valeur)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[0.95rem] font-semibold transition-colors ${
              onglet === valeur
                ? 'border-dore-500 text-nuit-900'
                : 'border-transparent text-slate-500 hover:text-nuit-900'
            }`}
          >
            {nom}
          </button>
        ))}
      </div>

      <div id={`${idOnglets}-panneau`} role="tabpanel" aria-labelledby={`${idOnglets}-${onglet}`}>
        {onglet === 'filtres' ? <FormulaireFiltres /> : <RechercheLibre />}
      </div>

      {onglet === 'filtres' && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="mr-1 text-sm text-slate-600">Recherches rapides :</span>
          {suggestions.map((s) => (
            <Link
              key={s.nom}
              to={s.vers}
              className="rounded-full bg-brume px-3.5 py-1.5 text-sm font-medium text-nuit-900 transition-colors hover:bg-dore-100"
            >
              {s.nom}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
