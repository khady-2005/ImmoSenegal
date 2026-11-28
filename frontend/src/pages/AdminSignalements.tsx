import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Flag } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type SignalementAdmin = {
  id: string
  auteurNom: string
  annonceId: string | null
  type: string
  objet: string
  description: string
  statut: string
  reponseAdmin: string | null
  creeLe: string
}

export default function AdminSignalements() {
  const { jeton } = useAuth()
  const [liste, setListe] = useState<SignalementAdmin[]>([])
  const [reponses, setReponses] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    try {
      setListe(await appelApi<SignalementAdmin[]>('/api/admin/signalements', { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.')
    } finally {
      setChargement(false)
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  async function traiter(id: string, statut: 'EN_COURS' | 'TRAITE' | 'REJETE') {
    if (!jeton) return
    setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/admin/signalements/${id}`, {
        method: 'PATCH',
        token: jeton,
        body: { statut, reponseAdmin: reponses[id] ?? '' },
      })
      setMessage('Décision enregistrée et utilisateur notifié.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Traitement impossible.')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-900 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-titre text-3xl font-bold text-nuit-900">
        <Flag className="h-7 w-7 text-amber-700" /> Signalements et réclamations
      </h1>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {chargement ? <p className="mt-6 text-sm text-slate-500">Chargement…</p> : liste.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun signalement ni réclamation pour le moment.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {liste.map((s) => (
            <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">{s.type}</span>
                  <h2 className="mt-2 text-lg font-bold text-nuit-900">{s.objet}</h2>
                  <p className="text-xs text-slate-500">Par {s.auteurNom} · {new Date(s.creeLe).toLocaleString('fr-FR')}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">{s.statut}</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{s.description}</p>
              {s.annonceId && (
                <Link to={`/annonces/${s.annonceId}`} className="mt-2 inline-block text-xs font-semibold text-nuit-800 underline">
                  Voir l’annonce concernée
                </Link>
              )}
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                <input
                  value={reponses[s.id] ?? s.reponseAdmin ?? ''}
                  onChange={(e) => setReponses((r) => ({ ...r, [s.id]: e.target.value }))}
                  placeholder="Réponse administrative à l’utilisateur…"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void traiter(s.id, 'EN_COURS')} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">En cours</button>
                  <button type="button" onClick={() => void traiter(s.id, 'TRAITE')} className="rounded-xl bg-nuit-900 px-4 py-2 text-xs font-bold text-white">Marquer traité</button>
                  <button type="button" onClick={() => void traiter(s.id, 'REJETE')} className="rounded-xl border border-red-300 px-3 py-2 text-xs font-bold text-red-700">Rejeter</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
