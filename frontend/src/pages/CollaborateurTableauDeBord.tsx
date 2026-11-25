import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, ClipboardList, Compass, MapPinned, ShieldCheck, MessageCircle } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import MissionsAgence from '../components/MissionsAgence'
import VisitesAgence from '../components/VisitesAgence'
import PortefeuilleAgence from '../components/PortefeuilleAgence'
import CRMAgence from '../components/CRMAgence'
import VentesAgence from '../components/VentesAgence'

type Agence = { id: string; nom: string; slug: string; fonction: string }

const roles: Record<string, { titre: string; mission: string; responsabilites: string[] }> = {
  AGENT: {
    titre: 'Agent immobilier',
    mission: 'Votre espace est consacré au développement commercial : prospects, présentation des biens, visites et ventes.',
    responsabilites: [
      'Enregistrer et suivre les prospects dans le CRM.',
      'Présenter les biens et organiser les visites avec les clients.',
      'Renseigner les ventes réalisées et transmettre les comptes rendus au responsable.',
    ],
  },
  CAISSIER: {
    titre: 'Caissier',
    mission: 'Votre espace est consacré à l’enregistrement et au suivi des mouvements de caisse de l’agence, sous le contrôle du Responsable.',
    responsabilites: ['Enregistrer les recettes et les dépenses avec leurs justificatifs.', 'Consulter l’historique des mouvements de caisse.', 'Préparer les états et rapports de caisse.', 'Signaler les écarts et transmettre les rapports au Responsable.'],
  },
  ASSISTANT_ADMINISTRATIF: {
    titre: 'Assistant administratif',
    mission: 'Votre espace est consacré au suivi administratif des dossiers et à l’organisation documentaire de l’agence.',
    responsabilites: ['Préparer et classer les dossiers des propriétaires et locataires.', 'Suivre les pièces et documents manquants.', 'Préparer les courriers et documents administratifs.', 'Transmettre les dossiers et comptes rendus au Responsable.'],
  },
  GESTIONNAIRE: {
    titre: 'Gestionnaire immobilier',
    mission: 'Votre espace est consacré à la gestion quotidienne des biens qui vous sont personnellement attribués par le responsable.',
    responsabilites: [
      'Suivre uniquement les biens confiés à l’agence et qui vous sont attribués.',
      'Assurer le suivi quotidien des biens, des propriétaires et des locataires.',
      'Suivre les contrats, les échéances de loyers et les incidents liés aux biens attribués.',
      'Transmettre les comptes rendus de gestion au responsable de l’agence.',
    ],
  },
}

export default function CollaborateurTableauDeBord() {
  const { agenceId = '' } = useParams()
  const { jeton } = useAuth()
  const navigate = useNavigate()
  const [agence, setAgence] = useState<Agence | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    const charger = async () => {
      if (!jeton || !agenceId) return
      setChargement(true)
      setErreur(null)
      try {
        const espaces = await appelApi<Agence[]>('/api/agence/mes-espaces', { token: jeton })
        const espace = espaces.find((item) => item.id === agenceId)
        if (!espace || !['AGENT', 'GESTIONNAIRE', 'CAISSIER', 'ASSISTANT_ADMINISTRATIF'].includes(espace.fonction)) {
          navigate('/mes-agences', { replace: true })
          return
        }
        if (!annule) setAgence(espace)
      } catch (e) {
        if (!annule) setErreur(e instanceof ApiError ? e.message : 'Impossible de charger votre espace collaborateur.')
      } finally {
        if (!annule) setChargement(false)
      }
    }
    void charger()
    return () => { annule = true }
  }, [jeton, agenceId, navigate])

  if (chargement) {
    return <main className="mx-auto max-w-6xl px-4 py-12"><p role="status" className="text-sm text-slate-500">Chargement de votre espace professionnel…</p></main>
  }

  if (erreur) {
    return <main className="mx-auto max-w-6xl px-4 py-12"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p><Link to="/mes-agences" className="mt-5 inline-flex text-sm font-semibold text-nuit-800 underline">Retour à Mes agences</Link></main>
  }

  if (!agence) return null
  const role = roles[agence.fonction]

  return (
    <main className="espace-partenaire-page mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Link to="/mes-agences" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" /> Retour à Mes agences
      </Link>

      <section className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Espace collaborateur</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-dore-300"><Building2 className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{agence.nom}</h1>
            <p className="mt-1 text-sm text-white/75">{role.titre}</p>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/80">{role.mission}</p>
      </section>

      {agence.fonction === 'AGENT' && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Espace commercial</p>
          <h2 className="mt-1 text-xl font-bold text-nuit-900">Vos outils d’agent immobilier</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">Vous prenez en charge les prospects et les clients, organisez les visites, présentez les biens et renseignez les ventes. Vous ne gérez pas les contrats locatifs ni l’administration de l’agence.</p>
        </section>
      )}

      {agence.fonction === 'CAISSIER' && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Espace caisse</p><h2 className="mt-1 text-xl font-bold text-nuit-900">Suivi des recettes et dépenses</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">Le caissier prépare et enregistre les mouvements de caisse. Le Responsable conserve le contrôle et la supervision. Les opérations de caisse dédiées restent à connecter au backend avant toute saisie réelle.</p></section>
      )}
      {agence.fonction === 'ASSISTANT_ADMINISTRATIF' && (
        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-wider text-blue-800">Espace administratif</p><h2 className="mt-1 text-xl font-bold text-nuit-900">Suivi des dossiers</h2><p className="mt-2 text-sm leading-relaxed text-slate-700">L’assistant prépare et organise les dossiers, suit les documents et aide l’équipe. Les fonctions de classement et d’archivage dédiées restent à connecter au backend.</p></section>
      )}
      {agence.fonction === 'GESTIONNAIRE' && (
        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Espace gestion locative</p>
          <h2 className="mt-1 text-xl font-bold text-nuit-900">Vos outils de gestionnaire immobilier</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">Vous prenez en charge uniquement les biens qui vous sont attribués. Vous suivez leur état, les propriétaires et les locataires, puis rendez compte au responsable. Vous ne gérez pas les prospects commerciaux, les ventes ni les paramètres de l’agence.</p>
        </section>
      )}

      <MissionsAgence agenceId={agenceId} fonction={agence.fonction} />

      {agence.fonction === 'AGENT' && (
        <>
          <CRMAgence agenceId={agenceId} fonction="AGENT" />
          <VisitesAgence agenceId={agenceId} />
          <VentesAgence agenceId={agenceId} fonction="AGENT" />
        </>
      )}

      {agence.fonction === 'GESTIONNAIRE' && <PortefeuilleAgence agenceId={agenceId} />}

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-nuit-800" />
            <h2 className="text-xl font-bold text-nuit-900">Vos principales missions</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {role.responsabilites.map((responsabilite) => (
              <li key={responsabilite} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-dore-500" />
                {responsabilite}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-nuit-800" />
            <h2 className="text-xl font-bold text-nuit-900">Vos accès</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Votre accès est limité à votre compte et à votre appartenance active à cette agence. La gestion de l’équipe et des paramètres de l’agence reste réservée au responsable.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {agence.fonction === 'AGENT'
              ? 'Vous accédez au CRM commercial, aux visites de l’agence, aux ventes et aux missions qui vous sont attribuées. Les biens confiés, les contrats locatifs et la gestion de l’équipe ne relèvent pas de votre fonction.'
              : 'Vous accédez aux biens qui vous sont personnellement attribués et aux missions qui vous sont confiées. Le CRM commercial, les visites commerciales et les ventes relèvent de l’Agent immobilier. Les actions sensibles sont vérifiées par le serveur.'}
          </p>
        </article>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-nuit-900">Outils ImmoSénégal</h2>
        <p className="mt-1 text-sm text-slate-600">Raccourcis vers les outils généraux de la plateforme.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/catalogue" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-dore-400 hover:shadow-sm">
            <Compass className="h-6 w-6 text-nuit-800" />
            <h3 className="mt-3 font-semibold text-nuit-900">Catalogue des biens</h3>
            <p className="mt-1 text-xs text-slate-500">Découvrir les annonces publiées.</p>
          </Link>
          <Link to="/carte" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-dore-400 hover:shadow-sm">
            <MapPinned className="h-6 w-6 text-nuit-800" />
            <h3 className="mt-3 font-semibold text-nuit-900">Carte des biens</h3>
            <p className="mt-1 text-xs text-slate-500">Explorer les biens par localisation.</p>
          </Link>
          <Link to="/messagerie" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-dore-400 hover:shadow-sm">
            <MessageCircle className="h-6 w-6 text-nuit-800" />
            <h3 className="mt-3 font-semibold text-nuit-900">Messagerie professionnelle</h3>
            <p className="mt-1 text-xs text-slate-500">Échanger avec les propriétaires et les clients selon vos accès.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}
