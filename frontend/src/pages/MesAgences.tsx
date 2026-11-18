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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <section className="rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Mes agences</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
          Retrouvez les agences auxquelles vous appartenez et gérez vos invitations.
        </p>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-nuit-900">Mes espaces professionnels</h2>
          <p className="mt-1 text-sm text-slate-600">Les espaces auxquels votre compte a accès.</p>
        </div>
        <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {chargement ? (
        <p role="status" className="mt-5 text-sm text-slate-500">Chargement de vos agences…</p>
      ) : agences.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 font-semibold text-nuit-900">Aucun espace agence pour le moment</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Lorsqu’une agence vous aura ajouté comme membre et que vous aurez accepté son invitation, son espace apparaîtra ici.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {agences.map((agence) => (
            <Link key={agence.id} to={`/mes-agences/${agence.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-dore-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dore-500">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-semibold text-nuit-900">{agence.nom}</h3>
              <p className="mt-1 text-sm text-slate-600">{libelleFonction[agence.fonction] ?? agence.fonction}</p>
              <p className="mt-4 text-xs font-semibold text-nuit-800">Ouvrir le tableau de bord →</p>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-nuit-800" />
          <h2 className="text-xl font-bold text-nuit-900">Mes invitations</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">Acceptez une invitation pour rejoindre une agence.</p>
        {chargement ? null : invitations.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Vous n’avez aucune invitation en attente.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-nuit-900">{invitation.agenceNom}</h3>
                  <p className="mt-1 text-sm text-slate-600">Fonction proposée : {libelleFonction[invitation.fonction] ?? invitation.fonction}</p>
                  <p className="mt-1 text-xs text-slate-500">Invitation reçue le {new Date(invitation.creeLe).toLocaleDateString('fr-FR')}</p>
                </div>
                <button type="button" onClick={() => void accepter(invitation)} disabled={actionEnCours === invitation.id} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">
                  <Users className="h-4 w-4" /> {actionEnCours === invitation.id ? 'Acceptation…' : 'Accepter l’invitation'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8">
        <Link to="/tableau-de-bord" className="text-sm font-semibold text-nuit-800 underline underline-offset-4 hover:text-amber-700">Retour à mon espace</Link>
      </div>
    </main>
  )
}
