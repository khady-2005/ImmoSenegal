import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import { useFavoris } from '../favoris'
import type { Annonce } from '../types'
import AnnonceCard from '../components/AnnonceCard'

export default function MesFavoris() {
  const { jeton } = useAuth()
  const { ids } = useFavoris()
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    setChargement(true)
    setErreur('')
    Promise.all(ids.map(id => appelApi<Annonce>(`/api/annonces/${id}`, { token: jeton })))
      .then(resultats => { if (!annule) setAnnonces(resultats.filter(a => a.statut === 'PUBLIEE')) })
      .catch(e => { if (!annule) setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos favoris.') })
      .finally(() => { if (!annule) setChargement(false) })
    return () => { annule = true }
  }, [ids, jeton])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-dore-600">Espace personnel</p>
        <h1 className="mt-2 flex items-center gap-3 font-titre text-3xl font-semibold text-nuit-900"><Heart className="h-7 w-7 text-rose-600" />Mes favoris</h1>
        <p className="mt-2 text-slate-600">Retrouvez ici les annonces que vous avez enregistrées.</p>
      </div>
      {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement de vos favoris…</p>}
      {!chargement && !erreur && annonces.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-3 text-lg font-semibold text-nuit-900">Aucun favori pour le moment</h2>
          <p className="mt-1 text-sm text-slate-600">Dans le catalogue, appuyez sur le cœur d’une annonce pour la retrouver ici.</p>
          <Link to="/catalogue" className="mt-5 inline-flex rounded-full bg-nuit-900 px-5 py-2.5 font-semibold text-white">Découvrir les annonces</Link>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {annonces.map(annonce => <AnnonceCard key={annonce.id} annonce={annonce} />)}
      </div>
    </main>
  )
}
