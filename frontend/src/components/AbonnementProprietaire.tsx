import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type Forfait = 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL'
type Abonnement = {
  id: string; forfait: Forfait; montant: number; dateDebut: string | null; dateFin: string | null;
  statut: 'EN_ATTENTE' | 'ACTIF' | 'REFUSE' | 'EXPIRE' | 'ANNULE'; modePaiement: string;
  referencePaiement: string | null; note: string | null; creeLe: string
}
const forfaits: { id: Forfait; nom: string; prix: number; duree: string; avantage: string }[] = [
  { id: 'MENSUEL', nom: 'Mensuel', prix: 5000, duree: '1 mois', avantage: 'Pour commencer' },
  { id: 'TRIMESTRIEL', nom: 'Trimestriel', prix: 13500, duree: '3 mois', avantage: 'Économisez 1 500 FCFA' },
  { id: 'ANNUEL', nom: 'Annuel', prix: 50000, duree: '12 mois', avantage: 'Le meilleur tarif' },
]
const monnaie = (n: number) => Number(n).toLocaleString('fr-FR') + ' FCFA'
const statuts = { EN_ATTENTE: 'En attente de vérification', ACTIF: 'Actif', REFUSE: 'Demande refusée', EXPIRE: 'Expiré', ANNULE: 'Paiement annulé' }

export default function AbonnementProprietaire() {
  const { jeton } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [historique, setHistorique] = useState<Abonnement[]>([])
  const [forfait, setForfait] = useState<Forfait>('MENSUEL')
  const [mode, setMode] = useState('WAVE')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [paiementEnCours, setPaiementEnCours] = useState(false)

  const charger = useCallback(async () => {
    if (!jeton) return
    try { setHistorique(await appelApi<Abonnement[]>('/api/abonnements/historique', { token: jeton })) }
    catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les abonnements.') }
    finally { setChargement(false) }
  }, [jeton])
  useEffect(() => { void charger() }, [charger])

  useEffect(() => {
    const referencePayDunya = searchParams.get('token') || searchParams.get('token')
    if (!jeton || !referencePayDunya) return
    let actif = true
    setErreur('')
    setMessage('Vérification du statut du paiement…')
    appelApi<{ status: 'completed' | 'pending' | 'cancelled' }>(
      '/api/abonnements/paydunya/retour?token=' + encodeURIComponent(referencePayDunya),
      { token: jeton },
    ).then(resultat => {
      if (!actif) return
      if (resultat.status === 'completed') setMessage('Paiement confirmé. Votre abonnement est maintenant actif.')
      else if (resultat.status === 'cancelled') setMessage('Le paiement a été annulé. Vous pouvez recommencer.')
      else setMessage('Paiement en attente de confirmation. Consultez votre historique dans quelques instants.')
      void charger()
    }).catch(e => {
      if (actif) setErreur(e instanceof ApiError ? e.message : 'Impossible de vérifier le paiement pour le moment.')
    }).finally(() => {
      if (actif) setSearchParams({}, { replace: true })
    })
    return () => { actif = false }
  }, [jeton, searchParams, setSearchParams, charger])

  const actif = historique.find(a => a.statut === 'ACTIF' && a.dateFin && a.dateFin >= new Date().toISOString().slice(0, 10))
  const attente = historique.some(a => a.statut === 'EN_ATTENTE')
  const choisi = forfaits.find(f => f.id === forfait)!

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!jeton) return
    setErreur(''); setMessage(''); setEnvoi(true)
    try {
      await appelApi('/api/abonnements/demande', {
        method: 'POST', token: jeton,
        body: { forfait, modePaiement: mode, referencePaiement: reference.trim() || null, note: note.trim() || null },
      })
      setMessage('Votre demande a été envoyée. L’abonnement sera activé après vérification du paiement par l’administration.')
      setReference(''); setNote('')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer la demande.') }
    finally { setEnvoi(false) }
  }

  async function payerEnLigne() {
    if (!jeton) return
    setErreur(''); setMessage(''); setPaiementEnCours(true)
    try {
      const resultat = await appelApi<{ url: string }>('/api/abonnements/payer', {
        method: 'POST', token: jeton, body: { forfait },
      })
      if (!resultat.url || !resultat.url.startsWith('https://')) throw new Error('Lien de paiement invalide.')
      window.location.assign(resultat.url)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Impossible de démarrer le paiement en ligne.')
      setPaiementEnCours(false)
    }
  }

  return <section className="mt-9 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-amber-800">Services propriétaires</p><h2 className="mt-2 text-2xl font-bold text-nuit-900">Abonnement de publication</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">L’abonnement permet de publier directement vos annonces. Si vous confiez un bien à ImmoSénégal ou à une agence partenaire et que celle-ci accepte le mandat, aucun abonnement propriétaire n’est exigé pour ce bien.</p><p className="mt-2 text-sm text-slate-600">Choisissez une durée puis payez en ligne avec PayDunya, selon les moyens de paiement activés sur le compte marchand.</p></div>
    {actif && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Abonnement actif</strong> — {actif.forfait.toLowerCase()} jusqu’au {actif.dateFin}. Vous pouvez renouveler après son expiration.</div>}
    {attente && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Une demande est déjà en cours de vérification. Vous pourrez en soumettre une nouvelle après la décision de l’administration.</div>}
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
    <div className="mt-5 grid gap-3 md:grid-cols-3">{forfaits.map(f => <button key={f.id} type="button" onClick={() => setForfait(f.id)} className={'rounded-2xl border p-4 text-left transition ' + (forfait === f.id ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : 'border-slate-200 hover:border-amber-300')}><span className="text-sm font-semibold text-nuit-900">{f.nom}</span><span className="mt-2 block text-2xl font-bold text-nuit-900">{monnaie(f.prix)}</span><span className="mt-1 block text-xs text-slate-500">{f.duree}</span><span className="mt-3 block text-xs font-semibold text-amber-800">{f.avantage}</span></button>)}</div>
    <form onSubmit={e => void soumettre(e)} className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Mode de paiement manuel<select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="WAVE">Wave</option><option value="ORANGE_MONEY">Orange Money</option><option value="VIREMENT">Virement bancaire</option><option value="ESPECES">Espèces à l’agence</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Référence de transaction (facultatif)<input value={reference} onChange={e => setReference(e.target.value)} maxLength={150} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" placeholder="Numéro ou référence"/></label>
      <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Précisions (facultatif)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" placeholder="Informations utiles pour vérifier votre paiement…"/></label>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2"><p className="text-sm text-slate-600">Total : <strong className="text-nuit-900">{monnaie(choisi.prix)}</strong></p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void payerEnLigne()} disabled={paiementEnCours || envoi || attente || !!actif} className="rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{paiementEnCours ? 'Connexion…' : 'Payer en ligne (Orange Money ou Wave)'}</button><button disabled={envoi || paiementEnCours || attente || !!actif} className="rounded-full bg-nuit-900 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{envoi ? 'Envoi…' : 'Envoyer une déclaration manuelle'}</button></div></div>
      <p className="text-xs text-slate-500 sm:col-span-2">Le paiement en ligne est confirmé automatiquement par notification sécurisée PayDunya avant l’activation. Le bouton de déclaration manuelle reste réservé aux paiements reçus hors ligne.</p>
    </form>
    <div className="mt-7"><h3 className="font-bold text-nuit-900">Historique des abonnements</h3>{chargement ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : historique.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucun abonnement enregistré.</p> : <div className="mt-3 space-y-2">{historique.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-semibold text-nuit-900">{a.forfait} · {monnaie(a.montant)}</p><p className="mt-1 text-xs text-slate-500">{new Date(a.creeLe).toLocaleDateString('fr-FR')} · {a.modePaiement}{a.referencePaiement ? ' · ' + a.referencePaiement : ''}</p><p className="mt-1 text-xs text-slate-500">{a.dateFin ? 'Valable jusqu’au ' + a.dateFin : 'Dates à confirmer après validation'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statuts[a.statut]}</span></div>)}</div>}</div>
  </section>
}
