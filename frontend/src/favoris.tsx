import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { appelApi } from './api'
import { useAuth } from './auth'

interface ContexteFavoris {
  ids: string[]
  contient: (id: string) => boolean
  basculer: (id: string) => Promise<void>
  chargement: boolean
}
const Contexte = createContext<ContexteFavoris | null>(null)

export function FavorisProvider({ children }: { children: ReactNode }) {
  const { utilisateur, jeton } = useAuth()
  const [ids, setIds] = useState<string[]>([])
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    let annule = false
    if (utilisateur?.role !== 'CLIENT' || !jeton) {
      setIds([])
      setChargement(false)
      return
    }
    setChargement(true)
    appelApi<string[]>('/api/favoris', { token: jeton })
      .then(resultat => { if (!annule) setIds(resultat) })
      .catch(() => { if (!annule) setIds([]) })
      .finally(() => { if (!annule) setChargement(false) })
    return () => { annule = true }
  }, [utilisateur?.id, utilisateur?.role, jeton])

  const basculer = useCallback(async (id: string) => {
    if (!jeton || utilisateur?.role !== 'CLIENT') return
    const dejaPresent = ids.includes(id)
    if (dejaPresent) {
      await appelApi<void>(`/api/favoris/${id}`, { method: 'DELETE', token: jeton })
      setIds(actuels => actuels.filter(x => x !== id))
    } else {
      await appelApi<void>(`/api/favoris/${id}`, { method: 'POST', token: jeton })
      setIds(actuels => actuels.includes(id) ? actuels : [...actuels, id])
    }
  }, [ids, jeton, utilisateur?.role])

  const valeur = useMemo(() => ({ ids, contient: (id: string) => ids.includes(id), basculer, chargement }), [ids, basculer, chargement])
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useFavoris() {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useFavoris doit être utilisé dans FavorisProvider.')
  return contexte
}
