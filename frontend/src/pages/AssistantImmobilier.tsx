import { useState, type FormEvent } from 'react'
import { Bot, Search, Sparkles } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import AnnonceCard from '../components/AnnonceCard'
import type { Annonce, PagePaginee, TypeBien, TypeTransaction } from '../types'

type Criteres = {
  transaction: TypeTransaction
  type: TypeBien | ''
  ville: string
  quartier: string
  prixMax: string
  piecesMin: string
  equipements: string
}

const initial: Criteres = {
  transaction: 'LOCATION',
  type: '',
  ville: '',
  quartier: '',
  prixMax: '',
  piecesMin: '',
  equipements: '',
}

export default function AssistantImmobilier() {
  const [criteres, setCriteres] = useState<Criteres>(initial)
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  function modifier<K extends keyof Criteres>(cle: K, valeur: Criteres[K]) {
    setCriteres((actuels) => ({ ...actuels, [cle]: valeur }))
  }

  async function rechercher(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setChargement(true)
    setErreur('')
    setRechercheFaite(false)
    const params = new URLSearchParams({ transaction: criteres.transaction, page: '0', taille: '12' })
    if (criteres.type) params.set('type', criteres.type)
    if (criteres.ville.trim()) params.set('ville', criteres.ville.trim())
    if (criteres.quartier.trim()) params.set('quartier', criteres.quartier.trim())
    if (criteres.prixMax && Number(criteres.prixMax) > 0) params.set('prixMax', criteres.prixMax)
    if (criteres.piecesMin && Number(criteres.piecesMin) > 0) params.set('piecesMin', criteres.piecesMin)
    if (criteres.equipements.trim()) params.set('equipements', criteres.equipements.trim())
    try {
      const page = await appelApi<PagePaginee<Annonce>>(`/api/annonces?${params.toString()}`)
      setAnnonces(page.contenu)
      setRechercheFaite(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'La recherche a échoué. Réessayez.')
    } finally {
      setChargement(false)
    }
  }

  function reinitialiser() {
    setCriteres(initial)
    setAnnonces([])
    setRechercheFaite(false)
    setErreur('')
  }

  const champ = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-encre shadow-sm outline-none transition focus:border-[#d99a00] focus:ring-2 focus:ring-[#f2b800]/25'
  const label = 'block text-sm font-semibold text-[#173b63]'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#102b49] via-[#173b63] to-[#245783] p-6 text-white shadow-xl sm:p-10">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#f2b800] p-3 text-[#102b49]"><Bot aria-hidden className="h-7 w-7" /></span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ffdc72]">ImmoSénégal</p>
            <h1 className="font-titre text-3xl font-semibold sm:text-4xl">Assistant immobilier</h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
          Décrivez le logement que vous recherchez. Je vous aide à préciser vos critères et à retrouver les annonces publiées qui correspondent à votre projet.
        </p>
        <div className="mt-5 flex items-center gap-2 text-sm text-[#ffdc72]">
          <Sparkles aria-hidden className="h-4 w-4" />
          Recherche basée sur les annonces réelles du catalogue
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/70 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="mb-6">
          <h2 className="font-titre text-2xl font-semibold text-[#102b49]">Commençons par votre recherche</h2>
          <p className="mt-1 text-sm text-slate-600">Renseignez les informations que vous connaissez. Les champs facultatifs peuvent rester vides.</p>
        </div>
        <form onSubmit={rechercher}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={label} htmlFor="assistant-transaction">Votre projet</label>
              <select id="assistant-transaction" className={champ} value={criteres.transaction} onChange={(e) => modifier('transaction', e.target.value as TypeTransaction)}>
                <option value="LOCATION">Louer un logement</option>
                <option value="VENTE">Acheter un bien</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="assistant-type">Type de bien</label>
              <select id="assistant-type" className={champ} value={criteres.type} onChange={(e) => modifier('type', e.target.value as TypeBien | '')}>
                <option value="">Tous les types</option>
                <option value="MAISON">Maison</option>
                <option value="APPARTEMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="VILLA">Villa</option>
                <option value="TERRAIN">Terrain</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="assistant-ville">Ville</label>
              <input id="assistant-ville" className={champ} value={criteres.ville} onChange={(e) => modifier('ville', e.target.value)} placeholder="Ex. Dakar, Ziguinchor…" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-quartier">Quartier</label>
              <input id="assistant-quartier" className={champ} value={criteres.quartier} onChange={(e) => modifier('quartier', e.target.value)} placeholder="Ex. Almadies, Kandé…" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-budget">Budget maximum (FCFA)</label>
              <input id="assistant-budget" type="number" min="1" inputMode="numeric" className={champ} value={criteres.prixMax} onChange={(e) => modifier('prixMax', e.target.value)} placeholder="Ex. 150000" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-pieces">Nombre minimum de pièces</label>
              <input id="assistant-pieces" type="number" min="1" className={champ} value={criteres.piecesMin} onChange={(e) => modifier('piecesMin', e.target.value)} placeholder="Ex. 3" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={label} htmlFor="assistant-equipements">Équipements souhaités</label>
              <input id="assistant-equipements" className={champ} value={criteres.equipements} onChange={(e) => modifier('equipements', e.target.value)} placeholder="Ex. climatisation, wifi, parking (séparés par des virgules)" />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="submit" disabled={chargement} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2b800] px-6 py-3 font-bold text-[#102b49] shadow-sm transition hover:bg-[#ffcf35] disabled:cursor-wait disabled:opacity-60">
              <Search aria-hidden className="h-5 w-5" />
              {chargement ? 'Recherche en cours…' : 'Trouver mes logements'}
            </button>
            <button type="button" onClick={reinitialiser} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Réinitialiser</button>
          </div>
        </form>
        {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      </section>

      {rechercheFaite && (
        <section className="mt-10" aria-live="polite">
          <div className="mb-5">
            <h2 className="font-titre text-2xl font-semibold text-[#102b49]">Les annonces qui correspondent</h2>
            <p className="mt-1 text-slate-600">{annonces.length ? `${annonces.length} résultat(s) affiché(s) parmi les annonces publiées.` : 'Aucune annonce ne correspond exactement à ces critères.'}</p>
          </div>
          {annonces.length ? (
            <>
              {annonces.some((annonce) => annonce.exemple) && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Certains résultats sont des annonces de démonstration.</p>}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{annonces.map((annonce) => <AnnonceCard key={annonce.id} annonce={annonce} />)}</div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-7 text-center shadow-sm">
              <p className="font-semibold text-[#173b63]">Essayons avec des critères plus larges.</p>
              <p className="mt-2 text-sm text-slate-600">Vous pouvez retirer le quartier, augmenter le budget ou choisir « Tous les types ».</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
