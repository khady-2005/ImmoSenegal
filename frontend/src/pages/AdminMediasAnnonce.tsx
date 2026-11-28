import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import GestionPhotos from '../components/GestionPhotos'
import GestionVideo from '../components/GestionVideo'
import type { Annonce } from '../types'

export default function AdminMediasAnnonce() {
  const { id = '' } = useParams()
  const { jeton } = useAuth()
  const [annonce, setAnnonce] = useState<Annonce | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    if (!jeton || !id) return
    setChargement(true)
    appelApi<Annonce>(`/api/annonces/${id}`, { token: jeton })
      .then((a) => {
        setAnnonce(a)
        setPhotos(a.photos ?? [])
        setErreur(null)
      })
      .catch((e) => setErreur(e instanceof ApiError ? e.message : 'Annonce introuvable.'))
      .finally(() => setChargement(false))
  }, [id, jeton])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/photos" className="inline-flex items-center gap-2 text-sm font-bold text-nuit-950 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à la gestion des photos
        </Link>
        <Link to="/admin/annonces" className="text-sm font-semibold text-nuit-900 hover:underline">
          Modération des annonces
        </Link>
      </div>

      {chargement && <p role="status" className="mt-6 text-sm text-slate-600">Chargement de l’annonce…</p>}
      {erreur && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}

      {annonce && (
        <>
          <header className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                  {annonce.publieeParAgence ? 'Bien de l’agence ImmoSénégal' : 'Bien propriétaire'}
                </p>
                <h1 className="mt-1 font-titre text-2xl font-bold text-nuit-950 sm:text-3xl">{annonce.titre}</h1>
                <p className="mt-1 text-sm text-slate-600">{annonce.quartier}, {annonce.ville} · Propriétaire : {annonce.proprietaire.nomComplet}</p>
              </div>
              <Link to={`/annonces/${annonce.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-nuit-950 hover:bg-slate-50">
                Voir la fiche
              </Link>
            </div>
          </header>

          <GestionPhotos annonceId={annonce.id} photos={photos} onChange={setPhotos} />
          <GestionVideo annonceId={annonce.id} />
        </>
      )}
    </main>
  )
}
