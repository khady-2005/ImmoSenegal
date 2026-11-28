import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { FolderArchive, Plus } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Dossier = {
  id: string
  titre: string
  categorie: string
  referenceClient: string | null
  statut: string
  notes: string | null
  creeLe: string
}

const libelleCategorie: Record<string, string> = {
  PROPRIETAIRE: 'Dossier propriétaire',
  LOCATAIRE: 'Dossier locataire',
  BIEN: 'Dossier bien',
  CONTRAT: 'Contrat & bail',
  AUTRE: 'Autre document',
}

const libelleStatut: Record<string, string> = {
  A_COMPLETER: 'À compléter',
  COMPLET: 'Complet',
  ARCHIVE: 'Archivé',
}

export default function DossiersAgence({ agenceId }: { agenceId: string }) {
  const { jeton } = useAuth()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [titre, setTitre] = useState('')
  const [categorie, setCategorie] = useState('LOCATAIRE')
  const [referenceClient, setReferenceClient] = useState('')
  const [notes, setNotes] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!jeton || !agenceId) return
    setChargement(true)
    try {
      setDossiers(await appelApi<Dossier[]>(`/api/agence/${agenceId}/dossiers`, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les dossiers.')
    } finally {
      setChargement(false)
    }
  }, [jeton, agenceId])

  useEffect(() => { void charger() }, [charger])

  async function creer(e: FormEvent) {
    e.preventDefault()
    if (!jeton || !titre.trim()) return
    setEnvoi(true); setErreur(null)
    try {
      await appelApi(`/api/agence/${agenceId}/dossiers`, {
        method: 'POST',
        token: jeton,
        body: { titre: titre.trim(), categorie, referenceClient: referenceClient.trim() || null, notes: notes.trim() || null },
      })
      setTitre(''); setReferenceClient(''); setNotes('')
      await charger()
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Création impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  async function changerStatut(id: string, statut: string) {
    if (!jeton) return
    setErreur(null)
    try {
      await appelApi(`/api/agence/${agenceId}/dossiers/${id}`, {
        method: 'PATCH',
        token: jeton,
        body: { statut },
      })
      await charger()
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Mise à jour impossible.')
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <FolderArchive className="h-5 w-5 text-nuit-800" />
        <h2 className="text-xl font-bold text-nuit-900">Dossiers administratifs et archivage</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">Classez les dossiers des propriétaires, locataires et contrats, suivez les pièces manquantes et archivez les dossiers complets.</p>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}

      <form onSubmit={creer} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Titre du dossier *
          <input required maxLength={150} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Dossier bail Villa Almadies" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Catégorie
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
            {Object.entries(libelleCategorie).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Référence client / bien (facultatif)
          <input maxLength={150} value={referenceClient} onChange={(e) => setReferenceClient(e.target.value)} placeholder="Nom ou référence" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-semibold text-slate-700">Notes / pièces manquantes
          <input maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="CNI reçue, justificatif en attente…" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={envoi} className="inline-flex items-center gap-2 rounded-xl bg-nuit-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-nuit-800 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {envoi ? 'Enregistrement…' : 'Créer le dossier'}
          </button>
        </div>
      </form>

      {chargement ? <p className="mt-4 text-sm text-slate-500">Chargement des dossiers…</p> : dossiers.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun dossier enregistré pour le moment.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {dossiers.map((d) => (
            <article key={d.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-nuit-900">{d.titre}</p>
                <p className="mt-1 text-xs text-slate-600">{libelleCategorie[d.categorie] ?? d.categorie}{d.referenceClient ? ` · ${d.referenceClient}` : ''}</p>
                {d.notes && <p className="mt-1 text-sm text-slate-700">{d.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select aria-label={`Statut du dossier ${d.titre}`} value={d.statut} onChange={(e) => void changerStatut(d.id, e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800">
                  {Object.entries(libelleStatut).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
