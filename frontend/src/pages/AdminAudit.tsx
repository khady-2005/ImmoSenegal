import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type AuditItem = { id: number; type: string; userId: string | null; details: string | null; creeLe: string }

export default function AdminAudit() {
  const { jeton } = useAuth()
  const [evenements, setEvenements] = useState<AuditItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!jeton) return
    setChargement(true)
    appelApi<AuditItem[]>('/api/admin/audit?limite=100', { token: jeton })
      .then(setEvenements)
      .catch((e) => setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.'))
      .finally(() => setChargement(false))
  }, [jeton])

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
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Période d’essai propriétaire</p><p className="mt-1 font-bold text-nuit-900">15 jours gratuits</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Tarifs abonnements</p><p className="mt-1 font-bold text-nuit-900">5 000 / 13 500 / 50 000 FCFA</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Photos / Vidéo</p><p className="mt-1 font-bold text-nuit-900">Max 15 photos (5 Mo) · 1 vidéo</p></div>
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
