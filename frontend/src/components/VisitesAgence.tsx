import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, RefreshCw, Users, Check, X, Clock3 } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import type { DemandeVisite } from '../types'

const libelles: Record<DemandeVisite['statut'], string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  PROPOSEE: 'Nouveau créneau proposé',
  ANNULEE: 'Annulée',
}

function dateLisible(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function VisitesAgence({ agenceId }: { agenceId: string }) {
  const { jeton } = useAuth()
  const [visites, setVisites] = useState<DemandeVisite[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [dates, setDates] = useState<Record<string, string>>({})
  const [reponses, setReponses] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setErreur('')
    try {
      const donnees = await appelApi<DemandeVisite[]>(`/api/agence/${agenceId}/visites`, { token: jeton })
      setVisites(donnees)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les visites de l’agence.')
    } finally {
      setChargement(false)
    }
  }, [jeton, agenceId])

  useEffect(() => { void charger() }, [charger])

  const traiter = async (visite: DemandeVisite, action: 'ACCEPTEE' | 'REFUSEE' | 'PROPOSEE') => {
    if (!jeton) return
    if (action === 'PROPOSEE' && (!dates[visite.id] || new Date(dates[visite.id]) <= new Date())) {
      setErreur('Choisissez un nouveau créneau situé dans le futur.')
      return
    }
    setActionEnCours(visite.id)
    setErreur('')
    setMessage('')
    try {
      await appelApi(`/api/visites/${visite.id}/decision`, {
        method: 'POST',
        token: jeton,
        body: {
          action,
          nouvelleDate: action === 'PROPOSEE' ? dates[visite.id] : null,
          reponse: reponses[visite.id]?.trim() || null,
        },
      })
      setMessage(action === 'ACCEPTEE' ? 'Visite acceptée.' : action === 'REFUSEE' ? 'Demande refusée.' : 'Nouveau créneau proposé au client.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter cette demande.')
    } finally {
      setActionEnCours(null)
    }
  }

  const enAttente = visites.filter(v => v.statut === 'EN_ATTENTE').length
  const aVenir = visites.filter(v => ['ACCEPTEE', 'PROPOSEE'].includes(v.statut)).length

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-nuit-800"/><h2 className="text-xl font-bold text-nuit-900">Gestion des visites de l’agence</h2></div>
        <p className="mt-1 text-sm text-slate-600">Traitez les demandes concernant les biens confiés à l’agence par mandat accepté.</p>
      </div>
      <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`}/>Actualiser</button>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Demandes suivies</p><p className="mt-1 text-2xl font-bold text-nuit-900">{visites.length}</p></div>
      <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-800">En attente</p><p className="mt-1 text-2xl font-bold text-nuit-900">{enAttente}</p></div>
      <div className="col-span-2 rounded-xl bg-blue-50 p-3 sm:col-span-1"><p className="text-xs text-blue-800">Acceptées ou proposées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{aVenir}</p></div>
    </div>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
    {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement des visites…</p>
      : visites.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center"><Users className="mx-auto h-7 w-7 text-slate-400"/><p className="mt-2 text-sm font-medium text-slate-700">Aucune visite liée à un mandat accepté.</p><p className="mt-1 text-xs text-slate-500">Les demandes apparaîtront ici dès qu’un propriétaire confiera un bien à l’agence.</p></div>
      : <div className="mt-5 space-y-3">{visites.map(v => <article key={v.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-nuit-900">{v.annonceTitre}</h3><p className="mt-1 text-xs text-slate-500">{v.quartier}, {v.ville}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{libelles[v.statut]}</span></div>
        <p className="mt-3 text-sm text-slate-700"><strong>Client :</strong> {v.clientNom}</p>
        <p className="mt-1 text-sm text-slate-600">{v.clientEmail}{v.clientTelephone ? ` · ${v.clientTelephone}` : ''}</p>
        <p className="mt-2 text-sm text-slate-700"><strong>Date demandée :</strong> {dateLisible(v.dateVisite)}</p>
        {v.message && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{v.message}</p>}
        {v.statut === 'EN_ATTENTE' && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="block text-xs font-semibold text-slate-600">Réponse au client (facultatif)
            <textarea value={reponses[v.id] ?? ''} onChange={e => setReponses(s => ({ ...s, [v.id]: e.target.value }))} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal" placeholder="Précisions sur le rendez-vous…"/>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={actionEnCours === v.id} onClick={() => void traiter(v, 'ACCEPTEE')} className="inline-flex items-center gap-1 rounded-full bg-nuit-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4"/>Accepter</button>
            <button type="button" disabled={actionEnCours === v.id} onClick={() => void traiter(v, 'REFUSEE')} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><X className="h-4 w-4"/>Refuser</button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Proposer une autre date
              <input type="datetime-local" value={dates[v.id] ?? ''} onChange={e => setDates(s => ({ ...s, [v.id]: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal"/>
            </label>
            <button type="button" disabled={actionEnCours === v.id || !dates[v.id]} onClick={() => void traiter(v, 'PROPOSEE')} className="mt-5 inline-flex items-center justify-center gap-1 rounded-full border border-nuit-900 px-4 py-2 text-xs font-semibold text-nuit-900 disabled:opacity-50"><Clock3 className="h-4 w-4"/>Proposer ce créneau</button>
          </div>
        </div>}
        {v.statut !== 'EN_ATTENTE' && v.reponseProprietaire && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong>Réponse :</strong> {v.reponseProprietaire}</p>}
      </article>)}</div>}
  </section>
}
