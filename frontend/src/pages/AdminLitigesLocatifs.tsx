import { useEffect, useMemo, useState } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Litige = {
  type: 'INCIDENT' | 'ETAT_DES_LIEUX' | 'DEPOT_GARANTIE'; id: string; contratId: string
  annonceTitre: string; proprietaireNom: string; locataireNom: string; sujet: string
  details: string; statut: string; commentaire: string | null; dateSignalement: string | null
}
const libelles: Record<Litige['type'], string> = {
  INCIDENT: 'Incident non clôturé', ETAT_DES_LIEUX: 'État des lieux contesté', DEPOT_GARANTIE: 'Dépôt de garantie contesté',
}
export default function AdminLitigesLocatifs() {
  const { jeton } = useAuth()
  const [lignes, setLignes] = useState<Litige[]>([])
  const [filtre, setFiltre] = useState('TOUS')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  useEffect(() => {
    if (!jeton) return
    appelApi<Litige[]>('/api/admin/locations/litiges', { token: jeton })
      .then(setLignes)
      .catch(e => setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les dossiers.'))
      .finally(() => setChargement(false))
  }, [jeton])
  const visibles = useMemo(() => filtre === 'TOUS' ? lignes : lignes.filter(l => l.type === filtre), [lignes, filtre])
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Administration</p>
    <h1 className="mt-2 text-3xl font-bold text-nuit-900">Supervision des litiges locatifs</h1>
    <p className="mt-2 text-sm text-slate-600">Vue de suivi des incidents non clôturés et des désaccords sur les états des lieux ou les dépôts de garantie. Cette page facilite le suivi, sans remplacer une médiation ni une décision juridique.</p>
    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div><p className="text-xs text-slate-500">Dossiers à suivre</p><p className="text-2xl font-bold text-nuit-900">{lignes.length}</p></div>
      <label className="text-sm font-medium">Filtrer
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="ml-2 rounded-lg border border-slate-300 p-2">
          <option value="TOUS">Tous</option><option value="INCIDENT">Incidents</option>
          <option value="ETAT_DES_LIEUX">États des lieux contestés</option><option value="DEPOT_GARANTIE">Dépôts contestés</option>
        </select>
      </label>
    </section>
    {chargement ? <p className="mt-6">Chargement des dossiers…</p> : visibles.length === 0 ?
      <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun dossier à suivre pour ce filtre.</p> :
      <div className="mt-5 grid gap-4">{visibles.map(l => <article key={l.type + l.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{libelles[l.type]}</span><span className="text-xs text-slate-500">{l.dateSignalement ? new Date(l.dateSignalement).toLocaleString('fr-FR') : 'Date indisponible'}</span></div>
        <h2 className="mt-3 font-bold text-nuit-900">{l.annonceTitre} — {l.sujet}</h2>
        <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><p>Propriétaire : {l.proprietaireNom}</p><p>Locataire : {l.locataireNom}</p></div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{l.details}</p>
        {l.commentaire && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900"><strong>Désaccord signalé :</strong> {l.commentaire}</p>}
        <p className="mt-3 text-xs text-slate-500">Contrat : {l.contratId.slice(0, 8).toUpperCase()} · Statut : {l.statut}</p>
      </article>)}</div>}
    <a href="/admin/supervision-locative" className="mt-8 inline-block text-sm font-semibold text-amber-800 underline">Retour à la supervision locative</a>
  </main>
}
