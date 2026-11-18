import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, ClipboardList, Compass, MapPinned, ShieldCheck } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import MissionsAgence from '../components/MissionsAgence'

type Agence = { id: string; nom: string; slug: string; fonction: string }

const roles: Record<string, { titre: string; mission: string; responsabilites: string[] }> = {
  AGENT: {
    titre: 'Agent immobilier',
    mission: 'Votre espace vous accompagne dans la prospection, la découverte des biens et le suivi des échanges avec les clients.',
    responsabilites: [
      'Présenter les biens disponibles aux personnes intéressées.',
      'Accompagner les clients dans leurs recherches et leurs visites.',
      'Faire remonter au responsable les informations utiles sur les dossiers.',
    ],
  },
  GESTIONNAIRE: {
    titre: 'Gestionnaire immobilier',
    mission: 'Votre espace est orienté vers le suivi immobilier et la qualité du service rendu aux propriétaires et aux occupants.',
    responsabilites: [
      'Suivre les informations liées aux biens confiés à l’agence.',
      'Accompagner le suivi des locations et les échanges avec les occupants.',
      'Signaler au responsable les situations nécessitant une décision.',
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
        if (!espace || !['AGENT', 'GESTIONNAIRE'].includes(espace.fonction)) {
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
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

      <MissionsAgence agenceId={agenceId} fonction={agence.fonction} />

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
            Les missions qui vous sont attribuées sont disponibles dans la rubrique « Missions de l’agence ». Les autres dossiers métier seront intégrés progressivement, avec des contrôles d’accès côté serveur.
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
          <Link to="/mes-visites" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-dore-400 hover:shadow-sm">
            <CalendarDays className="h-6 w-6 text-nuit-800" />
            <h3 className="mt-3 font-semibold text-nuit-900">Mes visites</h3>
            <p className="mt-1 text-xs text-slate-500">Retrouver les visites liées à votre compte.</p>
          </Link>
          <Link to="/mes-reservations" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-dore-400 hover:shadow-sm">
            <ClipboardList className="h-6 w-6 text-nuit-800" />
            <h3 className="mt-3 font-semibold text-nuit-900">Mes réservations</h3>
            <p className="mt-1 text-xs text-slate-500">Consulter vos réservations personnelles.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}
