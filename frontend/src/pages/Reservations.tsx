import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BookmarkCheck, Check, X } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import type { Role } from '../types'

type StatutReservation = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE'
interface Reservation {
  id: string
  annonceId: string
  annonceTitre: string
  ville: string
  quartier: string
  clientId: string
  clientNom: string
  clientEmail: string
  clientTelephone: string | null
  proprietaireNom: string
  message: string | null
  statut: StatutReservation
  reponseProprietaire: string | null
  creeLe: string
}

const libelles: Record<StatutReservation, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
}

export default function Reservations() {
  const { utilisateur, jeton } = useAuth()
  const role = utilisateur?.role as Role | undefined
  const admin = role === 'ADMIN'
  const agent = role === 'AGENT'
  const client = role === 'CLIENT'
  const [demandes, setDemandes] = useState<Reservation[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [contratOuvert, setContratOuvert] = useState<string | null>(null)
  const [loyer, setLoyer] = useState('')
  const [depot, setDepot] = useState('0')
  const [debut, setDebut] = useState(new Date().toISOString().slice(0,10))
  const [fin, setFin] = useState('')

  const charger = useCallback(async () => {
    setErreur('')
    try {
      const chemin = admin ? '/api/reservations/admin' : client ? '/api/reservations/mes-demandes' : '/api/reservations/recues'
      setDemandes(await appelApi<Reservation[]>(chemin, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les réservations.')
    } finally {
      setChargement(false)
    }
  }, [admin, client, jeton])

  useEffect(() => { void charger() }, [charger])

  async function decider(id: string, action: 'ACCEPTEE' | 'REFUSEE') {
    setEnCours(id)
    setErreur('')
    try {
      await appelApi('/api/reservations/' + id + '/decision', {
        method: 'POST', token: jeton, body: { action, reponse: null },
      })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible.')
    } finally { setEnCours(null) }
  }

  async function creerContrat(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault()
    setEnCours(id); setErreur('')
    try {
      await appelApi(`/api/locations/reservations/${id}/contrat`, {
        method: 'POST', token: jeton,
        body: { loyerMensuel: Number(loyer), depotGarantie: Number(depot), dateDebut: debut, dateFin: fin || null },
      })
      setContratOuvert(null); setLoyer(''); setDepot('0'); setFin('')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de créer le contrat. Vérifiez que l’annonce concerne une location.')
    } finally { setEnCours(null) }
  }

  async function annuler(id: string) {
    setEnCours(id)
    setErreur('')
    try {
      await appelApi('/api/reservations/' + id + '/annuler', { method: 'POST', token: jeton })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Annulation impossible.')
    } finally { setEnCours(null) }
  }

  if (role !== 'CLIENT' && role !== 'PROPRIETAIRE' && role !== 'AGENT' && role !== 'ADMIN') {
    return <div className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cet espace est réservé aux clients, propriétaires, agents mandatés et administrateurs.</p></div>
  }

  const titre = admin ? 'Toutes les réservations' : client ? 'Mes demandes de réservation' : 'Réservations reçues'
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-emeraude-700">Espace personnel</p>
        <h1 className="mt-2 font-titre text-3xl font-semibold text-nuit-900">{titre}</h1>
        <p className="mt-2 text-slate-600">{client ? 'Suivez les réponses des propriétaires pour les logements qui vous intéressent.' : 'Chaque demande est associée au logement concerné et à son propriétaire ou à son agence gestionnaire.'}</p>
      </div>
      {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement des réservations…</p>}
      {!chargement && demandes.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookmarkCheck className="mx-auto h-9 w-9 text-emeraude-700" /><h2 className="mt-3 text-lg font-semibold text-nuit-900">Aucune réservation pour le moment</h2><p className="mt-1 text-sm text-slate-600">Les demandes liées à vos annonces ou à votre compte apparaîtront ici.</p></div>}
      <div className="space-y-4">
        {demandes.map(d => (
          <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-nuit-900">{d.annonceTitre}</h2><p className="mt-1 text-sm text-slate-600">{d.quartier}, {d.ville}</p></div>
              <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (d.statut === 'ACCEPTEE' ? 'bg-dore-100 text-nuit-900' : d.statut === 'REFUSEE' || d.statut === 'ANNULEE' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900')}>{libelles[d.statut]}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{client ? 'Propriétaire' : 'Demandeur'} : <strong className="text-slate-800">{client ? d.proprietaireNom : d.clientNom}</strong>{!client ? ' · ' + d.clientEmail + (d.clientTelephone ? ' · ' + d.clientTelephone : '') : ''}</p>
            <p className="mt-1 text-xs text-slate-500">Demande envoyée le {new Date(d.creeLe).toLocaleString('fr-FR')}</p>
            {d.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {d.message} »</p>}
            {d.reponseProprietaire && <p className="mt-3 rounded-xl bg-dore-100 p-3 text-sm text-nuit-900">Réponse : {d.reponseProprietaire}</p>}
            {!client && !admin && d.statut === 'EN_ATTENTE' && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button disabled={enCours === d.id} onClick={() => void decider(d.id, 'ACCEPTEE')} className="inline-flex items-center gap-2 rounded-lg bg-emeraude-700 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Accepter</button><button disabled={enCours === d.id} onClick={() => void decider(d.id, 'REFUSEE')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><X className="h-4 w-4" /> Refuser</button></div>}
            {!client && !admin && d.statut === 'ACCEPTEE' && <div className="mt-4 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setContratOuvert(contratOuvert === d.id ? null : d.id)} className="rounded-lg border border-emeraude-700 px-4 py-2 text-sm font-semibold text-emeraude-800">Préparer le contrat de location</button>
              {contratOuvert === d.id && <form onSubmit={e => void creerContrat(e,d.id)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <label className="text-sm">Loyer mensuel (FCFA)<input required type="number" min="1" step="0.01" value={loyer} onChange={e=>setLoyer(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <label className="text-sm">Dépôt de garantie (FCFA)<input required type="number" min="0" step="0.01" value={depot} onChange={e=>setDepot(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <label className="text-sm">Date de début<input required type="date" value={debut} onChange={e=>setDebut(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <label className="text-sm">Date de fin (facultative)<input type="date" value={fin} onChange={e=>setFin(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <button disabled={enCours===d.id} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Créer le contrat</button>
                <p className="text-xs text-slate-500 sm:col-span-2">Le contrat sera rattaché au propriétaire et visible par le locataire. L’agent ne signe pas à sa place : les parties doivent vérifier et formaliser leur accord.</p>
              </form>}
            </div>}
            {client && d.statut === 'EN_ATTENTE' && <button disabled={enCours === d.id} onClick={() => void annuler(d.id)} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Annuler la demande</button>}
          </article>
        ))}
      </div>
    </main>
  )
}
