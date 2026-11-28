import { useEffect, useRef, useState } from 'react'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'
import { PHOTOS_MAX, urlPhoto } from './photos'
import { preparerPhoto } from './preparerPhoto'

interface Props {
  annonceId: string
  photos: string[]
  onChange: (photos: string[]) => void
}

/** Ajout et suppression des photos d'une annonce. Le serveur revérifie tout (droits, format réel, taille, nombre). */
export default function GestionPhotos({ annonceId, photos, onChange }: Props) {
  const { jeton } = useAuth()
  const champ = useRef<HTMLInputElement>(null)
  const [erreurs, setErreurs] = useState<string[]>([])
  const [succes, setSucces] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, number>>({})
  const [enCours, setEnCours] = useState(false)
  const [apercusEnCours, setApercusEnCours] = useState<string[]>([])
  const [piece, setPiece] = useState('AUTRE')
  const [categories, setCategories] = useState<Record<string, string>>({})
  useEffect(() => {
    let active = true
    fetch(urlApi(`/api/annonces/${annonceId}/photos/metadata`))
      .then((r) => r.ok ? r.json() : [])
      .then((items: Array<{id: string; piece: string}>) => {
        if (active) setCategories(Object.fromEntries(items.map((x) => [x.id, x.piece])))
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [annonceId])

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return
    setSucces(null)
    setErreurs([])
    const urlsApercu = typeof URL.createObjectURL === 'function'
      ? Array.from(fichiers).map((f) => URL.createObjectURL(f))
      : []
    setApercusEnCours(urlsApercu)
    setEnCours(true)
    const problemes: string[] = []
    let courantes = photos
    try {
      for (const fichier of Array.from(fichiers)) {
        if (courantes.length >= PHOTOS_MAX) {
          problemes.push(`« ${fichier.name} » : maximum ${PHOTOS_MAX} photos par annonce.`)
          continue
        }
        let photoPreparee: File
        try {
          photoPreparee = await preparerPhoto(fichier)
        } catch (e) {
          problemes.push(`« ${fichier.name} » : ${e instanceof Error ? e.message : 'compression impossible.'}`)
          continue
        }
        const donnees = new FormData()
        donnees.append('fichier', photoPreparee)
        donnees.append('piece', piece)
        try {
          const r = await appelApi<{ id: string }>(`/api/annonces/${annonceId}/photos`, { method: 'POST', body: donnees, token: jeton })
          courantes = [...courantes, r.id]
          setCategories((actuelles) => ({ ...actuelles, [r.id]: piece }))
          onChange(courantes)
        } catch (e) {
          problemes.push(`« ${fichier.name} » : ${e instanceof ApiError ? e.message : 'envoi impossible.'}`)
        }
      }
      setErreurs(problemes)
      if (courantes.length > photos.length) {
        setSucces(`${courantes.length - photos.length} photo(s) ajoutée(s).`)
      }
    } finally {
      if (typeof URL.revokeObjectURL === 'function') {
        urlsApercu.forEach((u) => URL.revokeObjectURL(u))
      }
      setApercusEnCours([])
      setEnCours(false)
      if (champ.current) champ.current.value = ''
    }
  }

  async function definirPrincipale(index: number) {
    if (index <= 0 || index >= photos.length || enCours) return
    const cible = photos[index]
    const nouvelOrdre = [cible, ...photos.filter((_, idx) => idx !== index)]
    setErreurs([])
    setEnCours(true)
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/photos/ordre`, {
        method: 'PUT', body: nouvelOrdre, token: jeton,
      })
      onChange(nouvelOrdre)
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : 'Modification impossible.'])
    } finally {
      setEnCours(false)
    }
  }

  async function deplacer(index: number, direction: -1 | 1) {
    const cible = index + direction
    if (cible < 0 || cible >= photos.length || enCours) return
    const nouvelOrdre = [...photos]
    ;[nouvelOrdre[index], nouvelOrdre[cible]] = [nouvelOrdre[cible], nouvelOrdre[index]]
    setErreurs([])
    setEnCours(true)
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/photos/ordre`, {
        method: 'PUT', body: nouvelOrdre, token: jeton,
      })
      onChange(nouvelOrdre)
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : 'Réorganisation impossible.'])
    } finally {
      setEnCours(false)
    }
  }

  async function classer(photo: string, nouvellePiece: string) {
    setCategories((actuelles) => ({ ...actuelles, [photo]: nouvellePiece }))
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/photos/${photo}/piece`, { method: 'PATCH', body: { piece: nouvellePiece }, token: jeton })
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : 'Classement impossible.'])
    }
  }

  async function remplacer(photo: string, fichier: File | undefined) {
    if (!fichier || enCours) return
    setErreurs([])
    setSucces(null)
    setEnCours(true)
    try {
      const photoPreparee = await preparerPhoto(fichier)
      const donnees = new FormData()
      donnees.append('fichier', photoPreparee)
      await appelApi<void>(`/api/annonces/${annonceId}/photos/${photo}`, {
        method: 'PUT', body: donnees, token: jeton,
      })
      setVersions((v) => ({ ...v, [photo]: Date.now() }))
      setSucces('Photo remplacée.')
      onChange([...photos])
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Remplacement impossible.'])
    } finally {
      setEnCours(false)
    }
  }

  async function supprimer(photo: string) {
    if (typeof window !== 'undefined' && !window.confirm('Voulez-vous vraiment supprimer cette photo ?')) return
    setErreurs([])
    setSucces(null)
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/photos/${photo}`, { method: 'DELETE', token: jeton })
      setSucces('Photo supprimée.')
      onChange(photos.filter((p) => p !== photo))
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : 'Suppression impossible.'])
    }
  }

  return (
    <section aria-labelledby="titre-photos" className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="bg-nuit-950 bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 px-4 py-5 text-white sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-dore-300 sm:text-base">Présentation du logement</p>
            <h2 id="titre-photos" className="mt-1 text-xl font-bold text-white sm:text-2xl">Galerie photos</h2>
            <p className="mt-1 text-sm text-slate-100 sm:text-base">Mettez en valeur chaque espace de votre bien.</p>
          </div>
          <div className="w-full rounded-2xl border border-dore-300/40 bg-nuit-950/90 px-4 py-3 text-center sm:w-auto sm:min-w-36">
            <p className="text-2xl font-extrabold text-dore-300">{photos.length}<span className="text-base font-semibold text-white">/{PHOTOS_MAX}</span></p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-100 sm:text-sm">Photos ajoutées</p>
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-dore-500 to-dore-300 transition-all" style={{ width: `${Math.min(100, photos.length / PHOTOS_MAX * 100)}%` }} />
        </div>
      </div>
      <div className="p-4 sm:p-7">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-nuit-950 sm:text-base">
        <p className="font-semibold text-nuit-950">Classez les photos par pièce du logement (15 maximum).</p>
        <p className="mt-1 text-slate-800">Dans la fenêtre de fichiers, maintenez <strong>Ctrl</strong> (ou <strong>Cmd</strong> sur Mac) pour sélectionner plusieurs images, puis validez. Vous pouvez modifier la catégorie de chaque photo après son envoi. Jusqu’à 15 photos peuvent être ajoutées pour une annonce.</p>
        <label htmlFor="categorie-nouvelles-photos" className="mt-3 block font-semibold text-nuit-950">Catégorie des prochaines photos</label>
        <select id="categorie-nouvelles-photos" value={piece} onChange={(e) => setPiece(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-medium text-slate-900">
          <option value="FACADE">Façade</option><option value="SALON">Salon / séjour</option><option value="CHAMBRE">Chambre</option><option value="CUISINE">Cuisine</option><option value="SALLE_DE_BAIN">Salle de bain</option><option value="TOILETTES">Toilettes</option><option value="BALCON_TERRASSE">Balcon / terrasse</option><option value="JARDIN_COUR">Jardin / cour</option><option value="PISCINE">Piscine</option><option value="AUTRE">Autre</option>
        </select>
      </div>

      {succes && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {succes}
        </p>
      )}
      {erreurs.length > 0 && (
        <ul role="alert" className="mt-4 space-y-1 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <li key={photo} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg">
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                <img src={`${urlPhoto(annonceId, photo)}${versions[photo] ? `?v=${versions[photo]}` : ''}`} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full border border-white/30 bg-nuit-950 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-dore-300">Photo {i + 1}</span>
                {i === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-dore-300 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-nuit-950">Couverture</span>}
              </div>
              <label className="mt-3 block text-sm font-semibold leading-5 text-nuit-950 sm:text-base">Pièce associée
                <select aria-label={`Pièce de la photo ${i + 1}`} value={categories[photo] ?? "AUTRE"} onChange={(e) => void classer(photo, e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-300/40 sm:text-base">
                  <option value="FACADE">Façade</option><option value="SALON">Salon / séjour</option><option value="CHAMBRE">Chambre</option><option value="CUISINE">Cuisine</option><option value="SALLE_DE_BAIN">Salle de bain</option><option value="TOILETTES">Toilettes</option><option value="BALCON_TERRASSE">Balcon / terrasse</option><option value="JARDIN_COUR">Jardin / cour</option><option value="PISCINE">Piscine</option><option value="AUTRE">Autre</option>
                </select>
              </label>
              <div className="mt-2 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" disabled={enCours || i === 0} onClick={() => void deplacer(i, -1)}
                    aria-label={`Déplacer la photo ${i + 1} vers le début`}
                    className="min-h-11 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-base font-bold text-nuit-950 transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40">↑</button>
                  <button type="button" disabled={enCours || i === photos.length - 1} onClick={() => void deplacer(i, 1)}
                    aria-label={`Déplacer la photo ${i + 1} vers la fin`}
                    className="min-h-11 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-base font-bold text-nuit-950 transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40">↓</button>
                </div>
                <label className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-nuit-950 transition hover:border-nuit-800 hover:bg-slate-100">
                  Remplacer
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={enCours}
                    aria-label={`Remplacer la photo ${i + 1}`}
                    onChange={(e) => { void remplacer(photo, e.target.files?.[0]); e.target.value = '' }}
                    className="sr-only" />
                </label>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => supprimer(photo)}
                  aria-label={`Supprimer la photo ${i + 1}`}
                  className="min-h-11 w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900 transition hover:border-rose-400 hover:bg-rose-100 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
              {i > 0 && (
                <button type="button" disabled={enCours} onClick={() => void definirPrincipale(i)}
                  className="mt-1.5 min-h-10 w-full rounded-xl border border-amber-400 bg-amber-50 px-2 py-1.5 text-xs font-bold text-nuit-950 hover:bg-amber-100 disabled:opacity-50">
                  Définir comme photo principale
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {photos.length < PHOTOS_MAX && (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 p-4 sm:p-5">
          <label htmlFor="ajout-photos" className="mb-1 block text-base font-bold text-nuit-950">Ajouter des photos à votre galerie</label>
          <p className="mb-3 text-sm leading-5 text-slate-700 sm:text-base">Sélectionnez plusieurs images à la fois. Choisissez d’abord la catégorie ci-dessus pour classer automatiquement les nouvelles photos.</p>
          <input
            ref={champ}
            id="ajout-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={enCours}
            onChange={(e) => void ajouter(e.target.files)}
            className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-nuit-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-nuit-800 sm:text-base"
          />
          {apercusEnCours.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {apercusEnCours.map((url, idx) => (
                <img key={url} src={url} alt={`Aperçu ${idx + 1}`} className="h-16 w-20 rounded-lg border border-slate-300 object-cover opacity-80" />
              ))}
            </div>
          )}
          {enCours && <p role="status" className="mt-2 text-sm font-semibold text-nuit-900 sm:text-base">Envoi en cours…</p>}
        </div>
      )}
      </div>
    </section>
  )
}
