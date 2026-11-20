import { useCallback, useEffect, useState } from 'react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type Demande = {
  id: string; forfait: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL'; montant: number;
  modePaiement: string; referencePaiement: string | null; note: string | null; creeLe: string
}
const monnaie = (n: number) => Number(n).toLocaleString('fr-FR') + ' FCFA'

export default function AdminAbonnements() {
  const { jeton, utilisateur } = useAuth()
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [motifs, setMotifs] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)
  const [action, setAction] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    try { setDemandes(await appelApi<Demande[]>('/api/abonnements/admin/en-attente', { token: jeton })); setErreur('') }
    catch (e) { setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.') }
    finally { setChargement(false) }
  }, [jeton])
  useEffect(() => { if (utilisateur?.role === 'ADMIN') void charger() }, [charger, utilisateur?.role])

  async function decider(id: string, accepter: boolean) {
    setAction(id); setErreur(''); setMessage('')
    try {
      await appelApi('/api/abonnements/admin/' + id + '/decision', {
        method: 'POST', token: jeton, body: { accepter, motif: motifs[id]?.trim() || null },
      })
      setMessage(accepter ? 'Abonnement activé.' : 'Demande refusée.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Décision impossible.') }
    finally { setAction(null) }
  }

  if (utilisateur?.role !== 'ADMIN') return <main className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Accès réservé à l’administration.</p></main>

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-800">Administration</p>
    <h1 className="mt-2 text-3xl font-bold text-nuit-900">Validation des abonnements</h1>
    <p className="mt-2 text-sm text-slate-600">Vérifiez le paiement auprès du canal officiel avant d’activer un forfait.</p>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
    {chargement ? <p className="mt-6 text-sm text-slate-500">Chargement…</p> : demandes.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Aucune demande d’abonnement en attente.</p> :
      <div className="mt-6 space-y-4">{demandes.map(d => <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-nuit-900">{d.forfait} · {monnaie(d.montant)}</h2><p className="mt-1 text-xs text-slate-500">Demande du {new Date(d.creeLe).toLocaleString('fr-FR')}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">À vérifier</span></div>
        <p className="mt-3 text-sm text-slate-700">Mode déclaré : <strong>{d.modePaiement}</strong></p>
        <p className="mt-1 text-sm text-slate-700">Référence : <strong>{d.referencePaiement || 'Non renseignée'}</strong></p>
        {d.note && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{d.note}</p>}
        <label className="mt-4 block text-xs font-semibold text-slate-600">Motif ou précision (facultatif)<textarea value={motifs[d.id] || ''} onChange={e => setMotifs(s => ({ ...s, [d.id]: e.target.value }))} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal"/></label>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={action === d.id} onClick={() => void decider(d.id, true)} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Valider et activer</button><button type="button" disabled={action === d.id} onClick={() => void decider(d.id, false)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Refuser</button></div>
      </article>)}</div>}
  </main>
}
