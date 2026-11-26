import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Agence = {
  id: string
  nom: string
  slug: string
  type: string
  statut: 'EN_ATTENTE' | 'ACTIVE' | 'SUSPENDUE'
  adresse: string | null
  emailContact: string | null
  telephoneContact: string | null
  creeLe: string
  membresActifs: number
}

const libelles: Record<Agence['statut'], string> = {
  EN_ATTENTE: 'En attente de validation',
  ACTIVE: 'Active',
  SUSPENDUE: 'Suspendue',
}

export default function AdminAgences() {
  const { jeton } = useAuth()
  const [agences, setAgences] = useState<Agence[]>([])
  const [chargement, setChargement] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('TOUTES')
  const [emailsResponsables, setEmailsResponsables] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    setErreur(null)
    try {
      setAgences(await appelApi<Agence[]>('/api/admin/agences', { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les agences.')
    } finally {
      setChargement(false)
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  const modifierStatut = async (agence: Agence, statut: 'ACTIVE' | 'SUSPENDUE') => {
    setAction(agence.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi<Agence>(`/api/admin/agences/${agence.id}/statut`, {
        method: 'PATCH',
        token: jeton,
        body: { statut },
      })
      setMessage(statut === 'ACTIVE'
        ? `L’agence « ${agence.nom} » est maintenant active.`
        : `L’agence « ${agence.nom} » a été suspendue.`)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier le statut de cette agence.')
    } finally {
      setAction(null)
    }
  }

  const designerResponsable = async (agence: Agence) => {
    const email = (emailsResponsables[agence.id] ?? '').trim()
    if (!email) {
      setErreur('Saisissez l’adresse e-mail du responsable.')
      return
    }
    setAction(agence.id)
    setErreur(null)
    setMessage(null)
    try {
      const membre = await appelApi<{ nom: string; email: string }>(`/api/admin/agences/${agence.id}/responsable`, {
        method: 'POST',
        token: jeton,
        body: { email },
      })
      setMessage(`${membre.nom} est maintenant responsable de l’agence « ${agence.nom} ».`)
      setEmailsResponsables(current => ({ ...current, [agence.id]: '' }))
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de désigner ce responsable.')
    } finally {
      setAction(null)
    }
  }

  const agencesFiltrees = agences.filter(a => {
    const q = recherche.trim().toLocaleLowerCase()
    const correspondTexte = !q || [a.nom, a.slug, a.adresse ?? '', a.emailContact ?? '', a.telephoneContact ?? ''].some(v => v.toLocaleLowerCase().includes(q))
    return correspondTexte && (filtreStatut === 'TOUTES' || a.statut === filtreStatut)
  })
  const enAttente = agences.filter(a => a.statut === 'EN_ATTENTE').length
  const actives = agences.filter(a => a.statut === 'ACTIVE').length
  const suspendues = agences.filter(a => a.statut === 'SUSPENDUE').length

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" /> Retour à l’administration
      </Link>
      <section className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-base font-extrabold uppercase tracking-wide text-amber-300">Administration</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Gestion des agences</h1>
        <p className="mt-3 max-w-3xl text-lg font-semibold leading-8 text-white">
          Vérifiez les agences inscrites, validez leur activation et suspendez un accès si nécessaire.
        </p>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-blue-50 p-4 text-sm text-blue-800">{message}</p>}

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">À valider</p><p className="mt-1 text-2xl font-bold text-amber-950">{enAttente}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">Agences actives</p><p className="mt-1 text-2xl font-bold text-blue-950">{actives}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Suspendues</p><p className="mt-1 text-2xl font-bold text-slate-900">{suspendues}</p>
        </article>
      </section>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-nuit-900">Toutes les agences</h2><p className="mt-1 text-sm text-slate-600">{agences.length} agence(s) enregistrée(s).</p></div>
        <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Rechercher une agence
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Nom, adresse, e-mail ou téléphone…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"/>
        </label>
        <label className="text-sm font-medium text-slate-700">État de l’agence
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
            <option value="TOUTES">Tous les états</option><option value="EN_ATTENTE">À valider</option><option value="ACTIVE">Actives</option><option value="SUSPENDUE">Suspendues</option>
          </select>
        </label>
      </section>
      {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement des agences…</p> : agences.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucune agence enregistrée pour le moment.</p>
      ) : agencesFiltrees.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucune agence ne correspond à votre recherche.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {agencesFiltrees.map(agence => (
            <article key={agence.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-5 w-5" /></span>
                    <div><h3 className="font-semibold text-nuit-900">{agence.nom}</h3><p className="text-xs text-slate-500">{agence.type} · Créée le {new Date(agence.creeLe).toLocaleDateString('fr-FR')}</p></div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Adresse : {agence.adresse || 'Non renseignée'}</p>
                    <p>E-mail : {agence.emailContact || 'Non renseigné'}</p>
                    <p>Téléphone : {agence.telephoneContact || 'Non renseigné'}</p>
                    <p>Membres actifs : {agence.membresActifs}</p>
                  </div>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${agence.statut === 'ACTIVE' ? 'bg-emerald-100 text-blue-800' : agence.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                    {libelles[agence.statut]}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {agence.statut === 'EN_ATTENTE' && <button type="button" disabled={action === agence.id} onClick={() => void modifierStatut(agence, 'ACTIVE')} className="inline-flex items-center gap-2 rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /> Valider / activer</button>}
                  {agence.statut === 'ACTIVE' && <button type="button" disabled={action === agence.id} onClick={() => void modifierStatut(agence, 'SUSPENDUE')} className="inline-flex items-center gap-2 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><ShieldAlert className="h-4 w-4" /> Suspendre</button>}
                  {agence.statut === 'SUSPENDUE' && <button type="button" disabled={action === agence.id} onClick={() => void modifierStatut(agence, 'ACTIVE')} className="inline-flex items-center gap-2 rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /> Réactiver</button>}
                </div>
              </div>
              {agence.statut === 'ACTIVE' && (
                <form onSubmit={event => { event.preventDefault(); void designerResponsable(agence) }} className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
                  <label className="flex-1 text-sm font-semibold text-slate-700">
                    Désigner le responsable de cette agence
                    <input
                      type="email"
                      required
                      value={emailsResponsables[agence.id] ?? ''}
                      onChange={event => setEmailsResponsables(current => ({ ...current, [agence.id]: event.target.value }))}
                      placeholder="adresse@email.com"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                    />
                  </label>
                  <button type="submit" disabled={action === agence.id} className="rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">
                    {action === agence.id ? 'Enregistrement…' : 'Désigner le responsable'}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
