import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { useFavoris } from '../favoris'
import { ApiError } from '../api'

export default function BoutonFavori({ annonceId }: { annonceId: string }) {
  const { utilisateur } = useAuth()
  const { contient, basculer } = useFavoris()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  if (utilisateur?.role !== 'CLIENT') return null

  async function cliquer(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setEnCours(true)
    setErreur('')
    try {
      await basculer(annonceId)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier vos favoris.')
    } finally {
      setEnCours(false)
    }
  }

  const actif = contient(annonceId)
  return (
    <div className="absolute right-3 top-3 z-20">
      <button type="button" onClick={cliquer} disabled={enCours} aria-pressed={actif}
        aria-label={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        title={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-nuit-900 shadow-md transition hover:scale-105 hover:bg-white disabled:opacity-60">
        <Heart aria-hidden className={`h-5 w-5 ${actif ? 'fill-rose-500 text-rose-600' : ''}`} />
      </button>
      {erreur && <p role="alert" className="absolute right-0 top-12 w-48 rounded-lg bg-white p-2 text-xs text-red-700 shadow-lg">{erreur}</p>}
    </div>
  )
}
