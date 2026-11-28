import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../auth'
import { ApiError } from '../api'
import Champ from '../components/Champ'
import MiseEnPageAuth from '../components/MiseEnPageAuth'

type Erreurs = Partial<Record<'nomComplet' | 'email' | 'telephone' | 'password' | 'confirmation', string>>

export default function Inscription() {
  const { utilisateur, inscrire } = useAuth()
  const navigate = useNavigate()

  const [nomComplet, setNomComplet] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  if (utilisateur) return <Navigate to="/tableau-de-bord" replace />

  /** Contrôles rapides côté navigateur (confort). Le serveur revalide TOUT : ce n'est pas une protection. */
  function valider(): Erreurs {
    const e: Erreurs = {}
    if (nomComplet.trim() === '') e.nomComplet = 'Indiquez votre nom complet.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Adresse email invalide.'
    if (telephone.trim() !== '' && !/^\+?[0-9 ]{8,15}$/.test(telephone.trim())) e.telephone = 'Numéro de téléphone invalide.'
    if (password.length < 8) e.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    if (confirmation !== password) e.confirmation = 'Les deux mots de passe ne correspondent pas.'
    return e
  }

  async function soumettre(ev: FormEvent) {
    ev.preventDefault()
    setErreurGenerale(null)
    const locales = valider()
    setErreurs(locales)
    if (Object.keys(locales).length > 0) return

    setEnCours(true)
    try {
      await inscrire({
        nomComplet: nomComplet.trim(),
        email: email.trim(),
        telephone,
        password,
      })
      navigate('/tableau-de-bord', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        // Erreurs champ par champ renvoyées par le serveur (clé = nom du champ).
        const duServeur: Erreurs = {}
        for (const [champ, message] of Object.entries(err.details)) {
          if (champ in { nomComplet: 1, email: 1, telephone: 1, password: 1 }) {
            duServeur[champ as keyof Erreurs] = message
          }
        }
        setErreurs(duServeur)
        setErreurGenerale(Object.keys(duServeur).length === 0 ? err.message : null)
      } else {
        setErreurGenerale('Une erreur inattendue est survenue.')
      }
    } finally {
      setEnCours(false)
    }
  }

  return (
    <MiseEnPageAuth
      titre="Créer un compte"
      intro="Créez d’abord votre compte Client. Ensuite, demandez le statut Propriétaire ou Agent depuis votre tableau de bord. Pour devenir Gestionnaire ou collaborer avec une agence, le responsable de cette agence devra vous inviter à partir de votre adresse e-mail."
      pied={
        <>
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-semibold text-emeraude-700 underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreurGenerale && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {erreurGenerale}
          </p>
        )}
        <Champ id="nomComplet" libelle="Nom complet" autoComplete="name" required value={nomComplet}
          onChange={(e) => setNomComplet(e.target.value)} erreur={erreurs.nomComplet} />
        <Champ id="email" libelle="Adresse email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} erreur={erreurs.email} />
        <Champ id="telephone" libelle="Téléphone (facultatif)" type="tel" autoComplete="tel" value={telephone}
          onChange={(e) => setTelephone(e.target.value)} erreur={erreurs.telephone} aide="Ex. +221 77 123 45 67" />
        <Champ id="password" libelle="Mot de passe" type="password" autoComplete="new-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} erreur={erreurs.password} aide="8 caractères minimum." />
        <Champ id="confirmation" libelle="Confirmer le mot de passe" type="password" autoComplete="new-password" required
          value={confirmation} onChange={(e) => setConfirmation(e.target.value)} erreur={erreurs.confirmation} />
        <button
          type="submit"
          disabled={enCours}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emeraude-700 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emeraude-800 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UserPlus aria-hidden className="h-5 w-5" />
          {enCours ? 'Création du compte…' : 'Créer mon compte'}
        </button>
      </form>
    </MiseEnPageAuth>
  )
}
