import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { appelApi, ApiError } from '../api'
import Champ from '../components/Champ'
import MiseEnPageAuth from '../components/MiseEnPageAuth'

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setErreur(null)
    setEnCours(true)
    try {
      await appelApi<void>('/api/auth/mot-de-passe-oublie', { method: 'POST', body: { email: email.trim() } })
      setMessage("Si un compte actif correspond à cette adresse, un lien de réinitialisation lui sera envoyé. Vérifiez aussi vos courriers indésirables.")
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Une erreur est survenue. Réessayez.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <MiseEnPageAuth titre="Mot de passe oublié ?" intro="Indiquez l'adresse e-mail associée à votre compte.">
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        {erreur && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
        <Champ id="email-reset" libelle="Adresse email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <button type="submit" disabled={enCours || !email.trim()} className="w-full rounded-xl bg-emeraude-700 px-4 py-3 font-semibold text-white hover:bg-emeraude-800 disabled:opacity-60">
          {enCours ? 'Envoi…' : 'Envoyer le lien'}
        </button>
        <p className="text-center text-sm"><Link to="/connexion" className="font-semibold text-emeraude-700 underline">Retour à la connexion</Link></p>
      </form>
    </MiseEnPageAuth>
  )
}
