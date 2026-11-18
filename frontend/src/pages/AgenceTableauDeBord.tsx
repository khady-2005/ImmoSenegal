import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, MailPlus, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Agence = { id: string; nom: string; slug: string; fonction: string }
type Membre = {
  id: string
  utilisateurId: string
  nom: string
  email: string
  fonction: string
  statut: string
  creeLe: string
}

const fonctions: Record<string, string> = {
  RESPONSABLE: 'Responsable',
  GESTIONNAIRE: 'Gestionnaire',
  AGENT: 'Agent immobilier',
}

export default function AgenceTableauDeBord() {
  const { agenceId = '' } = useParams()
  const { jeton, utilisateur } = useAuth()
  const navigate = useNavigate()
  const [agence, setAgence] = useState<Agence | null>(null)
  const [membres, setMembres] = useState<Membre[]>([])
  const [email, setEmail] = useState('')
  const [fonction, setFonction] = useState<'GESTIONNAIRE' | 'AGENT'>('AGENT')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [membreEnCours, setMembreEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setChargement(true)
    setErreur(null)
    try {
      const [espaces, equipe] = await Promise.all([
        appelApi<Agence[]>('/api/agence/mes-espaces', { token: jeton }),
        appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: jeton }),
      ])
      const espace = espaces.find((item) => item.id === agenceId)
      if (utilisateur?.role !== 'ADMIN' && espace?.fonction !== 'RESPONSABLE') {
        navigate('/mes-agences', { replace: true })
        return
      }
      if (!espace && utilisateur?.role !== 'ADMIN') {
        navigate('/tableau-de-bord', { replace: true })
        return
      }
      setAgence(espace ?? { id: agenceId, nom: 'Agence', slug: '', fonction: 'ADMIN' })
      setMembres(equipe)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        navigate('/mes-agences', { replace: true })
        return
      }
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le tableau de bord de cette agence.')
    } finally {
      setChargement(false)
    }
  }, [jeton, agenceId, utilisateur?.role, navigate])

  useEffect(() => { void charger() }, [charger])

  const inviter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) return
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi('/api/agence/' + agenceId + '/invitations', {
        method: 'POST',
        token: jeton,
        body: { email: email.trim(), fonction },
      })
      setEmail('')
      setMessage('Invitation créée. La personne pourra la retrouver dans sa rubrique « Mes agences » après connexion.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer cette invitation.')
    } finally {
      setEnvoi(false)
    }
  }

  const changerFonction = async (membre: Membre, nouvelleFonction: 'GESTIONNAIRE' | 'AGENT') => {
    setMembreEnCours(membre.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/membres/${membre.id}/fonction`, {
        method: 'PATCH',
        token: jeton,
        body: { fonction: nouvelleFonction },
      })
      setMessage(`La fonction de ${membre.nom} a été mise à jour.`)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier cette fonction.')
    } finally {
      setMembreEnCours(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Link to="/mes-agences" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" /> Retour à Mes agences
      </Link>

      <section className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-dore-300"><Building2 className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{agence?.nom ?? 'Tableau de bord de l’agence'}</h1>
            <p className="mt-1 text-sm text-white/75">Gérez votre équipe et les accès à cet espace.</p>
          </div>
        </div>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-nuit-900"><Users className="h-5 w-5" /> Équipe de l’agence</h2>
              <p className="mt-1 text-sm text-slate-600">Les membres actifs qui ont accès à cet espace.</p>
            </div>
            <button type="button" onClick={() => void charger()} disabled={chargement} aria-label="Actualiser l’équipe" className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement de l’équipe…</p> : membres.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun membre actif à afficher.</p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {membres.map((membre) => (
                <article key={membre.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-nuit-900">{membre.nom}</p>
                    <p className="truncate text-sm text-slate-600">{membre.email}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      {membre.fonction === 'RESPONSABLE' && <ShieldCheck className="h-3.5 w-3.5" />}
                      {fonctions[membre.fonction] ?? membre.fonction}
                    </span>
                  </div>
                  {membre.fonction !== 'RESPONSABLE' && (
                    <select
                      aria-label={`Fonction de ${membre.nom}`}
                      value={membre.fonction}
                      disabled={membreEnCours === membre.id}
                      onChange={(event) => void changerFonction(membre, event.target.value as 'GESTIONNAIRE' | 'AGENT')}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                    >
                      <option value="AGENT">Agent immobilier</option>
                      <option value="GESTIONNAIRE">Gestionnaire</option>
                    </select>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-nuit-900"><MailPlus className="h-5 w-5" /> Inviter un collaborateur</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            La personne doit déjà posséder un compte ImmoSénégal. Elle recevra une invitation dans son espace personnel.
          </p>
          <form onSubmit={inviter} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email-collaborateur" className="mb-1.5 block text-sm font-medium text-slate-700">Adresse e-mail du collaborateur</label>
              <input id="email-collaborateur" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@exemple.com" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            </div>
            <div>
              <label htmlFor="fonction-collaborateur" className="mb-1.5 block text-sm font-medium text-slate-700">Fonction dans l’agence</label>
              <select id="fonction-collaborateur" value={fonction} onChange={(event) => setFonction(event.target.value as 'GESTIONNAIRE' | 'AGENT')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="AGENT">Agent immobilier</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
              </select>
            </div>
            <button type="submit" disabled={envoi || !email.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nuit-900 px-5 py-3 text-sm font-semibold text-white hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-50">
              <MailPlus className="h-4 w-4" /> {envoi ? 'Envoi en cours…' : 'Envoyer l’invitation'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
