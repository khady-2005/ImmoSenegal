import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
  const client = role === 'CLIENT'
  const [demandes, setDemandes] = useState<Reservation[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)
  const [contratOuvert, setContratOuvert] = useState<string | null>(null)
  const [loyer, setLoyer] = useState('')
  const [depot, setDepot] = useState('0')
  const [debut, setDebut] = useState(new Date().toISOString().slice(0,10))
  const [duree, setDuree] = useState<'INDETERMINEE' | 'DETERMINEE'>('INDETERMINEE')
  const [fin, setFin] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<'TOUS' | StatutReservation>('TOUS')

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
        body: { loyerMensuel: Number(loyer), depotGarantie: Number(depot), dateDebut: debut, dateFin: duree === 'DETERMINEE' ? fin : null },
      })
      setContratOuvert(null); setLoyer(''); setDepot('0'); setFin(''); setDuree('INDETERMINEE')
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

  const demandesFiltrees = useMemo(() => demandes.filter(d => {
    const q = recherche.trim().toLocaleLowerCase()
    const correspond = !q || [d.annonceTitre, d.ville, d.quartier, d.clientNom, d.proprietaireNom].some(v => v.toLocaleLowerCase().includes(q))
    return correspond && (filtre === 'TOUS' || d.statut === filtre)
  }), [demandes, recherche, filtre])
  const enAttente = demandes.filter(d => d.statut === 'EN_ATTENTE').length
  const acceptees = demandes.filter(d => d.statut === 'ACCEPTEE').length
  const refusees = demandes.filter(d => d.statut === 'REFUSEE').length

  const titre = admin ? 'Toutes les réservations' : client ? 'Mes demandes de réservation' : 'Réservations reçues'
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-base font-bold uppercase tracking-wider text-amber-800">Espace personnel</p>
        <h1 className="mt-2 font-titre text-4xl font-semibold text-nuit-900">{titre}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{client ? 'Suivez les réponses du propriétaire ou de l’agence mandatée pour les logements qui vous intéressent.' : 'Chaque demande est associée au logement concerné et à son propriétaire ou à son agence gestionnaire.'}</p>
      </div>
      {erreur && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {chargement && <p role="status" className="py-10 text-center text-slate-500">Chargement des réservations…</p>}
      {!chargement && demandes.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookmarkCheck className="mx-auto h-9 w-9 text-amber-800" /><h2 className="mt-3 text-lg font-semibold text-nuit-900">Aucune réservation pour le moment</h2><p className="mt-1 text-sm text-slate-600">Les demandes liées à vos annonces ou à votre compte apparaîtront ici.</p></div>}
      {!chargement && <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Résumé des réservations">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">En attente</p><p className="mt-1 text-2xl font-bold text-nuit-900">{enAttente}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Acceptées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{acceptees}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Refusées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{refusees}</p></div>
      </section>}
      {!chargement && demandes.length > 0 && <section className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px]">
        <label className="text-sm font-medium text-slate-700">Rechercher une réservation
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Logement, ville, demandeur…" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/>
        </label>
        <label className="text-sm font-medium text-slate-700">État
          <select value={filtre} onChange={e => setFiltre(e.target.value as 'TOUS' | StatutReservation)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="TOUS">Tous les états</option>{Object.entries(libelles).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
      </section>}
      {!chargement && demandes.length > 0 && demandesFiltrees.length === 0 && <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune réservation ne correspond à votre recherche.</p>}
      <div className="space-y-4">
        {demandesFiltrees.map(d => (
          <article key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-nuit-900">{d.annonceTitre}</h2><p className="mt-1 text-sm text-slate-600">{d.quartier}, {d.ville}</p></div>
              <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (d.statut === 'ACCEPTEE' ? 'bg-dore-100 text-nuit-900' : d.statut === 'REFUSEE' || d.statut === 'ANNULEE' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900')}>{libelles[d.statut]}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{client ? 'Propriétaire' : 'Demandeur'} : <strong className="text-slate-800">{client ? d.proprietaireNom : d.clientNom}</strong>{!client ? ' · ' + d.clientEmail + (d.clientTelephone ? ' · ' + d.clientTelephone : '') : ''}</p>
            <p className="mt-1 text-xs text-slate-500">Demande envoyée le {new Date(d.creeLe).toLocaleString('fr-FR')}</p>
            {d.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">« {d.message} »</p>}
            {d.reponseProprietaire && <p className="mt-3 rounded-xl bg-dore-100 p-3 text-sm text-nuit-900">Réponse : {d.reponseProprietaire}</p>}
            {!client && !admin && d.statut === 'EN_ATTENTE' && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button disabled={enCours === d.id} onClick={() => void decider(d.id, 'ACCEPTEE')} className="inline-flex items-center gap-2 rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white"><Check className="h-4 w-4" /> Accepter</button><button disabled={enCours === d.id} onClick={() => void decider(d.id, 'REFUSEE')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"><X className="h-4 w-4" /> Refuser</button></div>}
            {!client && !admin && d.statut === 'ACCEPTEE' && <div className="mt-4 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setContratOuvert(contratOuvert === d.id ? null : d.id)} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900">Préparer le contrat de location</button>
              {contratOuvert === d.id && <form onSubmit={e => void creerContrat(e,d.id)} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <label className="text-sm">Loyer mensuel (FCFA)<input required type="number" min="1" step="0.01" value={loyer} onChange={e=>setLoyer(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <label className="text-sm">Dépôt de garantie / caution (FCFA)
                  <input required type="number" min="0" step="0.01" value={depot} onChange={e=>setDepot(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/>
                  <span className="mt-1 block text-xs text-slate-500">Montant fixé d’un commun accord. Saisissez 0 si aucune caution n’est prévue.</span>
                </label>
                <label className="text-sm">Date de début<input required type="date" value={debut} onChange={e=>setDebut(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
                <label className="text-sm">Durée du contrat
                  <select value={duree} onChange={e=>{setDuree(e.target.value as 'INDETERMINEE'|'DETERMINEE');if(e.target.value==='INDETERMINEE')setFin('')}} className="mt-1 w-full rounded-lg border bg-white p-2">
                    <option value="INDETERMINEE">Durée indéterminée</option>
                    <option value="DETERMINEE">Durée déterminée</option>
                  </select>
                </label>
                {duree === 'DETERMINEE' && <label className="text-sm">Date de fin obligatoire
                  <input required type="date" min={debut} value={fin} onChange={e=>setFin(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/>
                </label>}

                <button type="submit" disabled={enCours===d.id} style={{ color: "#ffffff", backgroundColor: "#173b63", minHeight: 48, fontWeight: 700, fontSize: 15, opacity: enCours===d.id ? 0.65 : 1 }} className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-center sm:col-span-2">{enCours===d.id ? "Création du contrat…" : "Créer le contrat"}</button>
                <p className="text-xs text-slate-500 sm:col-span-2">Sans date de fin, le contrat est enregistré à durée indéterminée. Pour une durée déterminée, choisissez obligatoirement une date de fin. Le contrat sera visible par le locataire ; les deux parties doivent vérifier les conditions avant de signer.</p>
              </form>}
            </div>}
            {client && d.statut === 'EN_ATTENTE' && <button disabled={enCours === d.id} onClick={() => void annuler(d.id)} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Annuler la demande</button>}
          </article>
        ))}
      </div>
    </main>
  )
}
