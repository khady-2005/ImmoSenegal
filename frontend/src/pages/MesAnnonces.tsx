import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleStatut, type Annonce, type PagePaginee } from '../types'
import { peutPublier } from './FormulaireAnnonce'

type Agence = { id: string; nom: string; slug: string; description: string | null; adresse: string | null; logoUrl: string | null }
type Mandat = {
  id: string
  agenceId: string
  agenceNom: string
  annonceId: string
  annonceTitre: string
  origine: string
  statut: string
  creeLe: string
  decideLe: string | null
  tauxCommissionMensuel: number | null
  proposeParId: string
}

const libelleOrigine = (origine: string) => origine === 'INITIATIVE_PROPRIETAIRE' ? 'Demande envoyée à l’agence' : 'Proposition reçue de l’agence'
const libelleMandat = (statut: string) => statut === 'EN_ATTENTE' ? 'En attente de réponse' : statut === 'ACCEPTE' ? 'Accepté' : 'Refusé'

export default function MesAnnonces() {
  const { utilisateur, jeton } = useAuth()
  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)
  const [agences, setAgences] = useState<Agence[]>([])
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [agenceChoisie, setAgenceChoisie] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [demandeEnCours, setDemandeEnCours] = useState<string | null>(null)
  const [tauxCommission, setTauxCommission] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    setErreur(null)
    try {
      const [p, listeAgences, listeMandats] = await Promise.all([
        appelApi<PagePaginee<Annonce>>('/api/annonces/mes-annonces?taille=50', { token: jeton }),
        appelApi<Agence[]>('/api/agence/annuaire', { token: jeton }),
        appelApi<Mandat[]>('/api/mandats/mes-propositions', { token: jeton }),
      ])
      setAnnonces(p.contenu)
      setAgences(listeAgences)
      setMandats(listeMandats)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.')
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  async function supprimer(id: string) {
    setErreur(null)
    try {
      await appelApi<void>(`/api/annonces/${id}`, { method: 'DELETE', token: jeton })
      setASupprimer(null)
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Suppression impossible.')
    }
  }

  async function repondreProposition(mandat: Mandat, accepter: boolean) {
    setDemandeEnCours(mandat.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/reponse`, {
        method: 'POST',
        token: jeton,
        body: { accepter },
      })
      setMessage(accepter ? 'Vous avez accepté la proposition de l’agence.' : 'Vous avez refusé la proposition de l’agence.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer votre réponse.')
    } finally {
      setDemandeEnCours(null)
    }
  }

  async function definirCommission(mandat: Mandat) {
    const taux = Number(tauxCommission[mandat.id])
    if (!Number.isFinite(taux) || taux < 0.01 || taux > 100) {
      setErreur('Indiquez un taux compris entre 0,01 % et 100 %.')
      return
    }
    setDemandeEnCours(mandat.id); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/mandats/${mandat.id}/commission`, {
        method: 'PATCH', token: jeton, body: { tauxCommissionMensuel: taux },
      })
      setMessage('Le taux de commission a été enregistré dans le mandat.')
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’enregistrer le taux.') }
    finally { setDemandeEnCours(null) }
  }

  async function demanderGestion(annonce: Annonce) {
    const agenceId = agenceChoisie[annonce.id]
    if (!agenceId) {
      setErreur('Choisissez une agence avant d’envoyer votre demande.')
      return
    }
    setDemandeEnCours(annonce.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/mandats/demandes`, {
        method: 'POST',
        token: jeton,
        body: { annonceId: annonce.id },
      })
      setMessage('Votre demande a été envoyée au responsable de l’agence.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer cette demande.')
    } finally {
      setDemandeEnCours(null)
    }
  }

  async function publierAvecAbonnement(annonce: Annonce) {
    setDemandeEnCours(annonce.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi<Annonce>(`/api/annonces/${annonce.id}/publier`, {
        method: 'POST',
        token: jeton,
      })
      setMessage('Votre annonce est maintenant publiée dans le catalogue.')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de publier cette annonce.')
    } finally {
      setDemandeEnCours(null)
    }
  }

  const mandatParAnnonce = new Map(mandats.map((m) => [m.annonceId, m]))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mes annonces</h1>
        {peutPublier(utilisateur?.role) && (
          <Link to="/annonces/nouvelle" className="rounded-lg bg-emeraude-600 px-4 py-2.5 font-semibold text-white hover:bg-emeraude-700">
            Publier une annonce
          </Link>
        )}
      </div>
      {erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-nuit-900">Suivi des demandes de gestion</h2>
        <p className="mt-1 text-sm text-slate-600">Retrouvez les demandes que vous avez envoyées aux agences et les propositions reçues.</p>
        {mandats.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune demande ou proposition pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {mandats.map((mandat) => (
              <li key={mandat.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-nuit-900">{mandat.annonceTitre}</p>
                    <p className="text-sm text-slate-600">{mandat.agenceNom} · {libelleOrigine(mandat.origine)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mandat.statut === 'ACCEPTE' ? 'bg-emerald-100 text-emerald-800' : mandat.statut === 'REFUSE' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {libelleMandat(mandat.statut)}
                    </span>
                    {mandat.statut === 'EN_ATTENTE' && mandat.proposeParId === utilisateur?.id && mandat.tauxCommissionMensuel == null && (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <label className="text-xs font-medium text-slate-600">Commission mensuelle (%)
                          <input type="number" min="0.01" max="100" step="0.01" value={tauxCommission[mandat.id] ?? ''} onChange={(event) => setTauxCommission((prev) => ({ ...prev, [mandat.id]: event.target.value }))} className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ex. 8" />
                        </label>
                        <button type="button" disabled={demandeEnCours === mandat.id} onClick={() => void definirCommission(mandat)} className="rounded-lg bg-nuit-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Enregistrer le taux</button>
                      </div>
                    )}
                    {mandat.tauxCommissionMensuel != null && <p className="mt-2 text-xs text-slate-600">Commission proposée : <strong>{Number(mandat.tauxCommissionMensuel).toLocaleString('fr-FR')} % du loyer mensuel</strong></p>}
                    {mandat.origine === 'INITIATIVE_AGENCE' && mandat.statut === 'EN_ATTENTE' && (
                      <>
                        <button type="button" disabled={demandeEnCours === mandat.id} onClick={() => void repondreProposition(mandat, true)} className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Accepter</button>
                        <button type="button" disabled={demandeEnCours === mandat.id} onClick={() => void repondreProposition(mandat, false)} className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Refuser</button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!annonces && !erreur && <p role="status" className="mt-6 text-slate-500">Chargement…</p>}
      {annonces && annonces.length === 0 && <p className="mt-6 text-slate-600">Vous n'avez publié aucune annonce.</p>}
      <ul className="mt-6 space-y-3">
        {annonces?.map((a) => {
          const mandat = mandatParAnnonce.get(a.id)
          return (
            <li key={a.id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/annonces/${a.id}`} className="break-words font-semibold hover:underline">{a.titre}</Link>
                  <p className="text-sm text-slate-600">{a.quartier}, {a.ville} · {formatFcfa(a.prix)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{libelleStatut[a.statut]}</span>
              </div>
              {a.statut === 'EN_ATTENTE' && (
                <div className="mt-2">
                  <p className="text-sm text-slate-600">Cette annonce n’est pas encore visible du public. Vous pouvez souscrire un abonnement pour la publier directement, ou demander à une agence de prendre le bien en gestion sans abonnement.</p>
                  <button type="button" onClick={() => void publierAvecAbonnement(a)} disabled={demandeEnCours === a.id} className="mt-2 rounded-lg border border-nuit-900 px-3 py-1.5 text-sm font-semibold text-nuit-900 disabled:opacity-50">
                    {demandeEnCours === a.id ? 'Publication…' : 'Publier avec mon abonnement'}
                  </button>
                </div>
              )}
              {a.motifModeration && ['A_CORRIGER', 'REFUSEE', 'SUSPENDUE'].includes(a.statut) && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-slate-800"><strong>Motif :</strong> {a.motifModeration}</p>
              )}

              {['PUBLIEE', 'EN_ATTENTE'].includes(a.statut) && !a.exemple && (
                <div className="mt-4 rounded-xl border border-dore-200 bg-dore-50/50 p-3">
                  <h3 className="text-sm font-bold text-nuit-900">Confier ce bien à une agence</h3>
                  {mandat ? (
                    <p className="mt-1 text-sm text-slate-700">{mandat.agenceNom} · {libelleMandat(mandat.statut)}</p>
                  ) : agences.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">Aucune agence active ne peut recevoir de demande pour le moment.</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor={`agence-${a.id}`}>Choisir une agence</label>
                      <select id={`agence-${a.id}`} value={agenceChoisie[a.id] ?? ''} onChange={(event) => setAgenceChoisie((prev) => ({ ...prev, [a.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Choisir une agence…</option>
                        {agences.map((agence) => <option key={agence.id} value={agence.id}>{agence.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => void demanderGestion(a)} disabled={demandeEnCours === a.id || !agenceChoisie[a.id]} className="rounded-lg bg-nuit-900 px-4 py-2 text-sm font-semibold text-white hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-50">
                        {demandeEnCours === a.id ? 'Envoi…' : 'Demander la gestion'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/annonces/${a.id}/modifier`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium">Modifier</Link>
                {aSupprimer === a.id ? (
                  <>
                    <button onClick={() => supprimer(a.id)} className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Confirmer la suppression</button>
                    <button onClick={() => setASupprimer(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Annuler</button>
                  </>
                ) : (
                  <button onClick={() => setASupprimer(a.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700">Supprimer</button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
