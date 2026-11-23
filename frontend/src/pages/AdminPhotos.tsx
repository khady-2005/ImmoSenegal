import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'

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

  const categories = [
    { id: 'TOUTES', label: 'Toutes les annonces', count: annonces.length },
    { id: 'MAISON', label: 'Maisons', count: annonces.filter((a) => a.typeBien === 'MAISON').length },
    { id: 'APPARTEMENT', label: 'Appartements', count: annonces.filter((a) => a.typeBien === 'APPARTEMENT').length },
    { id: 'STUDIO', label: 'Studios', count: annonces.filter((a) => a.typeBien === 'STUDIO').length },
    { id: 'VILLA', label: 'Villas', count: annonces.filter((a) => a.typeBien === 'VILLA').length },
    { id: 'TERRAIN', label: 'Terrains', count: annonces.filter((a) => a.typeBien === 'TERRAIN').length },
    { id: 'AGENCE', label: 'ImmoSénégal', count: annonces.filter((a) => a.publieeParAgence).length },
    { id: 'PROPRIETAIRE', label: 'Propriétaires', count: annonces.filter((a) => !a.publieeParAgence).length },
  ]
  const annoncesFiltrees = annonces.filter((a) => {
    const correspondCategorie = categorie === 'TOUTES' || categorie === 'AGENCE' && a.publieeParAgence || categorie === 'PROPRIETAIRE' && !a.publieeParAgence || a.typeBien === categorie
    const terme = recherche.trim().toLocaleLowerCase('fr')
    const correspondRecherche = !terme || [a.titre, a.ville, a.quartier, a.proprietaire.nomComplet].some((v) => v.toLocaleLowerCase('fr').includes(terme))
    return correspondCategorie && correspondRecherche
  })

  if (utilisateur?.role !== 'ADMIN') return <div className="mx-auto max-w-3xl px-4 py-10">Accès réservé aux administrateurs.</div>

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber-300">Administration · ImmoSénégal</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">Gestion du catalogue</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-100 sm:text-lg">
                Retrouve rapidement les annonces par type de bien ou par origine de publication. Les photos et fiches restent accessibles depuis chaque annonce.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void charger()} disabled={chargement}
                className="min-h-12 rounded-xl border-2 border-white bg-white px-5 py-3 text-base font-extrabold text-slate-950 shadow hover:bg-slate-100 disabled:opacity-60">
                {chargement ? 'Actualisation…' : 'Actualiser la liste'}
              </button>
              <Link to="/admin/annonces" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-300 px-5 py-3 text-base font-extrabold text-slate-950 shadow hover:bg-amber-200">
                Modération des annonces
              </Link>
            </div>
          </div>
        </header>

        <section aria-label="Statistiques du catalogue" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="flex min-h-28 items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <div><p className="text-sm font-bold uppercase tracking-wide text-slate-700">Annonces publiées</p><p className="mt-1 text-sm text-slate-600">Total du catalogue</p></div>
            <p className="shrink-0 text-4xl font-black leading-none tabular-nums text-slate-950">{annonces.length}</p>
          </article>
          <article className="flex min-h-28 items-center justify-between gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div><p className="text-sm font-bold uppercase tracking-wide text-blue-950">Annonces ImmoSénégal</p><p className="mt-1 text-sm text-blue-900">Gérées par l'agence</p></div>
            <p className="shrink-0 text-4xl font-black leading-none tabular-nums text-blue-950">{annonces.filter((a) => a.publieeParAgence).length}</p>
          </article>
          <article className="flex min-h-28 items-center justify-between gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div><p className="text-sm font-bold uppercase tracking-wide text-amber-950">Annonces propriétaires</p><p className="mt-1 text-sm text-amber-900">Gérées par leurs propriétaires</p></div>
            <p className="shrink-0 text-4xl font-black leading-none tabular-nums text-amber-950">{annonces.filter((a) => !a.publieeParAgence).length}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <h2 className="text-lg font-extrabold text-blue-950">Règles de gestion des annonces</h2>
          <div className="mt-2 grid gap-2 text-sm leading-relaxed text-blue-950 sm:grid-cols-2">
            <p><strong>Annonces ImmoSénégal :</strong> l’administrateur peut ajouter, remplacer ou supprimer les photos.</p>
            <p><strong>Annonces des propriétaires :</strong> elles sont affichées en consultation uniquement. Le propriétaire modifie lui-même son annonce et ses photos. La modération se fait dans l’espace dédié.</p>
          </div>
        </section>

        {info && <p role="status" className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-base font-bold text-emerald-950">{info}</p>}
        {erreur && <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-base font-bold text-red-950">{erreur}</p>}

        {chargement ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-semibold text-slate-700">Chargement des annonces…</div>
        ) : annonces.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-extrabold text-slate-950">Aucune annonce publiée</h2>
            <p className="mt-2 text-base text-slate-700">Les annonces publiées apparaîtront ici pour la gestion de leurs photos.</p>
          </div>
        ) : (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="text-2xl font-black text-slate-950">Annonces du catalogue</h2><p className="mt-1 text-sm text-slate-700">Choisis une catégorie ou recherche un bien par son titre, sa ville ou son propriétaire.</p></div>
                <span className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800">{annoncesFiltrees.length} résultat(s)</span>
              </div>
              <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une annonce, une ville, un quartier…" aria-label="Rechercher dans le catalogue" className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-blue-800 focus:ring-4 focus:ring-blue-100" />
              <div className="flex flex-wrap gap-2" aria-label="Catégories du catalogue">
                {categories.map((item) => <button key={item.id} type="button" onClick={() => setCategorie(item.id)} aria-pressed={categorie === item.id} className={categorie === item.id ? 'rounded-xl border-2 border-blue-950 bg-blue-950 px-4 py-2.5 text-sm font-extrabold text-white shadow' : 'rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-blue-400 hover:bg-blue-50'}>{item.label} <span className={categorie === item.id ? 'ml-1 text-amber-300' : 'ml-1 text-blue-800'}>{item.count}</span></button>)}
              </div>
            </div>
            {annoncesFiltrees.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="text-lg font-extrabold text-slate-950">Aucune annonce dans cette catégorie</h3><p className="mt-2 text-sm text-slate-700">Essaie une autre catégorie ou modifie ta recherche.</p><button type="button" onClick={() => { setCategorie('TOUTES'); setRecherche('') }} className="mt-4 rounded-xl bg-blue-950 px-4 py-2.5 font-bold text-white">Afficher toutes les annonces</button></div> : annoncesFiltrees.map((a) => (
              <article key={a.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={a.publieeParAgence ? "rounded-full bg-blue-100 px-3 py-1.5 text-sm font-extrabold text-blue-950" : "rounded-full bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-950"}>
                        {a.publieeParAgence ? 'Annonce ImmoSénégal' : 'Annonce propriétaire'}
                      </span>
                      <span className="rounded-full bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-800">{a.typeBien === 'MAISON' ? 'Maison' : a.typeBien === 'APPARTEMENT' ? 'Appartement' : a.typeBien === 'STUDIO' ? 'Studio' : a.typeBien === 'VILLA' ? 'Villa' : 'Terrain'}</span>
                      <span className="rounded-full bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-800">{a.photos.length} photo(s)</span>
                    </div>
                    <h3 className="mt-3 break-words text-xl font-black text-slate-950">{a.titre}</h3>
                    <button type="button" onClick={() => ouvrirEdition(a)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-blue-800 bg-blue-800 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-200">
                      ✎ Modifier l’annonce
                    </button>
                    <p className="mt-1 text-sm font-medium text-slate-700">Propriétaire : {a.proprietaire.nomComplet}</p>
                    <Link to={'/annonces/' + a.id} className="mt-2 inline-flex font-bold text-blue-800 underline decoration-2 underline-offset-2 hover:text-blue-950">Voir la fiche de l’annonce</Link>
                  </div>

                </div>

                <div className="p-5 sm:p-6">
                  <h4 className="mb-4 text-lg font-extrabold text-slate-950">Photos actuellement enregistrées</h4>
                  {a.photos.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-base font-semibold text-slate-700">Aucune photo pour cette annonce.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {a.photos.map((photoId, index) => (
                        <article key={photoId} className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                          <div className="relative bg-slate-200">
                            <img src={urlApi('/api/annonces/' + a.id + '/photos/' + photoId + '?v=' + (versionImages[photoId] ?? a.id))}
                              alt={'Photo ' + (index + 1) + ' de ' + a.titre} className="h-56 w-full object-cover" />
                            <span className="absolute left-3 top-3 rounded-lg bg-slate-950/90 px-3 py-1.5 text-sm font-bold text-white">Photo {index + 1}</span>
                          </div>
                          <div className="space-y-3 p-4">
                            {a.publieeParAgence ? (
                              <>
                                <label htmlFor={`remplacer-${photoId}`} className="block text-sm font-extrabold text-slate-900">Choisir la nouvelle image</label>
                                <label htmlFor={`remplacer-${photoId}`} className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-blue-900 bg-blue-700 px-4 py-3 text-center text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-950 focus-within:ring-4 focus-within:ring-blue-300">📷 Choisir une nouvelle photo</label>
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
                                <p aria-live="polite" className="min-h-11 break-all rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800">{fichiersRemplacement[photoId]?.name ?? 'Aucun fichier choisi'}</p>
                                <button type="button" disabled={envoi === photoId || !fichiersRemplacement[photoId]}
                                  onClick={() => void remplacerPhoto(a, photoId)}
                                  className="min-h-12 w-full rounded-xl border-2 border-amber-600 bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300">
                                  {envoi === photoId ? 'Remplacement en cours…' : 'Valider le remplacement'}
                                </button>
                                <button type="button" disabled={envoi === photoId} onClick={() => void supprimerPhoto(a, photoId)}
                                  className="min-h-11 w-full rounded-xl border-2 border-red-700 bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-red-800 disabled:opacity-50">🗑 Supprimer cette photo</button>
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
                          <label htmlFor={`ajouter-${a.id}`} className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-blue-900 bg-blue-700 px-5 py-3 text-center text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-950 focus-within:ring-4 focus-within:ring-blue-300">＋ Choisir un fichier image</label>
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
                          className="min-h-12 rounded-xl border-2 border-amber-600 bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500">
                          {envoi === a.id ? 'Ajout en cours…' : 'Ajouter au catalogue'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}



        {annonceEnEdition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
            <form onSubmit={enregistrerEdition} className="my-6 w-full max-w-3xl space-y-4 rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div><p className="text-xs font-black uppercase tracking-widest text-blue-800">Administration · Intervention justifiée</p><h2 className="mt-1 text-2xl font-black text-slate-950">Modifier l’annonce</h2><p className="mt-1 text-sm text-slate-600">Le propriétaire sera automatiquement informé de cette modification.</p></div>
                <button type="button" onClick={() => setAnnonceEnEdition(null)} className="rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-800 hover:bg-slate-200">Fermer</button>
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
                <button type="button" onClick={()=>setAnnonceEnEdition(null)} className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 hover:bg-slate-100">Annuler</button>
                <button type="submit" disabled={envoi===annonceEnEdition.id} className="rounded-xl border-2 border-blue-950 bg-blue-900 px-6 py-3 font-black text-white shadow-lg hover:bg-blue-950 disabled:opacity-60">{envoi===annonceEnEdition.id?'Enregistrement…':'Enregistrer les modifications'}</button>
              </div>
            </form>
          </div>
        )}

      </div>
    </main>
  )
}
