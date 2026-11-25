import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Send } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type AvisAgence = { id: string; agenceId: string; auteurNom: string; note: number; commentaire: string; creeLe: string }
type Agence = { id: string; nom: string; slug: string; description?: string; adresse?: string; logoUrl?: string; moyenne?: number; nombreAvis?: number; avis?: AvisAgence[] }
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
      const agencesNotees = await Promise.all(liste.map(async agence => {
        try {
          const resume = await appelApi<{ moyenne: number; nombreAvis: number; avis: AvisAgence[] }>(`/api/agence/${agence.id}/evaluations`, { token: jeton })
          return { ...agence, moyenne: resume.moyenne, nombreAvis: resume.nombreAvis, avis: resume.avis }
        } catch { return agence }
      }))
      setAgences(agencesNotees)
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
    <main className="mx-auto max-w-7xl bg-slate-50 px-4 py-8 text-[18px] leading-8 text-slate-950 sm:px-6 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-lg font-extrabold text-slate-950 shadow-sm hover:bg-amber-100">
        <ArrowLeft className="h-4 w-4" /> Retour à mon espace
      </Link>
      <section className="mt-6 rounded-3xl border-2 border-amber-500 bg-amber-100 p-7 text-slate-950 shadow-lg sm:p-10">
        <p className="text-base font-extrabold uppercase tracking-wide text-amber-950">Espace professionnel</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">Rejoindre une agence</h1>
        <p className="mt-3 max-w-3xl text-xl font-semibold leading-9 text-slate-950">
          Découvrez les agences partenaires et envoyez une candidature pour devenir agent immobilier ou gestionnaire.
        </p>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-lg font-semibold leading-8 text-red-950">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-lg font-semibold leading-8 text-emerald-950">{message}</p>}

      <section className="mt-8">
        <h2 className="text-3xl font-extrabold leading-tight text-slate-950">Agences disponibles</h2>
        <p className="mt-3 text-lg font-medium leading-8 text-slate-900">Votre adresse e-mail de compte sera communiquée uniquement à l’agence auprès de laquelle vous candidatez.</p>
        {chargement ? <p role="status" className="mt-5 text-lg font-semibold text-slate-800">Chargement des agences…</p> : agences.length === 0 ? (
          <p className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-5 text-lg font-medium text-slate-900">Aucune agence active n’est disponible pour le moment.</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {agences.map(agence => {
              const candidature = candidaturePour(agence.id)
              const dejaMembre = mesEspaces.some(espace => espace.id === agence.id)
              const ancienne = candidatures.find(c => c.agenceId === agence.id)
              return (
                <article key={agence.id} className="rounded-2xl border-2 border-slate-400 bg-white p-7 text-slate-950 shadow-md transition-shadow hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-6 w-6" /></span>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-extrabold text-slate-950">{agence.nom}</h3>
                      {typeof agence.nombreAvis === 'number' && agence.nombreAvis > 0 && <p className="mt-3 text-lg font-extrabold text-amber-800">★ {agence.moyenne?.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})}/5 <span className="font-semibold text-slate-700">· {agence.nombreAvis} avis</span></p>}
                      {agence.adresse && <p className="mt-3 text-lg font-medium text-slate-800">{agence.adresse}</p>}
                      {agence.description && <p className="mt-4 text-lg font-medium leading-8 text-slate-900">{agence.description}</p>}
                      {agence.avis && agence.avis.length > 0 && <div className="mt-3 space-y-2">{agence.avis.slice(0, 2).map(avis => <blockquote key={avis.id} className="rounded-lg bg-slate-50 p-3"><p className="text-base font-extrabold text-amber-800">{'★'.repeat(avis.note)}{'☆'.repeat(5-avis.note)} · {avis.auteurNom}</p><p className="mt-2 text-lg font-medium leading-8 text-slate-900">{avis.commentaire}</p></blockquote>)}</div>}
                    </div>
                  </div>
                  {dejaMembre ? (
                    <p className="mt-6 flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-lg font-bold text-emerald-950"><CheckCircle2 className="h-4 w-4" /> Vous êtes déjà membre — {mesEspaces.find(espace => espace.id === agence.id)?.fonction === 'RESPONSABLE' ? 'Responsable' : 'Collaborateur'}</p>
                  ) : candidature ? (
                    <p className="mt-6 flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-lg font-bold text-amber-950"><Send className="h-4 w-4" /> Candidature envoyée — en attente de réponse</p>
                  ) : ancienne?.statut === 'ACCEPTEE' ? (
                    <p className="mt-5 flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-lg font-bold text-emerald-950"><CheckCircle2 className="h-4 w-4" /> Vous êtes membre de cette agence</p>
                  ) : (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <label className="sr-only" htmlFor={'fonction-' + agence.id}>Fonction souhaitée</label>
                      <select id={'fonction-' + agence.id} value={fonctions[agence.id] ?? 'AGENT'}
                        onChange={e => setFonctions(current => ({ ...current, [agence.id]: e.target.value as 'AGENT' | 'GESTIONNAIRE' }))}
                        className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-500 bg-white px-4 py-3 text-lg font-bold text-slate-950">
                        <option value="AGENT">Agent immobilier</option>
                        <option value="GESTIONNAIRE">Gestionnaire immobilier</option>
                      </select>
                      <button type="button" onClick={() => void postuler(agence)} disabled={envoi !== null}
                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-amber-700 bg-amber-400 px-8 py-3 text-lg font-extrabold text-slate-950 shadow-md transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-200 disabled:text-slate-700 disabled:opacity-100">
                        <Send className="h-4 w-4" /> {envoi === agence.id ? 'Envoi…' : 'Postuler'}
                      </button>
                    </div>
                  )}
                  {ancienne && !candidature && ancienne.statut !== 'ACCEPTEE' && (
                    <p className="mt-4 text-lg font-medium text-slate-800">Dernière candidature : {libelles[ancienne.statut] ?? ancienne.statut}</p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border-2 border-slate-400 bg-white p-7 text-slate-950 shadow-md">
        <h2 className="text-3xl font-extrabold leading-tight text-slate-950">Mes candidatures</h2>
        {candidatures.length === 0 ? <p className="mt-4 text-lg font-medium text-slate-900">Vous n’avez envoyé aucune candidature.</p> : (
          <ul className="mt-5 divide-y divide-slate-200">
            {candidatures.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-5 text-lg leading-8">
              <span className="font-medium text-nuit-900">{c.agenceNom} · {libelles[c.fonction] ?? c.fonction}</span>
              <span className={c.statut === 'ACCEPTEE' ? 'font-semibold text-emerald-700' : c.statut === 'REFUSEE' ? 'font-semibold text-red-700' : 'font-semibold text-amber-700'}>{libelles[c.statut] ?? c.statut}</span>
            </li>)}
          </ul>
        )}
      </section>
    </main>
  )
}
