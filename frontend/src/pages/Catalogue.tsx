import { useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { ArrowDownUp, MapPin, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { parametresApi } from '../annonces'
import ListeAnnonces from '../components/ListeAnnonces'
import { useAnnonces } from '../components/useAnnonces'

const champ = 'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-nuit-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emeraude-600 focus:bg-white focus:ring-4 focus:ring-emeraude-600/10'
const etiquette = 'mb-1.5 block text-xs font-bold tracking-wide text-slate-600'

export default function Catalogue() {
  const [params, setParams] = useSearchParams()
  const requete = parametresApi(params).toString()
  const { etat, reessayer } = useAnnonces(requete)
  const page = Number(params.get('page') ?? 0) || 0

  function appliquer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const donnees = new FormData(e.currentTarget)
    const suivants = new URLSearchParams()
    for (const nom of ['transaction', 'type', 'quartier', 'ville', 'prixMin', 'prixMax', 'superficieMin', 'piecesMin', 'equipements', 'tri']) {
      const valeur = String(donnees.get(nom) ?? '').trim()
      if (valeur) suivants.set(nom, valeur)
    }
    setParams(suivants)
  }

  function allerPage(numero: number) {
    const suivants = new URLSearchParams(params)
    suivants.set('page', String(numero))
    setParams(suivants)
  }

  const nombreAnnonces = etat.statut === 'ok' ? etat.page.totalElements : null

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:pt-10">
      <section className="relative mb-7 overflow-hidden rounded-[2rem] bg-nuit-950 px-6 py-8 text-white shadow-[0_18px_50px_rgba(7,20,42,0.16)] sm:px-9 sm:py-10">
        <div aria-hidden className="absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/10" />
        <div aria-hidden className="absolute -right-2 -top-16 h-52 w-52 rounded-full border border-dore-500/20" />
        <div aria-hidden className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-emeraude-500/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-dore-500">
            <Sparkles aria-hidden className="h-4 w-4" />
            ImmoSénégal · Trouvez votre prochain chez-vous
          </p>
          <h1 className="font-titre text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Le bien qu’il vous faut,<br className="hidden sm:block" /> au bon endroit.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Explorez les annonces immobilières partout au Sénégal et trouvez un logement qui correspond à vos envies.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <MapPin aria-hidden className="h-3.5 w-3.5 text-dore-500" /> Partout au Sénégal
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Location & vente</span>
            {nombreAnnonces !== null && (
              <span className="rounded-full border border-emeraude-400/30 bg-emeraude-500/15 px-3 py-1.5 text-emerald-200">
                {nombreAnnonces} annonce{nombreAnnonces > 1 ? 's' : ''} disponible{nombreAnnonces > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Les filtres restent synchronisés avec l’URL pour conserver les recherches partageables. */}
      <form key={params.toString()} onSubmit={appliquer} aria-label="Filtres du catalogue" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(11,31,58,0.06)] sm:p-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emeraude-50 text-emeraude-700">
                <SlidersHorizontal aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-titre text-lg font-bold text-nuit-950">Affiner votre recherche</span>
                <span className="mt-0.5 block text-xs text-slate-500">Ville, budget, surface et équipements : personnalisez les résultats</span>
              </span>
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Afficher les filtres</span>
          </summary>
          <div className="mt-6 grid gap-x-4 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-transaction" className={etiquette}>Transaction</label>
              <select id="f-transaction" name="transaction" defaultValue={params.get('transaction') ?? ''} className={champ}>
                <option value="">Location et vente</option>
                <option value="LOCATION">Location</option>
                <option value="VENTE">Vente</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-type" className={etiquette}>Type de bien</label>
              <select id="f-type" name="type" defaultValue={params.get('type') ?? ''} className={champ}>
                <option value="">Tous les types</option>
                <option value="MAISON">Maison</option>
                <option value="APPARTEMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="VILLA">Villa</option>
                <option value="TERRAIN">Terrain</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-quartier" className={etiquette}>Quartier</label>
              <input id="f-quartier" name="quartier" placeholder="Ex. : Almadies" defaultValue={params.get('quartier') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-ville" className={etiquette}>Ville</label>
              <input id="f-ville" name="ville" placeholder="Ex. : Dakar" defaultValue={params.get('ville') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-prixMin" className={etiquette}>Budget minimum (FCFA)</label>
              <input id="f-prixMin" name="prixMin" type="number" min={0} inputMode="numeric" placeholder="Sans minimum" defaultValue={params.get('prixMin') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-prixMax" className={etiquette}>Budget maximum (FCFA)</label>
              <input id="f-prixMax" name="prixMax" type="number" min={0} inputMode="numeric" placeholder="Sans maximum" defaultValue={params.get('prixMax') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-superficieMin" className={etiquette}>Surface minimum (m²)</label>
              <input id="f-superficieMin" name="superficieMin" type="number" min={0} inputMode="numeric" placeholder="Toutes surfaces" defaultValue={params.get('superficieMin') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-piecesMin" className={etiquette}>Nombre de pièces minimum</label>
              <input id="f-piecesMin" name="piecesMin" type="number" min={0} inputMode="numeric" placeholder="Toutes configurations" defaultValue={params.get('piecesMin') ?? ''} className={champ} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="f-equipements" className={etiquette}>Équipements souhaités</label>
              <input id="f-equipements" name="equipements" placeholder="Ex. : wifi, climatisation" defaultValue={params.get('equipements') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-tri" className={etiquette}>Trier les résultats</label>
              <select id="f-tri" name="tri" defaultValue={params.get('tri') ?? ''} className={champ}>
                <option value="">Plus récentes</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
                <option value="superficie_desc">Plus grande surface</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emeraude-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emeraude-900/10 transition hover:-translate-y-0.5 hover:bg-emeraude-800 hover:shadow-lg">
              <Search aria-hidden className="h-4 w-4" />
              Rechercher les biens
            </button>
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams())}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-nuit-950"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Effacer les filtres
            </button>
          </div>
        </details>
      </form>

      <section className="mt-9" aria-live="polite">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emeraude-700">Notre sélection</p>
            <h2 className="mt-1 font-titre text-2xl font-bold tracking-tight text-nuit-950">Les annonces immobilières</h2>
          </div>
          {etat.statut === 'ok' && (
            <p className="text-sm font-medium text-slate-500">
              {etat.page.totalElements === 0
                ? 'Aucune annonce trouvée'
                : etat.page.totalElements + ' résultat' + (etat.page.totalElements > 1 ? 's' : '')}
            </p>
          )}
        </div>
        <ListeAnnonces etat={etat} reessayer={reessayer} vide="Aucune annonce ne correspond à ces critères. Essayez d’élargir votre recherche." />
      </section>

      {etat.statut === 'ok' && etat.page.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-9 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => allerPage(page - 1)}
            disabled={page <= 0}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-nuit-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <ArrowDownUp aria-hidden className="h-4 w-4 text-emeraude-700" />
            Page {etat.page.page + 1} sur {etat.page.totalPages}
          </span>
          <button
            type="button"
            onClick={() => allerPage(page + 1)}
            disabled={page + 1 >= etat.page.totalPages}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-nuit-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
          </button>
        </nav>
      )}
    </div>
  )
}
