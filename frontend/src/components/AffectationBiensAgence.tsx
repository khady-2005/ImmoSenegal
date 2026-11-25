import { useCallback, useEffect, useState } from 'react'
import { UserRoundCog, RefreshCw } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type Membre = { id: string; nom: string; fonction: string; statut: string }
type Mandat = { id: string; annonceTitre: string; ville: string; proprietaireNom: string; gestionnaireMembreId: string | null; gestionnaireNom: string | null }

export default function AffectationBiensAgence({ agenceId }: { agenceId: string }) {
  const { jeton } = useAuth()
  const [biens, setBiens] = useState<Mandat[]>([])
  const [gestionnaires, setGestionnaires] = useState<Membre[]>([])
  const [choix, setChoix] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setChargement(true); setErreur('')
    try {
      const [portefeuille, membres] = await Promise.all([
        appelApi<Mandat[]>(`/api/agence/${agenceId}/portefeuille`, { token: jeton }),
        appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: jeton }),
      ])
      setBiens(portefeuille)
      setGestionnaires(membres.filter(m => m.fonction === 'GESTIONNAIRE' && m.statut === 'ACTIF'))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les affectations.')
    } finally { setChargement(false) }
  }, [jeton, agenceId])

  useEffect(() => { void charger() }, [charger])

  const affecter = async (mandatId: string) => {
    const membreId = choix[mandatId]
    if (!membreId) return
    setEnCours(mandatId); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/mandats/${mandatId}/gestionnaire`, {
        method: 'PATCH', token: jeton, body: { membreId },
      })
      setMessage('Le bien a été attribué au gestionnaire.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’attribuer ce bien.')
    } finally { setEnCours(null) }
  }

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-nuit-900"><UserRoundCog className="h-5 w-5"/> Affectation des biens aux gestionnaires</h2>
        <p className="mt-1 text-sm text-slate-600">Attribuez chaque mandat accepté à un gestionnaire actif. Il ne verra ensuite que les biens qui lui sont attribués.</p>
      </div>
      <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`}/>Actualiser</button>
    </div>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
    {chargement ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : biens.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun mandat accepté à attribuer.</p> :
      <div className="mt-4 divide-y divide-slate-100">{biens.map(b => <article key={b.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold text-nuit-900">{b.annonceTitre}</p><p className="text-sm text-slate-600">{b.ville} · Propriétaire : {b.proprietaireNom}</p><p className="mt-1 text-xs text-slate-500">Gestionnaire actuel : {b.gestionnaireNom ?? 'Non attribué'}</p></div>
        <div className="flex flex-wrap gap-2">
          <select aria-label={`Gestionnaire pour ${b.annonceTitre}`} value={choix[b.id] ?? b.gestionnaireMembreId ?? ''} onChange={e => setChoix(prev => ({...prev, [b.id]: e.target.value}))} className="min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Choisir un gestionnaire…</option>
            {gestionnaires.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
          </select>
          <button type="button" disabled={!choix[b.id] || enCours === b.id || gestionnaires.length === 0} onClick={() => void affecter(b.id)} className="rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{enCours === b.id ? 'Attribution…' : 'Attribuer'}</button>
        </div>
      </article>)}</div>}
    {!chargement && gestionnaires.length === 0 && <p className="mt-3 text-xs text-amber-700">Aucun gestionnaire actif. Invitez ou acceptez d’abord un gestionnaire dans la rubrique Équipe.</p>}
  </section>
}
