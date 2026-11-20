import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { appelApi, ApiError } from '../api'
import AbonnementProprietaire from '../components/AbonnementProprietaire'
import EvaluationAgenceMandat from '../components/EvaluationAgenceMandat'
import { useAuth } from '../auth'

type Mandat = {
  id: string; agenceId: string; agenceNom: string; annonceId: string; annonceTitre: string;
  ville: string; proprietaireId: string; proprietaireNom: string; origine: string; statut: string;
  creeLe: string; decideLe: string | null; resiliationDemandeeParId?: string | null
}
type AnnonceResume = { id: string; statut: string; dateFinPublication?: string | null; prix: number; transaction: string }
type PageAnnonces = { contenu: AnnonceResume[]; totalElements: number }
type Contrat = {
  id: string
  annonceId: string
  annonceTitre: string
  proprietaireNom: string
  locataireNom: string
  loyerMensuel: number
  etat: string
  depotGarantie: number
  dateDebut: string
  dateFin: string | null
  resiliationDemandeeParNom: string | null
  dateFinSouhaitee: string | null
}
const monnaie = (n: number) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const outils = [
  { href: '/mes-annonces', tag: 'Patrimoine', titre: 'Mes biens et annonces', texte: 'Créer, modifier, retirer vos annonces et suivre leur statut de publication.', action: 'Gérer mes biens' },
  { href: '/reservations-recues', tag: 'Candidatures', titre: 'Réservations reçues', texte: 'Étudier les demandes, accepter ou refuser et préparer un contrat après accord.', action: 'Traiter les demandes' },
  { href: '/visites-recues', tag: 'Rendez-vous', titre: 'Visites reçues', texte: 'Consulter les demandes, accepter, refuser ou proposer un autre créneau.', action: 'Organiser les visites' },
  { href: '/offres-recues', tag: 'Négociation', titre: 'Offres et propositions de loyer', texte: 'Examiner les offres d’achat et les propositions de loyer des candidats.', action: 'Répondre aux offres' },
  { href: '/messagerie', tag: 'Communication', titre: 'Messagerie propriétaire', texte: 'Échanger avec les locataires et les agences qui gèrent vos biens.', action: 'Ouvrir les messages' },
  { href: '/mes-contrats-location', tag: 'Gestion locative', titre: 'Contrats et loyers', texte: 'Consulter les contrats, enregistrer les loyers déclarés et suivre les résiliations.', action: 'Gérer les contrats' },
  { href: '/incidents-location', tag: 'Entretien', titre: 'Incidents et réparations', texte: 'Consulter les signalements et tenir les locataires informés de leur traitement.', action: 'Suivre les incidents' },
  { href: '/etats-des-lieux', tag: 'Entrée et sortie', titre: 'États des lieux', texte: 'Établir les constats d’entrée et de sortie et recueillir la validation du locataire.', action: 'Gérer les états des lieux' },
  { href: '/depot-garantie', tag: 'Fin de location', titre: 'Dépôts de garantie', texte: 'Préparer le bilan du dépôt après la fin du contrat et traiter les observations.', action: 'Suivre les dépôts' },
  { href: '/mes-annonces', tag: 'Délégation', titre: 'Confier un bien à une agence', texte: 'Choisir une agence et suivre les propositions ou mandats de gestion de vos annonces.', action: 'Gérer les mandats' },
]
const nomEtat = (etat: string) => ({ ACTIF: 'Actif', RESILIATION_DEMANDEE: 'Résiliation en attente', RESILIATION_PLANIFIEE: 'Départ planifié', TERMINE: 'Terminé', RESILIE: 'Résilié' }[etat] || etat)

export default function EspaceProprietaire() {
  const { jeton, utilisateur } = useAuth()
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [annonces, setAnnonces] = useState<AnnonceResume[]>([])
  const [totalAnnonces, setTotalAnnonces] = useState(0)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [suivi, setSuivi] = useState({ visites: 0, reservations: 0, offres: 0 })
  const [suiviPartiel, setSuiviPartiel] = useState(false)
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [actionMandat, setActionMandat] = useState<string | null>(null)

  useEffect(() => {
    if (!jeton) return
    let actif = true
    setChargement(true)
    Promise.allSettled([
      appelApi<Contrat[]>('/api/locations/mes-contrats', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/visites/recues', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/reservations/recues', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/offres/recues', { token: jeton }),
      appelApi<{ statut: string }[]>('/api/offres-location/recues', { token: jeton }),
      appelApi<Mandat[]>('/api/mandats/mes-propositions', { token: jeton }),
      appelApi<PageAnnonces>('/api/annonces/mes-annonces?taille=100', { token: jeton }),
    ]).then(([contratsResult, visitesResult, reservationsResult, achatsResult, loyersResult, mandatsResult, annoncesResult]) => {
      if (!actif) return
      if (contratsResult.status === 'fulfilled') {
        setContrats(contratsResult.value.filter(c => c.etat !== 'TERMINE' && c.etat !== 'RESILIE'))
      } else {
        setErreur(contratsResult.reason instanceof ApiError ? contratsResult.reason.message : 'Impossible de charger votre portefeuille locatif.')
      }
      const visites = visitesResult.status === 'fulfilled' ? visitesResult.value : []
      const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : []
      const achats = achatsResult.status === 'fulfilled' ? achatsResult.value : []
      const loyers = loyersResult.status === 'fulfilled' ? loyersResult.value : []
      setSuiviPartiel([visitesResult, reservationsResult, achatsResult, loyersResult, mandatsResult, annoncesResult].some(result => result.status === 'rejected'))
      if (mandatsResult.status === 'fulfilled') setMandats(mandatsResult.value)
      if (annoncesResult.status === 'fulfilled') {
        setAnnonces(annoncesResult.value.contenu)
        setTotalAnnonces(annoncesResult.value.totalElements)
      }
      setSuivi({
        visites: visites.filter(x => x.statut === 'EN_ATTENTE').length,
        reservations: reservations.filter(x => x.statut === 'EN_ATTENTE').length,
        offres: [...achats, ...loyers].filter(x => x.statut === 'EN_ATTENTE').length,
      })
    }).finally(() => { if (actif) setChargement(false) })
    return () => { actif = false }
  }, [jeton])

  const agirMandat = async (mandat: Mandat, action: 'resilier' | 'accepter' | 'refuser' | 'accepter-proposition' | 'refuser-proposition') => {
    if (!jeton) return
    setActionMandat(mandat.id); setErreur('')
    try {
      if (action === 'accepter-proposition' || action === 'refuser-proposition') {
        await appelApi(`/api/mandats/${mandat.id}/reponse`, { method: 'POST', token: jeton, body: { accepter: action === 'accepter-proposition' } })
      } else if (action === 'resilier') {
        await appelApi(`/api/mandats/${mandat.id}/resiliation`, { method: 'POST', token: jeton })
      } else {
        await appelApi(`/api/mandats/${mandat.id}/resiliation/reponse`, { method: 'POST', token: jeton, body: { accepter: action === 'accepter' } })
      }
      const actualises = await appelApi<Mandat[]>('/api/mandats/mes-propositions', { token: jeton })
      setMandats(actualises)
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter ce mandat.') }
    finally { setActionMandat(null) }
  }

  const actifs = useMemo(() => contrats.filter(c => c.etat === 'ACTIF' || c.etat === 'RESILIATION_PLANIFIEE'), [contrats])
  const loyer = actifs.reduce((s, c) => s + Number(c.loyerMensuel || 0), 0)
  const annoncesPubliees = annonces.filter(a => a.statut === 'PUBLIEE').length
  const annoncesEnAttente = annonces.filter(a => a.statut === 'EN_ATTENTE').length
  const annoncesModerees = annonces.filter(a => ['A_CORRIGER', 'REFUSEE', 'SUSPENDUE'].includes(a.statut)).length
  const aujourdHui = new Date().toISOString().slice(0, 10)
  const publicationsAExpirer = annonces.filter(a => a.statut === 'PUBLIEE' && a.dateFinPublication && a.dateFinPublication <= new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)).length

  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="rounded-3xl bg-nuit-900 p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-dore-300">Gestion de patrimoine · Espace propriétaire</p>
      <h1 className="mt-2 text-3xl font-bold">Bienvenue {utilisateur?.nomComplet || ''}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Pilotez vos annonces, les demandes des candidats, vos échanges avec les agences et toutes les étapes de vos locations depuis un seul espace.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/annonces/nouvelle" className="rounded-full bg-dore-300 px-5 py-2.5 text-sm font-bold text-nuit-900 hover:bg-dore-200">Publier un bien</Link>
        <Link to="/mes-annonces" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Voir mes annonces</Link>
      </div>
    </header>

    {erreur && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {suiviPartiel && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Certaines demandes reçues n’ont pas pu être chargées. Ouvrez les rubriques concernées pour vérifier leur état complet.</p>}

    <section aria-label="Résumé du portefeuille locatif" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Link to="/reservations-recues" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"><p className="text-xs text-slate-500">Réservations à traiter</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : suivi.reservations}</p><span className="mt-1 block text-xs text-amber-800">Consulter →</span></Link>
      <Link to="/visites-recues" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"><p className="text-xs text-slate-500">Visites à traiter</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : suivi.visites}</p><span className="mt-1 block text-xs text-amber-800">Consulter →</span></Link>
      <Link to="/offres-recues" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"><p className="text-xs text-slate-500">Offres sans réponse</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : suivi.offres}</p><span className="mt-1 block text-xs text-amber-800">Consulter →</span></Link>
      <Link to="/mes-contrats-location" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm"><p className="text-xs text-slate-500">Loyers mensuels contractuels</p><p className="mt-2 text-xl font-bold text-nuit-900">{chargement ? '…' : monnaie(loyer)}</p><span className="mt-1 block text-xs text-amber-800">Gérer les contrats →</span></Link>
    </section>
    <p className="mt-3 text-xs text-slate-500">Les montants correspondent aux loyers prévus dans les contrats actifs, pas à des encaissements bancaires vérifiés.</p>
    <section aria-label="Résumé de mes annonces" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Link to="/mes-annonces" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300"><p className="text-xs text-slate-500">Total de mes biens</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : totalAnnonces}</p><span className="mt-1 block text-xs text-amber-800">Gérer le patrimoine →</span></Link>
      <Link to="/mes-annonces" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300"><p className="text-xs text-slate-500">Annonces publiées</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : annoncesPubliees}</p><span className="mt-1 block text-xs text-amber-800">Voir mes annonces →</span></Link>
      <Link to="/mes-annonces" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300"><p className="text-xs text-slate-500">À renouveler ou régulariser</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : annoncesEnAttente}</p><span className="mt-1 block text-xs text-amber-800">Voir les abonnements →</span></Link>
      <Link to="/mes-annonces" className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-300"><p className="text-xs text-slate-500">À surveiller</p><p className="mt-2 text-2xl font-bold text-nuit-900">{chargement ? '…' : publicationsAExpirer + annoncesModerees}</p><span className="mt-1 block text-xs text-amber-800">Échéances et modération →</span></Link>
    </section>
    {!chargement && (publicationsAExpirer > 0 || annoncesModerees > 0) && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <strong>Actions à prévoir :</strong> {publicationsAExpirer > 0 ? `${publicationsAExpirer} publication(s) arrivent à échéance dans les cinq prochains jours. Pensez à renouveler la couverture par abonnement ou à discuter d’un mandat avec une agence. ` : ''}{annoncesModerees > 0 ? `${annoncesModerees} annonce(s) nécessitent une correction ou font l’objet d’une modération. Consultez leur motif dans « Mes annonces ».` : ''}
    </div>}

    <section className="mt-9">
      <div><h2 className="text-xl font-bold text-nuit-900">Tous vos outils de gestion</h2><p className="mt-1 text-sm text-slate-600">Chaque rubrique vous conduit directement à la fonctionnalité correspondante.</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {outils.map(l => <Link key={l.titre} to={l.href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{l.tag}</span>
          <h3 className="mt-2 font-bold text-nuit-900 group-hover:text-amber-800">{l.titre}</h3>
          <p className="mt-2 text-sm leading-5 text-slate-600">{l.texte}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-amber-800">{l.action} →</span>
        </Link>)}
      </div>
    </section>

    <AbonnementProprietaire />

    <section className="mt-9">
      <div>
        <h2 className="text-xl font-bold text-nuit-900">Mandats confiés aux agences</h2>
        <p className="mt-1 text-sm text-slate-600">Suivez les propositions de gestion et les demandes de résiliation de vos biens.</p>
      </div>
      {chargement ? <p className="mt-4 text-sm text-slate-500">Chargement des mandats…</p> : mandats.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun mandat de gestion pour le moment. Vous pourrez retrouver ici les propositions des agences et vos demandes.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {mandats.map(m => {
            const enAttenteAgence = m.statut === 'EN_ATTENTE' && m.origine === 'INITIATIVE_PROPRIETAIRE'
            const propositionAgence = m.statut === 'EN_ATTENTE' && m.origine === 'INITIATIVE_AGENCE'
            const reponseResiliationPossible = m.statut === 'RESILIATION_DEMANDEE' && m.resiliationDemandeeParId !== utilisateur?.id
            const statutLabel: Record<string, string> = {
              EN_ATTENTE: enAttenteAgence ? 'En attente de réponse de l’agence' : 'Proposition à examiner',
              ACCEPTE: 'Mandat actif',
              REFUSE: 'Proposition refusée',
              RESILIATION_DEMANDEE: 'Résiliation en attente de votre réponse',
              RESILIE: 'Mandat résilié',
            }
            return <article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-bold text-nuit-900">{m.annonceTitre}</h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{statutLabel[m.statut] || m.statut}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Agence : <strong className="text-slate-800">{m.agenceNom}</strong></p>
              <p className="mt-1 text-sm text-slate-600">Bien situé à {m.ville}</p>
              {propositionAgence && <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={actionMandat === m.id} onClick={() => void agirMandat(m, 'accepter-proposition')} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Accepter</button>
                <button type="button" disabled={actionMandat === m.id} onClick={() => void agirMandat(m, 'refuser-proposition')} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Refuser</button>
              </div>}
              {m.statut === 'ACCEPTE' && <button type="button" disabled={actionMandat === m.id} onClick={() => void agirMandat(m, 'resilier')} className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Demander la résiliation</button>}
              {m.statut === 'RESILIE' && <EvaluationAgenceMandat mandatId={m.id} />}
              {m.statut === 'RESILIATION_DEMANDEE' && (reponseResiliationPossible ? <div className="mt-4">
                <p className="text-sm text-slate-600">L’autre partie demande la fin du mandat. Vous devez répondre.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={actionMandat === m.id} onClick={() => void agirMandat(m, 'accepter')} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmer la résiliation</button>
                  <button type="button" disabled={actionMandat === m.id} onClick={() => void agirMandat(m, 'refuser')} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Refuser</button>
                </div>
              </div> : <p className="mt-3 text-sm text-slate-600">Votre demande de résiliation a été envoyée. En attente de la réponse de l’agence.</p>)}
            </article>
          })}
        </div>
      )}
    </section>

    <section className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold text-nuit-900">Portefeuille locatif</h2><p className="mt-1 text-sm text-slate-600">Les logements actuellement associés à un contrat.</p></div><Link to="/mes-contrats-location" className="text-sm font-semibold text-amber-800 underline">Voir tous les contrats</Link></div>
      {chargement ? <p className="mt-4 text-sm text-slate-500">Chargement du portefeuille…</p> : contrats.length === 0 ?
        <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun contrat de location en cours. Les contrats apparaîtront ici après acceptation d’une réservation et création du contrat.</p> :
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{contrats.map(c => <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-nuit-900">{c.annonceTitre}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{nomEtat(c.etat)}</span></div>
          <p className="mt-3 text-sm text-slate-600">Locataire : <strong className="text-slate-800">{c.locataireNom}</strong></p>
          <p className="mt-1 text-sm text-slate-600">Loyer mensuel : <strong className="text-slate-800">{monnaie(c.loyerMensuel)}</strong> · Dépôt : <strong className="text-slate-800">{monnaie(c.depotGarantie)}</strong></p>
          <p className="mt-2 text-xs text-slate-500">Début : {c.dateDebut}{c.dateFin ? ' · Fin : ' + c.dateFin : ''}</p>
          {c.etat === 'RESILIATION_DEMANDEE' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Demande envoyée par {c.resiliationDemandeeParNom || 'l’autre partie'}. Départ souhaité : {c.dateFinSouhaitee || 'à convenir'}.</p>}
          <Link to="/mes-contrats-location" className="mt-4 inline-flex text-sm font-semibold text-amber-800 underline">Consulter le contrat et répondre</Link>
        </article>)}</div>}
    </section>
  </main>
}
