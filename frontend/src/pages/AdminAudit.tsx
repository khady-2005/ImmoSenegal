import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type AuditItem = { id: number; type: string; userId: string | null; details: string | null; creeLe: string }
type Parametre = { cle: string; valeur: string; libelle: string; modifieLe: string }

export default function AdminAudit() {
  const { jeton } = useAuth()
  const [evenements, setEvenements] = useState<AuditItem[]>([])
  const [parametres, setParametres] = useState<Parametre[]>([])
  const [valeurs, setValeurs] = useState<Record<string, string>>({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)

  useEffect(() => {
    if (!jeton) return
    setChargement(true)
    Promise.all([
      appelApi<AuditItem[]>('/api/admin/audit?limite=100', { token: jeton }),
      appelApi<Parametre[]>('/api/admin/parametres', { token: jeton }),
    ])
      .then(([evs, params]) => {
        setEvenements(evs)
        setParametres(params)
        setValeurs(Object.fromEntries(params.map((p) => [p.cle, p.valeur])))
      })
      .catch((e) => setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.'))
      .finally(() => setChargement(false))
  }, [jeton])

  async function enregistrerParametre(cle: string) {
    setEnCours(cle)
    setErreur(null)
    setMessage(null)
    try {
      const maj = await appelApi<Parametre>(`/api/admin/parametres/${cle}`, {
        method: 'PUT',
        body: { valeur: valeurs[cle] ?? '' },
        token: jeton,
      })
      setParametres((prev) => prev.map((p) => (p.cle === cle ? maj : p)))
      setMessage(`Paramètre « ${maj.libelle} » mis à jour.`)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Enregistrement impossible.')
    } finally {
      setEnCours(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 text-sm font-semibold text-nuit-900 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-titre text-3xl font-bold text-nuit-900">
        <ScrollText className="h-7 w-7 text-nuit-800" /> Journal d’audit et paramètres
      </h1>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-nuit-900">Paramètres actifs de la plateforme</h2>
        {message && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {parametres.map((p) => (
            <div key={p.cle} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label htmlFor={`param-${p.cle}`} className="block text-xs font-semibold text-slate-600">{p.libelle}</label>
              <div className="mt-2 flex gap-2">
                <input
                  id={`param-${p.cle}`}
                  type="text"
                  value={valeurs[p.cle] ?? ''}
                  onChange={(e) => setValeurs((prev) => ({ ...prev, [p.cle]: e.target.value }))}
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-bold text-nuit-950"
                />
                <button
                  type="button"
                  disabled={enCours === p.cle}
                  onClick={() => void enregistrerParametre(p.cle)}
                  className="rounded-lg bg-nuit-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-nuit-800 disabled:opacity-50"
                >
                  {enCours === p.cle ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {chargement ? <p className="mt-6 text-sm text-slate-500">Chargement du journal…</p> : (
        <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Événement</th><th className="px-4 py-3">Détails</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evenements.map((ev) => (
                <tr key={ev.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{new Date(ev.creeLe).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2.5 font-semibold text-nuit-900">{ev.type}</td>
                  <td className="px-4 py-2.5 text-slate-700">{ev.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
