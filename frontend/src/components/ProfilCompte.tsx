import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Save, UserRound } from 'lucide-react'
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
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [motDePasseMessage, setMotDePasseMessage] = useState('')
  const [motDePasseErreur, setMotDePasseErreur] = useState('')
  const [changementEnCours, setChangementEnCours] = useState(false)

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

  async function changerMotDePasse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!jeton) return
    if (nouveauMotDePasse !== confirmation) {
      setMotDePasseErreur('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setChangementEnCours(true)
    setMotDePasseErreur('')
    setMotDePasseMessage('')
    try {
      await appelApi<void>('/api/auth/changer-mot-de-passe', {
        method: 'POST',
        token: jeton,
        body: { motDePasseActuel, nouveauMotDePasse },
      })
      setMotDePasseActuel('')
      setNouveauMotDePasse('')
      setConfirmation('')
      setMotDePasseMessage('Votre mot de passe a été modifié.')
    } catch (e) {
      setMotDePasseErreur(e instanceof ApiError ? e.message : 'Impossible de modifier le mot de passe.')
    } finally {
      setChangementEnCours(false)
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
        <div className="col-span-1 flex flex-col items-stretch gap-2 border-t border-slate-200 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            disabled={envoi || nomComplet.trim().length < 2}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-400 px-6 py-3 text-base font-bold text-slate-950 shadow-md transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nuit-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
          >
            <Save className="h-5 w-5" /> {envoi ? 'Enregistrement…' : 'Enregistrer mes modifications'}
          </button>
        </div>
      </form>
      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-nuit-800" />
          <h3 className="text-lg font-semibold text-nuit-900">Sécurité du compte</h3>
        </div>
        <p className="mt-1 text-sm text-slate-600">Pour changer votre mot de passe, confirmez d'abord celui que vous utilisez actuellement.</p>
        {motDePasseErreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{motDePasseErreur}</p>}
        {motDePasseMessage && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{motDePasseMessage}</p>}
        <form onSubmit={changerMotDePasse} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Mot de passe actuel
            <input required type="password" autoComplete="current-password" maxLength={72} value={motDePasseActuel} onChange={e => setMotDePasseActuel(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">Nouveau mot de passe
            <input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={nouveauMotDePasse} onChange={e => setNouveauMotDePasse(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">Confirmer le nouveau mot de passe
            <input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={changementEnCours || motDePasseActuel.length === 0 || nouveauMotDePasse.length < 8 || confirmation.length < 8} className="inline-flex items-center gap-2 rounded-full border border-nuit-900 px-5 py-2.5 text-sm font-semibold text-nuit-900 hover:bg-slate-50 disabled:opacity-50">
              <KeyRound className="h-4 w-4" /> {changementEnCours ? 'Modification…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
