import { useEffect, useRef, useState } from 'react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

interface Props { annonceId: string }

export default function GestionVideo({ annonceId }: Props) {
  const { jeton } = useAuth()
  const champ = useRef<HTMLInputElement>(null)
  const [disponible, setDisponible] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function actualiser() {
    try {
      const r = await appelApi<{ disponible: boolean }>(`/api/annonces/${annonceId}/video/info`)
      setDisponible(r.disponible)
    } catch {
      setDisponible(false)
    }
  }

  useEffect(() => { void actualiser() }, [annonceId])

  async function envoyer(fichier: File | undefined) {
    if (!fichier) return
    setErreur('')
    if (fichier.size > 30 * 1024 * 1024) {
      setErreur('La vidéo dépasse 30 Mo.')
      if (champ.current) champ.current.value = ''
      return
    }
    const donnees = new FormData()
    donnees.append('fichier', fichier)
    setEnCours(true)
    try {
      await appelApi<{ id: string }>(`/api/annonces/${annonceId}/video`, {
        method: 'POST', body: donnees, token: jeton,
      })
      setDisponible(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Envoi de la vidéo impossible.')
    } finally {
      setEnCours(false)
      if (champ.current) champ.current.value = ''
    }
  }

  async function supprimer() {
    setErreur('')
    setEnCours(true)
    try {
      await appelApi<void>(`/api/annonces/${annonceId}/video`, { method: 'DELETE', token: jeton })
      setDisponible(false)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Suppression impossible.')
    } finally { setEnCours(false) }
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow" aria-labelledby="titre-video-annonce">
      <h2 id="titre-video-annonce" className="text-lg font-semibold">Vidéo de présentation (facultative)</h2>
      <p className="mt-1 text-sm text-slate-600">Ajoutez une courte visite vidéo pour montrer les pièces, la circulation et les extérieurs. Formats MP4 ou WebM, 30 Mo maximum. Une seule vidéo par annonce ; un nouvel envoi remplace l'ancienne.</p>
      {disponible && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <span>Une vidéo est enregistrée pour cette annonce.</span>
          <button type="button" onClick={() => void supprimer()} disabled={enCours} className="font-semibold underline disabled:opacity-50">Supprimer</button>
        </div>
      )}
      <label htmlFor={`video-annonce-${annonceId}`} className="mt-4 mb-1 block text-sm font-medium text-slate-700">
        {disponible ? 'Remplacer la vidéo' : 'Choisir une vidéo'}
      </label>
      <input ref={champ} id={`video-annonce-${annonceId}`} type="file" accept="video/mp4,video/webm,.mp4,.webm"
        disabled={enCours} onChange={e => void envoyer(e.target.files?.[0])} className="block w-full text-sm" />
      {enCours && <p role="status" className="mt-2 text-sm text-slate-500">Envoi en cours…</p>}
      {erreur && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    </section>
  )
}
