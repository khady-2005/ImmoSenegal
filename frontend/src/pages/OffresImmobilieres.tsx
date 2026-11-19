import { useCallback, useEffect, useState } from 'react'
import { Check, X, HandCoins } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'

type Statut = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'
type Offre = {
  id: string; annonceId: string; annonceTitre: string; ville: string; quartier: string
  acheteurId: string; acheteurNom: string; proprietaireNom: string
  prixAnnonce: number; montantPropose: number; message: string | null
  statut: Statut; reponseProprietaire: string | null; creeLe: string; modifieLe: string
}

const libelles: Record<Statut, string> = { EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée', ANNULEE: 'Annulée' }

export default function OffresImmobilieres() {
  const { utilisateur, jeton } = useAuth()
  const client = utilisateur?.role === 'CLIENT'
  const proprietaire = utilisateur?.role === 'PROPRIETAIRE'
  const [offres, setOffres] = useState<Offre[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [reponses, setReponses] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    try {
      const chemin = client ? '/api/offres/envoyees' : '/api/offres/recues'
      setOffres(await appelApi<Offre[]>(chemin, { token: jeton }))
      setErreur('')
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les offres.') }
    finally { setChargement(false) }
  }, [client, jeton])

  useEffect(() => { void charger() }, [charger])

  async function decider(id: string, accepter: boolean) {
    setActionEnCours(id); setErreur('')
    try {
      await appelApi('/api/offres/' + id + '/decision', {
        method: 'POST', token: jeton, body: { accepter, reponse: reponses[id]?.trim() || null },
      })
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter cette offre.') }
    finally { setActionEnCours(null) }
  }

  async function annuler(id: string) {
    setActionEnCours(id); setErreur('')
    try {
      await appelApi('/api/offres/' + id + '/annuler', { method: 'POST', token: jeton })
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’annuler cette offre.') }
    finally { setActionEnCours(null) }
  }

  if (!client && !proprietaire) return <main className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cet espace est réservé aux clients et propriétaires.</p></main>

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-sm font-semibold uppercase tracking-wider text-emeraude-700">Transactions immobilières</p>
    <h1 className="mt-2 font-titre text-3xl font-semibold text-nuit-900">{client ? 'Mes offres d’achat' : 'Offres reçues'}</h1>
    <p className="mt-2 mb-7 text-slate-600">{client ? 'Suivez les propositions de prix envoyées aux propriétaires.' : 'Consultez les propositions reçues et répondez aux acheteurs.'}</p>
    {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
    {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement des offres…</p>}
    {!chargement && offres.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><HandCoins className="mx-auto h-10 w-10 text-emeraude-700"/><h2 className="mt-3 font-semibold text-nuit-900">Aucune offre pour le moment</h2><p className="mt-1 text-sm text-slate-600">{client ? 'Vos offres envoyées apparaîtront ici.' : 'Les propositions reçues pour vos annonces apparaîtront ici.'}</p></div>}
    <div className="space-y-4">{offres.map(o => <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-nuit-900">{o.annonceTitre}</h2><p className="mt-1 text-sm text-slate-600">{o.quartier}, {o.ville}</p></div><span className={'rounded-full px-3 py-1 text-xs font-semibold '+(o.statut==='ACCEPTEE'?'bg-emerald-100 text-emerald-800':o.statut==='REFUSEE'||o.statut==='ANNULEE'?'bg-slate-100 text-slate-700':'bg-amber-100 text-amber-900')}>{libelles[o.statut]}</span></div>
      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Prix affiché</p><p className="font-semibold text-nuit-900">{formatFcfa(o.prixAnnonce)}</p></div><div><p className="text-xs text-slate-500">Proposition</p><p className="text-lg font-bold text-emeraude-800">{formatFcfa(o.montantPropose)}</p></div></div>
      <p className="mt-3 text-sm text-slate-600">{client ? 'Propriétaire' : 'Acheteur'} : <strong className="text-slate-800">{client ? o.proprietaireNom : o.acheteurNom}</strong></p>
      {o.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {o.message} »</p>}
      {o.reponseProprietaire && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-800">Réponse du propriétaire : {o.reponseProprietaire}</p>}
      <p className="mt-3 text-xs text-slate-400">Envoyée le {new Date(o.creeLe).toLocaleString('fr-FR')}</p>
      {proprietaire && o.statut==='EN_ATTENTE' && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><label className="block text-sm text-slate-700">Réponse facultative<textarea maxLength={1000} rows={2} value={reponses[o.id] ?? ''} onChange={e=>setReponses(v=>({...v,[o.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 p-2" placeholder="Ajouter une précision…" /></label><div className="flex flex-wrap gap-2"><button disabled={actionEnCours===o.id} onClick={()=>void decider(o.id,true)} className="inline-flex items-center gap-2 rounded-lg bg-emeraude-700 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4"/>Accepter</button><button disabled={actionEnCours===o.id} onClick={()=>void decider(o.id,false)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><X className="h-4 w-4"/>Refuser</button></div></div>}
      {client && o.statut==='EN_ATTENTE' && <button disabled={actionEnCours===o.id} onClick={()=>void annuler(o.id)} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Annuler mon offre</button>}
      <p className="mt-4 text-xs text-slate-500">L’acceptation d’une proposition ne remplace pas la signature d’un acte de vente et ne déclenche aucun paiement.</p>
    </article>)}</div>
  </main>
}
