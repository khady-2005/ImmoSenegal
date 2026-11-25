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
  const [enCours, setEnCours] = useState(false)
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
    setEnCours(true)
    const problemes: string[] = []
    let courantes = photos
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
    setEnCours(false)
    if (champ.current) champ.current.value = ''
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

  async function supprimer(photo: string) {
    setErreurs([])
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/photos/${photo}`, { method: 'DELETE', token: jeton })
      onChange(photos.filter((p) => p !== photo))
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : 'Suppression impossible.'])
    }
  }

  return (
    <section aria-labelledby="titre-photos" className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="bg-gradient-to-r from-[#101d35] via-[#172b4d] to-[#243b60] px-5 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8c56f]">Présentation du logement</p>
            <h2 id="titre-photos" className="mt-1 text-2xl font-bold">Galerie photos</h2>
            <p className="mt-1 text-sm text-slate-200">Mettez en valeur chaque espace de votre bien.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur">
            <p className="text-2xl font-extrabold text-[#f2d27f]">{photos.length}<span className="text-sm font-medium text-white">/{PHOTOS_MAX}</span></p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">Photos ajoutées</p>
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-[#d5ad4f] to-[#f5df9c] transition-all" style={{ width: `${Math.min(100, photos.length / PHOTOS_MAX * 100)}%` }} />
        </div>
      </div>
      <div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-[#ead9aa] bg-[#fbf7eb] p-4 text-sm leading-relaxed text-nuit-900">
        <p className="font-semibold">Classez les photos par pièce du logement (15 maximum).</p>
        <p className="mt-1">Dans la fenêtre de fichiers, maintenez <strong>Ctrl</strong> (ou <strong>Cmd</strong> sur Mac) pour sélectionner plusieurs images, puis validez. Vous pouvez modifier la catégorie de chaque photo après son envoi. Jusqu’à 15 photos peuvent être ajoutées pour une annonce.</p>
        <label htmlFor="categorie-nouvelles-photos" className="mt-3 block font-semibold">Catégorie des prochaines photos</label>
        <select id="categorie-nouvelles-photos" value={piece} onChange={(e) => setPiece(e.target.value)} className="mt-1 w-full rounded-lg border border-dore-300 bg-white px-3 py-2 text-sm text-slate-900">
          <option value="FACADE">Façade</option><option value="SALON">Salon / séjour</option><option value="CHAMBRE">Chambre</option><option value="CUISINE">Cuisine</option><option value="SALLE_DE_BAIN">Salle de bain</option><option value="TOILETTES">Toilettes</option><option value="BALCON_TERRASSE">Balcon / terrasse</option><option value="JARDIN_COUR">Jardin / cour</option><option value="PISCINE">Piscine</option><option value="AUTRE">Autre</option>
        </select>
        <p className="mt-2 font-semibold">Ordre conseillé pour présenter un appartement :</p>
        <ol className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <li>1. Façade / couverture</li>
          <li>2. Salon / séjour</li>
          <li>3. Cuisine</li>
          <li>4. Chambre principale</li>
          <li>5. Deuxième chambre</li>
          <li>6. Salle de bain</li>
          <li>7. Balcon / terrasse</li>
          <li>8. Cour / parking / autre pièce</li>
        </ol>
        <p className="mt-2 text-xs text-slate-600">JPEG, PNG ou WebP acceptés. Les images sont automatiquement redimensionnées à 1600 px maximum et compressées avant l'envoi. La première photo devient la couverture. Vous pouvez modifier l'ordre avec les flèches. Les métadonnées privées (GPS, appareil) sont retirées à l'envoi.</p>
      </div>

      {photos.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <li key={photo} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#d6b65e] hover:shadow-lg">
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                <img src={urlPhoto(annonceId, photo)} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-full border border-white/30 bg-[#101d35]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#f2d27f] backdrop-blur">Photo {i + 1}</span>
                {i === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-[#e8c56f] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#18243a]">Couverture</span>}
              </div>
              <label className="mt-2 block text-xs font-semibold text-slate-700">Pièce associée
                <select aria-label={`Pièce de la photo ${i + 1}`} value={categories[photo] ?? "AUTRE"} onChange={(e) => void classer(photo, e.target.value)} className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#c9a64f] focus:bg-white focus:ring-2 focus:ring-[#e8c56f]/30">
                  <option value="FACADE">Façade</option><option value="SALON">Salon / séjour</option><option value="CHAMBRE">Chambre</option><option value="CUISINE">Cuisine</option><option value="SALLE_DE_BAIN">Salle de bain</option><option value="TOILETTES">Toilettes</option><option value="BALCON_TERRASSE">Balcon / terrasse</option><option value="JARDIN_COUR">Jardin / cour</option><option value="PISCINE">Piscine</option><option value="AUTRE">Autre</option>
                </select>
              </label>
              <div className="mt-2 grid grid-cols-[1fr_1fr_1.35fr] gap-1.5">
                <button type="button" disabled={enCours || i === 0} onClick={() => void deplacer(i, -1)}
                  aria-label={`Déplacer la photo ${i + 1} vers le début`}
                  className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-700 transition hover:border-[#c9a64f] hover:bg-[#fbf7eb] disabled:cursor-not-allowed disabled:opacity-35">↑</button>
                <button type="button" disabled={enCours || i === photos.length - 1} onClick={() => void deplacer(i, 1)}
                  aria-label={`Déplacer la photo ${i + 1} vers la fin`}
                  className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-700 transition hover:border-[#c9a64f] hover:bg-[#fbf7eb] disabled:cursor-not-allowed disabled:opacity-35">↓</button>
                <button
                type="button"
                disabled={enCours}
                onClick={() => supprimer(photo)}
                aria-label={`Supprimer la photo ${i + 1}`}
                className="min-h-10 w-full rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Supprimer
              </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {photos.length < PHOTOS_MAX && (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-[#d8c58f] bg-[#fcfaf4] p-5">
          <label htmlFor="ajout-photos" className="mb-1 block text-sm font-bold text-nuit-900">Ajouter des photos à votre galerie</label>
          <p className="mb-3 text-xs leading-5 text-slate-600">Sélectionnez plusieurs images à la fois. Choisissez d’abord la catégorie ci-dessus pour classer automatiquement les nouvelles photos.</p>
          <input
            ref={champ}
            id="ajout-photos"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            disabled={enCours}
            onChange={(e) => void ajouter(e.target.files)}
            className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#172b4d] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#243b60]"
          />
          {enCours && <p role="status" className="mt-2 text-sm text-slate-500">Envoi en cours…</p>}
        </div>
      )}

      {erreurs.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      </div>
    </section>
  )
}
