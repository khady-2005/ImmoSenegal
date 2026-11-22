import { useCallback, useEffect, useState } from 'react'
import { Check, X, HandCoins } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'

type Statut = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'
type OffreAchat = {
  id: string; annonceTitre: string; ville: string; quartier: string
  acheteurNom: string; proprietaireNom: string; prixAnnonce: number; montantPropose: number
  message: string | null; statut: Statut; reponseProprietaire: string | null; creeLe: string
}
type OffreLocation = {
  id: string; annonceTitre: string; ville: string; quartier: string
  locataireNom: string; proprietaireNom: string; loyerAffiche: number; loyerPropose: number
  message: string | null; statut: Statut; reponseDecideur: string | null; creeLe: string
}
const libelles: Record<Statut, string> = { EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée', ANNULEE: 'Annulée' }
const statutStyle = (s: Statut) => s === 'ACCEPTEE' ? 'bg-emerald-100 text-emerald-800' : s === 'REFUSEE' || s === 'ANNULEE' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900'

export default function OffresImmobilieres() {
  const { utilisateur, jeton } = useAuth()
  const client = utilisateur?.role === 'CLIENT'
  const decideur = utilisateur?.role === 'PROPRIETAIRE' || utilisateur?.role === 'AGENT'
  const admin = utilisateur?.role === 'ADMIN'
  const [achats, setAchats] = useState<OffreAchat[]>([])
  const [locations, setLocations] = useState<OffreLocation[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [reponses, setReponses] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    setChargement(true)
    const chemins = client
      ? ['/api/offres/envoyees', '/api/offres-location/envoyees']
      : admin
        ? ['/api/offres/toutes', '/api/offres-location/toutes']
        : ['/api/offres/recues', '/api/offres-location/recues']
    const [a, l] = await Promise.allSettled([
      appelApi<OffreAchat[]>(chemins[0], { token: jeton }),
      appelApi<OffreLocation[]>(chemins[1], { token: jeton }),
    ])
    setAchats(a.status === 'fulfilled' ? a.value : [])
    setLocations(l.status === 'fulfilled' ? l.value : [])
    if (a.status === 'rejected' && l.status === 'rejected') {
      const e = a.reason
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les offres.')
    } else setErreur('')
    setChargement(false)
  }, [client, admin, jeton])

  useEffect(() => { void charger() }, [charger])

  async function traiter(type: 'achat' | 'location', id: string, accepter: boolean) {
    setActionEnCours(id); setErreur('')
    try {
      const base = type === 'achat' ? '/api/offres/' : '/api/offres-location/'
      await appelApi(base + id + '/decision', {
        method: 'POST', token: jeton, body: { accepter, reponse: reponses[id]?.trim() || null },
      })
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter cette proposition.') }
    finally { setActionEnCours(null) }
  }

  async function annuler(type: 'achat' | 'location', id: string) {
    setActionEnCours(id); setErreur('')
    try {
      const base = type === 'achat' ? '/api/offres/' : '/api/offres-location/'
      await appelApi(base + id + '/annuler', { method: 'POST', token: jeton })
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’annuler cette proposition.') }
    finally { setActionEnCours(null) }
  }

  if (!client && !decideur && !admin) return <main className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Accès non autorisé.</p></main>

  const vide = achats.length === 0 && locations.length === 0
  return <main className="mx-auto max-w-5xl px-4 py-10">
    <header className="mb-7 rounded-2xl border border-white/80 bg-white/95 p-6 shadow-xl shadow-nuit-950/10 backdrop-blur-sm">
      <p className="text-sm font-bold uppercase tracking-wider text-emeraude-800">Transactions immobilières</p>
      <h1 className="mt-2 font-titre text-3xl font-bold text-nuit-950">{client ? 'Mes propositions' : admin ? 'Supervision des propositions' : 'Propositions reçues'}</h1>
      <p className="mt-2 text-base font-medium leading-relaxed text-nuit-800">{client ? 'Suivez vos offres d’achat et vos propositions de loyer.' : admin ? 'Consultez toutes les offres d’achat et propositions de loyer. Les décisions restent réservées aux personnes autorisées.' : 'Répondez aux offres d’achat et aux propositions de loyer concernant vos biens ou ceux confiés à votre agence.'}</p>
    </header>
    {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
    {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement des propositions…</p>}
    {!chargement && vide && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><HandCoins className="mx-auto h-10 w-10 text-emeraude-700"/><h2 className="mt-3 font-semibold text-nuit-900">Aucune proposition pour le moment</h2><p className="mt-1 text-sm text-slate-600">Vos propositions apparaîtront ici.</p></div>}

    {achats.length > 0 && <section className="mb-10"><h2 className="mb-4 text-xl font-semibold text-nuit-900">{client ? 'Offres d’achat envoyées' : admin ? 'Toutes les offres d’achat' : 'Offres d’achat reçues'}</h2><div className="space-y-4">{achats.map(o => <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-nuit-900">{o.annonceTitre}</h3><p className="mt-1 text-sm text-slate-600">{o.quartier}, {o.ville}</p></div><span className={'rounded-full px-3 py-1 text-xs font-semibold '+statutStyle(o.statut)}>{libelles[o.statut]}</span></div>
      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Prix affiché</p><p className="font-semibold text-nuit-900">{formatFcfa(o.prixAnnonce)}</p></div><div><p className="text-xs text-slate-500">Offre d’achat</p><p className="text-lg font-bold text-emeraude-800">{formatFcfa(o.montantPropose)}</p></div></div>
      <p className="mt-3 text-sm text-slate-600">{client ? 'Propriétaire' : 'Acheteur'} : <strong>{client ? o.proprietaireNom : o.acheteurNom}</strong></p>
      {o.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {o.message} »</p>}
      {o.reponseProprietaire && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-800">Réponse : {o.reponseProprietaire}</p>}
      {decideur && o.statut === 'EN_ATTENTE' && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><label className="block text-sm text-slate-700">Réponse facultative<textarea maxLength={1000} rows={2} value={reponses[o.id] ?? ''} onChange={e=>setReponses(v=>({...v,[o.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 p-2"/></label><div className="flex gap-2"><button disabled={actionEnCours===o.id} onClick={()=>void traiter('achat',o.id,true)} className="inline-flex items-center gap-2 rounded-lg bg-emeraude-700 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4"/>Accepter</button><button disabled={actionEnCours===o.id} onClick={()=>void traiter('achat',o.id,false)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><X className="h-4 w-4"/>Refuser</button></div></div>}
      {client && o.statut==='EN_ATTENTE' && <button disabled={actionEnCours===o.id} onClick={()=>void annuler('achat',o.id)} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Annuler mon offre</button>}
      <p className="mt-4 text-xs text-slate-500">L’acceptation ne remplace pas la signature d’un acte de vente et ne déclenche aucun paiement.</p>
    </article>)}</div></section>}

    {locations.length > 0 && <section><h2 className="mb-4 text-xl font-semibold text-nuit-900">{client ? 'Propositions de loyer envoyées' : admin ? 'Toutes les propositions de loyer' : 'Propositions de loyer reçues'}</h2><div className="space-y-4">{locations.map(o => <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-nuit-900">{o.annonceTitre}</h3><p className="mt-1 text-sm text-slate-600">{o.quartier}, {o.ville}</p></div><span className={'rounded-full px-3 py-1 text-xs font-semibold '+statutStyle(o.statut)}>{libelles[o.statut]}</span></div>
      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Loyer affiché / mois</p><p className="font-semibold text-nuit-900">{formatFcfa(o.loyerAffiche)}</p></div><div><p className="text-xs text-slate-500">Loyer proposé / mois</p><p className="text-lg font-bold text-emeraude-800">{formatFcfa(o.loyerPropose)}</p></div></div>
      <p className="mt-3 text-sm text-slate-600">{client ? 'Propriétaire' : 'Candidat locataire'} : <strong>{client ? o.proprietaireNom : o.locataireNom}</strong></p>
      {o.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {o.message} »</p>}
      {o.reponseDecideur && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-800">Réponse : {o.reponseDecideur}</p>}
      {decideur && o.statut==='EN_ATTENTE' && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><label className="block text-sm text-slate-700">Réponse facultative<textarea maxLength={1000} rows={2} value={reponses[o.id] ?? ''} onChange={e=>setReponses(v=>({...v,[o.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 p-2" placeholder="Préciser les conditions du loyer…"/></label><div className="flex flex-wrap gap-2"><button disabled={actionEnCours===o.id} onClick={()=>void traiter('location',o.id,true)} className="inline-flex items-center gap-2 rounded-lg bg-emeraude-700 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4"/>Accepter</button><button disabled={actionEnCours===o.id} onClick={()=>void traiter('location',o.id,false)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><X className="h-4 w-4"/>Refuser</button></div></div>}
      {client && o.statut==='EN_ATTENTE' && <button disabled={actionEnCours===o.id} onClick={()=>void annuler('location',o.id)} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Annuler ma proposition</button>}
      <p className="mt-4 text-xs text-slate-500">L’acceptation fixe un accord de principe sur le loyer proposé. Le contrat de location doit encore être établi et signé ; aucun paiement n’est déclenché.</p>
    </article>)}</div></section>}
  </main>
}
