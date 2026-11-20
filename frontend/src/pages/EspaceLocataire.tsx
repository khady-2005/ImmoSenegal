import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = {
  id: string
  annonceId: string
  annonceTitre: string
  loyerMensuel: number
  depotGarantie: number
  etat: string
  proprietaireNom: string
  locataireNom: string
  dateDebut: string
  dateFin: string | null
  resiliationDemandeeParId: string | null
  resiliationDemandeeParNom: string | null
  resiliationDemandeeLe: string | null
  dateFinSouhaitee: string | null
}
const monnaie = (n: number) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const libelleEtat: Record<string, string> = {
  ACTIF: 'Actif',
  RESILIATION_DEMANDEE: 'Résiliation en attente',
  RESILIATION_PLANIFIEE: 'Départ planifié',
  TERMINE: 'Terminé',
  RESILIE: 'Résilié',
}
const liens = [
  { href: '/mes-contrats-location', titre: 'Mes contrats et loyers', texte: 'Consulter les contrats, les échéances, déclarer un paiement et gérer une demande de résiliation.', tag: 'Location' },
  { href: '/mes-offres', titre: 'Mes propositions de loyer', texte: 'Proposer un loyer pour un logement et suivre les réponses des propriétaires ou agences.', tag: 'Avant location' },
  { href: '/mes-reservations', titre: 'Mes réservations', texte: 'Suivre les demandes de réservation et les réponses concernant les logements.', tag: 'Candidatures' },
  { href: '/mes-visites', titre: 'Mes visites', texte: 'Consulter les visites demandées et organiser les rendez-vous.', tag: 'Rendez-vous' },
  { href: '/messagerie', titre: 'Messagerie', texte: 'Échanger avec le propriétaire ou l’agence qui gère le logement.', tag: 'Échanges' },
  { href: '/incidents-location', titre: 'Incidents et réparations', texte: 'Signaler un problème et suivre sa prise en charge.', tag: 'Pendant la location' },
  { href: '/etats-des-lieux', titre: 'États des lieux', texte: 'Créer, consulter et valider les constats d’entrée et de sortie.', tag: 'Entrée et sortie' },
  { href: '/depot-garantie', titre: 'Dépôt de garantie', texte: 'Consulter le bilan proposé et confirmer les montants ou signaler un désaccord.', tag: 'Fin de location' },
]

export default function EspaceLocataire() {
  const { jeton, utilisateur } = useAuth()
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [suivi, setSuivi] = useState({ visites: 0, reservations: 0, propositions: 0 })
  const [suiviPartiel, setSuiviPartiel] = useState(false)

  useEffect(() => {
    if (!jeton) return
    let actif = true
    setChargement(true)
    setErreur('')
    setSuiviPartiel(false)
    Promise.allSettled([
      appelApi<Contrat[]>('/api/locations/mes-contrats', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/visites/mes-demandes', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/reservations/mes-demandes', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/offres/envoyees', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/offres-location/envoyees', { token: jeton }),
    ]).then(([contratsResult, visitesResult, reservationsResult, achatsResult, loyersResult]) => {
      if (!actif) return
      if (contratsResult.status === 'fulfilled') setContrats(contratsResult.value)
      else setErreur(contratsResult.reason instanceof ApiError ? contratsResult.reason.message : 'Impossible de charger vos locations.')
      const visites = visitesResult.status === 'fulfilled' ? visitesResult.value : []
      const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : []
      const achats = achatsResult.status === 'fulfilled' ? achatsResult.value : []
      const loyers = loyersResult.status === 'fulfilled' ? loyersResult.value : []
      setSuiviPartiel([visitesResult, reservationsResult, achatsResult, loyersResult].some(result => result.status === 'rejected'))
      setSuivi({
        visites: visites.filter(x => x.statut === 'EN_ATTENTE' || x.statut === 'PROPOSEE').length,
        reservations: reservations.filter(x => x.statut === 'EN_ATTENTE').length,
        propositions: [...achats, ...loyers].filter(x => x.statut === 'EN_ATTENTE').length,
      })
    }).finally(() => { if (actif) setChargement(false) })
    return () => { actif = false }
  }, [jeton])

  const actifs = useMemo(() => contrats.filter(c => c.etat === 'ACTIF' || c.etat === 'RESILIATION_PLANIFIEE'), [contrats])
  const demandes = contrats.filter(c => c.etat === 'RESILIATION_DEMANDEE')
  const demandesARepondre = demandes.filter(c => c.resiliationDemandeeParId !== utilisateur?.id)
  const mesDemandesResiliation = demandes.filter(c => c.resiliationDemandeeParId === utilisateur?.id)
  const historique = contrats.filter(c => c.etat === 'TERMINE' || c.etat === 'RESILIE')
  const loyer = actifs.reduce((s, c) => s + Number(c.loyerMensuel || 0), 0)

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="rounded-3xl bg-nuit-900 p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-dore-300">Espace personnel · Locataire</p>
      <h1 className="mt-2 text-3xl font-bold">Bonjour {utilisateur?.nomComplet || ''}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Retrouvez au même endroit vos démarches avant la location, le suivi de vos contrats, vos échanges avec le propriétaire ou l’agence et les formalités de départ.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link to="/mes-visites" className="rounded-xl border border-white/15 bg-white/5 p-3 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-dore-300"><p className="text-xs text-white/65">Visites en attente</p><p className="mt-1 text-2xl font-bold text-dore-300">{chargement ? '…' : suivi.visites}</p><span className="mt-1 block text-xs text-white/60">Voir mes visites →</span></Link>
        <Link to="/mes-reservations" className="rounded-xl border border-white/15 bg-white/5 p-3 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-dore-300"><p className="text-xs text-white/65">Réservations en attente</p><p className="mt-1 text-2xl font-bold text-dore-300">{chargement ? '…' : suivi.reservations}</p><span className="mt-1 block text-xs text-white/60">Voir mes réservations →</span></Link>
        <Link to="/mes-offres" className="rounded-xl border border-white/15 bg-white/5 p-3 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-dore-300"><p className="text-xs text-white/65">Propositions sans réponse</p><p className="mt-1 text-2xl font-bold text-dore-300">{chargement ? '…' : suivi.propositions}</p><span className="mt-1 block text-xs text-white/60">Voir mes propositions →</span></Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/catalogue?transaction=LOCATION" className="rounded-full bg-dore-300 px-5 py-2.5 text-sm font-bold text-nuit-900 hover:bg-dore-200">Trouver un logement</Link>
        <Link to="/messagerie" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Ouvrir la messagerie</Link>
      </div>
    </header>

    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {suiviPartiel && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Certaines statistiques n’ont pas pu être chargées. Consultez directement les rubriques Visites, Réservations et Propositions pour vérifier leur état complet.</p>}

    <section aria-label="Résumé de mes locations" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Contrats actifs ou départ planifié</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : actifs.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Demandes de résiliation à traiter</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : demandesARepondre.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Historique des locations</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : historique.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Loyers mensuels contractuels</p><p className="mt-2 text-xl font-bold text-nuit-900">{chargement ? '…' : monnaie(loyer)}</p></div>
    </section>

    <section className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-xl font-bold text-nuit-900">Toutes mes démarches</h2><p className="mt-1 text-sm text-slate-600">De la recherche d’un logement jusqu’à la restitution du dépôt de garantie.</p></div>
        <Link to="/mes-contrats-location" className="text-sm font-semibold text-amber-800 underline">Voir tous mes contrats</Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {liens.map(l => <Link key={l.href} to={l.href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{l.tag}</span>
          <h3 className="mt-2 font-bold text-nuit-900 group-hover:text-amber-800">{l.titre}</h3>
          <p className="mt-2 text-sm leading-5 text-slate-600">{l.texte}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-amber-800">Accéder →</span>
        </Link>)}
      </div>
    </section>

    <section className="mt-9">
      <h2 className="text-xl font-bold text-nuit-900">Mes locations en cours</h2>
      {chargement ? <p className="mt-3 text-sm text-slate-500">Chargement de vos contrats…</p> : actifs.length === 0 ?
        <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucune location active pour le moment. Vos futurs contrats apparaîtront ici après leur création par le propriétaire.</p> :
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{actifs.map(c => <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-nuit-900">{c.annonceTitre}</h3><span className="rounded-full bg-dore-100 px-3 py-1 text-xs font-semibold text-nuit-900">{libelleEtat[c.etat] || c.etat}</span></div>
          <p className="mt-3 text-sm text-slate-600">Propriétaire : <strong className="text-slate-800">{c.proprietaireNom}</strong></p>
          <p className="mt-1 text-sm text-slate-600">Loyer mensuel : <strong className="text-slate-800">{monnaie(c.loyerMensuel)}</strong></p>
          <p className="mt-1 text-sm text-slate-600">Dépôt de garantie : <strong className="text-slate-800">{monnaie(c.depotGarantie)}</strong></p>
          <p className="mt-2 text-xs text-slate-500">Début : {c.dateDebut}{c.dateFin ? ' · Fin : ' + c.dateFin : ''}</p>
          {c.etat === 'RESILIATION_PLANIFIEE' && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">Départ convenu le {c.dateFinSouhaitee || c.dateFin}. Les obligations du contrat continuent jusqu’à cette date.</p>}
          <Link to="/mes-contrats-location" className="mt-4 inline-flex text-sm font-semibold text-amber-800 underline">Gérer ce contrat</Link>
        </article>)}</div>}
    </section>

    {demandes.length > 0 && <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-bold text-amber-950">Suivi des demandes de résiliation</h2>
      {demandesARepondre.length > 0 && <>
        <p className="mt-2 text-sm text-amber-950">Une réponse de votre part est attendue pour :</p>
        <ul className="mt-2 space-y-2">{demandesARepondre.map(c => <li key={c.id} className="text-sm text-amber-950"><strong>{c.annonceTitre}</strong> — demande de {c.resiliationDemandeeParNom || "l’autre partie"} · départ souhaité : {c.dateFinSouhaitee || "à convenir"}</li>)}</ul>
      </>}
      {mesDemandesResiliation.length > 0 && <>
        <p className="mt-4 text-sm text-amber-950">Vos demandes qui attendent une réponse de l’autre partie :</p>
        <ul className="mt-2 space-y-2">{mesDemandesResiliation.map(c => <li key={c.id} className="text-sm text-amber-950"><strong>{c.annonceTitre}</strong> · départ souhaité : {c.dateFinSouhaitee || "à convenir"}</li>)}</ul>
      </>}
      <Link to="/mes-contrats-location" className="mt-3 inline-block text-sm font-bold text-amber-900 underline">Consulter les contrats et répondre</Link>
    </section>}

    {historique.length > 0 && <section className="mt-8">
      <h2 className="text-xl font-bold text-nuit-900">Historique de mes locations</h2>
      <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">{historique.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div><p className="font-semibold text-nuit-900">{c.annonceTitre}</p><p className="mt-1 text-xs text-slate-500">Propriétaire : {c.proprietaireNom} · {c.dateDebut}{c.dateFin ? ' au ' + c.dateFin : ''}</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{libelleEtat[c.etat] || c.etat}</span>
      </div>)}</div>
    </section>}
    <p className="mt-8 text-xs text-slate-500">Les paiements affichés dans ImmoSénégal sont des déclarations enregistrées par les parties. Ils ne constituent pas, à eux seuls, une confirmation bancaire.</p>
  </main>
}
