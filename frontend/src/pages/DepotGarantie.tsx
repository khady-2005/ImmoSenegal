import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = { id: string; annonceTitre: string; depotGarantie: number; etat: string; proprietaireNom: string; locataireNom: string }
type Suivi = { id: string; contratId: string; depotInitial: number; montantRestitue: number; montantRetenu: number; motifRetenue: string | null; statut: 'A_CONFIRMER' | 'CONFIRME' | 'CONTESTE'; commentaireLocataire: string | null; creeLe: string; decideLe: string | null }
const monnaie = (n: number) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'

export default function DepotGarantie() {
  const { jeton, utilisateur } = useAuth()
  const estProprietaire = utilisateur?.role === 'PROPRIETAIRE'
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [selection, setSelection] = useState('')
  const [suivi, setSuivi] = useState<Suivi | null>(null)
  const [restitue, setRestitue] = useState('')
  const [retenu, setRetenu] = useState('0')
  const [motif, setMotif] = useState('')
  const [commentaire, setCommentaire] = useState('')
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

  const chargerSuivi = useCallback(async () => {
    if (!jeton || !selection) { setSuivi(null); return }
    try {
      const data = await appelApi<Suivi | null>(`/api/locations/${selection}/depot-garantie`, { token: jeton })
      setSuivi(data)
      if (data) { setRestitue(String(data.montantRestitue)); setRetenu(String(data.montantRetenu)); setMotif(data.motifRetenue || '') }
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le suivi du dépôt.') }
  }, [jeton, selection])

  useEffect(() => { void chargerContrats() }, [chargerContrats])
  useEffect(() => { void chargerSuivi() }, [chargerSuivi])

  const proposer = async (e: FormEvent) => {
    e.preventDefault(); setErreur(''); setMessage('')
    try {
      await appelApi(`/api/locations/${selection}/depot-garantie`, {
        method: 'POST', token: jeton,
        body: { montantRestitue: Number(restitue), montantRetenu: Number(retenu), motifRetenue: motif },
      })
      setMessage('Proposition enregistrée et transmise au locataire.')
      await chargerSuivi()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer la proposition.') }
  }

  const decider = async (accepter: boolean) => {
    setErreur(''); setMessage('')
    try {
      await appelApi(`/api/locations/${selection}/depot-garantie/decision`, {
        method: 'PATCH', token: jeton, body: { accepter, commentaire },
      })
      setMessage(accepter ? 'Vous avez confirmé le bilan du dépôt.' : 'Votre désaccord a été transmis au propriétaire.')
      await chargerSuivi()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer votre réponse.') }
  }

  const contrat = contrats.find(c => c.id === selection)
  const total = Number(restitue || 0) + Number(retenu || 0)
  const contratTermine = contrat?.etat === 'RESILIE' || contrat?.etat === 'TERMINE'

  return <main className="mx-auto max-w-4xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Gestion locative</p>
    <h1 className="mt-2 text-3xl font-bold text-nuit-900">Dépôt de garantie</h1>
    <p className="mt-2 text-sm text-slate-600">Consultez la proposition de restitution et confirmez les montants ou signalez un désaccord.</p>
    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {chargement ? <p className="mt-6">Chargement…</p> : contrats.length === 0 ?
      <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun contrat associé à votre compte.</p> :
      <>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-semibold">Contrat
            <select value={selection} onChange={e => setSelection(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
              {contrats.map(c => <option key={c.id} value={c.id}>{c.annonceTitre} — dépôt {monnaie(c.depotGarantie)}</option>)}
            </select>
          </label>
          {contrat && <p className="mt-3 text-xs text-slate-500">État du contrat : {contrat.etat} · Dépôt initial : {monnaie(contrat.depotGarantie)}</p>}
        </section>
        {suivi ? <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-nuit-900">Proposition du propriétaire</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${suivi.statut === 'CONFIRME' ? 'bg-emerald-50 text-emerald-800' : suivi.statut === 'CONTESTE' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{suivi.statut === 'CONFIRME' ? 'Confirmée' : suivi.statut === 'CONTESTE' ? 'Contestée' : 'En attente de réponse'}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Dépôt initial</p><p className="mt-1 font-bold">{monnaie(suivi.depotInitial)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Montant proposé à restituer</p><p className="mt-1 font-bold text-emerald-800">{monnaie(suivi.montantRestitue)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Montant retenu</p><p className="mt-1 font-bold">{monnaie(suivi.montantRetenu)}</p></div>
          </div>
          {suivi.motifRetenue && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><strong>Motif des retenues :</strong> {suivi.motifRetenue}</p>}
          {suivi.commentaireLocataire && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Réponse du locataire :</strong> {suivi.commentaireLocataire}</p>}
          {!estProprietaire && suivi.statut === 'A_CONFIRMER' && <div className="mt-5 border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium">Commentaire (obligatoire en cas de désaccord)
              <textarea rows={3} maxLength={1500} value={commentaire} onChange={e => setCommentaire(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/>
            </label>
            <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void decider(true)} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Confirmer les montants</button>
              <button disabled={!commentaire.trim()} onClick={() => void decider(false)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-40">Contester la proposition</button></div>
          </div>}
          <p className="mt-4 text-xs text-slate-500">Cette validation enregistre l’accord ou le désaccord sur la plateforme. Elle ne déclenche aucun virement et ne prouve pas qu’un remboursement a été effectué.</p>
        </section> : estProprietaire && contratTermine ?
          <form onSubmit={proposer} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-nuit-900">Proposer le bilan du dépôt</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Montant à restituer (FCFA)
                <input required type="number" min="0" step="0.01" max={contrat?.depotGarantie} value={restitue} onChange={e => setRestitue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/>
              </label>
              <label className="text-sm font-medium">Montant retenu (FCFA)
                <input required type="number" min="0" step="0.01" max={contrat?.depotGarantie} value={retenu} onChange={e => setRetenu(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Motif des retenues (si applicable)
                <textarea rows={3} maxLength={1500} value={motif} onChange={e => setMotif(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/>
              </label>
            </div>
            <p className={`mt-3 text-sm ${total === Number(contrat?.depotGarantie) ? 'text-emerald-700' : 'text-red-700'}`}>Total : {monnaie(total)} / {monnaie(Number(contrat?.depotGarantie))}</p>
            <button disabled={total !== Number(contrat?.depotGarantie)} className="mt-4 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Transmettre la proposition</button>
          </form> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{estProprietaire ? 'Le bilan du dépôt pourra être proposé lorsque le contrat sera terminé.' : 'Le propriétaire n’a pas encore transmis de proposition de restitution.'}</p>}
      </>
    }
    <a href="/mes-contrats-location" className="mt-8 inline-block text-sm font-semibold text-amber-800 underline">Retour à mes contrats</a>
  </main>
}
