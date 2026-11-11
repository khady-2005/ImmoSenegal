import { Link, useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { parametresApi } from '../annonces'
import ListeAnnonces from '../components/ListeAnnonces'
import { useAnnonces } from '../components/useAnnonces'
import { useAuth } from '../auth'

const champ =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[0.95rem] text-encre placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-emeraude-600'
const etiquette = 'mb-1.5 block text-sm font-medium text-slate-700'

/** Les critères de la zone « Plus de filtres » : elle s'ouvre d'elle-même quand l'un d'eux est déjà appliqué. */
const AVANCES = ['quartier', 'superficieMin', 'piecesMin', 'equipements']

export default function Catalogue() {
  const [params, setParams] = useSearchParams()
  const { utilisateur } = useAuth()
  const requeteParams = parametresApi(params)
  // Un visiteur peut découvrir six annonces ; la connexion débloque toutes les pages du catalogue.
  if (!utilisateur) {
    requeteParams.set('page', '0')
    requeteParams.set('taille', '6')
  }
  const requete = requeteParams.toString()
  const { etat, reessayer } = useAnnonces(requete)
  const page = utilisateur ? (Number(params.get('page') ?? 0) || 0) : 0
  const avancesActifs = AVANCES.some((nom) => (params.get(nom) ?? '') !== '')
  const filtresActifs = [...params.keys()].some((nom) => nom !== 'page' && nom !== 'tri')

  function appliquer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const donnees = new FormData(e.currentTarget)
    const suivants = new URLSearchParams()
    for (const nom of ['transaction', 'type', 'quartier', 'ville', 'prixMin', 'prixMax', 'superficieMin', 'piecesMin', 'equipements']) {
      const valeur = String(donnees.get(nom) ?? '').trim()
      if (valeur) suivants.set(nom, valeur)
    }
    const tri = params.get('tri')
    if (tri) suivants.set('tri', tri) // le tri se règle à part et survit à un changement de filtres
    setParams(suivants) // une nouvelle recherche repart de la page 0
  }

  function changerTri(valeur: string) {
    const suivants = new URLSearchParams(params)
    if (valeur) suivants.set('tri', valeur)
    else suivants.delete('tri')
    suivants.delete('page')
    setParams(suivants)
  }

  function allerPage(numero: number) {
    const suivants = new URLSearchParams(params)
    suivants.set('page', String(numero))
    setParams(suivants)
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="bg-nuit-900 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-12 sm:pt-16">
          <h1 className="font-titre text-4xl font-medium sm:text-5xl">Catalogue des annonces</h1>
          <p className="mt-3 max-w-xl text-lg text-nuit-100">
            Affinez par type de bien, ville, budget ou équipements pour trouver ce qui vous correspond.
          </p>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-dore-500 to-transparent" aria-hidden />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20">
        {/* key : le formulaire se réinitialise quand l'URL change (ex. arrivée depuis la recherche de l'accueil). */}
        <form
          key={params.toString()}
          onSubmit={appliquer}
          aria-label="Filtres du catalogue"
          className="relative z-10 -mt-20 rounded-3xl bg-white p-5 shadow-carte-haut ring-1 ring-black/5 sm:p-7"
        >
          <div className="mb-4 flex items-center gap-2 font-semibold text-nuit-900">
            <SlidersHorizontal aria-hidden className="h-5 w-5 text-emeraude-700" />
            Filtres
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <label htmlFor="f-ville" className={etiquette}>Ville</label>
              <input id="f-ville" name="ville" defaultValue={params.get('ville') ?? ''} placeholder="Ex. Dakar" className={champ} />
            </div>
            <div>
              <label htmlFor="f-prixMin" className={etiquette}>Prix minimum (FCFA)</label>
              <input id="f-prixMin" name="prixMin" type="number" min={0} inputMode="numeric" defaultValue={params.get('prixMin') ?? ''} className={champ} />
            </div>
            <div>
              <label htmlFor="f-prixMax" className={etiquette}>Prix maximum (FCFA)</label>
              <input id="f-prixMax" name="prixMax" type="number" min={0} inputMode="numeric" defaultValue={params.get('prixMax') ?? ''} className={champ} />
            </div>
          </div>

          <details open={avancesActifs} className="group mt-5">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-emeraude-700 hover:underline [&::-webkit-details-marker]:hidden">
              <ChevronRight aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90" />
              Plus de filtres
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="f-quartier" className={etiquette}>Quartier</label>
                <input id="f-quartier" name="quartier" defaultValue={params.get('quartier') ?? ''} className={champ} />
              </div>
              <div>
                <label htmlFor="f-superficieMin" className={etiquette}>Superficie minimum (m²)</label>
                <input id="f-superficieMin" name="superficieMin" type="number" min={0} inputMode="numeric" defaultValue={params.get('superficieMin') ?? ''} className={champ} />
              </div>
              <div>
                <label htmlFor="f-piecesMin" className={etiquette}>Pièces (minimum)</label>
                <input id="f-piecesMin" name="piecesMin" type="number" min={0} inputMode="numeric" defaultValue={params.get('piecesMin') ?? ''} className={champ} />
              </div>
              <div>
                <label htmlFor="f-equipements" className={etiquette}>Équipements (séparés par des virgules)</label>
                <input id="f-equipements" name="equipements" placeholder="wifi, climatisation" defaultValue={params.get('equipements') ?? ''} className={champ} />
              </div>
            </div>
          </details>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emeraude-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emeraude-800 hover:shadow-md active:scale-[0.98]"
            >
              <Search aria-hidden className="h-5 w-5" />
              Appliquer
            </button>
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams())}
              className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition-colors hover:bg-brume"
            >
              Réinitialiser
            </button>
          </div>
        </form>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <p className="font-medium text-slate-700">
            {etat.statut === 'ok'
              ? etat.page.totalElements === 0
                ? 'Aucune annonce'
                : `${etat.page.totalElements} annonce${etat.page.totalElements > 1 ? 's' : ''}`
              : ' '}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="f-tri" className="text-sm font-medium text-slate-700">Trier par</label>
            <select
              id="f-tri"
              value={params.get('tri') ?? ''}
              onChange={(e) => changerTri(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[0.95rem] text-encre transition-colors hover:border-slate-400 focus:border-emeraude-600"
            >
              <option value="">Plus récentes</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix décroissant</option>
              <option value="superficie_desc">Plus grande surface</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <ListeAnnonces
            etat={etat}
            reessayer={reessayer}
            vide="Aucune annonce ne correspond à ces critères. Essayez d'élargir votre recherche."
            actionVide={
              filtresActifs ? (
                <button
                  type="button"
                  onClick={() => setParams(new URLSearchParams())}
                  className="rounded-full bg-nuit-900 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-nuit-800"
                >
                  Effacer tous les filtres
                </button>
              ) : undefined
            }
          />
        </div>

        {utilisateur && etat.statut === 'ok' && etat.page.totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => allerPage(page - 1)}
              disabled={page <= 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-medium text-nuit-900 transition-colors hover:bg-brume disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Précédent
            </button>
            <span className="text-sm text-slate-600">
              Page {etat.page.page + 1} sur {etat.page.totalPages}
            </span>
            <button
              type="button"
              onClick={() => allerPage(page + 1)}
              disabled={page + 1 >= etat.page.totalPages}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-medium text-nuit-900 transition-colors hover:bg-brume disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </nav>
        )}

        {!utilisateur && etat.statut === 'ok' && etat.page.totalElements > 6 && (
          <section className="mt-10 rounded-3xl border border-emeraude-100 bg-[#eaf3eb] px-6 py-8 text-center sm:px-10" aria-labelledby="titre-catalogue-complet">
            <h2 id="titre-catalogue-complet" className="font-titre text-2xl font-semibold text-[#063b2b]">Découvrez tout le catalogue</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-600">Connectez-vous ou créez un compte pour parcourir toutes les annonces et accéder aux fiches détaillées.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/connexion" className="rounded-full bg-[#08734f] px-6 py-3 font-semibold text-white transition hover:bg-[#07513a]">Se connecter</Link>
              <Link to="/inscription" className="rounded-full border border-[#08734f] px-6 py-3 font-semibold text-[#07513a] transition hover:bg-white">Créer un compte</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}