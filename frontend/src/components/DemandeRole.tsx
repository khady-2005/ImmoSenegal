import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, appelApi, urlApi } from '../api'
import { useAuth } from '../auth'

interface MaDemandeDto {
  id: string
  roleDemande: string
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE'
  creeLe: string
  decideLe: string | null
  decideParNom: string | null
  motifDecision: string | null
  aJustificatif: boolean
  justificatifNom: string | null
}

/** Un Client demande à devenir Propriétaire (avec justificatif obligatoire) ou Agent. */
export default function DemandeRole() {
  const { jeton } = useAuth()
  const [role, setRole] = useState('PROPRIETAIRE')
  const [justificatif, setJustificatif] = useState<File | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [demandeActuelle, setDemandeActuelle] = useState<MaDemandeDto | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!jeton) return
    appelApi<MaDemandeDto | null>('/api/auth/role-requests/ma-demande', { token: jeton })
      .then((d) => { if (d) setDemandeActuelle(d) })
      .catch(() => undefined)
  }, [jeton])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    if (role === 'PROPRIETAIRE' && !justificatif) {
      setErreur('Veuillez joindre un justificatif (PDF, JPG, PNG ou WebP).')
      return
    }
    setEnvoi(true)
    setErreur(null)
    try {
      const form = new FormData()
      form.append('role', role)
      if (justificatif) form.append('justificatif', justificatif)
      const cree = await appelApi<MaDemandeDto>('/api/auth/role-requests', {
        method: 'POST',
        body: form,
        token: jeton,
      })
      setDemandeActuelle(cree)
      setJustificatif(null)
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Une erreur inattendue est survenue.')
    } finally {
      setEnvoi(false)
    }
  }

  async function voirJustificatif(demandeId: string) {
    try {
      const res = await fetch(urlApi(`/api/auth/role-requests/${demandeId}/justificatif`), {
        headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Justificatif inaccessible.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible d’ouvrir le justificatif.')
    }
  }

  return (
    <section aria-labelledby="demande-role" className="mt-6 rounded-2xl bg-white p-5 shadow">
      <h2 id="demande-role" className="text-lg font-semibold">Devenir propriétaire ou agent</h2>
      <p className="mt-1 text-sm text-slate-600">
        Tout compte démarre comme Client. Pour obtenir l’espace Propriétaire et publier vos biens, déposez votre demande avec un justificatif (pièce d’identité ou titre de propriété). Elle sera examinée par l’administrateur ou le responsable d’ImmoSénégal.
      </p>

      {demandeActuelle && demandeActuelle.statut === 'EN_ATTENTE' ? (
        <div role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Demande en attente de validation ({demandeActuelle.roleDemande})</p>
          <p className="mt-1 text-xs">Envoyée le {new Date(demandeActuelle.creeLe).toLocaleString('fr-FR')}.</p>
          {demandeActuelle.aJustificatif && (
            <button type="button" onClick={() => void voirJustificatif(demandeActuelle.id)} className="mt-2 text-xs font-bold underline">
              Voir mon justificatif ({demandeActuelle.justificatifNom ?? 'document'})
            </button>
          )}
        </div>
      ) : (
        <>
          {demandeActuelle && (
            <div role="status" className={`mt-3 rounded-lg p-3 text-sm ${demandeActuelle.statut === 'APPROUVEE' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
              <p className="font-semibold">
                Dernière demande ({demandeActuelle.roleDemande}) : {demandeActuelle.statut === 'APPROUVEE' ? 'Approuvée' : 'Refusée'}
              </p>
              {demandeActuelle.decideLe && (
                <p className="mt-1 text-xs">
                  Décidée le {new Date(demandeActuelle.decideLe).toLocaleString('fr-FR')}
                  {demandeActuelle.decideParNom ? ` par ${demandeActuelle.decideParNom}` : ''}.
                </p>
              )}
              {demandeActuelle.motifDecision && <p className="mt-1 text-xs">Motif : {demandeActuelle.motifDecision}</p>}
            </div>
          )}

          <form onSubmit={envoyer} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="role-demande" className="mb-1 block text-sm font-medium text-slate-700">Rôle souhaité</label>
              <select id="role-demande" value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                <option value="PROPRIETAIRE">Propriétaire</option>
                <option value="AGENT">Agent immobilier (rejoindre une agence ensuite)</option>
              </select>
            </div>
            <div>
              <label htmlFor="justificatif-demande" className="mb-1 block text-sm font-medium text-slate-700">
                Justificatif {role === 'PROPRIETAIRE' ? '(obligatoire — PDF, JPG, PNG, WebP)' : '(facultatif)'}
              </label>
              <input
                id="justificatif-demande"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setJustificatif(e.target.files?.[0] ?? null)}
                className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" disabled={envoi} className="rounded-lg bg-emeraude-600 px-4 py-2.5 font-semibold text-white hover:bg-emeraude-700 disabled:opacity-60">
              {envoi ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </form>
        </>
      )}
      {erreur && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    </section>
  )
}
