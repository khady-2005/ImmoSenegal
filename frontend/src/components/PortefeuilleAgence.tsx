import { useCallback, useEffect, useState } from 'react'
import { Building2, RefreshCw } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type BienConfie = {
  id: string
  agenceId: string
  agenceNom: string
  annonceId: string
  annonceTitre: string
  ville: string
  proprietaireId: string
  proprietaireNom: string
  origine: string
  statut: string
  creeLe: string
  decideLe: string | null
}

export default function PortefeuilleAgence({ agenceId }: { agenceId: string }) {
  const { jeton } = useAuth()
  const [biens, setBiens] = useState<BienConfie[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setErreur('')
    try {
      const resultat = await appelApi<BienConfie[]>(`/api/agence/${agenceId}/portefeuille`, { token: jeton })
      setBiens(resultat)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le portefeuille de biens.')
    } finally {
      setChargement(false)
    }
  }, [jeton, agenceId])

  useEffect(() => { void charger() }, [charger])

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-nuit-800"/><h2 className="text-xl font-bold text-nuit-900">Portefeuille des biens confiés</h2></div>
        <p className="mt-1 text-sm text-slate-600">Biens dont le propriétaire a accepté le mandat de gestion de cette agence.</p>
      </div>
      <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`}/>Actualiser</button>
    </div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Biens confiés</p><p className="mt-1 text-2xl font-bold text-nuit-900">{biens.length}</p></div>
      <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-800">Villes représentées</p><p className="mt-1 text-2xl font-bold text-nuit-900">{new Set(biens.map(b => b.ville).filter(Boolean)).size}</p></div>
      <div className="col-span-2 rounded-xl bg-amber-50 p-3 sm:col-span-1"><p className="text-xs text-amber-800">Mandats acceptés</p><p className="mt-1 text-2xl font-bold text-nuit-900">{biens.filter(b => b.statut === 'ACCEPTE').length}</p></div>
    </div>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    {chargement ? <p role="status" className="mt-5 text-sm text-slate-500">Chargement du portefeuille…</p>
      : biens.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aucun bien confié à cette agence pour le moment. Les mandats apparaîtront ici après acceptation par le propriétaire.</p>
      : <div className="mt-5 grid gap-3 md:grid-cols-2">{biens.map(b => <article key={b.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-nuit-900">{b.annonceTitre}</h3><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Mandat accepté</span></div>
        <p className="mt-2 text-sm text-slate-600">{b.ville}</p>
        <p className="mt-3 text-sm text-slate-700"><strong>Propriétaire :</strong> {b.proprietaireNom}</p>
        <p className="mt-1 text-xs text-slate-500">Confié le {new Date(b.decideLe ?? b.creeLe).toLocaleDateString('fr-FR')}</p>
      </article>)}</div>}
  </section>
}
