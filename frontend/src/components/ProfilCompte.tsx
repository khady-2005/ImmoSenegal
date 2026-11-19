import { useEffect, useState, type FormEvent } from 'react'
import { Save, UserRound } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import type { Utilisateur } from '../types'

export default function ProfilCompte({ profil }: { profil: Utilisateur }) {
  const { jeton, majUtilisateur } = useAuth()
  const [nomComplet, setNomComplet] = useState(profil.nomComplet)
  const [telephone, setTelephone] = useState(profil.telephone ?? '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setNomComplet(profil.nomComplet)
    setTelephone(profil.telephone ?? '')
  }, [profil.nomComplet, profil.telephone])

  async function enregistrer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!jeton) return
    setEnvoi(true)
    setErreur('')
    setMessage('')
    try {
      const actualise = await appelApi<Utilisateur>('/api/auth/me', {
        method: 'PUT',
        token: jeton,
        body: { nomComplet: nomComplet.trim(), telephone: telephone.trim() || null },
      })
      majUtilisateur(actualise)
      setMessage('Vos informations ont été mises à jour.')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier votre profil.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-nuit-800" />
        <h2 className="text-lg font-semibold text-nuit-900">Modifier mes coordonnées</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">Mettez à jour votre nom et votre numéro de téléphone. Votre adresse e-mail et votre rôle restent protégés.</p>
      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <form onSubmit={enregistrer} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Nom complet
          <input required minLength={2} maxLength={120} value={nomComplet} onChange={e => setNomComplet(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <label className="text-sm font-medium text-slate-700">Téléphone
          <input maxLength={20} value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+221 ..." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={envoi || nomComplet.trim().length < 2} className="inline-flex items-center gap-2 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">
            <Save className="h-4 w-4" /> {envoi ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </section>
  )
}
