import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { appelApi } from '../api'
import { useAuth } from '../auth'

/** Vérifie côté API qu'un compte possède un espace ou une invitation d'agence. */
export default function RequireAgenceAccess({ children }: { children: ReactNode }) {
  const { utilisateur, jeton } = useAuth()
  const [autorise, setAutorise] = useState<boolean | null>(null)

  useEffect(() => {
    let annule = false
    if (utilisateur?.role === 'ADMIN') {
      setAutorise(true)
      return () => { annule = true }
    }
    setAutorise(null)
    Promise.all([
      appelApi<unknown[]>('/api/agence/mes-espaces', { token: jeton }),
      appelApi<unknown[]>('/api/agence/mes-invitations', { token: jeton }),
    ]).then(([espaces, invitations]) => {
      if (!annule) setAutorise(espaces.length > 0 || invitations.length > 0)
    }).catch(() => {
      if (!annule) setAutorise(false)
    })
    return () => { annule = true }
  }, [utilisateur?.role, jeton])

  if (autorise === null) return <p role="status" className="p-8 text-center text-slate-500">Vérification de vos accès professionnels…</p>
  if (!autorise) return <Navigate to="/tableau-de-bord" replace />
  return <>{children}</>
}
