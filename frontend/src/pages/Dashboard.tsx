import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, ClipboardList, Compass, FileCheck2, ShieldCheck, Users, Heart, BookmarkCheck } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import DemandeRole from '../components/DemandeRole'
import ProfilCompte from '../components/ProfilCompte'
import EspaceProprietaire from './EspaceProprietaire'
import { libelleRole, type Utilisateur } from '../types'

type Acces = { titre: string; description: string; lien: string; icone: typeof Building2; action: string }

function CarteAcces({ item }: { item: Acces }) {
  const Icone = item.icone
  return (
    <Link to={item.lien} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-dore-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dore-500">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent text-nuit-900"><Icone className="h-5 w-5" aria-hidden /></span>
      <h2 className="mt-4 text-lg font-semibold text-nuit-900">{item.titre}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 group-hover:text-amber-700">{item.action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
    </Link>
  )
}

/** Tableau de bord organisé selon le rôle vérifié par le serveur. */
export default function Dashboard() {
  const { utilisateur: depuisConnexion, jeton, deconnecter, majUtilisateur } = useAuth()
  const navigate = useNavigate()
  const [profil, setProfil] = useState<Utilisateur | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [accesAgence, setAccesAgence] = useState(false)
  const [statsAdmin, setStatsAdmin] = useState<{
    utilisateursTotal: number; clientsActifs: number; proprietairesActifs: number;
    annoncesTotal: number; annoncesPubliees: number; agencesActives: number;
    agencesEnAttente: number; abonnementsEnAttente: number; demandesRoleEnAttente: number;
  } | null>(null)

  useEffect(() => {
    let annule = false
    Promise.all([
      appelApi<Utilisateur>('/api/auth/me', { token: jeton }),
      appelApi<unknown[]>('/api/agence/mes-espaces', { token: jeton }),
      appelApi<unknown[]>('/api/agence/mes-invitations', { token: jeton }),
    ])
      .then(([p, espaces, invitations]) => {
        if (annule) return
        setProfil(p)
        setAccesAgence(p.role === 'ADMIN' || espaces.length > 0 || invitations.length > 0)
        if (p.role !== depuisConnexion?.role) majUtilisateur(p)
        if (p.role === 'ADMIN') {
          appelApi<NonNullable<typeof statsAdmin>>('/api/admin/statistiques', { token: jeton })
            .then((s) => { if (!annule) setStatsAdmin(s) })
            .catch(() => undefined)
        }
      })
      .catch((e: unknown) => {
        if (annule) return
        if (e instanceof ApiError && e.status === 401) {
          deconnecter()
          navigate('/connexion', { replace: true })
        } else {
          setErreur(e instanceof ApiError ? e.message : 'Impossible de charger votre profil.')
        }
      })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeton, deconnecter, navigate, majUtilisateur])


  const affiche = profil ?? depuisConnexion
  if (!affiche) return null
  if (affiche.role === 'PROPRIETAIRE') return <EspaceProprietaire />

  const accesClient: Acces[] = [
    { titre: 'Mes favoris', description: 'Retrouvez les annonces que vous avez enregistrées avec le cœur.', lien: '/mes-favoris', icone: Heart, action: 'Voir mes favoris' },
    { titre: 'Mes demandes de visite', description: 'Suivez les réponses des propriétaires, confirmez un créneau proposé ou annulez une demande.', lien: '/mes-visites', icone: CalendarDays, action: 'Voir mes visites' },
    { titre: 'Mes réservations', description: 'Suivez les demandes de réservation envoyées pour les logements qui vous intéressent.', lien: '/mes-reservations', icone: BookmarkCheck, action: 'Voir mes réservations' },
    { titre: 'Mon espace locataire', description: 'Consultez vos contrats de location, les loyers déclarés et les informations de votre logement.', lien: '/espace-locataire', icone: Building2, action: 'Ouvrir mon espace locataire' },
    { titre: 'Découvrir les biens', description: 'Consultez les annonces disponibles et trouvez un logement ou un terrain au Sénégal.', lien: '/catalogue', icone: Compass, action: 'Ouvrir le catalogue' },
    { titre: 'Assistant immobilier', description: 'Décrivez votre recherche pour obtenir de l’aide afin de trouver un bien adapté.', lien: '/assistant', icone: ClipboardList, action: 'Parler à l’assistant' },
  ]
  const accesEntreprise: Acces[] = [
    { titre: 'Abonnements et paiements', description: 'Suivez les abonnements souscrits, les paiements et les recettes liées aux services ImmoSénégal.', lien: '/admin/abonnements', icone: FileCheck2, action: 'Gérer les abonnements' },
    { titre: 'Agences partenaires', description: 'Gérez les agences inscrites, leurs responsables et leurs accès professionnels.', lien: '/admin/agences', icone: Building2, action: 'Gérer les agences' },
  ]

  const accesProprietaires: Acces[] = [
    { titre: 'Propriétaires et comptes', description: 'Consultez les comptes des propriétaires et retrouvez les informations de leurs activités sur la plateforme.', lien: '/admin/utilisateurs', icone: Users, action: 'Consulter les comptes' },
    { titre: 'Annonces des propriétaires', description: 'Consultez les biens publiés et intervenez uniquement dans le cadre de la modération.', lien: '/admin/annonces', icone: Building2, action: 'Suivre les annonces' },
    { titre: 'Visites et réservations', description: 'Suivez les demandes liées aux biens et vérifiez leur bonne prise en charge par les propriétaires.', lien: '/admin/visites', icone: CalendarDays, action: 'Suivre les visites' },
    { titre: 'Réservations', description: 'Consultez les demandes de réservation concernant les annonces de la plateforme.', lien: '/admin/reservations', icone: BookmarkCheck, action: 'Suivre les réservations' },
    { titre: 'Contrats et locations', description: 'Consultez les contrats de location et les paiements déclarés sur la plateforme.', lien: '/admin/supervision-locative', icone: FileCheck2, action: 'Superviser les locations' },
    { titre: 'Incidents et litiges', description: 'Suivez les incidents et désaccords signalés entre les parties à une location.', lien: '/admin/litiges-locatifs', icone: ShieldCheck, action: 'Suivre les dossiers' },
  ]

  const accesAdministration: Acces[] = [
    { titre: 'Demandes de rôle', description: 'Examinez les demandes de changement de rôle des utilisateurs.', lien: '/admin/demandes', icone: ShieldCheck, action: 'Voir les demandes' },
    { titre: 'Signalements et réclamations', description: 'Traitez les signalements d’annonces et les réclamations des utilisateurs.', lien: '/admin/signalements', icone: ShieldCheck, action: 'Traiter les signalements' },
    { titre: 'Journal d’audit et paramètres', description: 'Consultez les activités importantes du système et les paramètres actifs.', lien: '/admin/audit', icone: ClipboardList, action: 'Consulter le journal' },
    { titre: 'Messagerie', description: 'Consultez les échanges lorsque votre intervention administrative est nécessaire.', lien: '/messagerie', icone: ClipboardList, action: 'Ouvrir la messagerie' },
  ]

  const accesAgent: Acces[] = [
    { titre: 'Rejoindre une agence', description: 'Après validation de votre statut Agent, découvrez les agences et envoyez votre candidature. Un gestionnaire rejoint une agence sur invitation de son responsable.', lien: '/rejoindre-agence', icone: Building2, action: 'Trouver une agence' },
    { titre: 'Mes espaces professionnels', description: 'Retrouvez les agences qui vous ont invité et les espaces auxquels vous appartenez.', lien: '/mes-agences', icone: Users, action: 'Ouvrir mes agences' },
    { titre: 'Mes visites', description: 'Consultez les demandes de visite associées à votre compte.', lien: '/mes-visites', icone: CalendarDays, action: 'Suivre les visites' },
    { titre: 'Catalogue des biens', description: 'Explorez les annonces disponibles sur la plateforme.', lien: '/catalogue', icone: Compass, action: 'Explorer les biens' },
    { titre: 'Assistant immobilier', description: 'Utilisez l’assistant pour orienter une recherche immobilière.', lien: '/assistant', icone: ClipboardList, action: 'Utiliser l’assistant' },
  ]

  const accesEquipeAgence: Acces[] = [
    { titre: 'Mes espaces professionnels', description: 'Retrouvez les agences auxquelles vous appartenez et vos outils de travail.', lien: '/mes-agences', icone: Users, action: 'Ouvrir mes agences' },
    { titre: 'Catalogue des biens', description: 'Consultez les annonces disponibles sur la plateforme.', lien: '/catalogue', icone: Compass, action: 'Explorer les biens' },
  ]
  const acces = affiche.role === 'CLIENT' ? accesClient
    : affiche.role === 'ADMIN' ? []
      : affiche.role === 'AGENT' ? accesAgent
        : ['GESTIONNAIRE', 'CAISSIER', 'ASSISTANT_ADMINISTRATIF', 'RESPONSABLE'].includes(affiche.role) ? accesEquipeAgence
          : [
            { titre: 'Explorer les annonces', description: 'Consultez les annonces disponibles sur ImmoSénégal.', lien: '/catalogue', icone: Compass, action: 'Ouvrir le catalogue' },
            { titre: 'Assistant immobilier', description: 'Aidez-vous de l’assistant pour orienter une recherche de logement.', lien: '/assistant', icone: ClipboardList, action: 'Utiliser l’assistant' },
          ]

  const accesAvecAgences: Acces[] = [
    ...acces,
    ...(affiche.role !== 'ADMIN' ? [{ titre: 'Signalements et réclamations', description: 'Signalez un problème ou suivez l’état de vos réclamations.', lien: '/mes-signalements', icone: ShieldCheck, action: 'Mes signalements' }] : []),
    ...(accesAgence ? [{ titre: 'Mes agences', description: 'Retrouvez vos espaces professionnels et répondez aux invitations des agences.', lien: '/mes-agences', icone: Building2, action: 'Ouvrir mes agences' }] : []),
  ]

  const introduction = affiche.role === 'CLIENT'
    ? 'Retrouvez vos demandes et poursuivez votre recherche de logement.'
    : affiche.role === 'ADMIN'
      ? 'Accédez aux outils de gestion et de suivi de la plateforme.'
      : 'Retrouvez les principaux outils disponibles sur la plateforme.'

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <section className="rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Mon espace ImmoSénégal</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Bonjour, {affiche.nomComplet}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{introduction}</p>
        <span className="mt-5 inline-flex rounded-full border border-dore-400/50 bg-white/10 px-3 py-1.5 text-sm font-medium text-dore-200">{libelleRole[affiche.role]}</span>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {!profil && !erreur && <p role="status" className="mt-4 text-sm text-slate-500">Vérification de votre session…</p>}

      {affiche.role === 'ADMIN' ? (
        <>
          {statsAdmin && (
            <section className="mt-8" aria-label="Statistiques globales de la plateforme">
              <h2 className="mb-4 text-xl font-bold text-nuit-900">Vue d’ensemble de la plateforme</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Utilisateurs</p><p className="mt-2 text-3xl font-bold text-nuit-900">{statsAdmin.utilisateursTotal}</p><p className="mt-1 text-xs text-slate-600">{statsAdmin.clientsActifs} clients · {statsAdmin.proprietairesActifs} propriétaires</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annonces</p><p className="mt-2 text-3xl font-bold text-nuit-900">{statsAdmin.annoncesTotal}</p><p className="mt-1 text-xs text-slate-600">{statsAdmin.annoncesPubliees} publiée(s)</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agences</p><p className="mt-2 text-3xl font-bold text-nuit-900">{statsAdmin.agencesActives}</p><p className="mt-1 text-xs text-amber-800">{statsAdmin.agencesEnAttente} en attente de validation</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Validations en attente</p><p className="mt-2 text-3xl font-bold text-nuit-900">{statsAdmin.abonnementsEnAttente + statsAdmin.demandesRoleEnAttente}</p><p className="mt-1 text-xs text-slate-600">{statsAdmin.abonnementsEnAttente} abonnements · {statsAdmin.demandesRoleEnAttente} rôles</p></div>
              </div>
            </section>
          )}
          <section className="mt-8">
            <div className="mb-4"><h2 className="text-xl font-bold text-nuit-900">1. Gestion de l’entreprise ImmoSénégal</h2><p className="mt-1 text-sm text-slate-600">Les activités et services qui concernent directement l’entreprise et son réseau professionnel.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accesEntreprise.map(item => <CarteAcces key={item.lien} item={item} />)}</div>
          </section>
          <section className="mt-8">
            <div className="mb-4"><h2 className="text-xl font-bold text-nuit-900">2. Suivi des propriétaires</h2><p className="mt-1 text-sm text-slate-600">Les biens et activités des propriétaires, consultés dans un rôle de supervision globale.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accesProprietaires.map(item => <CarteAcces key={item.lien} item={item} />)}</div>
          </section>
          <section className="mt-8">
            <div className="mb-4"><h2 className="text-xl font-bold text-nuit-900">3. Administration de la plateforme</h2><p className="mt-1 text-sm text-slate-600">Les fonctions de contrôle et de gestion des comptes.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accesAdministration.map(item => <CarteAcces key={item.lien} item={item} />)}</div>
          </section>
        </>
      ) : (
        <section className="mt-8">
          <div className="mb-4"><h2 className="text-xl font-bold text-nuit-900">Mes services</h2><p className="mt-1 text-sm text-slate-600">Choisissez une rubrique pour continuer.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accesAvecAgences.map(item => <CarteAcces key={item.lien} item={item} />)}</div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-nuit-900">Informations de mon compte</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Adresse e-mail</dt><dd className="mt-1 font-medium text-slate-900">{affiche.email}</dd></div>
          <div><dt className="text-sm text-slate-500">Téléphone</dt><dd className="mt-1 font-medium text-slate-900">{affiche.telephone ?? 'Non renseigné'}</dd></div>
          <div><dt className="text-sm text-slate-500">Membre depuis</dt><dd className="mt-1 font-medium text-slate-900">{new Date(affiche.creeLe).toLocaleDateString('fr-FR')}</dd></div>
        </dl>
      </section>

      <ProfilCompte profil={affiche} />

      {affiche.role === 'CLIENT' && <DemandeRole />}
    </main>
  )
}
