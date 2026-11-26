import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = { id: string; annonceTitre: string; proprietaireNom: string; locataireNom: string; etat: string }
type Incident = {
  id: string; contratId: string; annonceTitre: string; declareParId: string; declareParNom: string
  categorie: string; description: string; statut: 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'CLOTURE'
  commentaireResolution: string | null; creeLe: string; modifieLe: string
}
const statutLibelle: Record<Incident['statut'], string> = {
  OUVERT: 'Ouvert', EN_COURS: 'En cours', RESOLU: 'Résolu', CLOTURE: 'Clôturé',
}
const dateFr = (v: string) => new Date(v).toLocaleString('fr-FR')

export default function IncidentsLocation() {
  const { jeton, utilisateur } = useAuth()
  const estProprietaire = utilisateur?.role === 'PROPRIETAIRE'
  const estAdmin = utilisateur?.role === 'ADMIN'
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [selection, setSelection] = useState('')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [categorie, setCategorie] = useState('REPARATION')
  const [description, setDescription] = useState('')
  const [commentaires, setCommentaires] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)

  const chargerContrats = useCallback(async () => {
    if (!jeton) return
    setChargement(true); setErreur('')
    try {
      const liste = await appelApi<Contrat[]>('/api/locations/mes-contrats', { token: jeton })
      setContrats(liste)
      const premier = liste.find(c => c.etat === 'ACTIF' || c.etat === 'RESILIATION_PLANIFIEE')
      if (!selection && premier) setSelection(premier.id)
      if (selection && !liste.some(c => c.id === selection)) setSelection('')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos contrats.')
    } finally { setChargement(false) }
  }, [jeton, selection])

  const chargerIncidents = useCallback(async () => {
    if (!jeton || !selection) { setIncidents([]); return }
    try {
      setIncidents(await appelApi<Incident[]>(`/api/locations/${selection}/incidents`, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les incidents.')
    }
  }, [jeton, selection])

  useEffect(() => { void chargerContrats() }, [chargerContrats])
  useEffect(() => { void chargerIncidents() }, [chargerIncidents])

  const declarer = async (e: FormEvent) => {
    e.preventDefault()
    if (!selection) return
    setEnvoi(true); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/locations/${selection}/incidents`, {
        method: 'POST', token: jeton, body: { categorie, description },
      })
      setDescription(''); setMessage('Incident déclaré. L’autre partie a été notifiée.')
      await chargerIncidents()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de déclarer cet incident.')
    } finally { setEnvoi(false) }
  }

  const actualiser = async (incident: Incident, statut: Incident['statut']) => {
    setErreur(''); setMessage('')
    try {
      await appelApi(estAdmin ? `/api/locations/admin/incidents/${incident.id}` : `/api/locations/incidents/${incident.id}`, {
        method: 'PATCH', token: jeton,
        body: { statut, commentaire: commentaires[incident.id] || '' },
      })
      setMessage(statut === 'CLOTURE' ? 'Incident clôturé.' : 'Suivi de l’incident mis à jour.')
      await chargerIncidents()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de mettre à jour cet incident.')
    }
  }

  const contratSelectionne = contrats.find(c => c.id === selection)
  const peutDeclarer = !estAdmin && contratSelectionne && (contratSelectionne.etat === 'ACTIF' || contratSelectionne.etat === 'RESILIATION_PLANIFIEE')

  return <main className="mx-auto max-w-5xl px-4 py-10">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Gestion locative</p>
      <h1 className="mt-2 text-3xl font-bold text-nuit-900">Incidents et réparations</h1>
      <p className="mt-2 text-sm text-slate-600">Déclarez un problème dans le logement et suivez son traitement avec l’autre partie du contrat.</p>
    </header>

    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

    {chargement ? <p className="mt-6">Chargement de vos contrats…</p> : contrats.length === 0 ?
      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-semibold text-nuit-900">Aucun contrat disponible</h2>
        <p className="mt-2 text-sm text-slate-600">Les incidents sont accessibles lorsqu’un contrat de location est associé à votre compte.</p>
        <a className="mt-4 inline-block text-sm font-semibold text-amber-800 underline" href="/mes-contrats-location">Consulter mes contrats</a>
      </section> :
      <>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-semibold text-slate-700">Choisir le logement
            <select value={selection} onChange={e => setSelection(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
              {contrats.map(c => <option key={c.id} value={c.id}>{c.annonceTitre} — {c.etat}</option>)}
            </select>
          </label>
          {contratSelectionne && <p className="mt-3 text-xs text-slate-500">Propriétaire : {contratSelectionne.proprietaireNom} · Locataire : {contratSelectionne.locataireNom}</p>}
        </section>

        {peutDeclarer && <form onSubmit={declarer} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-nuit-900">Signaler un nouvel incident</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Catégorie
              <select value={categorie} onChange={e => setCategorie(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3">
                <option value="REPARATION">Réparation</option><option value="PLOMBERIE">Plomberie</option>
                <option value="ELECTRICITE">Électricité</option><option value="HUMIDITE">Humidité / infiltration</option>
                <option value="EQUIPEMENT">Équipement</option><option value="AUTRE">Autre</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description du problème
              <textarea required minLength={5} maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Décrivez le problème, la pièce concernée et depuis quand il existe…" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" />
              <span className="mt-1 block text-right text-xs text-slate-500">{description.length}/2000</span>
            </label>
          </div>
          <button disabled={envoi} className="mt-4 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {envoi ? 'Envoi…' : 'Déclarer l’incident'}
          </button>
        </form>}

        <section className="mt-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-nuit-900">Historique des incidents</h2>
            <span className="text-sm text-slate-500">{incidents.length} signalement(s)</span>
          </div>
          {incidents.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun incident déclaré pour ce logement.</p> :
            <div className="mt-4 grid gap-4">{incidents.map(i => <article key={i.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-bold text-nuit-900">{i.categorie.replaceAll('_', ' ')}</h3><p className="mt-1 text-xs text-slate-500">Déclaré par {i.declareParNom} · {dateFr(i.creeLe)}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${i.statut === 'RESOLU' || i.statut === 'CLOTURE' ? 'bg-emerald-50 text-emerald-800' : i.statut === 'EN_COURS' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{statutLibelle[i.statut]}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{i.description}</p>
              {i.commentaireResolution && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Commentaire de suivi :</strong> {i.commentaireResolution}</p>}
              {(estProprietaire || estAdmin) && i.statut !== 'CLOTURE' && <div className="mt-4 border-t border-slate-100 pt-4">
                <label className="block text-sm text-slate-700">Commentaire de suivi (facultatif)
                  <textarea rows={2} maxLength={1500} required={estAdmin} value={commentaires[i.id] || ''} onChange={e => setCommentaires(v => ({ ...v, [i.id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5" />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.statut === 'OUVERT' && <button disabled={estAdmin && !(commentaires[i.id] || '').trim()} onClick={() => void actualiser(i, 'EN_COURS')} className="rounded-full border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800">Prendre en charge</button>}
                  {(i.statut === 'OUVERT' || i.statut === 'EN_COURS') && <button disabled={estAdmin && !(commentaires[i.id] || '').trim()} onClick={() => void actualiser(i, 'RESOLU')} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Marquer comme résolu</button>}
                </div>
              </div>}
              {i.declareParId === utilisateur?.id && i.statut === 'RESOLU' &&
                <button onClick={() => void actualiser(i, 'CLOTURE')} className="mt-4 rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white">Confirmer et clôturer</button>}
              {i.statut === 'CLOTURE' && <p className="mt-3 text-xs text-slate-500">Incident clôturé le {dateFr(i.modifieLe)}.</p>}
            </article>)}</div>}
        </section>
      </>
    }
    <a href="/mes-contrats-location" className="mt-8 inline-block text-sm font-semibold text-amber-800 underline">Retour à mes contrats</a>
  </main>
}
