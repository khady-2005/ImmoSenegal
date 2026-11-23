import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleStatut, libelleTypeBien, type Annonce, type PagePaginee, type StatutAnnonce } from '../types'

type Action = 'valider' | 'refuser' | 'suspendre' | 'demander-correction'

interface ProprietaireOption { id: string; nomComplet: string; email: string; role: string; actif: boolean }

const ONGLETS: { statut: StatutAnnonce; libelle: string }[] = [
  { statut: 'EN_ATTENTE', libelle: 'En attente' },
  { statut: 'PUBLIEE', libelle: 'Publiées' },
  { statut: 'RESERVE', libelle: 'Réservées' },
  { statut: 'SUSPENDUE', libelle: 'Suspendues' },
  { statut: 'A_CORRIGER', libelle: 'À corriger' },
  { statut: 'REFUSEE', libelle: 'Refusées' },
]

/** Décisions proposées selon le statut actuel. Le serveur vérifie la même règle : l'interface ne fait que la refléter. */
const ACTIONS_PAR_STATUT: Partial<Record<StatutAnnonce, Action[]>> = {
  EN_ATTENTE: ['demander-correction', 'refuser'],
  PUBLIEE: ['suspendre'],
  RESERVE: ['suspendre'],
  SUSPENDUE: ['valider'],
}

const LIBELLE_ACTION: Record<Action, string> = {
  valider: 'Réactiver',
  refuser: 'Refuser',
  suspendre: 'Supprimer du catalogue',
  'demander-correction': 'Demander une correction',
}

const CONFIRMATION: Record<Action, string> = {
  valider: 'Publication rétablie après contrôle.',
  refuser: 'Annonce refusée. Le motif est visible par son propriétaire.',
  suspendre: 'Annonce retirée du catalogue. Le propriétaire a reçu le motif par notification.',
  'demander-correction': 'Correction demandée au propriétaire.',
}

const AVEC_MOTIF: Action[] = ['refuser', 'suspendre', 'demander-correction']

export default function AdminModeration() {
  const { utilisateur, jeton } = useAuth()
  const [statut, setStatut] = useState<StatutAnnonce>('EN_ATTENTE')
  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saisie, setSaisie] = useState<{ id: string; action: Action } | null>(null)
  const [motif, setMotif] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [proprietaires, setProprietaires] = useState<ProprietaireOption[]>([])

  const charger = useCallback(async () => {
    try {
      const p = await appelApi<PagePaginee<Annonce>>(`/api/admin/annonces?statut=${statut}&taille=50`, { token: jeton })
      setAnnonces(p.contenu)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.')
    }
  }, [jeton, statut])

  useEffect(() => {
    if (utilisateur?.role !== 'ADMIN') return
    void charger()
    appelApi<ProprietaireOption[]>('/api/admin/users', { token: jeton })
      .then((comptes) => setProprietaires(comptes.filter((u) => u.role === 'PROPRIETAIRE' && u.actif)))
      .catch(() => setErreur('Impossible de charger la liste des propriétaires.'))
  }, [charger, utilisateur?.role, jeton])

  async function changerProprietaire(annonceId: string, proprietaireId: string) {
    setErreur(null); setInfo(null); setEnvoi(true)
    try {
      await appelApi('/api/annonces/' + annonceId + '/proprietaire', { method: 'PATCH', token: jeton, body: { proprietaireId } })
      setInfo('Le propriétaire de cette annonce a été modifié. Les nouvelles demandes de visite seront envoyées à ce compte.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Réattribution impossible.') }
    finally { setEnvoi(false) }
  }

  async function decider(id: string, action: Action, texte?: string) {
    setErreur(null)
    setInfo(null)
    setEnvoi(true)
    try {
      await appelApi(`/api/admin/annonces/${id}/${action}`, {
        method: 'POST',
        token: jeton,
        body: texte === undefined ? undefined : { motif: texte },
      })
      setInfo(CONFIRMATION[action])
      setSaisie(null)
      setMotif('')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Action impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  function choisirOnglet(s: StatutAnnonce) {
    setStatut(s)
    setAnnonces(null)
    setInfo(null)
    setErreur(null)
    setSaisie(null)
    setMotif('')
  }

  if (utilisateur?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm">Cette page est réservée aux administrateurs.</p>
      </div>
    )
  }

  const actions = ACTIONS_PAR_STATUT[statut] ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-nuit-950 sm:text-4xl">Modération des annonces</h1>
        <Link to="/admin/photos" className="rounded-xl border-2 border-dore-400 bg-dore-100 px-4 py-3 text-base font-bold text-nuit-950 shadow-sm hover:bg-dore-200">
          Gérer les photos du catalogue
        </Link>
      </div>
      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-800">
        L’administrateur peut retirer une annonce du catalogue lorsqu’elle ne respecte pas les règles ou après un signalement. Le motif est obligatoire et envoyé au propriétaire. Le retrait est réversible : l’annonce est conservée dans l’espace de modération et peut être réactivée après contrôle.
      </p>

      <div role="group" aria-label="Filtrer par statut" className="mt-5 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o.statut}
            type="button"
            aria-pressed={statut === o.statut}
            onClick={() => choisirOnglet(o.statut)}
            className={`rounded-full px-4 py-2.5 text-base font-semibold ${
              statut === o.statut ? 'bg-nuit-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {o.libelle}
          </button>
        ))}
      </div>

      {info && <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-base font-medium text-nuit-950">{info}</p>}
      {erreur && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-900">{erreur}</p>}
      {!annonces && !erreur && <p role="status" className="mt-6 rounded-xl bg-slate-50 p-4 text-base text-slate-700">Chargement…</p>}
      {annonces && annonces.length === 0 && (
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-base text-slate-700">Aucune annonce « {libelleStatut[statut].toLowerCase()} ».</p>
      )}

      <ul className="mt-6 space-y-5">
        {annonces?.map((a) => (
          <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/annonces/${a.id}`} className="break-words text-lg font-bold text-nuit-950 hover:underline sm:text-xl">{a.titre}</Link>
                <p className="mt-1 text-base leading-relaxed text-slate-700">
                  {libelleTypeBien[a.typeBien]} · {a.quartier}, {a.ville} · {formatFcfa(a.prix)}
                </p>
                <p className="mt-1 text-base leading-relaxed text-slate-600">
                  Propriétaire : {a.proprietaire.nomComplet} · déposée le {new Date(a.creeLe).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">{libelleStatut[a.statut]}</span>
            </div>
            {a.exemple && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-base text-slate-700">Annonce d'exemple (le bien n'existe pas).</p>}
            {!a.exemple && (
              <div className="mt-3 max-w-xl">
                <label htmlFor={'proprietaire-' + a.id} className="mb-2 block text-base font-bold text-slate-800">Rattacher cette annonce au propriétaire réel</label>
                <select id={'proprietaire-' + a.id} value={a.proprietaire.id} disabled={envoi || proprietaires.length === 0}
                  onChange={(e) => void changerProprietaire(a.id, e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-950 disabled:bg-slate-100">
                  {!proprietaires.some((p) => p.id === a.proprietaire.id) && <option value={a.proprietaire.id}>{a.proprietaire.nomComplet} (compte actuel)</option>}
                  {proprietaires.map((p) => <option key={p.id} value={p.id}>{p.nomComplet} — {p.email}</option>)}
                </select>
                {proprietaires.length === 0 && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-base font-medium text-amber-900">Aucun compte propriétaire actif disponible.</p>}
              </div>
            )}
            {a.motifModeration && ['A_CORRIGER', 'REFUSEE', 'SUSPENDUE'].includes(a.statut) && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base leading-relaxed text-slate-900"><strong>Motif :</strong> {a.motifModeration}</p>
            )}

            {actions.length > 0 && saisie?.id !== a.id && (
              <div className="mt-4 flex flex-wrap gap-3">
                {actions.map((action) =>
                  AVEC_MOTIF.includes(action) ? (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setSaisie({ id: a.id, action })
                        setMotif('')
                        setInfo(null)
                      }}
                      className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      {LIBELLE_ACTION[action]}
                    </button>
                  ) : (
                    <button
                      key={action}
                      type="button"
                      disabled={envoi}
                      onClick={() => decider(a.id, action)}
                      className="rounded-xl bg-nuit-900 px-4 py-3 text-base font-bold text-white hover:bg-nuit-800 disabled:opacity-60"
                    >
                      {LIBELLE_ACTION[action]}
                    </button>
                  ),
                )}
              </div>
            )}

            {saisie?.id === a.id && (
              <form
                className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void decider(a.id, saisie.action, motif.trim())
                }}
              >
                <label htmlFor={`motif-${a.id}`} className="block text-base font-bold text-slate-800">
                  Motif (visible par le propriétaire)
                </label>
                <textarea
                  id={`motif-${a.id}`}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-950"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={envoi || motif.trim() === ''}
                    className="rounded-xl bg-red-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60"
                  >
                    Confirmer : {LIBELLE_ACTION[saisie.action].toLowerCase()}
                  </button>
                  <button type="button" onClick={() => setSaisie(null)} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
