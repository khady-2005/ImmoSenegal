import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Send } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Agence = { id: string; nom: string; slug: string; description?: string; adresse?: string; logoUrl?: string }
type EspaceAgence = { id: string; nom: string; fonction: string }
type Candidature = { id: string; agenceId: string; agenceNom: string; fonction: string; statut: string; creeLe: string; traiteeLe?: string | null }

const libelles: Record<string, string> = {
  AGENT: 'Agent immobilier',
  GESTIONNAIRE: 'Gestionnaire immobilier',
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
}

export default function AnnuaireAgences() {
  const { jeton } = useAuth()
  const [agences, setAgences] = useState<Agence[]>([])
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [mesEspaces, setMesEspaces] = useState<EspaceAgence[]>([])
  const [fonctions, setFonctions] = useState<Record<string, 'AGENT' | 'GESTIONNAIRE'>>({})
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    setErreur(null)
    try {
      const [liste, mesDemandes, espaces] = await Promise.all([
        appelApi<Agence[]>('/api/agence/annuaire', { token: jeton }),
        appelApi<Candidature[]>('/api/mes-candidatures-agence', { token: jeton }),
        appelApi<EspaceAgence[]>('/api/agence/mes-espaces', { token: jeton }),
      ])
      setAgences(liste)
      setCandidatures(mesDemandes)
      setMesEspaces(espaces)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les agences.')
    } finally {
      setChargement(false)
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  const postuler = async (agence: Agence) => {
    const fonction = fonctions[agence.id] ?? 'AGENT'
    setEnvoi(agence.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi('/api/agence/' + agence.id + '/candidatures', {
        method: 'POST',
        token: jeton,
        body: { fonction },
      })
      setMessage('Votre candidature a été envoyée à ' + agence.nom + '.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre candidature.')
    } finally {
      setEnvoi(null)
    }
  }

  const candidaturePour = (agenceId: string) => candidatures.find(c => c.agenceId === agenceId && c.statut === 'EN_ATTENTE')

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-800 hover:text-amber-700">
        <ArrowLeft className="h-4 w-4" /> Retour à mon espace
      </Link>
      <section className="mt-5 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Rejoindre une agence</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
          Découvrez les agences partenaires et envoyez une candidature pour devenir agent immobilier ou gestionnaire.
        </p>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <section className="mt-8">
        <h2 className="text-xl font-bold text-nuit-900">Agences disponibles</h2>
        <p className="mt-1 text-sm text-slate-600">Votre adresse e-mail de compte sera communiquée uniquement à l’agence auprès de laquelle vous candidatez.</p>
        {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement des agences…</p> : agences.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucune agence active n’est disponible pour le moment.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {agences.map(agence => {
              const candidature = candidaturePour(agence.id)
              const dejaMembre = mesEspaces.some(espace => espace.id === agence.id)
              const ancienne = candidatures.find(c => c.agenceId === agence.id)
              return (
                <article key={agence.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-nuit-900">{agence.nom}</h3>
                      {agence.adresse && <p className="mt-1 text-sm text-slate-500">{agence.adresse}</p>}
                      {agence.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{agence.description}</p>}
                    </div>
                  </div>
                  {dejaMembre ? (
                    <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Vous êtes déjà membre — {mesEspaces.find(espace => espace.id === agence.id)?.fonction === 'RESPONSABLE' ? 'Responsable' : 'Collaborateur'}</p>
                  ) : candidature ? (
                    <p className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800"><Send className="h-4 w-4" /> Candidature envoyée — en attente de réponse</p>
                  ) : ancienne?.statut === 'ACCEPTEE' ? (
                    <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Vous êtes membre de cette agence</p>
                  ) : (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <label className="sr-only" htmlFor={'fonction-' + agence.id}>Fonction souhaitée</label>
                      <select id={'fonction-' + agence.id} value={fonctions[agence.id] ?? 'AGENT'}
                        onChange={e => setFonctions(current => ({ ...current, [agence.id]: e.target.value as 'AGENT' | 'GESTIONNAIRE' }))}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="AGENT">Agent immobilier</option>
                        <option value="GESTIONNAIRE">Gestionnaire immobilier</option>
                      </select>
                      <button type="button" onClick={() => void postuler(agence)} disabled={envoi !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-nuit-800 disabled:opacity-50">
                        <Send className="h-4 w-4" /> {envoi === agence.id ? 'Envoi…' : 'Postuler'}
                      </button>
                    </div>
                  )}
                  {ancienne && !candidature && ancienne.statut !== 'ACCEPTEE' && (
                    <p className="mt-3 text-xs text-slate-500">Dernière candidature : {libelles[ancienne.statut] ?? ancienne.statut}</p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-nuit-900">Mes candidatures</h2>
        {candidatures.length === 0 ? <p className="mt-2 text-sm text-slate-600">Vous n’avez envoyé aucune candidature.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">
            {candidatures.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="font-medium text-nuit-900">{c.agenceNom} · {libelles[c.fonction] ?? c.fonction}</span>
              <span className={c.statut === 'ACCEPTEE' ? 'font-semibold text-emerald-700' : c.statut === 'REFUSEE' ? 'font-semibold text-red-700' : 'font-semibold text-amber-700'}>{libelles[c.statut] ?? c.statut}</span>
            </li>)}
          </ul>
        )}
      </section>
    </main>
  )
}
