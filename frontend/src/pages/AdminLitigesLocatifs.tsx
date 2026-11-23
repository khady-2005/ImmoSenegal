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
  const [notesAdmin, setNotesAdmin] = useState<Record<string, string>>({})
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [notesDossiers, setNotesDossiers] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!jeton) return
    appelApi<Litige[]>('/api/admin/locations/litiges', { token: jeton })
      .then(setLignes)
      .catch(e => setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les dossiers.'))
      .finally(() => setChargement(false))
  }, [jeton])
  const visibles = useMemo(() => filtre === 'TOUS' ? lignes : lignes.filter(l => l.type === filtre), [lignes, filtre])
  async function traiterIncident(litige: Litige, statut: 'EN_COURS' | 'RESOLU') {
    const commentaire = (notesAdmin[litige.id] || '').trim()
    if (!commentaire) { setErreur('Ajoutez une note avant de mettre à jour le dossier.'); return }
    setErreur('')
    setActionEnCours(litige.id)
    try {
      await appelApi(`/api/admin/locations/litiges/incidents/${litige.id}`, {
        method: 'PATCH', token: jeton, body: { statut, commentaire },
      })
      const actualises = await appelApi<Litige[]>('/api/admin/locations/litiges', { token: jeton })
      setLignes(actualises)
      setNotesAdmin(v => ({ ...v, [litige.id]: '' }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de mettre à jour ce dossier.')
    } finally { setActionEnCours(null) }
  }
  async function ajouterNoteDossier(litige: Litige) {
    const note = (notesDossiers[litige.id] || '').trim()
    if (!note) { setErreur('Ajoutez une note avant de l’envoyer.'); return }
    setErreur(''); setActionEnCours(litige.id)
    try {
      await appelApi(`/api/admin/locations/litiges/${litige.type}/${litige.id}/note`, { method: 'PATCH', token: jeton, body: { note } })
      const actualises = await appelApi<Litige[]>('/api/admin/locations/litiges', { token: jeton })
      setLignes(actualises); setNotesDossiers(v => ({ ...v, [litige.id]: '' }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer la note administrative.')
    } finally { setActionEnCours(null) }
  }
  function exporterCsv() {
    const colonnes = ['Type', 'Annonce', 'Sujet', 'Proprietaire', 'Locataire', 'Details', 'Statut', 'Commentaire', 'Date']
    const cellules = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"'
    const contenu = [colonnes, ...visibles.map(l => [libelles[l.type], l.annonceTitre, l.sujet, l.proprietaireNom, l.locataireNom, l.details, l.statut, l.commentaire, l.dateSignalement ? new Date(l.dateSignalement).toLocaleString('fr-FR') : ''])].map(ligne => ligne.map(cellules).join(';')).join('\r\n')
    const fichier = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(fichier)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = 'immosenegal-litiges-locatifs.csv'
    lien.click()
    URL.revokeObjectURL(url)
  }
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <p className="text-base font-bold uppercase tracking-wider text-amber-700">Administration</p>
    <h1 className="mt-2 text-4xl font-bold text-nuit-900">Supervision des litiges locatifs</h1>
    <p className="mt-3 text-base leading-relaxed text-slate-600">Vue de suivi des incidents non clôturés et des désaccords sur les états des lieux ou les dépôts de garantie. Cette page facilite le suivi, sans remplacer une médiation ni une décision juridique.</p>
    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div><p className="text-xs text-slate-500">Dossiers à suivre</p><p className="text-2xl font-bold text-nuit-900">{lignes.length}</p></div>
      <label className="text-sm font-medium">Filtrer
        <select value={filtre} onChange={e => setFiltre(e.target.value)} className="ml-2 rounded-lg border border-slate-300 p-2">
          <option value="TOUS">Tous</option><option value="INCIDENT">Incidents</option>
          <option value="ETAT_DES_LIEUX">États des lieux contestés</option><option value="DEPOT_GARANTIE">Dépôts contestés</option>
        </select>
      </label>
      <button type="button" onClick={exporterCsv} disabled={visibles.length === 0} className="rounded-lg bg-nuit-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Exporter CSV</button>
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
        {l.type !== 'INCIDENT' && <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">Note de médiation administrative
            <textarea rows={3} maxLength={1500} value={notesDossiers[l.id] || ''} onChange={e => setNotesDossiers(v => ({ ...v, [l.id]: e.target.value }))} placeholder="Consignez les échanges, pièces à fournir ou prochaines étapes convenues…" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" />
          </label>
          <button type="button" disabled={actionEnCours === l.id} onClick={() => void ajouterNoteDossier(l)} className="mt-3 rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Envoyer la note aux deux parties</button>
          <p className="mt-2 text-xs text-slate-500">La note est ajoutée au dossier et transmise aux deux parties. Elle ne remplace pas leur accord ni une décision juridique.</p>
        </div>}
        {l.type === 'INCIDENT' && l.statut !== 'CLOTURE' && <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-sm font-medium text-slate-700">Note de suivi administratif
            <textarea rows={3} maxLength={1500} value={notesAdmin[l.id] || ''} onChange={e => setNotesAdmin(v => ({ ...v, [l.id]: e.target.value }))} placeholder="Notez les démarches effectuées ou les prochaines étapes convenues avec les parties…" className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {l.statut !== 'EN_COURS' && <button type="button" disabled={actionEnCours === l.id} onClick={() => void traiterIncident(l, 'EN_COURS')} className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">Prendre en charge</button>}
            {l.statut !== 'RESOLU' && <button type="button" disabled={actionEnCours === l.id} onClick={() => void traiterIncident(l, 'RESOLU')} className="rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Proposer comme résolu</button>}
          </div>
          <p className="mt-2 text-xs text-slate-500">Les deux parties reçoivent la note. La clôture définitive reste confirmée par la personne qui a signalé l’incident.</p>
        </div>}
      </article>)}</div>}
    <a href="/admin/supervision-locative" className="mt-8 inline-block text-sm font-semibold text-amber-800 underline">Retour à la supervision locative</a>
  </main>
}
