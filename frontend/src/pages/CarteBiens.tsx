import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MapPin, MapPinned, RefreshCw } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleTypeBien, type Annonce, type PagePaginee } from '../types'

function urlCarte(lat: number, lon: number) {
  const delta = 0.012
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
}

export default function CarteBiens() {
  const { jeton } = useAuth()
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [selection, setSelection] = useState('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  async function charger() {
    setChargement(true)
    setErreur('')
    try {
      const page = await appelApi<PagePaginee<Annonce>>('/api/annonces?taille=100&tri=recent', { token: jeton })
      const geolocalisees = page.contenu.filter(a =>
        a.statut === 'PUBLIEE' &&
        typeof a.latitude === 'number' && Number.isFinite(a.latitude) &&
        typeof a.longitude === 'number' && Number.isFinite(a.longitude) &&
        a.latitude >= -90 && a.latitude <= 90 &&
        a.longitude >= -180 && a.longitude <= 180
      )
      setAnnonces(geolocalisees)
      setSelection(current => geolocalisees.some(a => a.id === current) ? current : geolocalisees[0]?.id ?? '')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les biens géolocalisés.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { void charger() }, [jeton])

  const bien = useMemo(() => annonces.find(a => a.id === selection) ?? annonces[0], [annonces, selection])
  const lienExterne = bien ? `https://www.openstreetmap.org/?mlat=${bien.latitude}&mlon=${bien.longitude}#map=16/${bien.latitude}/${bien.longitude}` : ''

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <Link to="/catalogue" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-900 hover:text-dore-600">
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>
      <header className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 px-6 py-8 text-white sm:px-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-dore-300">Explorer le Sénégal</p>
        <h1 className="mt-2 font-titre text-3xl font-semibold sm:text-4xl">Les biens sur la carte</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Repérez les annonces publiées disposant de coordonnées GPS. Sélectionnez un bien pour voir son emplacement sur la carte.</p>
      </header>

      {erreur && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}<button type="button" onClick={() => void charger()} className="ml-3 font-semibold underline">Réessayer</button></div>}
      {chargement && <p role="status" className="py-12 text-center text-slate-500">Chargement des emplacements…</p>}

      {!chargement && !erreur && annonces.length === 0 && (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <MapPinned className="mx-auto h-10 w-10 text-dore-600" />
          <h2 className="mt-4 text-xl font-semibold text-nuit-900">Aucun bien géolocalisé pour le moment</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Les annonces publiées apparaîtront ici dès que leurs coordonnées GPS auront été renseignées. Les annonces sans coordonnées restent visibles dans le catalogue.</p>
          <Link to="/catalogue" className="mt-5 inline-flex rounded-full bg-nuit-900 px-5 py-2.5 font-semibold text-white hover:bg-nuit-800">Parcourir le catalogue</Link>
        </section>
      )}

      {!chargement && annonces.length > 0 && bien && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-carte">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div><h2 className="font-semibold text-nuit-900">Emplacement sélectionné</h2><p className="text-xs text-slate-500">Carte OpenStreetMap</p></div>
              <a href={lienExterne} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-nuit-900 hover:text-dore-600">Ouvrir la carte <ExternalLink className="h-4 w-4" /></a>
            </div>
            <iframe title={`Carte de localisation : ${bien.titre}`} src={urlCarte(bien.latitude!, bien.longitude!)} className="h-[420px] w-full border-0 sm:h-[520px]" loading="lazy" referrerPolicy="no-referrer" />
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">La position affichée correspond aux coordonnées fournies dans l’annonce. Vérifiez l’adresse avec le propriétaire avant tout déplacement.</p>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-carte">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-nuit-900">Annonces localisées</h2>
                <span className="rounded-full bg-dore-100 px-3 py-1 text-xs font-bold text-nuit-900">{annonces.length}</span>
              </div>
              <label htmlFor="bien-carte" className="mt-4 block text-sm font-medium text-slate-700">Choisir un bien</label>
              <select id="bien-carte" value={bien.id} onChange={e => setSelection(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-nuit-900 focus:border-dore-500 focus:outline-none">
                {annonces.map(a => <option key={a.id} value={a.id}>{a.titre} — {a.ville}</option>)}
              </select>
              <article className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-dore-600">{libelleTypeBien[bien.typeBien]} · {bien.transaction === 'LOCATION' ? 'Location' : 'Vente'}</p>
                <h3 className="mt-2 font-semibold text-nuit-900">{bien.titre}</h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0 text-dore-600" />{bien.quartier}, {bien.ville}</p>
                <p className="mt-3 font-titre text-xl font-semibold text-nuit-900">{formatFcfa(bien.prix)}{bien.transaction === 'LOCATION' && <span className="font-sans text-xs font-normal text-slate-500"> / mois</span>}</p>
                <Link to={`/annonces/${bien.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-nuit-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nuit-800">Voir la fiche du bien</Link>
              </article>
            </div>
            <button type="button" onClick={() => void charger()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-dore-500"><RefreshCw className="h-4 w-4" /> Actualiser les emplacements</button>
          </aside>
        </div>
      )}
    </main>
  )
}
