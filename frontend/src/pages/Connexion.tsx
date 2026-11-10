import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../auth'
import { ApiError } from '../api'
import Champ from '../components/Champ'
import MiseEnPageAuth from '../components/MiseEnPageAuth'

function messageErreur(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429 && e.retryAfter) {
      const minutes = Math.max(1, Math.ceil(e.retryAfter / 60))
      return `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
    }
    return e.message
  }
  return 'Une erreur inattendue est survenue.'
}

export default function Connexion() {
  const { utilisateur, connecter } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = (location.state as { from?: string } | null)?.from ?? '/tableau-de-bord'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  if (utilisateur) return <Navigate to={destination} replace />

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await connecter(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <MiseEnPageAuth
      titre="Connexion"
      intro="Accédez à votre espace ImmoSénégal."
      pied={
        <>
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="font-semibold text-emeraude-700 underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {erreur}
          </p>
        )}
        <Champ
          id="email"
          libelle="Adresse email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Champ
          id="password"
          libelle="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={enCours || email.trim() === '' || password === ''}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emeraude-700 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emeraude-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogIn aria-hidden className="h-5 w-5" />
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </MiseEnPageAuth>
  )
}
