import { useCallback, useEffect, useState } from 'react'
import { appelApi, ApiError } from '../api'
import type { Annonce, PagePaginee } from '../types'

export type EtatListe =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | { statut: 'ok'; page: PagePaginee<Annonce> }

/** Charge une page d'annonces et la rafraîchit quand l'utilisateur revient au catalogue. */
export function useAnnonces(requete: string) {
  const [etat, setEtat] = useState<EtatListe>({ statut: 'chargement' })
  const [essai, setEssai] = useState(0)

  const charger = useCallback((annule: () => boolean) => {
    appelApi<PagePaginee<Annonce>>(`/api/annonces?${requete}`)
      .then((page) => {
        if (!annule()) setEtat({ statut: 'ok', page })
      })
      .catch((e: unknown) => {
        if (!annule()) setEtat({ statut: 'erreur', message: e instanceof ApiError ? e.message : 'Une erreur est survenue.' })
      })
  }, [requete])

  useEffect(() => {
    let annule = false
    setEtat({ statut: 'chargement' })
    charger(() => annule)
    const actualiserAuRetour = () => {
      if (document.visibilityState === 'visible') charger(() => annule)
    }
    window.addEventListener('focus', actualiserAuRetour)
    document.addEventListener('visibilitychange', actualiserAuRetour)
    return () => {
      annule = true
      window.removeEventListener('focus', actualiserAuRetour)
      document.removeEventListener('visibilitychange', actualiserAuRetour)
    }
  }, [charger, essai])

  return { etat, reessayer: () => setEssai((n) => n + 1) }
}
