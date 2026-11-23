import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatFcfa } from '../format'
import { Building2, MapPin, Ruler, BedDouble, Search, Plus, Image as ImageIcon, Pencil, Trash2, Eye, RefreshCw, Home as HomeIcon, LayoutGrid, ClipboardList, CalendarDays, Mail, Users, Settings, LogOut, Menu, Filter, ChevronDown, UserCircle } from 'lucide-react'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'
import { Marque } from '../components/Logo'

type AnnoncePhoto = {
  id: string
  titre: string
  description: string | null
  transaction: 'LOCATION' | 'VENTE'
  prix: number
  superficie: number
  pieces: number | null
  adresse: string | null
  latitude: number | null
  longitude: number | null
  equipements: string[]
  ville: string
  quartier: string
  statut: string
  typeBien: 'MAISON' | 'APPARTEMENT' | 'STUDIO' | 'VILLA' | 'TERRAIN'
  publieeParAgence: boolean
  proprietaire: { id: string; nomComplet: string }
  photos: string[]
}
type Page<T> = { contenu: T[] }

// Réduit les photos volumineuses dans le navigateur avant l'envoi (limite serveur : 5 Mo).
async function preparerPhoto(fichier: File): Promise<File> {
  if (!fichier.type.startsWith('image/')) throw new Error('Sélectionne un fichier image.')
  const image = await createImageBitmap(fichier)
  try {
    const coteMax = 1600
    const echelle = Math.min(1, coteMax / Math.max(image.width, image.height))
    const largeur = Math.max(1, Math.round(image.width * echelle))
    const hauteur = Math.max(1, Math.round(image.height * echelle))
    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const contexte = canvas.getContext('2d')
    if (!contexte) throw new Error('Impossible de préparer cette image.')
    contexte.fillStyle = '#ffffff'
    contexte.fillRect(0, 0, largeur, hauteur)
    contexte.drawImage(image, 0, 0, largeur, hauteur)
    let qualite = 0.86
    let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite))
    while (blob && blob.size > 4.5 * 1024 * 1024 && qualite > 0.45) {
      qualite -= 0.1
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite))
    }
    if (!blob || blob.size > 4.5 * 1024 * 1024) {
      throw new Error('Cette image reste trop volumineuse après compression. Choisis une image plus petite.')
    }
    const nom = fichier.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], nom, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    image.close()
  }
}
export default function AdminPhotos() {
  const { utilisateur, jeton } = useAuth()
  const [annonces, setAnnonces] = useState<AnnoncePhoto[]>([])
  const [fichiers, setFichiers] = useState<Record<string, File | undefined>>({})
  const [fichiersRemplacement, setFichiersRemplacement] = useState<Record<string, File | undefined>>({})
  const [versionImages, setVersionImages] = useState<Record<string, number>>({})
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [categorie, setCategorie] = useState('TOUTES')
  const [recherche, setRecherche] = useState('')
  const [villeFiltre, setVilleFiltre] = useState('TOUTES')
  const [menuMobile, setMenuMobile] = useState(false)
  const [photosOuvertes, setPhotosOuvertes] = useState<Record<string, boolean>>({})
  const [annonceEnEdition, setAnnonceEnEdition] = useState<AnnoncePhoto | null>(null)
  const [motifEdition, setMotifEdition] = useState('')
  const [edition, setEdition] = useState({ titre: '', description: '', typeBien: 'MAISON' as AnnoncePhoto['typeBien'], transaction: 'LOCATION' as 'LOCATION' | 'VENTE', prix: '', superficie: '', pieces: '', quartier: '', ville: '', adresse: '' })

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const page = await appelApi<Page<AnnoncePhoto>>('/api/admin/annonces?statut=PUBLIEE&taille=50', { token: jeton })
      setAnnonces(page.contenu)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les photos.')
    } finally { setChargement(false) }
  }, [jeton])

  useEffect(() => { if (utilisateur?.role === 'ADMIN') void charger() }, [charger, utilisateur?.role])

  function ouvrirEdition(a: AnnoncePhoto) {
    setAnnonceEnEdition(a)
    setMotifEdition('')
    setEdition({ titre: a.titre, description: a.description ?? '', typeBien: a.typeBien, transaction: a.transaction, prix: String(a.prix), superficie: String(a.superficie), pieces: a.pieces == null ? '' : String(a.pieces), quartier: a.quartier, ville: a.ville, adresse: a.adresse ?? '' })
  }

  async function enregistrerEdition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!annonceEnEdition) return
    if (!motifEdition.trim()) { setErreur('Le motif de la modification est obligatoire.'); return }
    setEnvoi(annonceEnEdition.id); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/admin/annonces/' + annonceEnEdition.id + '/intervention', {
        method: 'PUT', token: jeton,
        body: { motif: motifEdition.trim(), annonce: {
          titre: edition.titre.trim(), description: edition.description.trim(), typeBien: edition.typeBien,
          transaction: edition.transaction, prix: Number(edition.prix), superficie: Number(edition.superficie),
          pieces: edition.pieces === '' ? null : Number(edition.pieces), quartier: edition.quartier.trim(),
          ville: edition.ville.trim(), adresse: edition.adresse.trim() || null,
          latitude: annonceEnEdition.latitude, longitude: annonceEnEdition.longitude,
          equipements: annonceEnEdition.equipements ?? [], statut: annonceEnEdition.statut
        } }
      })
      setInfo('Annonce modifiée. Le propriétaire a été informé.')
      setAnnonceEnEdition(null)
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Modification impossible.') }
    finally { setEnvoi(null) }
  }

  async function retirerAnnonce(a: AnnoncePhoto) {
    const motif = window.prompt('Indique le motif du retrait de cette annonce. Le propriétaire recevra ce motif :')
    if (!motif || !motif.trim()) return
    setEnvoi(a.id); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/admin/annonces/' + a.id + '/suspendre', { method: 'POST', token: jeton, body: { motif: motif.trim() } })
      setInfo('Annonce retirée du catalogue. Le propriétaire a été notifié. Le retrait est réversible depuis la modération.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Retrait impossible.') }
    finally { setEnvoi(null) }
  }

  async function supprimerPhoto(a: AnnoncePhoto, photoId: string) {
    if (!window.confirm('Supprimer définitivement cette photo de l’annonce ImmoSénégal ?')) return
    setEnvoi(photoId); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/annonces/' + a.id + '/photos/' + photoId, { method: 'DELETE', token: jeton })
      setInfo('Photo supprimée.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Suppression impossible.') }
    finally { setEnvoi(null) }
  }

  async function remplacerPhoto(a: AnnoncePhoto, photoId: string) {
    const fichier = fichiersRemplacement[photoId]
    if (!fichier) { setErreur('Choisis une nouvelle image.'); return }
    const form = new FormData()
    form.append('fichier', fichier)
    setEnvoi(photoId); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/annonces/' + a.id + '/photos/' + photoId, { method: 'PUT', token: jeton, body: form })
      setInfo('Photo remplacée.')
      setVersionImages((v) => ({ ...v, [photoId]: Date.now() }))
      setFichiersRemplacement((v) => ({ ...v, [photoId]: undefined }))
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Remplacement impossible.') }
    finally { setEnvoi(null) }
  }

  async function ajouterPhoto(a: AnnoncePhoto) {
    const fichier = fichiers[a.id]
    if (!fichier) { setErreur('Choisis une image à ajouter.'); return }
    const form = new FormData()
    form.append('fichier', fichier)
    form.append('piece', 'AUTRE')
    setEnvoi(a.id); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/annonces/' + a.id + '/photos', { method: 'POST', token: jeton, body: form })
      setInfo('Nouvelle photo ajoutée à l’annonce.')
      setFichiers((v) => ({ ...v, [a.id]: undefined }))
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Ajout impossible.') }
    finally { setEnvoi(null) }
  }

  const villes = Array.from(new Set(annonces.map((a) => a.ville).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'))
  const annoncesFiltrees = annonces.filter((a) => {
    const correspondCategorie = categorie === 'TOUTES' || categorie === 'AGENCE' && a.publieeParAgence || categorie === 'PROPRIETAIRE' && !a.publieeParAgence || a.typeBien === categorie
    const terme = recherche.trim().toLocaleLowerCase('fr')
    const correspondRecherche = !terme || [a.titre, a.ville, a.quartier, a.proprietaire.nomComplet].some((v) => v.toLocaleLowerCase('fr').includes(terme))
    const correspondVille = villeFiltre === 'TOUTES' || a.ville === villeFiltre
    return correspondCategorie && correspondRecherche && correspondVille
  })

  if (utilisateur?.role !== 'ADMIN') return <div className="mx-auto max-w-3xl px-4 py-10">Accès réservé aux administrateurs.</div>

  return (
    <main className="admin-photos-page fixed inset-0 z-[80] flex h-screen w-screen min-w-0 overflow-hidden bg-[#f4f6fb] text-[#08284d]">
      <aside className={`absolute inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-[#062b55] text-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${menuMobile ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden border-b border-white/10 px-5 py-6">
          <div className="absolute inset-0 bg-gradient-to-b from-[#062b55] via-[#062b55]/95 to-[#062b55]/65" />
          <div className="relative flex flex-col items-center text-center">
            <Marque taille="md" sombre />
            <p className="mt-2 text-sm font-medium text-white/90">Trouvez votre bien idéal</p>
          </div>
        </div>
        <nav className="relative z-10 flex-1 space-y-2 overflow-y-auto px-3 py-6 text-sm font-semibold">
          <Link to="/tableau-de-bord" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><HomeIcon className="h-5 w-5" />Tableau de bord</Link>
          <Link to="/admin/photos" className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#ffd45c] to-[#f3b92e] px-4 py-3 font-extrabold text-[#08284d] shadow-lg"><LayoutGrid className="h-5 w-5" />Gestion du catalogue</Link>
          <Link to="/admin/demandes" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><ClipboardList className="h-5 w-5" />Demandes</Link>
          <Link to="/mes-reservations" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><CalendarDays className="h-5 w-5" />Réservations</Link>
          <Link to="/messagerie" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><Mail className="h-5 w-5" />Messages</Link>
          <Link to="/admin/utilisateurs" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><Users className="h-5 w-5" />Utilisateurs</Link>
          <Link to="/admin/abonnements" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><Settings className="h-5 w-5" />Paramètres</Link>
        </nav>
        <div className="relative z-10 border-t border-white/10 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-white/90 transition hover:bg-white/10"><LogOut className="h-5 w-5" />Quitter l'administration</Link>
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 z-0 h-40 w-full bg-cover bg-center opacity-60" style={{ backgroundImage: "linear-gradient(to top, rgba(3,29,59,.98), rgba(3,29,59,.08)), url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=85)" }} />
      </aside>
      {menuMobile && <button type="button" aria-label="Fermer le menu" onClick={() => setMenuMobile(false)} className="absolute inset-0 z-30 bg-[#061b35]/50 lg:hidden" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-10 flex min-h-[100px] flex-col justify-center border-b-[3px] border-[#f5c84c] bg-white px-4 py-4 shadow-sm sm:px-7 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button type="button" aria-label="Ouvrir le menu" onClick={() => setMenuMobile((v) => !v)} className="rounded-lg p-2 text-[#08284d] hover:bg-slate-100 lg:hidden"><Menu className="h-7 w-7" /></button>
              <div className="hidden h-10 w-px bg-slate-200 lg:block" />
              <LayoutGrid className="h-10 w-10 shrink-0 text-[#174b91]" />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-tight text-[#08284d] sm:text-3xl">Gestion du catalogue</h1>
                <p className="hidden text-sm text-[#18385e] sm:block">Gérez facilement toutes vos annonces immobilières</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#164fbd] to-[#08284d] text-white"><UserCircle className="h-7 w-7" /></span>
              <span className="hidden text-sm font-semibold text-[#08284d] sm:inline">Administrateur</span>
              <ChevronDown className="h-4 w-4 text-[#08284d]" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Link to="/annonces/nouvelle" className="admin-add-button inline-flex min-h-10 items-center justify-center gap-2 rounded-full border-2 border-[#eeb52b] bg-gradient-to-r from-[#08284d] to-[#174b83] px-5 py-2 text-sm font-extrabold text-white shadow-md transition hover:brightness-110"><Plus className="h-5 w-5" />Ajouter une annonce</Link>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
          <div className="mx-auto max-w-[1600px] space-y-5">
            <section aria-label="Filtres du catalogue" className="grid gap-2 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-md sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-center sm:gap-3 sm:p-3">
              <label className="flex min-h-11 items-center gap-3 rounded-full border border-slate-200 px-4 text-sm text-[#08284d] shadow-inner">
                <Search className="h-5 w-5 shrink-0" />
                <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une annonce..." aria-label="Rechercher dans le catalogue" className="w-full min-w-0 bg-transparent py-2 font-medium text-[#08284d] outline-none placeholder:text-slate-800" />
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#08284d]">
                <HomeIcon className="h-5 w-5 shrink-0" />
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} aria-label="Type de bien" className="w-full min-w-0 bg-transparent py-2 outline-none"><option value="TOUTES">Tous types</option><option value="MAISON">Maison</option><option value="APPARTEMENT">Appartement</option><option value="VILLA">Villa</option><option value="STUDIO">Studio</option><option value="TERRAIN">Terrain</option><option value="AGENCE">ImmoSénégal</option><option value="PROPRIETAIRE">Propriétaires</option></select>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#08284d]">
                <MapPin className="h-5 w-5 shrink-0" />
                <select value={villeFiltre} onChange={(e) => setVilleFiltre(e.target.value)} aria-label="Ville" className="w-full min-w-0 bg-transparent py-2 outline-none"><option value="TOUTES">Toutes les villes</option>{villes.map((ville) => <option key={ville} value={ville}>{ville}</option>)}</select>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </label>
              <button type="button" onClick={() => setInfo('Filtres appliqués au catalogue.')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffdc70] to-[#f4bd36] px-6 py-2.5 text-sm font-extrabold text-[#08284d] shadow-sm transition hover:brightness-105"><Filter className="h-5 w-5" />Filtrer</button>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b07b09]">Espace administrateur</p><h2 className="text-xl font-black text-[#08284d] sm:text-2xl">Annonces immobilières</h2></div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#08284d] shadow-sm">{annoncesFiltrees.length} annonce(s)</span>
                <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-[#08284d] hover:bg-slate-50 disabled:opacity-60"><RefreshCw className="h-4 w-4" />Actualiser</button>
              </div>
            </div>
            {info && <p role="status" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-base font-bold text-amber-950">{info}</p>}
            {erreur && <p role="alert" className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 text-base font-bold text-blue-950">{erreur}</p>}

        {chargement ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-semibold text-slate-800">Chargement des annonces…</div>
        ) : annonces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-extrabold text-slate-950">Aucune annonce publiée</h2>
            <p className="mt-2 text-base text-slate-800">Les annonces publiées apparaîtront ici pour la gestion de leurs photos.</p>
          </div>
        ) : (
          <section className="space-y-6">
            {annoncesFiltrees.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="text-lg font-extrabold text-slate-950">Aucune annonce dans cette catégorie</h3><p className="mt-2 text-sm text-slate-800">Essaie une autre catégorie ou modifie ta recherche.</p><button type="button" onClick={() => { setCategorie('TOUTES'); setRecherche(''); setVilleFiltre('TOUTES') }} className="mt-4 rounded-full border-2 border-amber-600 bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300">Afficher toutes les annonces</button></div> : <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{annoncesFiltrees.map((a) => (
              <article key={a.id} className="group overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white shadow-[0_5px_16px_rgba(8,40,77,0.13)] transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-[#102b49] to-[#24547a] sm:h-[214px]">
                  {a.photos.length > 0 ? <img src={urlApi('/api/annonces/' + a.id + '/photos/' + a.photos[0] + '?v=' + (versionImages[a.photos[0]] ?? a.id))} alt={a.titre} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <Building2 className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/50" />}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#071a31]/90 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/80 bg-amber-300 px-4 py-1.5 text-sm font-extrabold text-[#08284d] shadow-lg">{a.typeBien === 'MAISON' ? 'Maison' : a.typeBien === 'APPARTEMENT' ? 'Appartement' : a.typeBien === 'STUDIO' ? 'Studio' : a.typeBien === 'VILLA' ? 'Villa' : 'Terrain'}</span>
                  <Link to={'/annonces/' + a.id} aria-label={'Voir ' + a.titre} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#102b49] shadow-lg transition hover:bg-amber-100"><Eye className="h-5 w-5" /></Link>
                  <p className="price-badge absolute bottom-3 left-3 rounded-full border-2 border-[#f4c54b] bg-[#08284d] px-4 py-1.5 text-lg font-black text-white shadow-xl">{formatFcfa(a.prix)}{a.transaction === 'LOCATION' ? <span className="ml-1 text-xs font-semibold text-amber-200">/ mois</span> : null}</p>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={a.publieeParAgence ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#08284d]" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-[#603d00]"}>{a.publieeParAgence ? 'ImmoSénégal' : 'Propriétaire'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">{a.photos.length} photo(s)</span>
                    </div>
                    <h3 className="mt-1 break-words text-xl font-black leading-tight text-[#08284d]">{a.titre}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-slate-800"><MapPin className="h-4 w-4 shrink-0 text-amber-500" />{a.quartier}, {a.ville}</p>
                    <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-3 text-sm font-medium text-slate-800">
                      <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-amber-500" />{a.superficie} m²</span>
                      {a.pieces !== null && <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-slate-800" />{a.pieces} pièces</span>}
                    </div>
                    <p className="text-xs text-slate-800">Propriétaire : {a.proprietaire.nomComplet}</p>
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                      <button type="button" onClick={() => ouvrirEdition(a)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#08284d] bg-gradient-to-r from-[#08284d] to-[#174b83] px-3 py-2 text-sm font-bold text-white shadow-md transition hover:brightness-110"><Pencil className="h-4 w-4" />Modifier</button>
                      <button type="button" onClick={() => setPhotosOuvertes((v) => ({ ...v, [a.id]: !v[a.id] }))} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#eab72f] bg-gradient-to-r from-[#ffe18a] to-[#f4c044] px-3 py-2 text-sm font-bold text-[#08284d] shadow-sm transition hover:brightness-105"><ImageIcon className="h-4 w-4" />Photos</button>
                      <button type="button" disabled={envoi === a.id} onClick={() => void retirerAnnonce(a)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#174b83] bg-white px-3 py-2 text-sm font-bold text-[#08284d] shadow-sm transition hover:bg-[#edf4fc] disabled:opacity-50"><Trash2 className="h-4 w-4" />Retirer</button>
                    </div>
                  </div>

                </div>

                <details open={!!photosOuvertes[a.id]} className="border-t border-slate-100 bg-[#fbfcff]">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-extrabold text-[#08284d] hover:bg-amber-50">Gérer les photos ({a.photos.length})</summary>
                  <div className="p-5 sm:p-6">
                  <h4 className="mb-4 text-lg font-extrabold text-slate-950">Photos actuellement enregistrées</h4>
                  {a.photos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-base font-semibold text-slate-800">Aucune photo pour cette annonce.</div>
                  ) : (
                    <div className="admin-photo-grid grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                      {a.photos.map((photoId, index) => (
                        <article key={photoId} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
                          <div className="relative overflow-hidden bg-slate-200">
                            <img src={urlApi('/api/annonces/' + a.id + '/photos/' + photoId + '?v=' + (versionImages[photoId] ?? a.id))}
                              alt={'Photo ' + (index + 1) + ' de ' + a.titre} className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                            <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-[#08284d]/95 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm">Photo {index + 1}</span>
                          </div>
                          <div className="space-y-3.5 bg-white p-4 sm:p-5">
                            {a.publieeParAgence ? (
                              <>
                                <label htmlFor={`remplacer-${photoId}`} className="block text-xs font-bold uppercase tracking-wide text-slate-800">Choisir la nouvelle image</label>
                                <label htmlFor={`remplacer-${photoId}`} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#174b83] bg-[#08284d] px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#174b83] focus-within:outline-none focus-within:ring-4 focus-within:ring-dore-200">📁 Choisir un fichier</label>
                                <input id={`remplacer-${photoId}`} type="file" accept="image/jpeg,image/png" className="sr-only"
                                  onChange={async (e) => {
                                    const fichier = e.target.files?.[0]
                                    if (!fichier) return
                                    try {
                                      const prepare = await preparerPhoto(fichier)
                                      setFichiersRemplacement((v) => ({ ...v, [photoId]: prepare }))
                                      setErreur(null)
                                    } catch (erreurPhoto) {
                                      setErreur(erreurPhoto instanceof Error ? erreurPhoto.message : 'Préparation de la photo impossible.')
                                      setFichiersRemplacement((v) => ({ ...v, [photoId]: undefined }))
                                    }
                                  }} />
                                <p aria-live="polite" className="min-h-11 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">{fichiersRemplacement[photoId]?.name ?? 'Aucun fichier choisi'}</p>
                                <button type="button" disabled={envoi === photoId || !fichiersRemplacement[photoId]}
                                  onClick={() => void remplacerPhoto(a, photoId)}
                                  className="min-h-11 w-full rounded-xl border border-[#08284d] bg-nuit-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nuit-800 focus:outline-none focus:ring-4 focus:ring-dore-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-600 disabled:shadow-none">
                                  {envoi === photoId ? 'Remplacement en cours…' : 'Remplacer la photo'}
                                </button>
                                <button type="button" disabled={envoi === photoId} onClick={() => void supprimerPhoto(a, photoId)}
                                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#08284d] transition-colors hover:border-dore-500 hover:bg-dore-50 focus:outline-none focus:ring-4 focus:ring-dore-100 disabled:cursor-not-allowed disabled:opacity-50">🗑 Supprimer</button>
                              </>
                            ) : (
                              <div className="rounded-xl border-2 border-slate-300 bg-slate-100 p-4">
                                <p className="text-base font-extrabold text-slate-950">Photo gérée par le propriétaire</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-800">L’administrateur peut consulter cette photo, mais ne peut ni la remplacer ni la supprimer depuis cet espace. Toute demande de correction passe par la modération.</p>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {a.publieeParAgence && (
                    <div className="mt-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
                      <h4 className="text-lg font-black text-blue-950">Ajouter une photo à cette annonce</h4>
                      <p className="mt-1 text-sm leading-relaxed text-blue-950">Formats acceptés : JPG ou PNG. Maximum 5 Mo après préparation, jusqu’à 8 photos par annonce.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="space-y-2">
                          <label htmlFor={`ajouter-${a.id}`} className="block text-sm font-extrabold text-slate-950">Nouvelle photo</label>
                          <label htmlFor={`ajouter-${a.id}`} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-blue-950 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-800 px-5 py-2.5 text-center text-sm font-extrabold !text-white shadow-[0_5px_0_#c58a16] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_0_#c58a16] active:translate-y-1 active:shadow-none focus-within:outline-none focus-within:ring-4 focus-within:ring-amber-200">＋ Choisir un fichier</label>
                          <input id={`ajouter-${a.id}`} type="file" accept="image/jpeg,image/png" className="sr-only"
                            onChange={async (e) => {
                              const fichier = e.target.files?.[0]
                              if (!fichier) return
                              try {
                                const prepare = await preparerPhoto(fichier)
                                setFichiers((v) => ({ ...v, [a.id]: prepare }))
                                setErreur(null)
                              } catch (erreurPhoto) {
                                setErreur(erreurPhoto instanceof Error ? erreurPhoto.message : 'Préparation de la photo impossible.')
                                setFichiers((v) => ({ ...v, [a.id]: undefined }))
                              }
                            }} />
                          <p aria-live="polite" className="min-h-11 break-all rounded-lg border border-blue-200 bg-white p-3 text-sm font-semibold text-slate-800">{fichiers[a.id]?.name ?? 'Aucun fichier choisi'}</p>
                        </div>
                        <button type="button" disabled={envoi === a.id || !fichiers[a.id]} onClick={() => void ajouterPhoto(a)}
                          className="min-h-11 w-full rounded-full border-2 border-amber-600 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black !text-slate-950 shadow-[0_4px_0_#9a670b] sm:w-auto transition duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_6px_0_#9a670b] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:!text-slate-800 disabled:shadow-none">
                          {envoi === a.id ? 'Ajout en cours…' : 'Ajouter au catalogue'}
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </details>
              </article>
            ))}</div>}
          </section>
        )}



            {annonceEnEdition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
            <form onSubmit={enregistrerEdition} className="my-6 w-full max-w-3xl space-y-4 rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div><p className="text-xs font-black uppercase tracking-widest text-blue-800">Administration · Intervention justifiée</p><h2 className="mt-1 text-2xl font-black text-slate-950">Modifier l’annonce</h2><p className="mt-1 text-sm text-slate-800">Le propriétaire sera automatiquement informé de cette modification.</p></div>
                <button type="button" onClick={() => setAnnonceEnEdition(null)} className="rounded-full border-2 border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200">Fermer</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-bold text-slate-800 sm:col-span-2">Titre<input required maxLength={150} value={edition.titre} onChange={e=>setEdition(v=>({...v,titre:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base font-medium text-slate-950 focus:border-blue-700 focus:outline-none"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Type de bien<select value={edition.typeBien} onChange={e=>setEdition(v=>({...v,typeBien:e.target.value as AnnoncePhoto['typeBien']}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"><option value="MAISON">Maison</option><option value="APPARTEMENT">Appartement</option><option value="STUDIO">Studio</option><option value="VILLA">Villa</option><option value="TERRAIN">Terrain</option></select></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Transaction<select value={edition.transaction} onChange={e=>setEdition(v=>({...v,transaction:e.target.value as 'LOCATION'|'VENTE'}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"><option value="LOCATION">Location</option><option value="VENTE">Vente</option></select></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Prix (FCFA)<input required type="number" min="1" value={edition.prix} onChange={e=>setEdition(v=>({...v,prix:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Superficie (m²)<input required type="number" min="0.01" step="0.01" value={edition.superficie} onChange={e=>setEdition(v=>({...v,superficie:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Nombre de pièces<input type="number" min="0" max="100" value={edition.pieces} onChange={e=>setEdition(v=>({...v,pieces:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Ville<input required maxLength={100} value={edition.ville} onChange={e=>setEdition(v=>({...v,ville:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800">Quartier<input required maxLength={100} value={edition.quartier} onChange={e=>setEdition(v=>({...v,quartier:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800 sm:col-span-2">Adresse<input maxLength={255} value={edition.adresse} onChange={e=>setEdition(v=>({...v,adresse:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800 sm:col-span-2">Description<textarea rows={4} maxLength={5000} value={edition.description} onChange={e=>setEdition(v=>({...v,description:e.target.value}))} className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"/></label>
                <label className="space-y-1 text-sm font-bold text-slate-800 sm:col-span-2">Motif obligatoire de la modification<textarea required minLength={1} maxLength={500} rows={2} value={motifEdition} onChange={e=>setMotifEdition(e.target.value)} placeholder="Explique pourquoi l’administration modifie cette annonce…" className="w-full rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-base text-slate-950"/></label>
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={()=>setAnnonceEnEdition(null)} className="rounded-full border-2 border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100">Annuler</button>
                <button type="submit" disabled={envoi===annonceEnEdition.id} className="rounded-full border-2 border-amber-600 bg-amber-400 px-6 py-2.5 text-sm font-black text-slate-950 shadow-sm hover:bg-amber-300 disabled:opacity-60">{envoi===annonceEnEdition.id?'Enregistrement…':'Enregistrer les modifications'}</button>
              </div>
            </form>
          </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
