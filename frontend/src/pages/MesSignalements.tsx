import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type SignalementItem = {
  id: string
  type: string
  objet: string
  description: string
  statut: string
  reponseAdmin: string | null
  creeLe: string
}

const statuts: Record<string, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours d’examen',
  TRAITE: 'Traité',
  REJETE: 'Rejeté',
}

export default function MesSignalements() {
  const { jeton } = useAuth()
  const [liste, setListe] = useState<SignalementItem[]>([])
  const [type, setType] = useState<'RECLAMATION' | 'COMPORTEMENT' | 'ANNONCE'>('RECLAMATION')
  const [objet, setObjet] = useState('')
  const [description, setDescription] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton) return
    setChargement(true)
    try {
      setListe(await appelApi<SignalementItem[]>('/api/signalements/mes-signalements', { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos signalements.')
    } finally {
      setChargement(false)
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!jeton) return
    setEnvoi(true); setErreur(null); setMessage(null)
    try {
      await appelApi('/api/signalements', {
        method: 'POST',
        token: jeton,
        body: { type, objet: objet.trim(), description: description.trim() },
      })
      setObjet(''); setDescription('')
      setMessage('Votre réclamation / signalement a été transmis à l’administration.')
      await charger()
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Envoi impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="flex items-center gap-2 font-titre text-3xl font-bold text-nuit-900">
        <Flag className="h-7 w-7 text-amber-700" /> Signalements et réclamations
      </h1>
      <p className="mt-2 text-sm text-slate-600">Signalez un comportement inapproprié ou déposez une réclamation auprès de l’administration.</p>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={soumettre} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-nuit-900">Nouvelle réclamation / signalement</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Type
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal">
              <option value="RECLAMATION">Réclamation</option>
              <option value="COMPORTEMENT">Comportement inapproprié</option>
              <option value="ANNONCE">Problème sur une annonce</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Objet *
            <input required maxLength={150} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Résumé de votre demande" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Description détaillée *
          <textarea required rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez précisément les faits…" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal" />
        </label>
        <button type="submit" disabled={envoi} className="rounded-xl bg-nuit-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-nuit-800 disabled:opacity-50">
          {envoi ? 'Envoi…' : 'Envoyer à l’administration'}
        </button>
      </form>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-nuit-900">Mes dossiers</h2>
        {chargement ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : liste.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun signalement enregistré.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {liste.map((s) => (
              <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-nuit-900">{s.objet}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">{statuts[s.statut] ?? s.statut}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{s.description}</p>
                {s.reponseAdmin && (
                  <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                    <strong>Réponse de l’administration :</strong> {s.reponseAdmin}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
