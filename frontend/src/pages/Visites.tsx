import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Check, Clock3, X, BookmarkCheck } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import type { Role } from '../types'

type StatutVisite = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'PROPOSEE' | 'ANNULEE' | 'VISITEE'
interface DemandeVisite {
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
  dateVisite: string
  message: string | null
  statut: StatutVisite
  reponseProprietaire: string | null
  creeLe: string
  gestionType?: 'PROPRIETAIRE' | 'AGENCE'
  agenceNom?: string | null
}

const libelles: Record<StatutVisite, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  PROPOSEE: 'Nouveau créneau proposé',
  ANNULEE: 'Annulée',
  VISITEE: 'Visite effectuée',
}

function dateLisible(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

function dateLocaleMin() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function Visites({ modeAdmin = false }: { modeAdmin?: boolean }) {
  const { utilisateur, jeton } = useAuth()
  const role = utilisateur?.role as Role | undefined
  const admin = modeAdmin || role === 'ADMIN'
  const client = role === 'CLIENT'
  const [demandes, setDemandes] = useState<DemandeVisite[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [reservationCreee, setReservationCreee] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<'TOUS' | StatutVisite>('TOUS')
  const [filtreGestion, setFiltreGestion] = useState<'TOUS' | 'PROPRIETAIRE' | 'AGENCE'>('TOUS')

  const charger = useCallback(async () => {
    setErreur('')
    try {
      const chemin = admin ? '/api/visites/admin' : client ? '/api/visites/mes-demandes' : '/api/visites/recues'
      setDemandes(await appelApi<DemandeVisite[]>(chemin, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les demandes.')
    } finally {
      setChargement(false)
    }
  }, [admin, client, jeton])

  useEffect(() => { void charger() }, [charger])

  async function action(id: string, statut: 'ACCEPTEE' | 'REFUSEE' | 'PROPOSEE', nouvelleDate?: string, reponse?: string) {
    setEnCours(id)
    setErreur('')
    try {
      await appelApi('/api/visites/' + id + '/decision', {
        method: 'POST', token: jeton,
        body: { action: statut, nouvelleDate: nouvelleDate || null, reponse: reponse || null },
      })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible.')
    } finally { setEnCours(null) }
  }

  async function marquerEffectuee(id: string) {
    setEnCours(id); setErreur('')
    try {
      await appelApi('/api/visites/' + id + '/effectuee', { method: 'POST', token: jeton })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de confirmer la réalisation de la visite.')
    } finally { setEnCours(null) }
  }

  async function reserverBien(d: DemandeVisite) {
    setEnCours(d.id)
    setErreur('')
    setReservationCreee(null)
    try {
      await appelApi('/api/reservations/annonces/' + d.annonceId, {
        method: 'POST', token: jeton, body: { message: 'Demande de réservation après acceptation de la visite.' },
      })
      setReservationCreee(d.id)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer la demande de réservation.')
    } finally { setEnCours(null) }
  }

  async function actionClient(id: string, type: 'confirmer' | 'annuler') {
    setEnCours(id)
    setErreur('')
    try {
      await appelApi('/api/visites/' + id + '/' + type, { method: 'POST', token: jeton })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible.')
    } finally { setEnCours(null) }
  }

  function proposer(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const date = String(form.get('nouvelleDate') || '')
    const reponse = String(form.get('reponse') || '')
    if (date) void action(id, 'PROPOSEE', date, reponse)
  }

  const demandesFiltrees = useMemo(() => demandes.filter(d => {
    const q = recherche.trim().toLocaleLowerCase()
    const correspond = !q || [d.annonceTitre, d.ville, d.quartier, d.clientNom, d.proprietaireNom].some(v => v.toLocaleLowerCase().includes(q))
    return correspond && (filtre === 'TOUS' || d.statut === filtre) && (!admin || filtreGestion === 'TOUS' || d.gestionType === filtreGestion)
  }), [demandes, recherche, filtre, filtreGestion, admin])
  const enAttente = demandes.filter(d => d.statut === 'EN_ATTENTE').length
  const confirmees = demandes.filter(d => d.statut === 'ACCEPTEE').length
  const aConfirmer = demandes.filter(d => d.statut === 'PROPOSEE').length

  const titre = admin ? 'Toutes les demandes de visite' : client ? 'Mes demandes de visite' : 'Demandes de visite reçues'
  if (!admin && !['CLIENT', 'PROPRIETAIRE', 'AGENT', 'GESTIONNAIRE', 'CAISSIER', 'ASSISTANT_ADMINISTRATIF', 'RESPONSABLE'].includes(role ?? '')) {
    return <div className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cet espace est réservé aux clients, propriétaires, agents mandatés et administrateurs.</p></div>
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-base font-bold uppercase tracking-wider text-amber-800">Espace personnel</p>
        <h1 className="mt-2 font-titre text-4xl font-semibold text-nuit-900">{titre}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{client ? 'Retrouvez ici les réponses du propriétaire ou de l’agence gestionnaire et gérez vos rendez-vous.' : 'Consultez les demandes et répondez aux personnes intéressées par les biens que vous gérez.'}</p>
      </div>
      {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement des demandes…</p>}
      {!chargement && demandes.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CalendarDays className="mx-auto h-9 w-9 text-amber-800" /><h2 className="mt-3 text-lg font-semibold text-nuit-900">Aucune demande pour le moment</h2><p className="mt-1 text-sm text-slate-600">{client ? 'Lorsque vous demanderez une visite, elle apparaîtra ici.' : 'Les demandes reçues pour vos annonces apparaîtront ici.'}</p></div>}
      {!chargement && <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Résumé des visites">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">En attente</p><p className="mt-1 text-2xl font-bold text-nuit-900">{enAttente}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Visites acceptées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{confirmees}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Créneaux à confirmer</p><p className="mt-1 text-2xl font-bold text-nuit-900">{aConfirmer}</p></div>
      </section>}
      {!chargement && demandes.length > 0 && <section className={`mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 ${admin ? "sm:grid-cols-[1fr_220px_220px]" : "sm:grid-cols-[1fr_220px]"}`}>
        <label className="text-sm font-medium text-slate-700">Rechercher une visite
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Logement, ville, demandeur…" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/>
        </label>
        {admin && <label className="text-sm font-medium text-slate-700">Origine de la gestion<select value={filtreGestion} onChange={e => setFiltreGestion(e.target.value as typeof filtreGestion)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="TOUS">Tous</option><option value="PROPRIETAIRE">Gestion directe propriétaire</option><option value="AGENCE">Gestion par agent / agence</option></select></label>}
        <label className="text-sm font-medium text-slate-700">État
          <select value={filtre} onChange={e => setFiltre(e.target.value as 'TOUS' | StatutVisite)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="TOUS">Tous les états</option>{Object.entries(libelles).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
      </section>}
      {!chargement && demandes.length > 0 && demandesFiltrees.length === 0 && <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune visite ne correspond à votre recherche.</p>}
      <div className="space-y-4">
        {demandesFiltrees.map(d => (
          <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-nuit-900">{d.annonceTitre}</h2><p className="mt-1 text-sm text-slate-600">{d.quartier}, {d.ville}</p></div>
              <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (d.statut === 'ACCEPTEE' ? 'bg-dore-100 text-nuit-900' : d.statut === 'REFUSEE' || d.statut === 'ANNULEE' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900')}>{libelles[d.statut]}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-800"><Clock3 className="h-4 w-4 text-amber-800" />{dateLisible(d.dateVisite)}</div>
            {client ? <p className="mt-2 text-sm text-slate-600">Propriétaire : {d.proprietaireNom}</p> : <><p className="mt-1 text-xs font-semibold text-blue-800">{admin ? (d.gestionType === "AGENCE" ? `Gestion par ${d.agenceNom || "une agence mandatée"}` : "Gestion directe par le propriétaire") : ""}</p><div className="mt-2 text-sm text-slate-600"><p>Demandeur : <strong className="text-slate-800">{d.clientNom}</strong> · {d.clientEmail}{d.clientTelephone ? ' · ' + d.clientTelephone : ''}</p></div></>}
            {d.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {d.message} »</p>}
            {client && (d.statut === 'ACCEPTEE' || d.statut === 'VISITEE') && <div className="mt-4 border-t border-slate-100 pt-4">
              {reservationCreee === d.id ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Votre demande de réservation a été envoyée. Retrouvez son suivi dans « Mes réservations ».</p> : <button disabled={enCours === d.id} onClick={() => void reserverBien(d)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dore-600 bg-dore-500 px-5 py-3 text-sm font-extrabold text-nuit-950 shadow-md transition hover:bg-dore-400 disabled:cursor-not-allowed disabled:opacity-60"><BookmarkCheck className="h-4 w-4" /> Réserver ce bien</button>}
              <p className="mt-2 text-xs text-slate-500">Cette action envoie une demande au propriétaire ou à l’agence gestionnaire. Elle ne confirme pas encore la location.</p>
            </div>}
            {d.reponseProprietaire && <p className="mt-3 rounded-xl bg-dore-100 p-3 text-sm text-nuit-900">Réponse : {d.reponseProprietaire}</p>}
            {client && d.statut === 'PROPOSEE' && <div className="mt-4 flex flex-wrap gap-2"><button disabled={enCours === d.id} onClick={() => void actionClient(d.id, 'confirmer')} className="inline-flex items-center gap-2 rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Confirmer ce créneau</button><button disabled={enCours === d.id} onClick={() => void actionClient(d.id, 'annuler')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Annuler la demande</button></div>}
            {client && d.statut === 'EN_ATTENTE' && <button disabled={enCours === d.id} onClick={() => void actionClient(d.id, 'annuler')} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"><X className="h-4 w-4" /> Annuler la demande</button>}
            {!client && d.statut === 'ACCEPTEE' && <button disabled={enCours === d.id} onClick={() => void marquerEffectuee(d.id)} className="mt-4 rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white">Confirmer que la visite a été effectuée</button>}
            {!client && String(d.statut).trim().toUpperCase() === 'EN_ATTENTE' && <div className="mt-5 space-y-3 border-t border-slate-100 pt-4"><div className="flex flex-wrap gap-2"><button disabled={enCours === d.id} onClick={() => void action(d.id, 'ACCEPTEE')} className="rounded-lg border border-[#d8ad45] bg-[#f4d47a] px-4 py-2 text-sm font-semibold text-[#35280b] shadow-sm transition-colors hover:bg-[#edc45b]">Accepter</button><button disabled={enCours === d.id} onClick={() => void action(d.id, 'REFUSEE')} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Refuser</button></div><form onSubmit={e => proposer(e, d.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label className="sr-only" htmlFor={'date-'+d.id}>Proposer une autre date</label><input id={'date-'+d.id} name="nouvelleDate" type="datetime-local" min={dateLocaleMin()} required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input name="reponse" maxLength={1000} placeholder="Message (facultatif)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button disabled={enCours === d.id} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900">Proposer ce créneau</button></form></div>}
          </article>
        ))}
      </div>
    </main>
  )
}
