import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Mouvement = {
  id: string
  type: 'RECETTE' | 'DEPENSE'
  libelle: string
  description: string | null
  montant: number
  dateMouvement: string
  justificatifUrl: string | null
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REFUSE'
  motifRefus: string | null
  creePar: string
  traitePar: string | null
}

type Props = { agenceId: string; fonction: string }

export default function CaisseAgence({ agenceId, fonction }: Props) {
  const { jeton } = useAuth()
  const [lignes, setLignes] = useState<Mouvement[]>([])
  const [type, setType] = useState<'RECETTE' | 'DEPENSE'>('RECETTE')
  const [libelle, setLibelle] = useState('')
  const [description, setDescription] = useState('')
  const [montant, setMontant] = useState('')
  const [dateMouvement, setDateMouvement] = useState(new Date().toISOString().slice(0, 10))
  const [justificatifUrl, setJustificatifUrl] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    try {
      const resultat = await appelApi<Mouvement[]>(`/api/agence/${agenceId}/caisse`, { token: jeton })
      setLignes(resultat)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger la caisse.')
    }
  }, [jeton, agenceId])

  useEffect(() => { void charger() }, [charger])

  const total = useMemo(
    () => lignes.filter(x => x.statut === 'VALIDE').reduce(
      (s, x) => s + (x.type === 'RECETTE' ? Number(x.montant) : -Number(x.montant)), 0,
    ),
    [lignes],
  )

  const soumettre = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/caisse`, {
        method: 'POST',
        token: jeton,
        body: { type, libelle, description, montant: Number(montant), dateMouvement, justificatifUrl },
      })
      setLibelle('')
      setDescription('')
      setMontant('')
      setJustificatifUrl('')
      setMessage('Mouvement enregistré et transmis au Responsable pour validation.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer le mouvement.')
    } finally {
      setEnvoi(false)
    }
  }

  const decider = async (id: string, valider: boolean, motif?: string) => {
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/caisse/${id}/decision`, {
        method: 'PATCH',
        token: jeton,
        body: { valider, motif: motif ?? null },
      })
      setMessage(valider ? 'Mouvement validé.' : 'Mouvement refusé.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter le mouvement.')
    } finally {
      setEnvoi(false)
    }
  }

  const refuser = (id: string) => {
    const motif = window.prompt('Indiquez le motif du refus :')
    if (motif?.trim()) void decider(id, false, motif.trim())
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Caisse de l’agence</p>
          <h2 className="mt-1 text-xl font-bold text-nuit-900">Recettes et dépenses</h2>
          <p className="mt-1 text-sm text-slate-600">Les mouvements ne sont comptabilisés dans le solde qu’après validation du Responsable.</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Solde validé</p>
          <p className="text-xl font-bold text-nuit-900">{total.toLocaleString('fr-FR')} FCFA</p>
        </div>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

      {(fonction === 'CAISSIER' || fonction === 'RESPONSABLE') && (
        <form onSubmit={soumettre} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Type
            <select value={type} onChange={e => setType(e.target.value as 'RECETTE' | 'DEPENSE')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="RECETTE">Recette</option>
              <option value="DEPENSE">Dépense</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Libellé
            <input required maxLength={140} value={libelle} onChange={e => setLibelle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Montant (FCFA)
            <input required type="number" min="0.01" step="0.01" value={montant} onChange={e => setMontant(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Date
            <input required type="date" value={dateMouvement} onChange={e => setDateMouvement(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <input maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Lien du justificatif (facultatif)
            <input type="url" maxLength={500} value={justificatifUrl} onChange={e => setJustificatifUrl(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 p-2" />
          </label>
          <div className="sm:col-span-2">
            <button disabled={envoi} className="rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {envoi ? 'Enregistrement…' : 'Enregistrer le mouvement'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Mouvement</th><th className="py-2 pr-3">Montant</th><th className="py-2 pr-3">Statut</th><th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(x => (
              <tr key={x.id} className="border-b border-slate-100">
                <td className="py-3 pr-3">{new Date(x.dateMouvement).toLocaleDateString('fr-FR')}</td>
                <td className="py-3 pr-3">
                  <span className="font-semibold">{x.libelle}</span>
                  <span className="block text-xs text-slate-500">{x.type === 'RECETTE' ? 'Recette' : 'Dépense'} · {x.creePar}</span>
                  {x.justificatifUrl && <a href={x.justificatifUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">Justificatif</a>}
                  {x.motifRefus && <span className="block text-xs text-red-700">Motif : {x.motifRefus}</span>}
                </td>
                <td className="py-3 pr-3 font-semibold">{Number(x.montant).toLocaleString('fr-FR')} FCFA</td>
                <td className="py-3 pr-3">{x.statut === 'VALIDE' ? 'Validé' : x.statut === 'REFUSE' ? 'Refusé' : 'En attente'}</td>
                <td className="py-3">
                  {fonction === 'RESPONSABLE' && x.statut === 'EN_ATTENTE' ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={envoi} onClick={() => void decider(x.id, true)} className="rounded-full bg-nuit-900 px-3 py-1.5 text-xs font-semibold text-white">Valider</button>
                      <button type="button" disabled={envoi} onClick={() => refuser(x.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Refuser</button>
                    </div>
                  ) : <span className="text-xs text-slate-500">{x.traitePar ?? '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lignes.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun mouvement enregistré.</p>}
      </div>
    </section>
  )
}
