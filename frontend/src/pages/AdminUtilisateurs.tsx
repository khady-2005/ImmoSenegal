import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { libelleRole, type Role } from '../types'

interface UtilisateurAdmin {
  id: string
  email: string
  nomComplet: string
  telephone: string | null
  role: Role
  actif: boolean
  creeLe: string
}

const ROLES_MODIFIABLES: Role[] = [
  'CLIENT', 'PROPRIETAIRE', 'AGENT', 'GESTIONNAIRE',
  'CAISSIER', 'ASSISTANT_ADMINISTRATIF', 'RESPONSABLE', 'ADMIN',
]

export default function AdminUtilisateurs() {
  const { utilisateur, jeton } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurAdmin[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtreRole, setFiltreRole] = useState('TOUS')

  const charger = useCallback(async () => {
    try {
      setUtilisateurs(await appelApi<UtilisateurAdmin[]>('/api/admin/users', { token: jeton }))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les comptes.')
    }
  }, [jeton])

  useEffect(() => {
    if (utilisateur?.role === 'ADMIN') void charger()
  }, [charger, utilisateur?.role])

  async function modifier(id: string, chemin: 'status' | 'role', valeur: boolean | Role) {
    setEnCours(id)
    setErreur(null)
    try {
      await appelApi(`/api/admin/users/${id}/${chemin}`, {
        method: 'PATCH',
        token: jeton,
        body: chemin === 'status' ? { actif: valeur } : { role: valeur },
      })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Modification impossible.')
    } finally {
      setEnCours(null)
    }
  }

  if (utilisateur?.role !== 'ADMIN') {
    return <div className="mx-auto max-w-2xl px-4 py-12"><p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm">Cette page est réservée aux administrateurs.</p></div>
  }

  const filtres = (utilisateurs ?? []).filter((u) => {
    const q = recherche.trim().toLocaleLowerCase('fr')
    const okTexte = !q || [u.nomComplet, u.email, u.telephone ?? ''].some((v) => v.toLocaleLowerCase('fr').includes(q))
    const okRole = filtreRole === 'TOUS' || u.role === filtreRole
    return okTexte && okRole
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-slate-950">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 text-sm font-bold text-nuit-950 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex rounded-lg bg-amber-100 px-4 py-2 text-lg font-extrabold uppercase tracking-wide text-slate-950">Administration</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-nuit-950">Gestion des utilisateurs</h1>
          <p className="mt-3 max-w-3xl rounded-xl border-2 border-blue-200 bg-blue-50 px-5 py-4 text-lg font-semibold leading-8 text-slate-950 shadow-sm">Tous les comptes créés sont affichés, même si leur propriétaire ne s'est jamais reconnecté.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void charger()} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-nuit-950 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
          <span className="rounded-full border-2 border-slate-300 bg-slate-100 px-4 py-2 text-base font-extrabold text-slate-950">{filtres.length} / {utilisateurs?.length ?? '…'} compte(s)</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_240px]">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom, e-mail ou téléphone…"
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950"
        />
        <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950">
          <option value="TOUS">Tous les rôles</option>
          {ROLES_MODIFIABLES.map((r) => <option key={r} value={r}>{libelleRole[r]}</option>)}
        </select>
      </div>

      {erreur && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {!utilisateurs && !erreur && <p role="status" className="mt-6 text-slate-500">Chargement des comptes…</p>}
      {utilisateurs && filtres.length === 0 && <p className="mt-6 text-slate-600">Aucun compte correspondant.</p>}

      <ul className="mt-6 space-y-3">
        {filtres.map((u) => (
          <li key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-nuit-950">{u.nomComplet}</p>
                <p className="break-all text-sm text-slate-600">{u.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Inscrit le {new Date(u.creeLe).toLocaleDateString('fr-FR')} · {u.telephone ?? 'Téléphone non renseigné'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.actif ? 'bg-dore-100 text-nuit-900' : 'bg-red-50 text-red-800'}`}>
                {u.actif ? 'Compte actif' : 'Compte suspendu'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Rôle
                <select
                  value={u.role}
                  disabled={enCours === u.id || u.role === 'ADMIN'}
                  onChange={(e) => void modifier(u.id, 'role', e.target.value as Role)}
                  className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                >
                  {ROLES_MODIFIABLES.map((role) => <option key={role} value={role}>{libelleRole[role]}</option>)}
                  {u.role === 'ADMIN' && <option value="ADMIN">Administrateur</option>}
                </select>
              </label>
              <button
                type="button"
                disabled={enCours === u.id || u.id === utilisateur.id || (u.role === 'ADMIN' && u.actif)}
                onClick={() => void modifier(u.id, 'status', !u.actif)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${u.actif ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-emeraude-600 text-white hover:bg-emeraude-700'}`}
                title={u.id === utilisateur.id ? 'Vous ne pouvez pas suspendre votre propre compte' : undefined}
              >
                {enCours === u.id ? 'Enregistrement…' : u.actif ? 'Suspendre le compte' : 'Réactiver le compte'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
