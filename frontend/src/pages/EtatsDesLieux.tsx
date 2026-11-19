import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = { id: string; annonceTitre: string; etat: string }
type Etat = {
  id: string; contratId: string; annonceTitre: string; creeParId: string; creeParNom: string
  type: 'ENTREE' | 'SORTIE'; dateConstat: string; observations: string
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'CONTESTE'; commentaireDecision: string | null
}
const libelleStatut = { EN_ATTENTE: 'En attente de validation', ACCEPTE: 'Accepté par les deux parties', CONTESTE: 'Contesté' }

export default function EtatsDesLieux() {
  const { jeton, utilisateur } = useAuth()
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [selection, setSelection] = useState('')
  const [etats, setEtats] = useState<Etat[]>([])
  const [type, setType] = useState<'ENTREE' | 'SORTIE'>('ENTREE')
  const [dateConstat, setDateConstat] = useState(new Date().toISOString().slice(0, 10))
  const [observations, setObservations] = useState('')
  const [commentaires, setCommentaires] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)

  const chargerContrats = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    try {
      const liste = await appelApi<Contrat[]>('/api/locations/mes-contrats', { token: jeton })
      setContrats(liste)
      if (!selection && liste.length) setSelection(liste[0].id)
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les contrats.') }
    finally { setChargement(false) }
  }, [jeton, selection])

  const chargerEtats = useCallback(async () => {
    if (!jeton || !selection) { setEtats([]); return }
    try { setEtats(await appelApi<Etat[]>(`/api/locations/${selection}/etats-des-lieux`, { token: jeton })) }
    catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les états des lieux.') }
  }, [jeton, selection])

  useEffect(() => { void chargerContrats() }, [chargerContrats])
  useEffect(() => { void chargerEtats() }, [chargerEtats])

  const creer = async (e: FormEvent) => {
    e.preventDefault()
    setErreur(''); setMessage('')
    try {
      await appelApi(`/api/locations/${selection}/etats-des-lieux`, {
        method: 'POST', token: jeton, body: { type, dateConstat, observations },
      })
      setObservations(''); setMessage('État des lieux partagé. L’autre partie doit le vérifier et répondre.')
      await chargerEtats()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de créer cet état des lieux.') }
  }

  const decider = async (etat: Etat, accepter: boolean) => {
    setErreur(''); setMessage('')
    try {
      await appelApi(`/api/locations/etats-des-lieux/${etat.id}/decision`, {
        method: 'PATCH', token: jeton, body: { accepter, commentaire: commentaires[etat.id] || '' },
      })
      setMessage(accepter ? 'État des lieux accepté.' : 'Désaccord enregistré et transmis à l’autre partie.')
      await chargerEtats()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer votre réponse.') }
  }

  const typesExistants = new Set(etats.map(e => e.type))
  const entreeAcceptee = etats.some(e => e.type === 'ENTREE' && e.statut === 'ACCEPTE')
  const contratCourant = contrats.find(c => c.id === selection)
  const peutCreer = (contratCourant?.etat === 'ACTIF' || contratCourant?.etat === 'RESILIATION_PLANIFIEE') && (!typesExistants.has('ENTREE') || (entreeAcceptee && !typesExistants.has('SORTIE')))
  useEffect(() => {
    if (!typesExistants.has('ENTREE')) setType('ENTREE')
    else if (entreeAcceptee && !typesExistants.has('SORTIE')) setType('SORTIE')
  }, [selection, entreeAcceptee, etats])

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Gestion locative</p>
    <h1 className="mt-2 text-3xl font-bold text-nuit-900">États des lieux</h1>
    <p className="mt-2 text-sm text-slate-600">Décrivez l’état du logement à l’entrée et à la sortie. Chaque document doit être vérifié par l’autre partie.</p>
    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {chargement ? <p className="mt-6">Chargement…</p> : contrats.length === 0 ?
      <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun contrat de location associé à votre compte.</p> :
      <>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-semibold">Contrat concerné
            <select value={selection} onChange={e => setSelection(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
              {contrats.map(c => <option key={c.id} value={c.id}>{c.annonceTitre} — {c.etat}</option>)}
            </select>
          </label>
        </section>
        {peutCreer && <form onSubmit={creer} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-nuit-900">Créer un état des lieux</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Type
              <select value={type} onChange={e => setType(e.target.value as 'ENTREE' | 'SORTIE')} className="mt-1 w-full rounded-lg border border-slate-300 p-3">
                {!typesExistants.has('ENTREE') && <option value="ENTREE">Entrée</option>}
                {entreeAcceptee && !typesExistants.has('SORTIE') && <option value="SORTIE">Sortie</option>}
              </select>
            </label>
            <label className="text-sm font-medium">Date du constat
              <input required type="date" max={new Date().toISOString().slice(0, 10)} value={dateConstat} onChange={e => setDateConstat(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/>
            </label>
            <label className="text-sm font-medium sm:col-span-2">Observations détaillées
              <textarea required minLength={10} maxLength={5000} rows={6} value={observations} onChange={e => setObservations(e.target.value)}
                placeholder="Décrivez pièce par pièce l’état des murs, sols, portes, fenêtres, installations et équipements…" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal"/>
              <span className="mt-1 block text-right text-xs text-slate-500">{observations.length}/5000</span>
            </label>
          </div>
          <button className="mt-4 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white">Partager l’état des lieux</button>
          <p className="mt-2 text-xs text-slate-500">Conservez également vos photos datées en dehors de la plateforme. Le dépôt de photos sera ajouté dans une prochaine étape.</p>
        </form>}
        <section className="mt-7">
          <h2 className="text-xl font-bold text-nuit-900">Historique et validations</h2>
          {etats.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun état des lieux partagé pour ce contrat.</p> :
            <div className="mt-4 grid gap-4">{etats.map(e => <article key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-nuit-900">État des lieux d’{e.type === 'ENTREE' ? 'entrée' : 'sortie'}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${e.statut === 'ACCEPTE' ? 'bg-emerald-50 text-emerald-800' : e.statut === 'CONTESTE' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{libelleStatut[e.statut]}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Créé par {e.creeParNom} · Constat du {e.dateConstat}</p>
              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{e.observations}</p>
              {e.commentaireDecision && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Commentaire : {e.commentaireDecision}</p>}
              {e.statut === 'EN_ATTENTE' && e.creeParId !== utilisateur?.id && <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="block text-sm">Commentaire (obligatoire en cas de contestation)
                  <textarea rows={2} maxLength={1500} value={commentaires[e.id] || ''} onChange={ev => setCommentaires(v => ({ ...v, [e.id]: ev.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"/>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void decider(e, true)} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Accepter</button>
                  <button disabled={!(commentaires[e.id] || '').trim()} onClick={() => void decider(e, false)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-40">Contester</button>
                </div>
              </div>}
            </article>)}</div>}
        </section>
      </>
    }
    <a href="/mes-contrats-location" className="mt-8 inline-block text-sm font-semibold text-amber-800 underline">Retour à mes contrats</a>
  </main>
}
