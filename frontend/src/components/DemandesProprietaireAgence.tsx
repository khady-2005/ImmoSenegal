import { useCallback, useEffect, useState } from 'react'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'

interface DemandeDto {
  id: string
  email: string
  nomComplet: string
  roleDemande: string
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE'
  creeLe: string
  aJustificatif: boolean
  justificatifNom: string | null
}

/** Section réservée au responsable de l'agence ImmoSénégal (INTERNE) pour valider les demandes de statut Propriétaire. */
export default function DemandesProprietaireAgence() {
  const { jeton } = useAuth()
  const [demandes, setDemandes] = useState<DemandeDto[]>([])
  const [autorise, setAutorise] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    try {
      const liste = await appelApi<DemandeDto[]>('/api/auth/role-requests/a-traiter?statut=EN_ATTENTE', { token: jeton })
      setDemandes(liste)
      setAutorise(true)
    } catch {
      setAutorise(false)
    }
  }, [jeton])

  useEffect(() => {
    void charger()
  }, [charger])

  if (!autorise) return null

  async function decider(id: string, action: 'approve' | 'reject') {
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/auth/role-requests/${id}/${action}`, { method: 'POST', token: jeton })
      setMessage(action === 'approve' ? 'Demande approuvée.' : 'Demande refusée.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible.')
    }
  }

  async function voirJustificatif(id: string) {
    try {
      const res = await fetch(urlApi(`/api/auth/role-requests/${id}/justificatif`), {
        headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Justificatif inaccessible.')
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible d’ouvrir le justificatif.')
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-nuit-900">Demandes pour devenir propriétaire</h2>
      <p className="mt-1 text-sm text-slate-600">
        En tant que responsable d’ImmoSénégal, vous pouvez examiner les justificatifs privés et approuver ou refuser chaque demande en attente.
      </p>
      {erreur && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      {demandes.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune demande en attente.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {demandes.map((d) => (
            <li key={d.id} className="py-3">
              <p className="font-semibold text-nuit-900">{d.nomComplet} <span className="text-xs font-normal text-slate-500">({d.email})</span></p>
              <p className="text-xs text-slate-600">Rôle demandé : {d.roleDemande} · {new Date(d.creeLe).toLocaleString('fr-FR')}</p>
              {d.aJustificatif && (
                <button type="button" onClick={() => void voirJustificatif(d.id)} className="mt-1.5 text-xs font-bold text-nuit-900 underline">
                  Voir le justificatif privé ({d.justificatifNom ?? 'document'})
                </button>
              )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void decider(d.id, 'approve')} className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800">Approuver</button>
                <button type="button" onClick={() => void decider(d.id, 'reject')} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Refuser</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
