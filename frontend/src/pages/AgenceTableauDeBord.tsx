import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, MailPlus, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'
import type { Annonce, PagePaginee } from '../types'
import MissionsAgence from '../components/MissionsAgence'
import CaisseAgence from '../components/CaisseAgence'
import PortefeuilleAgence from '../components/PortefeuilleAgence'
import AffectationBiensAgence from '../components/AffectationBiensAgence'

type Agence = { id: string; nom: string; slug: string; fonction: string }
type Mandat = {
  id: string
  agenceId: string
  agenceNom: string
  annonceId: string
  annonceTitre: string
  ville: string
  proprietaireNom: string
  origine: string
  statut: string
  creeLe: string
  decideLe: string | null
  resiliationDemandeeParId?: string | null
  tauxCommissionMensuel: number | null
  proposeParId: string
}
type CommissionLocation = {
  id: string
  agenceId: string
  agenceNom: string
  contratId: string
  annonceTitre: string
  periode: string
  tauxApplique: number
  baseCalcul: number
  montantCommission: number
  creeLe: string
}
type Candidature = {
  id: string
  agenceId: string
  agenceNom: string
  utilisateurId: string
  nom: string
  email: string
  fonction: string
  statut: string
  creeLe: string
}

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
  CAISSIER: 'Caissier',
  ASSISTANT_ADMINISTRATIF: 'Assistant administratif',
}

export default function AgenceTableauDeBord() {
  const { agenceId = '' } = useParams()
  const { jeton, utilisateur } = useAuth()
  const navigate = useNavigate()
  const [agence, setAgence] = useState<Agence | null>(null)
  const [membres, setMembres] = useState<Membre[]>([])
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [commissions, setCommissions] = useState<CommissionLocation[]>([])
  const [tauxCommission, setTauxCommission] = useState<Record<string, string>>({})
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [annoncesPropres, setAnnoncesPropres] = useState<Annonce[]>([])
  const [annoncesDisponibles, setAnnoncesDisponibles] = useState<Annonce[]>([])
  const [annonceChoisie, setAnnonceChoisie] = useState('')
  const [email, setEmail] = useState('')
  const [fonction, setFonction] = useState<'GESTIONNAIRE' | 'AGENT' | 'CAISSIER' | 'ASSISTANT_ADMINISTRATIF'>('AGENT')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [membreEnCours, setMembreEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [rechercheMembre, setRechercheMembre] = useState('')
  const [filtreMembre, setFiltreMembre] = useState('TOUS')

  const membresFiltres = membres.filter(m => {
    const q = rechercheMembre.trim().toLocaleLowerCase()
    const texte = !q || [m.nom, m.email, fonctions[m.fonction] ?? m.fonction].some(v => v.toLocaleLowerCase().includes(q))
    return texte && (filtreMembre === 'TOUS' || m.statut === filtreMembre || m.fonction === filtreMembre)
  })
  const membresActifs = membres.filter(m => m.statut === 'ACTIF').length
  const membresSuspendus = membres.filter(m => m.statut !== 'ACTIF').length
  const mandatsActifs = mandats.filter(m => m.statut === 'ACCEPTE').length
  const mandatsEnAttente = mandats.filter(m => m.statut === 'EN_ATTENTE').length

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setChargement(true)
    setErreur(null)
    try {
      const [espaces, equipe, demandes, catalogue, demandesEquipe, relevéCommissions, propres] = await Promise.all([
        appelApi<Agence[]>('/api/agence/mes-espaces', { token: jeton }),
        appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: jeton }),
        appelApi<Mandat[]>(`/api/agence/${agenceId}/mandats`, { token: jeton }),
        appelApi<PagePaginee<Annonce>>('/api/annonces?taille=50', { token: jeton }),
        appelApi<Candidature[]>(`/api/agence/${agenceId}/candidatures`, { token: jeton }),
        appelApi<CommissionLocation[]>(`/api/locations/agence/${agenceId}/commissions`, { token: jeton }),
        appelApi<PagePaginee<Annonce>>(`/api/annonces/agence/${agenceId}?taille=50`, { token: jeton }),
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
      setMandats(demandes)
      setCommissions(relevéCommissions)
      setCandidatures(demandesEquipe)
      setAnnoncesDisponibles(catalogue.contenu)
      setAnnoncesPropres(propres.contenu)
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

  const repondreMandat = async (mandat: Mandat, accepter: boolean) => {
    setMembreEnCours(mandat.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/reponse`, {
        method: 'POST',
        token: jeton,
        body: { accepter },
      })
      await charger()
      setMessage(accepter
        ? '✓ Bien accepté avec succès ! Le propriétaire a été informé dans ses notifications ImmoSénégal.'
        : 'La demande du propriétaire a été refusée. Le propriétaire en a été informé dans ses notifications.')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de répondre à cette demande.')
    } finally {
      setMembreEnCours(null)
    }
  }

  const definirCommission = async (mandat: Mandat) => {
    const taux = Number(tauxCommission[mandat.id])
    if (!Number.isFinite(taux) || taux < 0.01 || taux > 100) {
      setErreur('Indiquez un taux compris entre 0,01 % et 100 %.')
      return
    }
    setMembreEnCours(mandat.id); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/commission`, {
        method: 'PATCH', token: jeton, body: { tauxCommissionMensuel: taux },
      })
      setMessage('Le taux de commission a été enregistré dans le mandat.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer le taux.') }
    finally { setMembreEnCours(null) }
  }

  const demanderResiliation = async (mandat: Mandat) => {
    setMembreEnCours(mandat.id); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/resiliation`, { method: 'POST', token: jeton })
      setMessage('La demande de résiliation a été envoyée au propriétaire.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de demander la résiliation.') }
    finally { setMembreEnCours(null) }
  }

  const repondreResiliation = async (mandat: Mandat, accepter: boolean) => {
    setMembreEnCours(mandat.id); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/resiliation/reponse`, { method: 'POST', token: jeton, body: { accepter } })
      setMessage(accepter ? 'La résiliation du mandat est confirmée.' : 'La demande de résiliation a été refusée.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible de répondre à la demande.') }
    finally { setMembreEnCours(null) }
  }

  const proposerGestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!annonceChoisie) return
    setEnvoi(true)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/mandats/propositions`, {
        method: 'POST',
        token: jeton,
        body: { annonceId: annonceChoisie },
      })
      setAnnonceChoisie('')
      setMessage('Votre proposition de gestion a été envoyée au propriétaire.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer cette proposition de gestion.')
    } finally {
      setEnvoi(false)
    }
  }

  const deciderCandidature = async (candidature: Candidature, accepter: boolean) => {
    setMembreEnCours(candidature.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/candidatures/${candidature.id}/decision`, {
        method: 'POST',
        token: jeton,
        body: { accepter },
      })
      setMessage(accepter
        ? `${candidature.nom} a été accepté(e) comme collaborateur.`
        : `La candidature de ${candidature.nom} a été refusée.`)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de traiter cette candidature.')
    } finally {
      setMembreEnCours(null)
    }
  }

  const changerStatut = async (membre: Membre, nouveauStatut: 'ACTIF' | 'SUSPENDU') => {
    setMembreEnCours(membre.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/membres/${membre.id}/statut`, {
        method: 'PATCH',
        token: jeton,
        body: { statut: nouveauStatut },
      })
      setMessage(nouveauStatut === 'SUSPENDU'
        ? `L’accès de ${membre.nom} à cette agence a été suspendu.`
        : `L’accès de ${membre.nom} à cette agence a été réactivé.`)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier le statut de ce membre.')
    } finally {
      setMembreEnCours(null)
    }
  }

  const inviter = async (event: FormEvent<HTMLFormElement>) => {
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

  const changerFonction = async (membre: Membre, nouvelleFonction: 'GESTIONNAIRE' | 'AGENT' | 'CAISSIER' | 'ASSISTANT_ADMINISTRATIF') => {
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
    <main className="espace-partenaire-page mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Link to="/mes-agences" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" /> Retour à Mes agences
      </Link>

      <section className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-dore-300"><Building2 className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{agence?.nom ?? 'Tableau de bord de l’agence'}</h1>
            <p className="mt-1 text-sm text-white/75">Organisez le travail de l’agence, attribuez les biens et les missions, puis suivez les résultats de votre équipe.</p>
          </div>
        </div>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {message && <div role="status" aria-live="polite" className="mt-5 flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-950 shadow-sm"><span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">✓</span><p>{message}</p></div>}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicateurs de l’agence">
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Collaborateurs actifs</p><p className="mt-1 text-2xl font-bold text-nuit-900">{membresActifs}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Accès suspendus</p><p className="mt-1 text-2xl font-bold text-nuit-900">{membresSuspendus}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Mandats actifs</p><p className="mt-1 text-2xl font-bold text-nuit-900">{mandatsActifs}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Mandats en attente</p><p className="mt-1 text-2xl font-bold text-nuit-900">{mandatsEnAttente}</p></article>
      </section>
      {agence && <MissionsAgence agenceId={agenceId} fonction="RESPONSABLE" />}
      <CaisseAgence agenceId={agenceId} fonction="RESPONSABLE" />
      <PortefeuilleAgence agenceId={agenceId} />
      <AffectationBiensAgence agenceId={agenceId} />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-nuit-900">Suivi des commissions locatives</h2>
            <p className="mt-1 text-sm text-slate-600">Estimation calculée sur chaque paiement de loyer déclaré pour un bien sous mandat accepté. Les déclarations ne constituent pas une vérification bancaire.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">{commissions.reduce((total, item) => total + Number(item.montantCommission), 0).toLocaleString('fr-FR')} FCFA estimés</span>
        </div>
        {commissions.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune commission locative enregistrée pour le moment.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Bien</th><th className="py-2 pr-3">Période</th><th className="py-2 pr-3">Loyer déclaré</th><th className="py-2 pr-3">Taux</th><th className="py-2">Commission estimée</th></tr></thead>
              <tbody>{commissions.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-3 pr-3 font-medium text-nuit-900">{item.annonceTitre}</td><td className="py-3 pr-3">{new Date(item.periode).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td><td className="py-3 pr-3">{Number(item.baseCalcul).toLocaleString('fr-FR')} FCFA</td><td className="py-3 pr-3">{Number(item.tauxApplique).toLocaleString('fr-FR')} %</td><td className="py-3 font-semibold text-nuit-900">{Number(item.montantCommission).toLocaleString('fr-FR')} FCFA</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-nuit-900">Proposer la gestion d’un bien</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Sélectionnez une annonce publiée appartenant à un propriétaire. Celui-ci recevra votre proposition et restera libre de l’accepter ou de la refuser.
        </p>
        {(() => {
          const dejaTraitees = new Set(mandats.filter((mandat) => ['EN_ATTENTE', 'ACCEPTE', 'RESILIATION_DEMANDEE'].includes(mandat.statut)).map((mandat) => mandat.annonceId))
          const disponibles = annoncesDisponibles.filter((annonce) =>
            !annonce.exemple &&
            annonce.proprietaire.id !== utilisateur?.id &&
            !dejaTraitees.has(annonce.id)
          )
          return disponibles.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucune annonce publiée disponible pour une nouvelle proposition pour le moment.
            </p>
          ) : (
            <form onSubmit={proposerGestion} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="annonce-a-gerer">Annonce à proposer</label>
              <select
                id="annonce-a-gerer"
                required
                value={annonceChoisie}
                onChange={(event) => setAnnonceChoisie(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Choisir une annonce publiée…</option>
                {disponibles.map((annonce) => (
                  <option key={annonce.id} value={annonce.id}>
                    {annonce.titre} — {annonce.ville} · {annonce.proprietaire.nomComplet}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={envoi || !annonceChoisie}
                className="rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {envoi ? 'Envoi…' : 'Envoyer une proposition'}
              </button>
            </form>
          )
        })()}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-nuit-900">Mandats et demandes de gestion</h2>
            <p className="mt-1 text-sm text-slate-600">Les demandes envoyées par les propriétaires et les propositions de votre agence.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{mandats.length} demande(s)</span>
        </div>
        {mandats.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune demande de gestion pour le moment.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {mandats.map((mandat) => (
              <article key={mandat.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-nuit-900">{mandat.annonceTitre}</p>
                  <p className="text-sm text-slate-600">{mandat.ville} · Propriétaire : {mandat.proprietaireNom}</p>
                  <p className="mt-1 text-xs text-slate-500">{mandat.origine === 'INITIATIVE_PROPRIETAIRE' ? 'Demande reçue du propriétaire' : 'Proposition envoyée par votre agence'}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${mandat.statut === 'ACCEPTE' ? 'bg-blue-100 text-blue-800' : mandat.statut === 'REFUSE' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {mandat.statut === 'EN_ATTENTE' ? (mandat.origine === 'INITIATIVE_PROPRIETAIRE' ? 'Votre réponse est attendue' : 'En attente du propriétaire') : mandat.statut === 'ACCEPTE' ? 'Mandat accepté' : mandat.statut === 'RESILIATION_DEMANDEE' ? 'Résiliation à confirmer' : mandat.statut === 'RESILIE' ? 'Mandat résilié' : 'Demande refusée'}
                  </span>
                </div>
                {mandat.statut === 'EN_ATTENTE' && mandat.proposeParId === utilisateur?.id && mandat.tauxCommissionMensuel == null && (
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="text-xs font-medium text-slate-600">Commission mensuelle (%)
                      <input type="number" min="0.01" max="100" step="0.01" value={tauxCommission[mandat.id] ?? ''} onChange={(event) => setTauxCommission((prev) => ({ ...prev, [mandat.id]: event.target.value }))} className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ex. 8" />
                    </label>
                    <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void definirCommission(mandat)} className="rounded-lg bg-nuit-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Enregistrer le taux</button>
                  </div>
                )}
                {mandat.statut === 'EN_ATTENTE' && mandat.tauxCommissionMensuel == null && mandat.proposeParId !== utilisateur?.id && <p className="mt-2 text-xs text-slate-500">En attente de la proposition du taux de commission par l’autre partie avant acceptation.</p>}
                {mandat.tauxCommissionMensuel != null && <p className="mt-2 text-xs text-slate-600">Commission convenue : <strong>{Number(mandat.tauxCommissionMensuel).toLocaleString('fr-FR')} % du loyer mensuel</strong></p>}
                {mandat.statut === 'ACCEPTE' && (
                  <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void demanderResiliation(mandat)}
                    className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">Demander la résiliation</button>
                )}
                {mandat.statut === 'RESILIATION_DEMANDEE' && mandat.resiliationDemandeeParId !== utilisateur?.id && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void repondreResiliation(mandat, true)} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmer</button>
                    <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void repondreResiliation(mandat, false)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Refuser</button>
                  </div>
                )}
                {mandat.origine === 'INITIATIVE_PROPRIETAIRE' && mandat.statut === 'EN_ATTENTE' && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void repondreMandat(mandat, true)} className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">Accepter</button>
                    <button type="button" disabled={membreEnCours === mandat.id} onClick={() => void repondreMandat(mandat, false)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Refuser</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-nuit-900">Biens propres de l’agence</h2>
            <p className="mt-1 text-sm text-slate-600">Les annonces publiées directement au nom de votre agence ({annoncesPropres.length}).</p>
          </div>
          <Link to={`/annonces/nouvelle?agenceId=${agenceId}`} className="rounded-xl bg-dore-500 px-4 py-2.5 text-sm font-bold text-nuit-950 hover:bg-dore-400">
            Publier un bien de l’agence
          </Link>
        </div>
        {annoncesPropres.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun bien propre publié par l’agence pour le moment.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {annoncesPropres.map((a) => (
              <article key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="min-w-0">
                  <Link to={`/annonces/${a.id}`} className="font-semibold text-nuit-900 hover:underline">{a.titre}</Link>
                  <p className="text-xs text-slate-600">{a.quartier}, {a.ville} · {a.prix.toLocaleString('fr-FR')} FCFA</p>
                </div>
                <Link to={`/annonces/${a.id}/modifier`} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Modifier
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-nuit-900">Candidatures reçues</h2>
            <p className="mt-1 text-sm text-slate-600">Les agents et gestionnaires qui souhaitent rejoindre votre agence.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{candidatures.length} en attente</span>
        </div>
        {candidatures.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucune candidature en attente pour le moment.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {candidatures.map((candidature) => (
              <article key={candidature.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-nuit-900">{candidature.nom}</p>
                  <p className="text-sm text-slate-600">{candidature.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Fonction souhaitée : {fonctions[candidature.fonction] ?? candidature.fonction}
                    {' · '}Reçue le {new Date(candidature.creeLe).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={membreEnCours === candidature.id}
                    onClick={() => void deciderCandidature(candidature, true)}
                    className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">
                    Accepter
                  </button>
                  <button type="button" disabled={membreEnCours === candidature.id}
                    onClick={() => void deciderCandidature(candidature, false)}
                    className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                    Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-nuit-900"><Users className="h-5 w-5" /> Équipe de l’agence</h2>
              <p className="mt-1 text-sm text-slate-600">Consultez les membres actifs et suspendus, et gérez leurs accès.</p>
            </div>
            <button type="button" onClick={() => void charger()} disabled={chargement} aria-label="Actualiser l’équipe" className="rounded-full border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Rechercher un membre
              <input value={rechercheMembre} onChange={e => setRechercheMembre(e.target.value)} placeholder="Nom, e-mail ou fonction…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal"/>
            </label>
            <label className="text-sm font-medium text-slate-700">Filtrer l’équipe
              <select value={filtreMembre} onChange={e => setFiltreMembre(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="TOUS">Tous les membres</option><option value="ACTIF">Accès actifs</option><option value="SUSPENDU">Accès suspendus</option><option value="AGENT">Agents immobiliers</option><option value="GESTIONNAIRE">Gestionnaires</option>
              </select>
            </label>
          </div>
          {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement de l’équipe…</p> : membresFiltres.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{membres.length === 0 ? 'Aucun membre enregistré.' : 'Aucun membre ne correspond à cette recherche.'}</p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {membresFiltres.map((membre) => (
                <article key={membre.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-nuit-900">{membre.nom}</p>
                    <p className="truncate text-sm text-slate-600">{membre.email}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      {membre.fonction === 'RESPONSABLE' && <ShieldCheck className="h-3.5 w-3.5" />}
                      {fonctions[membre.fonction] ?? membre.fonction}
                    </span>
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${membre.statut === 'ACTIF' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {membre.statut === 'ACTIF' ? 'Accès actif' : 'Accès suspendu'}
                    </span>
                  </div>
                  {membre.fonction !== 'RESPONSABLE' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Fonction de ${membre.nom}`}
                        value={membre.fonction}
                        disabled={membreEnCours === membre.id}
                        onChange={(event) => void changerFonction(membre, event.target.value as 'GESTIONNAIRE' | 'AGENT')}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                      >
                        <option value="AGENT">Agent immobilier</option>
                        <option value="GESTIONNAIRE">Gestionnaire</option>
                        <option value="CAISSIER">Caissier</option>
                        <option value="ASSISTANT_ADMINISTRATIF">Assistant administratif</option>
                      </select>
                      <button
                        type="button"
                        disabled={membreEnCours === membre.id}
                        onClick={() => void changerStatut(membre, membre.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${membre.statut === 'ACTIF' ? 'border border-red-200 text-red-700 hover:bg-red-50' : 'bg-nuit-900 text-white hover:bg-nuit-800'}`}
                      >
                        {membre.statut === 'ACTIF' ? 'Suspendre l’accès' : 'Réactiver l’accès'}
                      </button>
                    </div>
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
              <select id="fonction-collaborateur" value={fonction} onChange={(event) => setFonction(event.target.value as 'GESTIONNAIRE' | 'AGENT' | 'CAISSIER' | 'ASSISTANT_ADMINISTRATIF')} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="AGENT">Agent immobilier</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="CAISSIER">Caissier</option>
                <option value="ASSISTANT_ADMINISTRATIF">Assistant administratif</option>
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
