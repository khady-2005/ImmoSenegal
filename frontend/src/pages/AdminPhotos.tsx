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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-nuit-900">Gestion des photos du catalogue</h1>
          <p className="mt-1 text-sm text-slate-600">Photos de l’agence : gestion directe. Photos des propriétaires : avertissement et délai de 48 heures.</p>
        </div>
        <Link to="/admin/annonces" className="text-sm font-semibold text-nuit-900 underline">Retour à la modération</Link>
      </div>
      {info && <p role="status" className="mb-4 rounded-lg bg-dore-100 p-3 text-sm">{info}</p>}
      {erreur && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {chargement ? <p>Chargement…</p> : annonces.length === 0 ? <p>Aucune annonce publiée à afficher.</p> : (
        <div className="space-y-5">
          {annonces.map((a) => (
            <section key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={'/annonces/' + a.id} className="font-semibold text-nuit-900 underline">{a.titre}</Link>
                  <p className="text-sm text-slate-600">Propriétaire : {a.proprietaire.nomComplet}</p>
                  <p className="mt-1 text-xs font-semibold">{a.publieeParAgence ? 'Annonce ImmoSénégal' : 'Annonce d’un propriétaire'}</p>
                </div>
                <button type="button" disabled={envoi === a.id} onClick={() => void definirOrigine(a, !a.publieeParAgence)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
                  {a.publieeParAgence ? 'Classer comme annonce propriétaire' : 'Classer comme annonce ImmoSénégal'}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {a.photos.map((photoId) => (
                  <article key={photoId} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={urlApi('/api/annonces/' + a.id + '/photos/' + photoId)} alt={'Photo de ' + a.titre} className="h-48 w-full object-cover" />
                    <div className="space-y-2 p-3">
                      {a.publieeParAgence ? (
                        <button type="button" disabled={envoi === photoId} onClick={() => void supprimerPhoto(a, photoId)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-50">Supprimer cette photo</button>
                      ) : (
                        <>
                          <label className="block text-xs font-semibold text-slate-700" htmlFor={'motif-' + photoId}>Motif de l’avertissement</label>
                          <textarea id={'motif-' + photoId} value={motifs[photoId] ?? ''} maxLength={500} rows={2}
                            onChange={(e) => setMotifs((v) => ({ ...v, [photoId]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Explique le problème constaté…" />
                          <button type="button" disabled={envoi === photoId || !(motifs[photoId] ?? '').trim()}
                            onClick={() => void avertir(a, photoId)}
                            className="rounded-lg bg-nuit-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Envoyer l’avertissement (48 h)</button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {a.publieeParAgence && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                  <label className="text-sm font-medium">Ajouter une photo
                    <input type="file" accept="image/jpeg,image/png" onChange={(e) => setFichiers((v) => ({ ...v, [a.id]: e.target.files?.[0] }))}
                      className="mt-1 block max-w-full text-sm" />
                  </label>
                  <button type="button" disabled={envoi === a.id || !fichiers[a.id]} onClick={() => void ajouterPhoto(a)}
                    className="rounded-lg bg-nuit-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Ajouter la photo</button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold text-nuit-900">Historique des avertissements</h2>
        {avertissements.length === 0 ? <p className="mt-3 text-sm text-slate-600">Aucun avertissement envoyé.</p> : (
          <div className="mt-3 space-y-2">
            {avertissements.map((a) => (
              <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{a.titreAnnonce} · {a.nomProprietaire}</strong>
                  <span>{a.statut === 'EN_ATTENTE' ? 'En attente' : a.statut === 'REPONDU' ? 'Réponse reçue' : a.statut === 'CORRIGE' ? 'Photo corrigée' : 'Photo retirée'}</span>
                </div>
                <p className="mt-1 text-slate-600">{a.motif}</p>
                {a.statut === 'EN_ATTENTE' && <p className="mt-1 text-xs text-slate-500">Échéance : {new Date(a.echeanceLe).toLocaleString('fr-FR')}</p>}
                {a.reponseProprietaire && <p className="mt-1 rounded bg-slate-50 p-2">Réponse : {a.reponseProprietaire}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
