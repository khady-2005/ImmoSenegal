import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, LocateFixed, MapPin, MapPinned, RefreshCw, Search } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleTypeBien, type Annonce, type PagePaginee } from '../types'

type LatLng = [number, number]
interface LeafletLayer { addTo(map: LeafletMap): LeafletLayer; bindPopup(content: HTMLElement): LeafletLayer; openPopup(): LeafletLayer }
interface LeafletMap {
  setView(center: LatLng, zoom: number): LeafletMap
  flyTo(center: LatLng, zoom: number, options?: { duration?: number }): LeafletMap
  remove(): void
  invalidateSize(): void
  eachLayer(callback: (layer: unknown) => void): void
  removeLayer(layer: unknown): void
}
interface LeafletApi {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer
  marker(position: LatLng): LeafletLayer
  circleMarker(position: LatLng, options: Record<string, unknown>): LeafletLayer
}
declare global { interface Window { L?: LeafletApi } }

let leafletPromise: Promise<LeafletApi> | null = null
function chargerLeaflet(): Promise<LeafletApi> {
  if (window.L) return Promise.resolve(window.L)
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-immosenegal-leaflet]')) {
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        css.dataset.immosenegalLeaflet = 'true'
        document.head.appendChild(css)
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-immosenegal-leaflet]')
      if (existing) {
        existing.addEventListener('load', () => window.L && resolve(window.L), { once: true })
        existing.addEventListener('error', () => reject(new Error('La bibliothèque cartographique ne peut pas être chargée.')), { once: true })
        if (window.L) resolve(window.L)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.async = true
      script.dataset.immosenegalLeaflet = 'true'
      script.onload = () => window.L ? resolve(window.L) : reject(new Error('La carte est indisponible.'))
      script.onerror = () => reject(new Error('La bibliothèque cartographique ne peut pas être chargée.'))
      document.head.appendChild(script)
    })
  }
  return leafletPromise
}

const DAKAR: LatLng = [14.7167, -17.4677]
const zoomInitial = 12

export default function CarteBiens() {
  const { jeton } = useAuth()
  const conteneurCarte = useRef<HTMLDivElement>(null)
  const carte = useRef<LeafletMap | null>(null)
  const couches = useRef<unknown[]>([])
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [selection, setSelection] = useState('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [etatCarte, setEtatCarte] = useState('Préparation de la carte…')
  const [localisation, setLocalisation] = useState<'repos' | 'chargement' | 'ok' | 'erreur'>('repos')
  const [messageLocalisation, setMessageLocalisation] = useState('')
  const [recherche, setRecherche] = useState('')
  const [rechercheEnCours, setRechercheEnCours] = useState(false)
  const [erreurRecherche, setErreurRecherche] = useState('')
  const [positionActuelle, setPositionActuelle] = useState<LatLng | null>(null)

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

  useEffect(() => {
    if (chargement || !conteneurCarte.current) return
    let annule = false
    void chargerLeaflet().then(L => {
      if (annule || !conteneurCarte.current) return
      if (!carte.current) {
        carte.current = L.map(conteneurCarte.current, { scrollWheelZoom: true }).setView(DAKAR, zoomInitial)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        }).addTo(carte.current)
      }
      for (const couche of couches.current) carte.current?.removeLayer(couche)
      couches.current = []
      for (const annonce of annonces) {
        const point: LatLng = [annonce.latitude!, annonce.longitude!]
        const contenu = document.createElement('div')
        const titre = document.createElement('strong')
        titre.textContent = annonce.titre
        const adresse = document.createElement('p')
        adresse.textContent = [annonce.quartier, annonce.ville].filter(Boolean).join(', ')
        const prix = document.createElement('p')
        prix.textContent = formatFcfa(annonce.prix)
        const lien = document.createElement('a')
        lien.href = `/annonces/${encodeURIComponent(annonce.id)}`
        lien.textContent = 'Voir la fiche'
        contenu.append(titre, adresse, prix, lien)
        const marqueur = L.marker(point).addTo(carte.current!)
        marqueur.bindPopup(contenu)
        couches.current.push(marqueur)
      }
      if (positionActuelle) {
        const point = L.circleMarker(positionActuelle, {
          radius: 9, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1,
        }).addTo(carte.current)
        couches.current.push(point)
      }
      const selectionnee = annonces.find(a => a.id === selection)
      if (selectionnee) carte.current.setView([selectionnee.latitude!, selectionnee.longitude!], 14)
      carte.current.invalidateSize()
      setEtatCarte('Carte interactive prête')
    }).catch(() => setEtatCarte('La carte n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.'))
    return () => { annule = true }
  }, [chargement, annonces, selection, positionActuelle])

  useEffect(() => () => {
    carte.current?.remove()
    carte.current = null
    couches.current = []
  }, [])

  const bien = useMemo(() => annonces.find(a => a.id === selection) ?? annonces[0], [annonces, selection])
  const lienExterne = bien ? `https://www.openstreetmap.org/?mlat=${bien.latitude}&mlon=${bien.longitude}#map=16/${bien.latitude}/${bien.longitude}` : ''

  function localiser() {
    if (!navigator.geolocation) {
      setLocalisation('erreur')
      setMessageLocalisation('La localisation GPS n’est pas disponible sur cet appareil ou navigateur.')
      return
    }
    setLocalisation('chargement')
    setMessageLocalisation('Autorisez l’accès à votre position dans votre navigateur.')
    navigator.geolocation.getCurrentPosition(
      position => {
        const point: LatLng = [position.coords.latitude, position.coords.longitude]
        setPositionActuelle(point)
        setLocalisation('ok')
        setMessageLocalisation('Votre position a été affichée sur la carte. Elle n’est pas enregistrée.')
        carte.current?.flyTo(point, 16, { duration: 0.8 })
      },
      error => {
        setLocalisation('erreur')
        setMessageLocalisation(error.code === error.PERMISSION_DENIED
          ? 'Accès refusé. Vous pouvez autoriser la localisation dans les réglages du navigateur.'
          : 'Position introuvable. Vérifiez que le GPS ou la localisation de votre appareil est activé.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  async function rechercherLieu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const terme = recherche.trim()
    if (!terme) return
    setRechercheEnCours(true)
    setErreurRecherche('')
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.search = new URLSearchParams({ q: terme, format: 'jsonv2', limit: '1', countrycodes: 'sn' }).toString()
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Recherche indisponible.')
      const resultats = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!resultats.length) throw new Error('Aucun lieu trouvé au Sénégal. Essayez un autre nom de quartier ou de ville.')
      const point: LatLng = [Number(resultats[0].lat), Number(resultats[0].lon)]
      carte.current?.flyTo(point, 15, { duration: 0.8 })
      setMessageLocalisation(resultats[0].display_name)
    } catch (e) {
      setErreurRecherche(e instanceof Error ? e.message : 'La recherche du lieu a échoué.')
    } finally {
      setRechercheEnCours(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <Link to="/catalogue" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-900 hover:text-dore-600">
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>
      <header className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 px-6 py-8 text-white sm:px-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-dore-300">Explorer le Sénégal</p>
        <h1 className="mt-2 font-titre text-3xl font-semibold sm:text-4xl">La carte interactive ImmoSénégal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Explorez les rues et quartiers, repérez plusieurs annonces et affichez votre position actuelle si vous l’autorisez.</p>
      </header>

      {erreur && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}<button type="button" onClick={() => void charger()} className="ml-3 font-semibold underline">Réessayer</button></div>}
      {chargement && <p role="status" className="py-12 text-center text-slate-500">Chargement des annonces géolocalisées…</p>}

      {!chargement && (
        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-carte">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div>
              <h2 className="font-semibold text-nuit-900">Carte du Sénégal</h2>
              <p className="text-xs text-slate-500">{annonces.length} bien(s) avec coordonnées GPS · {etatCarte}</p>
            </div>
            <button type="button" onClick={localiser} disabled={localisation === 'chargement'} className="inline-flex items-center gap-2 rounded-xl bg-nuit-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nuit-800 disabled:opacity-60">
              <LocateFixed className="h-4 w-4" /> {localisation === 'chargement' ? 'Localisation…' : 'Me localiser'}
            </button>
          </div>
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <form onSubmit={rechercherLieu} className="flex gap-2">
              <label htmlFor="recherche-carte" className="sr-only">Rechercher une ville ou un quartier au Sénégal</label>
              <input id="recherche-carte" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une ville ou un quartier…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-encre focus:border-dore-500 focus:outline-none" />
              <button type="submit" disabled={rechercheEnCours || !recherche.trim()} className="inline-flex items-center gap-2 rounded-xl bg-dore-500 px-4 py-2.5 text-sm font-bold text-nuit-950 hover:bg-dore-400 disabled:opacity-50"><Search className="h-4 w-4" /> Rechercher</button>
            </form>
            <button type="button" onClick={() => void charger()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-nuit-900 hover:border-dore-500"><RefreshCw className="h-4 w-4" /> Actualiser</button>
          </div>
          {messageLocalisation && <p role="status" className="px-4 pt-3 text-sm text-slate-600">{messageLocalisation}</p>}
          {erreurRecherche && <p role="alert" className="px-4 pt-3 text-sm text-red-700">{erreurRecherche}</p>}
          <div ref={conteneurCarte} aria-label="Carte interactive OpenStreetMap avec les annonces immobilières" role="region" className="h-[520px] w-full bg-slate-100 sm:h-[640px]" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Bleu : votre position · Repères : biens immobiliers</span>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">Données © OpenStreetMap</a>
          </div>
        </section>
      )}

      {!chargement && annonces.length > 0 && bien && (
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-carte">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-nuit-900">Annonces localisées</h2>
              <span className="rounded-full bg-dore-100 px-3 py-1 text-xs font-bold text-nuit-900">{annonces.length}</span>
            </div>
            <label htmlFor="bien-carte" className="mt-4 block text-sm font-medium text-slate-700">Choisir un bien à afficher</label>
            <select id="bien-carte" value={bien.id} onChange={e => setSelection(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-nuit-900 focus:border-dore-500 focus:outline-none">
              {annonces.map(a => <option key={a.id} value={a.id}>{a.titre} — {a.ville}</option>)}
            </select>
            <article className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-dore-600">{libelleTypeBien[bien.typeBien]} · {bien.transaction === 'LOCATION' ? 'Location' : 'Vente'}</p>
              <h3 className="mt-2 font-semibold text-nuit-900">{bien.titre}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0 text-dore-600" />{bien.quartier}, {bien.ville}</p>
              <p className="mt-3 font-titre text-xl font-semibold text-nuit-900">{formatFcfa(bien.prix)}{bien.transaction === 'LOCATION' && <span className="font-sans text-xs font-normal text-slate-500"> / mois</span>}</p>
              <Link to={`/annonces/${bien.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-nuit-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nuit-800">Voir la fiche du bien</Link>
              <a href={lienExterne} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-nuit-900 hover:text-dore-600">Ouvrir dans OpenStreetMap <ExternalLink className="h-4 w-4" /></a>
            </article>
          </div>
          <aside className="rounded-3xl border border-dore-100 bg-dore-50 p-5">
            <MapPinned className="h-7 w-7 text-dore-600" />
            <h2 className="mt-3 font-semibold text-nuit-900">À propos de la localisation</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">Votre position n’est demandée que lorsque vous appuyez sur « Me localiser ». Elle est affichée sur cette carte et n’est pas envoyée ni enregistrée par ImmoSénégal.</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">La localisation dépend de l’autorisation du navigateur et fonctionne sur une connexion sécurisée HTTPS. Les biens sans coordonnées GPS ne peuvent pas encore apparaître sur la carte.</p>
          </aside>
        </section>
      )}
    </main>
  )
}
