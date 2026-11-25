import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleStatut, type Annonce, type PagePaginee } from '../types'
import { peutPublier } from './FormulaireAnnonce'
import GestionPhotos from '../components/GestionPhotos'

type Agence = { id: string; nom: string; slug: string; description: string | null; adresse: string | null; logoUrl: string | null }
type AvertissementPhoto = {
  id: string
  annonceId: string
  photoId: string
  titreAnnonce: string
  motif: string
  creeLe: string
  echeanceLe: string
  statut: 'EN_ATTENTE' | 'REPONDU' | 'CORRIGE' | 'RETIRE'
  reponseProprietaire: string | null
}
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
const libelleMandat = (statut: string) => ({ EN_ATTENTE: 'En attente de réponse', ACCEPTE: 'Mandat actif', REFUSE: 'Proposition refusée', RESILIATION_DEMANDEE: 'Résiliation en attente', RESILIE: 'Mandat résilié' }[statut] || statut)

export default function MesAnnonces() {
  const { utilisateur, jeton } = useAuth()
  const [annonces, setAnnonces] = useState<Annonce[] | null>(null)
  const [agences, setAgences] = useState<Agence[]>([])
  const [mandats, setMandats] = useState<Mandat[]>([])
  const [avertissementsPhotos, setAvertissementsPhotos] = useState<AvertissementPhoto[]>([])
  const [reponsesPhotos, setReponsesPhotos] = useState<Record<string, string>>({})
  const [agenceChoisie, setAgenceChoisie] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<string | null>(null)
  const [demandeEnCours, setDemandeEnCours] = useState<string | null>(null)
  const [tauxCommission, setTauxCommission] = useState<Record<string, string>>({})
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('TOUS')
  const [filtreTransaction, setFiltreTransaction] = useState('TOUTES')

  const charger = useCallback(async () => {
    setErreur(null)
    try {
      // Les annonces sont prioritaires : une panne de l'annuaire ou des mandats
      // ne doit pas empêcher le propriétaire de consulter et gérer ses biens.
      const [p, listeAgences, listeMandats, argumentsPhotos] = await Promise.all([
        appelApi<PagePaginee<Annonce>>('/api/annonces/mes-annonces?taille=50', { token: jeton }),
        appelApi<Agence[]>('/api/agence/annuaire', { token: jeton }).catch(() => [] as Agence[]),
        appelApi<Mandat[]>('/api/mandats/mes-propositions', { token: jeton }).catch(() => [] as Mandat[]),
        appelApi<AvertissementPhoto[]>('/api/annonces/mes-avertissements-photos', { token: jeton }).catch(() => [] as AvertissementPhoto[]),
      ])
      setAnnonces(p.contenu)
      setAgences(listeAgences)
      setMandats(listeMandats)
      setAvertissementsPhotos(argumentsPhotos)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.')
    }
  }, [jeton])

  useEffect(() => { void charger() }, [charger])

  async function repondreAvertissementPhoto(a: AvertissementPhoto) {
    const reponse = (reponsesPhotos[a.id] ?? '').trim()
    if (!reponse) { setErreur('Écris une réponse avant de l’envoyer.'); return }
    setDemandeEnCours(a.id); setErreur(null); setMessage(null)
    try {
      await appelApi('/api/annonces/' + a.annonceId + '/photos/' + a.photoId + '/avertissement/repondre', {
        method: 'POST', token: jeton, body: { reponse },
      })
      setMessage('Votre réponse a été transmise à l’administration. La photo ne sera pas retirée automatiquement pendant l’examen de votre réponse.')
      setReponsesPhotos((v) => ({ ...v, [a.id]: '' }))
      await charger()
    } catch (e) { setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer la réponse.') }
    finally { setDemandeEnCours(null) }
  }

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
  const annoncesFiltrees = useMemo(() => (annonces ?? []).filter((a) => {
    const terme = recherche.trim().toLocaleLowerCase()
    const correspondTexte = !terme || [a.titre, a.ville, a.quartier, a.adresse ?? ''].some(v => v.toLocaleLowerCase().includes(terme))
    const correspondStatut = filtreStatut === 'TOUS' || a.statut === filtreStatut
    const correspondTransaction = filtreTransaction === 'TOUTES' || a.transaction === filtreTransaction
    return correspondTexte && correspondStatut && correspondTransaction
  }), [annonces, recherche, filtreStatut, filtreTransaction])
  const nombrePubliees = (annonces ?? []).filter(a => a.statut === 'PUBLIEE').length
  const nombreEnAttente = (annonces ?? []).filter(a => a.statut === 'EN_ATTENTE').length

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mes annonces</h1>
        {peutPublier(utilisateur?.role) && (
          <Link to="/annonces/nouvelle" className="rounded-lg bg-nuit-900 px-4 py-2.5 font-semibold text-white hover:bg-nuit-800">
            Publier une annonce
          </Link>
        )}
      </div>
      {erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

      {avertissementsPhotos.length > 0 && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h2 className="text-lg font-bold text-nuit-900">Avertissements concernant vos photos</h2>
          <p className="mt-1 text-sm text-slate-600">Vous disposez de 48 heures après chaque avertissement pour corriger la photo ou répondre à l’administration.</p>
          <ul className="mt-3 space-y-3">
            {avertissementsPhotos.map((a) => (
              <li key={a.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <p className="font-semibold text-nuit-900">{a.titreAnnonce}</p>
                <p className="mt-1 text-sm text-slate-700">Motif : {a.motif}</p>
                <p className="mt-1 text-xs text-slate-500">Avertissement reçu le {new Date(a.creeLe).toLocaleString('fr-FR')} · délai jusqu’au {new Date(a.echeanceLe).toLocaleString('fr-FR')}</p>
                {a.statut === 'EN_ATTENTE' ? (
                  <div className="mt-3 space-y-2">
                    <textarea value={reponsesPhotos[a.id] ?? ''} maxLength={1000} rows={2}
                      onChange={(e) => setReponsesPhotos((v) => ({ ...v, [a.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      placeholder="Expliquez la correction effectuée ou donnez votre réponse…" />
                    <button type="button" disabled={demandeEnCours === a.id || !(reponsesPhotos[a.id] ?? '').trim()}
                      onClick={() => void repondreAvertissementPhoto(a)}
                      className="rounded-lg bg-nuit-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Envoyer ma réponse</button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {a.statut === 'REPONDU' ? 'Votre réponse a été reçue.' : a.statut === 'CORRIGE' ? 'Photo corrigée ou supprimée.' : 'Photo retirée du catalogue.'}
                  </p>
                )}
                {a.reponseProprietaire && <p className="mt-2 text-sm text-slate-600">Votre réponse : {a.reponseProprietaire}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

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
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${mandat.statut === 'ACCEPTE' ? 'bg-blue-100 text-blue-800' : ['REFUSE', 'RESILIE'].includes(mandat.statut) ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>
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
                    {mandat.statut === 'EN_ATTENTE' && mandat.tauxCommissionMensuel == null && mandat.proposeParId !== utilisateur?.id && <p className="mt-2 text-xs text-slate-500">En attente de la proposition du taux de commission par l’autre partie avant acceptation.</p>}
                    {mandat.tauxCommissionMensuel != null && <p className="mt-2 text-xs text-slate-600">Commission convenue ou proposée : <strong>{Number(mandat.tauxCommissionMensuel).toLocaleString('fr-FR')} % du loyer mensuel</strong></p>}
                    {mandat.statut === 'RESILIATION_DEMANDEE' && <p className="mt-2 text-xs text-amber-800">Une demande de résiliation est en cours. Consultez votre espace propriétaire pour répondre à l’agence.</p>}
                    {mandat.statut === 'RESILIE' && <p className="mt-2 text-xs text-slate-500">Ce mandat est terminé. Le bien reste dans votre portefeuille et peut être confié à une autre agence.</p>}
                    {mandat.origine === 'INITIATIVE_AGENCE' && mandat.statut === 'EN_ATTENTE' && (
                      <>
                        <button type="button" disabled={demandeEnCours === mandat.id} onClick={() => void repondreProposition(mandat, true)} className="rounded-full bg-nuit-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Accepter</button>
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

      {annonces && annonces.length > 0 && <>
        <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Résumé de mes biens">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total des biens affichés</p><p className="mt-1 text-2xl font-bold text-nuit-900">{annonces.length}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">En ligne</p><p className="mt-1 text-2xl font-bold text-nuit-900">{nombrePubliees}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">À renouveler</p><p className="mt-1 text-2xl font-bold text-nuit-900">{nombreEnAttente}</p></div>
        </section>
        <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3" aria-label="Filtres des annonces">
          <label className="text-sm font-medium text-slate-700">Rechercher un bien
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Titre, ville, quartier…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"/>
          </label>
          <label className="text-sm font-medium text-slate-700">État de l’annonce
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              <option value="TOUS">Tous les états</option><option value="PUBLIEE">Publiées</option><option value="EN_ATTENTE">À renouveler</option><option value="A_CORRIGER">À corriger</option><option value="SUSPENDUE">Suspendues</option><option value="REFUSEE">Refusées</option><option value="RESERVE">Réservées</option><option value="LOUE">Louées</option><option value="VENDU">Vendues</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Type d’opération
            <select value={filtreTransaction} onChange={e => setFiltreTransaction(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              <option value="TOUTES">Vente et location</option><option value="LOCATION">Location</option><option value="VENTE">Vente</option>
            </select>
          </label>
        </section>
        <p className="mt-4 text-sm text-slate-500">{annoncesFiltrees.length} bien(s) correspondent aux filtres.</p>
      </>}
      {!annonces && !erreur && <p role="status" className="mt-6 text-slate-500">Chargement…</p>}
      {annonces && annonces.length === 0 && <p className="mt-6 text-slate-600">Vous n'avez publié aucune annonce.</p>}
      {annonces && annonces.length > 0 && annoncesFiltrees.length === 0 && <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun bien ne correspond à votre recherche. Modifiez les filtres pour retrouver vos annonces.</p>}
      <ul className="mt-6 space-y-3">
        {annoncesFiltrees.map((a) => {
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
              {!a.exemple && !['REFUSEE', 'SUSPENDUE'].includes(a.statut) && (
                <GestionPhotos
                  annonceId={a.id}
                  photos={a.photos ?? []}
                  onChange={(photos) => setAnnonces((courantes) => courantes?.map((item) => item.id === a.id ? { ...item, photos } : item) ?? null)}
                />
              )}
              {a.statut === 'PUBLIEE' && a.dateFinPublication && <p className="mt-2 rounded-lg border border-dore-200 bg-dore-50 p-2 text-sm text-nuit-900">Publication couverte jusqu’au <strong>{new Date(a.dateFinPublication + 'T00:00:00').toLocaleDateString('fr-FR')}</strong>. Pour continuer après cette date, choisissez un abonnement ou un mandat d’agence.</p>}
              {a.statut === 'EN_ATTENTE' && (
                <div className="mt-2">
                  <p className="text-sm text-slate-600">La période gratuite de cette annonce est terminée : elle reste dans votre espace, mais n’est plus visible dans le catalogue. Vous pouvez souscrire un abonnement pour la republier ou négocier un mandat de gestion avec une agence.</p>
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
