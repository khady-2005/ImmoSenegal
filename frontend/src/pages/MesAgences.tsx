import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, RefreshCw, Users, MailCheck } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Agence = { id: string; nom: string; slug: string; fonction: string }
type Invitation = { id: string; agenceId: string; agenceNom: string; fonction: string; creeLe: string }

const libelleFonction: Record<string, string> = {
  RESPONSABLE: 'Responsable',
  GESTIONNAIRE: 'Gestionnaire',
  AGENT: 'Agent immobilier',
  CAISSIER: 'Caissier',
  ASSISTANT_ADMINISTRATIF: 'Assistant administratif',
}

export default function MesAgences() {
  const { jeton, utilisateur } = useAuth()
  const navigate = useNavigate()
  const [agences, setAgences] = useState<Agence[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const [espaces, demandes] = await Promise.all([
        appelApi<Agence[]>('/api/agence/mes-espaces', { token: jeton }),
        appelApi<Invitation[]>('/api/agence/mes-invitations', { token: jeton }),
      ])
      setAgences(espaces)
      setInvitations(demandes)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos espaces agence.')
    } finally {
      setChargement(false)
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  useEffect(() => {
    if (utilisateur?.role === 'ADMIN') return
    if (!jeton) return
    let annule = false
    Promise.all([
      appelApi<Agence[]>('/api/agence/mes-espaces', { token: jeton }),
      appelApi<Invitation[]>('/api/agence/mes-invitations', { token: jeton }),
    ]).then(([espaces, demandes]) => {
      if (!annule && espaces.length === 0 && demandes.length === 0) {
        navigate('/tableau-de-bord', { replace: true })
      }
    }).catch(() => {
      if (!annule) navigate('/tableau-de-bord', { replace: true })
    })
    return () => { annule = true }
  }, [jeton, utilisateur?.role, navigate])


  const accepter = async (invitation: Invitation) => {
    setActionEnCours(invitation.id)
    setErreur(null)
    try {
      await appelApi<void>(`/api/agence/${invitation.agenceId}/invitations/${invitation.id}/accepter`, {
        method: 'POST',
        token: jeton,
      })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’accepter cette invitation.')
    } finally {
      setActionEnCours(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Mes agences</h1>
        <p className="mt-3 max-w-2xl rounded-xl border border-white/15 bg-white/10 p-4 text-base leading-relaxed text-white sm:text-lg">
          Retrouvez vos espaces professionnels, consultez votre fonction dans chaque agence et gérez les invitations reçues.
        </p>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-900">{erreur}</p>}

      <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-nuit-950">Mes espaces professionnels</h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">
            Les agences auxquelles vous êtes rattaché et les espaces que vous pouvez gérer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/rejoindre-agence"
            className="inline-flex items-center justify-center rounded-xl bg-dore-400 px-5 py-3 text-base font-bold text-nuit-950 shadow-sm hover:bg-dore-300"
          >
            Découvrir les agences
          </Link>
          <button
            type="button"
            onClick={() => void charger()}
            disabled={chargement}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </section>

      {chargement ? (
        <p role="status" className="mt-5 rounded-xl bg-slate-50 p-5 text-base font-medium text-slate-700">Chargement de vos agences…</p>
      ) : agences.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-10">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 text-xl font-bold text-nuit-950">Aucun espace agence pour le moment</h3>
          <p className="mx-auto mt-3 max-w-xl rounded-xl bg-slate-50 p-4 text-base leading-relaxed text-slate-700">
            Lorsqu’une agence vous aura ajouté comme membre et que vous aurez accepté son invitation, son espace apparaîtra ici.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {agences.map((agence) => (
            agence.fonction === 'RESPONSABLE' ? (
              <Link key={agence.id} to={`/mes-agences/${agence.id}`} className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-0.5 hover:border-dore-400 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dore-500">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-5 w-5" /></span>
                <h3 className="mt-4 text-xl font-bold text-nuit-950">{agence.nom}</h3>
                <p className="mt-2 inline-flex rounded-full border border-dore-300 bg-dore-100 px-3 py-1.5 text-base font-bold text-nuit-950">{libelleFonction[agence.fonction] ?? agence.fonction}</p>
                <p className="mt-5 rounded-xl bg-nuit-900 px-4 py-3 text-center text-base font-bold text-white">Ouvrir le tableau de bord →</p>
              </Link>
            ) : (
              <Link key={agence.id} to={`/mes-agences/${agence.id}/espace`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-dore-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dore-500">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Building2 className="h-5 w-5" /></span>
                <h3 className="mt-4 text-lg font-semibold text-nuit-900">{agence.nom}</h3>
                <p className="mt-1 text-sm text-slate-600">{libelleFonction[agence.fonction] ?? agence.fonction}</p>
                <p className="mt-5 rounded-xl bg-nuit-900 px-4 py-3 text-center text-base font-bold text-white">Ouvrir mon espace collaborateur →</p>
              </Link>
            )
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-nuit-800" />
          <h2 className="text-2xl font-bold text-nuit-950">Mes invitations</h2>
        </div>
        <p className="mt-2 text-base leading-relaxed text-slate-700">Consultez les propositions reçues. Acceptez une invitation pour rejoindre officiellement une agence.</p>
        {chargement ? null : invitations.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700">Vous n’avez aucune invitation en attente.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-bold text-nuit-950">{invitation.agenceNom}</h3>
                  <p className="mt-2 text-base font-medium text-slate-800">Fonction proposée : {libelleFonction[invitation.fonction] ?? invitation.fonction}</p>
                  <p className="mt-2 text-sm text-slate-600">Invitation reçue le {new Date(invitation.creeLe).toLocaleDateString('fr-FR')}</p>
                </div>
                <button type="button" onClick={() => void accepter(invitation)} disabled={actionEnCours === invitation.id} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-nuit-900 px-6 py-3 text-base font-bold text-white hover:bg-nuit-800 disabled:opacity-50">
                  <Users className="h-4 w-4" /> {actionEnCours === invitation.id ? 'Acceptation…' : 'Accepter l’invitation'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 border-t border-slate-200 pt-5">
        <Link to="/tableau-de-bord" className="inline-flex rounded-xl bg-slate-100 px-4 py-3 text-base font-bold text-nuit-900 underline underline-offset-4 hover:bg-slate-200">Retour à mon espace</Link>
      </div>
    </main>
  )
}
