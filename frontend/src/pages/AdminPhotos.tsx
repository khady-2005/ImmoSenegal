import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'

type AnnoncePhoto = {
  id: string
  titre: string
  statut: string
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
type Avertissement = {
  id: string
  annonceId: string
  photoId: string
  titreAnnonce: string
  nomProprietaire: string
  motif: string
  creeLe: string
  echeanceLe: string
  statut: 'EN_ATTENTE' | 'REPONDU' | 'CORRIGE' | 'RETIRE'
  reponseProprietaire: string | null
  reponduLe: string | null
}

export default function AdminPhotos() {
  const { utilisateur, jeton } = useAuth()
  const [annonces, setAnnonces] = useState<AnnoncePhoto[]>([])
  const [avertissements, setAvertissements] = useState<Avertissement[]>([])
  const [motifs, setMotifs] = useState<Record<string, string>>({})
  const [fichiers, setFichiers] = useState<Record<string, File | undefined>>({})
  const [fichiersRemplacement, setFichiersRemplacement] = useState<Record<string, File | undefined>>({})
  const [versionImages, setVersionImages] = useState<Record<string, number>>({})
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const [page, historique] = await Promise.all([
        appelApi<Page<AnnoncePhoto>>('/api/admin/annonces?statut=PUBLIEE&taille=50', { token: jeton }),
        appelApi<Avertissement[]>('/api/admin/photos/avertissements', { token: jeton }),
      ])
      setAnnonces(page.contenu)
      setAvertissements(historique)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les photos.')
    } finally { setChargement(false) }
  }, [jeton])

  useEffect(() => { if (utilisateur?.role === 'ADMIN') void charger() }, [charger, utilisateur?.role])

  async function definirOrigine(a: AnnoncePhoto, publieeParAgence: boolean) {
    setEnvoi(a.id); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/admin/annonces/' + a.id + '/publication-agence', {
        method: 'PATCH', token: jeton, body: { publieeParAgence },
      })
      setInfo(publieeParAgence ? 'Annonce identifiée comme publiée par ImmoSénégal.' : 'Annonce identifiée comme appartenant à un propriétaire.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Modification impossible.') }
    finally { setEnvoi(null) }
  }

  async function avertir(a: AnnoncePhoto, photoId: string) {
    const motif = (motifs[photoId] ?? '').trim()
    if (!motif) { setErreur('Indique le motif de l’avertissement.'); return }
    setEnvoi(photoId); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/admin/photos/' + a.id + '/' + photoId + '/avertir', {
        method: 'POST', token: jeton, body: { motif },
      })
      setInfo('Avertissement envoyé au propriétaire. Le délai de 48 heures commence.')
      setMotifs((v) => ({ ...v, [photoId]: '' }))
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Envoi impossible.') }
    finally { setEnvoi(null) }
  }

  async function deciderAvertissement(a: Avertissement, retirer: boolean) {
    if (retirer && !window.confirm('Retirer cette photo après examen de la réponse du propriétaire ?')) return
    setEnvoi(a.id); setErreur(null); setInfo(null)
    try {
      await appelApi('/api/admin/photos/avertissements/' + a.id + '/decision', {
        method: 'POST', token: jeton, body: { retirer },
      })
      setInfo(retirer ? 'Photo retirée après examen de la réponse.' : 'Avertissement clôturé après examen de la réponse.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Décision impossible.') }
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

  if (utilisateur?.role !== 'ADMIN') return <div className="mx-auto max-w-3xl px-4 py-10">Accès réservé aux administrateurs.</div>

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-nuit-950 sm:text-4xl">Gestion des photos du catalogue</h1>
          <p className="mt-3 max-w-3xl rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-800 sm:text-lg">Photos de l’agence : gestion directe. Photos des propriétaires : avertissement et délai de 48 heures.</p>
        </div>
        <Link to="/admin/annonces" className="inline-flex rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold text-nuit-900 underline">Retour à la modération</Link>
      </div>
      {info && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-base font-semibold text-nuit-950">{info}</p>}
      {erreur && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-semibold text-red-900">{erreur}</p>}
      {chargement ? <p className="rounded-xl bg-slate-50 p-4 text-base text-slate-700">Chargement…</p> : annonces.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-base text-slate-700">Aucune annonce publiée à afficher.</p> : (
        <div className="space-y-5">
          {annonces.map((a) => (
            <section key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={'/annonces/' + a.id} className="text-xl font-bold text-nuit-950 underline">{a.titre}</Link>
                  <p className="mt-2 text-base text-slate-700">Propriétaire : {a.proprietaire.nomComplet}</p>
                  <p className="mt-2 inline-flex rounded-full border border-dore-300 bg-dore-100 px-3 py-1.5 text-base font-bold text-nuit-950">{a.publieeParAgence ? 'Annonce ImmoSénégal' : 'Annonce d’un propriétaire'}</p>
                </div>
                <button type="button" disabled={envoi === a.id} onClick={() => void definirOrigine(a, !a.publieeParAgence)}
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-50">
                  {a.publieeParAgence ? 'Classer comme annonce propriétaire' : 'Classer comme annonce ImmoSénégal'}
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {a.photos.map((photoId) => (
                  <article key={photoId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <img src={urlApi('/api/annonces/' + a.id + '/photos/' + photoId + (versionImages[photoId] ? '?v=' + versionImages[photoId] : ''))} alt={'Photo de ' + a.titre} className="h-48 w-full object-cover" />
                    <div className="space-y-3 bg-slate-50 p-4">
                      {a.publieeParAgence ? (
                        <>
                          <div className="space-y-2">
                            <span className="block text-base font-bold text-slate-900">Remplacer cette photo</span>
                            <label htmlFor={`remplacer-${photoId}`} className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dore-500 bg-dore-100 px-4 py-3 text-base font-bold text-nuit-950 shadow-sm hover:bg-dore-200">Choisir une nouvelle photo</label>
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
                            <p aria-live="polite" className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">{fichiersRemplacement[photoId]?.name ?? 'Aucun fichier sélectionné'}</p>
                          </div>
                          <button type="button" disabled={envoi === photoId || !fichiersRemplacement[photoId]}
                            onClick={() => void remplacerPhoto(a, photoId)}
                            className="w-full min-h-12 rounded-xl border-2 border-dore-500 bg-dore-400 px-4 py-3 text-base font-extrabold text-nuit-950 shadow-md hover:bg-dore-300 disabled:cursor-not-allowed disabled:opacity-60">Remplacer la photo sélectionnée</button>
                          <button type="button" disabled={envoi === photoId} onClick={() => void supprimerPhoto(a, photoId)}
                            className="w-full rounded-xl border-2 border-red-300 bg-white px-4 py-3 text-base font-bold text-red-800 hover:bg-red-50 disabled:opacity-50">Supprimer cette photo</button>
                        </>
                      ) : (
                        <>
                          <label className="block text-base font-bold text-slate-900" htmlFor={'motif-' + photoId}>Motif de l’avertissement</label>
                          <textarea id={'motif-' + photoId} value={motifs[photoId] ?? ''} maxLength={500} rows={2}
                            onChange={(e) => setMotifs((v) => ({ ...v, [photoId]: e.target.value }))}
                            className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950" placeholder="Explique le problème constaté…" />
                          <button type="button" disabled={envoi === photoId || !(motifs[photoId] ?? '').trim()}
                            onClick={() => void avertir(a, photoId)}
                            className="rounded-xl bg-nuit-900 px-4 py-3 text-base font-bold text-white disabled:opacity-50">Envoyer l’avertissement (48 h)</button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {a.publieeParAgence && (
                <div className="mt-5 flex flex-col items-start gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-end">
                  <div className="space-y-2">
                    <span className="block text-base font-bold text-slate-900">Ajouter une photo</span>
                    <label htmlFor={`ajouter-${a.id}`} className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dore-500 bg-dore-100 px-4 py-3 text-base font-bold text-nuit-950 shadow-sm hover:bg-dore-200">Choisir une photo</label>
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
                    <p aria-live="polite" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">{fichiers[a.id]?.name ?? 'Aucun fichier sélectionné'}</p>
                  </div>
                  <button type="button" disabled={envoi === a.id || !fichiers[a.id]} onClick={() => void ajouterPhoto(a)}
                    className="min-h-12 rounded-xl border-2 border-nuit-900 bg-nuit-900 px-5 py-3 text-base font-bold text-white shadow-md hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-60">Ajouter la photo sélectionnée</button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-nuit-950">Historique des avertissements</h2>
        {avertissements.length === 0 ? <p className="mt-3 text-base text-slate-700">Aucun avertissement envoyé.</p> : (
          <div className="mt-4 space-y-3">
            {avertissements.map((a) => (
              <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-base shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{a.titreAnnonce} · {a.nomProprietaire}</strong>
                  <span>{a.statut === 'EN_ATTENTE' ? 'En attente' : a.statut === 'REPONDU' ? 'Réponse reçue' : a.statut === 'CORRIGE' ? 'Photo corrigée' : 'Photo retirée'}</span>
                </div>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{a.motif}</p>
                {a.statut === 'EN_ATTENTE' && <p className="mt-2 text-base text-slate-600">Échéance : {new Date(a.echeanceLe).toLocaleString('fr-FR')}</p>}
                {a.reponseProprietaire && <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-800">Réponse : {a.reponseProprietaire}</p>}
                {a.statut === 'REPONDU' && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" disabled={envoi === a.id} onClick={() => void deciderAvertissement(a, false)}
                      className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold">Clôturer sans retrait</button>
                    <button type="button" disabled={envoi === a.id} onClick={() => void deciderAvertissement(a, true)}
                      className="rounded-xl border-2 border-red-300 bg-white px-4 py-3 text-base font-bold text-red-800">Retirer après examen</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
