import { useEffect, useState } from 'react'
import { appelApi, urlApi } from '../api'

export default function LecteurVideoAnnonce({ annonceId }: { annonceId: string }) {
  const [disponible, setDisponible] = useState(false)
  useEffect(() => {
    let actif = true
    appelApi<{ disponible: boolean }>(`/api/annonces/${annonceId}/video/info`)
      .then(r => { if (actif) setDisponible(r.disponible) })
      .catch(() => { if (actif) setDisponible(false) })
    return () => { actif = false }
  }, [annonceId])

  if (!disponible) return null
  return (
    <section className="mt-10" aria-labelledby="titre-visite-video">
      <h2 id="titre-visite-video" className="font-titre text-2xl font-medium text-nuit-900">Visite vidéo du logement</h2>
      <video className="mt-4 max-h-[32rem] w-full rounded-2xl bg-black shadow-carte" controls preload="none">
        <source src={urlApi(`/api/annonces/${annonceId}/video`)} />
        Votre navigateur ne prend pas en charge la lecture vidéo.
      </video>
    </section>
  )
}
