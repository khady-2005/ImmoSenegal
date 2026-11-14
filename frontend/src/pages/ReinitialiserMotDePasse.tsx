import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { appelApi, ApiError } from '../api'
import Champ from '../components/Champ'
import MiseEnPageAuth from '../components/MiseEnPageAuth'

export default function ReinitialiserMotDePasse() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setErreur(null)
    if (!token) { setErreur("Le lien est incomplet. Demandez un nouveau lien."); return }
    if (motDePasse !== confirmation) { setErreur("Les deux mots de passe ne correspondent pas."); return }
    if (motDePasse.length < 8) { setErreur("Le mot de passe doit contenir au moins 8 caractères."); return }
    setEnCours(true)
    try {
      await appelApi<void>('/api/auth/reinitialiser-mot-de-passe', { method: 'POST', body: { token, nouveauMotDePasse: motDePasse } })
      setMessage("Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.")
      setMotDePasse('')
      setConfirmation('')
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Une erreur est survenue. Demandez un nouveau lien.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <MiseEnPageAuth titre="Créer un nouveau mot de passe" intro="Choisissez un nouveau mot de passe pour votre compte."
      pied={<Link to="/connexion" className="font-semibold text-emeraude-700 underline">Retour à la connexion</Link>} >
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
        <Champ id="nouveau-mot-de-passe" libelle="Nouveau mot de passe" type="password" autoComplete="new-password" required minLength={8} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
        <Champ id="confirmation-mot-de-passe" libelle="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        <button type="submit" disabled={enCours || !motDePasse || !confirmation} className="w-full rounded-xl bg-emeraude-700 px-4 py-3 font-semibold text-white hover:bg-emeraude-800 disabled:opacity-60">
          {enCours ? 'Modification…' : 'Enregistrer le nouveau mot de passe'}
        </button>
        {message && <p className="text-center text-sm"><Link to="/connexion" className="font-semibold text-emeraude-700 underline">Se connecter</Link></p>}
        {!message && <p className="text-center text-sm"><Link to="/mot-de-passe-oublie" className="font-semibold text-emeraude-700 underline">Demander un autre lien</Link></p>}
      </form>
    </MiseEnPageAuth>
  )
}
