import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BriefcaseBusiness, RefreshCw } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import type { Annonce, PagePaginee } from '../types'

type Vente = {
  id: string; annonceId: string; annonceTitre: string; agentNom: string; acheteurNom: string
  prixVente: number; tauxCommission: number; partAgent: number; commissionTotale: number
  commissionAgent: number; commissionAgence: number; dateVente: string; statut: string
}
type Membre = { id: string; nom: string; fonction: string; statut: string }

const fc = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'

export default function VentesAgence({ agenceId, fonction }: { agenceId: string; fonction: string }) {
  const { jeton } = useAuth()
  const [ventes, setVentes] = useState<Vente[]>([])
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [annonceId, setAnnonceId] = useState('')
  const [agentMembreId, setAgentMembreId] = useState('')
  const [acheteurNom, setAcheteurNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [prix, setPrix] = useState('')
  const [taux, setTaux] = useState('5')
  const [partAgent, setPartAgent] = useState('50')
  const [dateVente, setDateVente] = useState(new Date().toISOString().slice(0, 10))
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    try {
      const [liste, catalogue] = await Promise.all([
        appelApi<Vente[]>(`/api/agence/${agenceId}/ventes`, { token: jeton }),
        appelApi<PagePaginee<Annonce>>('/api/annonces?taille=100', { token: jeton }),
      ])
      setVentes(liste)
      setAnnonces(catalogue.contenu.filter(a => a.transaction === 'VENTE' && a.statut === 'PUBLIEE' && !a.exemple))
      if (fonction === 'RESPONSABLE') {
        const equipe = await appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: jeton })
        setMembres(equipe.filter(m => m.fonction === 'AGENT' && m.statut === 'ACTIF'))
      }
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les ventes.')
    } finally { setChargement(false) }
  }, [jeton, agenceId, fonction])

  useEffect(() => { void charger() }, [charger])

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/ventes`, { method: 'POST', token: jeton, body: {
        annonceId, agentMembreId: agentMembreId || null, acheteurNom: acheteurNom.trim(),
        acheteurTelephone: telephone.trim() || null, prixVente: Number(prix),
        tauxCommission: Number(taux), partAgent: Number(partAgent), dateVente,
      } })
      setAnnonceId(''); setAgentMembreId(''); setAcheteurNom(''); setTelephone(''); setPrix('')
      setMessage('Vente enregistrée. Les commissions ont été calculées automatiquement.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer cette vente.')
    } finally { setEnvoi(false) }
  }

  const totalAgence = ventes.reduce((s, v) => s + v.commissionAgence, 0)
  const totalAgents = ventes.reduce((s, v) => s + v.commissionAgent, 0)
  const totalCommission = ventes.reduce((s, v) => s + v.commissionTotale, 0)

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-nuit-800" /><h2 className="text-xl font-bold text-nuit-900">Ventes et commissions</h2></div>
      <p className="mt-1 text-sm text-slate-600">Enregistrez les ventes réalisées et visualisez la répartition des commissions.</p></div>
      <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser</button>
    </div>
    {erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Commissions totales</p><p className="mt-1 text-lg font-bold text-nuit-900">{fc(totalCommission)}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Part agence</p><p className="mt-1 text-lg font-bold text-nuit-900">{fc(totalAgence)}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Part agents</p><p className="mt-1 text-lg font-bold text-nuit-900">{fc(totalAgents)}</p></div>
    </div>
    {fonction !== 'GESTIONNAIRE' && <form onSubmit={enregistrer} className="mt-6 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
      <h3 className="font-semibold text-nuit-900 sm:col-span-2">Enregistrer une vente</h3>
      <label className="text-sm text-slate-700 sm:col-span-2">Bien vendu<select required value={annonceId} onChange={e=>setAnnonceId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Choisir une annonce de vente publiée</option>{annonces.map(a=><option key={a.id} value={a.id}>{a.titre} — {a.ville}</option>)}</select></label>
      {fonction === 'RESPONSABLE' && <label className="text-sm text-slate-700 sm:col-span-2">Agent responsable<select value={agentMembreId} onChange={e=>setAgentMembreId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Attribuer au responsable</option>{membres.map(m=><option key={m.id} value={m.id}>{m.nom}</option>)}</select></label>}
      <label className="text-sm text-slate-700">Nom de l’acheteur<input required maxLength={150} value={acheteurNom} onChange={e=>setAcheteurNom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <label className="text-sm text-slate-700">Téléphone de l’acheteur<input maxLength={30} value={telephone} onChange={e=>setTelephone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <label className="text-sm text-slate-700">Prix final de vente (FCFA)<input required type="number" min="1" step="1" value={prix} onChange={e=>setPrix(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <label className="text-sm text-slate-700">Commission totale (%)<input required type="number" min="0" max="20" step="0.01" value={taux} onChange={e=>setTaux(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <label className="text-sm text-slate-700">Part de l’agent dans la commission (%)<input required type="number" min="0" max="100" step="0.01" value={partAgent} onChange={e=>setPartAgent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <label className="text-sm text-slate-700">Date de vente<input required type="date" value={dateVente} onChange={e=>setDateVente(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" /></label>
      <button disabled={envoi || !annonceId} className="rounded-full bg-nuit-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{envoi ? 'Enregistrement…' : 'Enregistrer la vente et calculer les commissions'}</button>
    </form>}
    <div className="mt-6"><h3 className="font-semibold text-nuit-900">Historique des ventes</h3>
      {chargement ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : ventes.length === 0 ? <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Aucune vente enregistrée pour cette agence.</p> :
      <div className="mt-3 space-y-3">{ventes.map(v=><article key={v.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-nuit-900">{v.annonceTitre}</p><p className="text-xs text-slate-500">Acheteur : {v.acheteurNom} · Agent : {v.agentNom} · {new Date(v.dateVente).toLocaleDateString('fr-FR')}</p></div><p className="font-bold text-nuit-900">{fc(v.prixVente)}</p></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><p>Commission : <strong>{fc(v.commissionTotale)}</strong></p><p>Part agence : <strong>{fc(v.commissionAgence)}</strong></p><p>Part agent : <strong>{fc(v.commissionAgent)}</strong></p></div></article>)}</div>}
    </div>
  </section>
}
