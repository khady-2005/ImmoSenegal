import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CalendarClock, CheckCircle2, ClipboardList, Plus, RefreshCw } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type Membre = { id: string; nom: string; fonction: string; statut: string }
type Mission = { id: string; agenceId: string; membreId: string; membreNom: string; fonction: string; titre: string; description: string | null; dateEcheance: string | null; statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE'; createurNom: string; creeLe: string; rapport: string | null; rapportParNom: string | null; rapportLe: string | null }

const statuts = [
  { value: 'A_FAIRE', label: 'À faire' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminée' },
] as const
const libelleFonction: Record<string, string> = { AGENT: 'Agent', GESTIONNAIRE: 'Gestionnaire' }

export default function MissionsAgence({ agenceId, fonction }: { agenceId: string; fonction: string }) {
  const { jeton } = useAuth()
  const responsable = fonction === 'RESPONSABLE'
  const [missions, setMissions] = useState<Mission[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateEcheance, setDateEcheance] = useState('')
  const [membreId, setMembreId] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [action, setAction] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [rapports, setRapports] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setChargement(true)
    setErreur('')
    try {
      const liste = await appelApi<Mission[]>(`/api/agence/${agenceId}/missions`, { token: jeton })
      setMissions(liste)
      if (responsable) {
        const equipe = await appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: jeton })
        const disponibles = equipe.filter(m => m.statut === 'ACTIF' && ['AGENT', 'GESTIONNAIRE'].includes(m.fonction))
        setMembres(disponibles)
        if (!membreId && disponibles.length) setMembreId(disponibles[0].id)
      }
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les missions.')
    } finally { setChargement(false) }
  }, [jeton, agenceId, responsable, membreId])

  useEffect(() => { void charger() }, [charger])

  async function creer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!membreId || !titre.trim()) return
    setEnvoi(true); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/agence/${agenceId}/missions`, { method: 'POST', token: jeton, body: { membreId, titre: titre.trim(), description: description.trim() || null, dateEcheance: dateEcheance || null } })
      setTitre(''); setDescription(''); setDateEcheance(''); setMessage('Mission attribuée avec succès.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de créer la mission.') }
    finally { setEnvoi(false) }
  }

  async function changerStatut(mission: Mission, statut: Mission['statut']) {
    setAction(mission.id); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/agence/${agenceId}/missions/${mission.id}/statut`, { method: 'PATCH', token: jeton, body: { statut } })
      setMessage('Avancement de la mission mis à jour.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier cette mission.') }
    finally { setAction(null) }
  }

  async function soumettreRapport(mission: Mission) {
    const rapport = (rapports[mission.id] || '').trim()
    if (!rapport) return
    setAction(mission.id); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/agence/${agenceId}/missions/${mission.id}/rapport`, { method: 'PATCH', token: jeton, body: { rapport } })
      setRapports(v => ({ ...v, [mission.id]: '' }))
      setMessage('Rapport transmis au responsable de l’agence.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de transmettre le rapport.') }
    finally { setAction(null) }
  }
  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-nuit-800"/><h2 className="text-xl font-bold text-nuit-900">Missions de l’agence</h2></div><p className="mt-1 text-sm text-slate-600">{responsable ? 'Attribuez des missions et suivez leur avancement.' : 'Retrouvez les missions qui vous sont attribuées.'}</p></div>
      <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`}/>Actualiser</button>
    </div>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-2xl font-bold text-nuit-900">{missions.length}</p></div>
      <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-800">À faire</p><p className="mt-1 text-2xl font-bold text-nuit-900">{missions.filter(m => m.statut === 'A_FAIRE').length}</p></div>
      <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-800">En cours</p><p className="mt-1 text-2xl font-bold text-nuit-900">{missions.filter(m => m.statut === 'EN_COURS').length}</p></div>
      <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Terminées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{missions.filter(m => m.statut === 'TERMINEE').length}</p></div>
    </div>
    {responsable && <form onSubmit={creer} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
      <div className="md:col-span-2"><label htmlFor="mission-titre" className="mb-1 block text-sm font-semibold text-slate-700">Titre de la mission</label><input id="mission-titre" required maxLength={160} value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex. Organiser une visite à Almadies" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></div>
      <div><label htmlFor="mission-membre" className="mb-1 block text-sm font-semibold text-slate-700">Collaborateur</label><select id="mission-membre" required value={membreId} onChange={e => setMembreId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Choisir un collaborateur</option>{membres.map(m => <option key={m.id} value={m.id}>{m.nom} — {libelleFonction[m.fonction] ?? m.fonction}</option>)}</select></div>
      <div><label htmlFor="mission-date" className="mb-1 block text-sm font-semibold text-slate-700">Date limite (facultative)</label><input id="mission-date" type="date" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></div>
      <div className="md:col-span-2"><label htmlFor="mission-description" className="mb-1 block text-sm font-semibold text-slate-700">Consignes (facultatif)</label><textarea id="mission-description" rows={2} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"/></div>
      <div className="md:col-span-2"><button type="submit" disabled={envoi || !membreId || !titre.trim()} className="inline-flex items-center gap-2 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>{envoi ? 'Attribution…' : 'Attribuer la mission'}</button>{membres.length === 0 && <p className="mt-2 text-xs text-amber-800">Ajoutez d’abord un agent ou un gestionnaire actif à cette agence.</p>}</div>
    </form>}
    {chargement ? <p className="mt-5 text-sm text-slate-500">Chargement des missions…</p> : missions.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aucune mission pour le moment.</p> : <div className="mt-5 space-y-3">{missions.map(m => <article key={m.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-nuit-900">{m.titre}</h3>{m.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{m.description}</p>}<p className="mt-2 text-xs text-slate-500">{responsable ? `Attribuée à ${m.membreNom} · ${libelleFonction[m.fonction] ?? m.fonction}` : `Attribuée par ${m.createurNom}`}{m.dateEcheance ? ` · Échéance : ${new Date(m.dateEcheance + 'T00:00:00').toLocaleDateString('fr-FR')}` : ''}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statuts.find(s => s.value === m.statut)?.label ?? m.statut}</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-400"/><label htmlFor={`statut-${m.id}`} className="text-xs font-medium text-slate-600">Avancement</label><select id={`statut-${m.id}`} disabled={action === m.id} value={m.statut} onChange={e => void changerStatut(m, e.target.value as Mission['statut'])} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="A_FAIRE">À faire</option><option value="EN_COURS">En cours</option><option value="TERMINEE">Terminée</option></select>{m.statut === 'TERMINEE' && <CheckCircle2 className="h-4 w-4 text-emerald-600"/>}</div>{m.rapport && <div className="mt-3 rounded-lg bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Rapport transmis {m.rapportParNom ? 'par ' + m.rapportParNom : ''}{m.rapportLe ? ' · ' + new Date(m.rapportLe).toLocaleString('fr-FR') : ''}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.rapport}</p></div>}{!responsable && <div className="mt-3 border-t border-slate-100 pt-3"><label htmlFor={`rapport-${m.id}`} className="block text-xs font-semibold text-slate-700">Votre rapport d’activité</label><textarea id={`rapport-${m.id}`} rows={3} maxLength={5000} value={rapports[m.id] ?? ''} onChange={e => setRapports(v => ({ ...v, [m.id]: e.target.value }))} placeholder="Décrivez les démarches effectuées, les résultats et les prochaines étapes…" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"/><button type="button" disabled={action === m.id || !(rapports[m.id] || '').trim()} onClick={() => void soumettreRapport(m)} className="mt-2 rounded-full bg-nuit-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{action === m.id ? 'Transmission…' : 'Transmettre le rapport'}</button></div>}</article>)}</div>}
  </section>
}
