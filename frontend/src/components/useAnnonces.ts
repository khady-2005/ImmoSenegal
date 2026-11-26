import { useCallback, useEffect, useState } from 'react'
import { appelApi, ApiError } from '../api'
import type { Annonce, PagePaginee } from '../types'

export type EtatListe =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | { statut: 'ok'; page: PagePaginee<Annonce> }

/** Charge une page d'annonces et la rafraîchit lorsque l'onglet redevient visible. */
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
    // `focus` et `visibilitychange` se déclenchent souvent ensemble : un seul
    // écouteur évite de lancer deux requêtes identiques à chaque retour.
    document.addEventListener('visibilitychange', actualiserAuRetour)
    return () => {
      annule = true
      document.removeEventListener('visibilitychange', actualiserAuRetour)
    }
  }, [charger, essai])

  return { etat, reessayer: () => setEssai((n) => n + 1) }
}
