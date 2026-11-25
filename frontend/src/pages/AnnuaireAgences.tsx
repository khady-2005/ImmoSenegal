import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Send, Search, MapPin, Star, Users, RefreshCw } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type AvisAgence = { id: string; agenceId: string; auteurNom: string; note: number; commentaire: string; creeLe: string }
type Agence = { id: string; nom: string; slug: string; description?: string; adresse?: string; logoUrl?: string; moyenne?: number; nombreAvis?: number; avis?: AvisAgence[] }
type EspaceAgence = { id: string; nom: string; fonction: string }
type Candidature = { id: string; agenceId: string; agenceNom: string; fonction: string; statut: string; creeLe: string; traiteeLe?: string | null }

const libelles: Record<string, string> = {
  AGENT: 'Agent immobilier',
  GESTIONNAIRE: 'Gestionnaire immobilier',
  CAISSIER: 'Caissier',
  ASSISTANT_ADMINISTRATIF: 'Assistant administratif',
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
}

export default function AnnuaireAgences() {
  const { jeton, utilisateur } = useAuth()
  const [agences, setAgences] = useState<Agence[]>([])
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [mesEspaces, setMesEspaces] = useState<EspaceAgence[]>([])
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<'NOM' | 'NOTE' | 'AVIS'>('NOM')
  const [fonctionChoisie, setFonctionChoisie] = useState<'AGENT' | 'GESTIONNAIRE' | 'CAISSIER' | 'ASSISTANT_ADMINISTRATIF'>('AGENT')
  const [avisOuverts, setAvisOuverts] = useState<string[]>([])

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
    setEnvoi(agence.id)
    setErreur(null)
    setMessage(null)
    try {
      await appelApi('/api/agence/' + agence.id + '/candidatures', {
        method: 'POST',
        token: jeton,
        body: { fonction: fonctionChoisie },
      })
      setMessage('Votre candidature a été envoyée à ' + agence.nom + '. Vous pourrez suivre sa réponse dans « Mes candidatures ».')
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre candidature.')
    } finally {
      setEnvoi(null)
    }
  }

  const candidaturePour = (agenceId: string) => candidatures.find(c => c.agenceId === agenceId && c.statut === 'EN_ATTENTE')
  const agencesFiltrees = useMemo(() => {
    const q = recherche.trim().toLocaleLowerCase('fr')
    return agences.filter(a => !q || [a.nom, a.adresse ?? '', a.description ?? ''].some(v => v.toLocaleLowerCase('fr').includes(q)))
      .sort((a, b) => tri === 'NOTE'
        ? (b.moyenne ?? 0) - (a.moyenne ?? 0)
        : tri === 'AVIS'
          ? (b.nombreAvis ?? 0) - (a.nombreAvis ?? 0)
          : a.nom.localeCompare(b.nom, 'fr'))
  }, [agences, recherche, tri])

  const toggleAvis = (id: string) => setAvisOuverts(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id])
  const membres = mesEspaces.length
  const candidaturesEnAttente = candidatures.filter(c => c.statut === 'EN_ATTENTE').length

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <Link to="/tableau-de-bord" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-nuit-950 shadow-sm hover:bg-slate-50">
        <ArrowLeft className="h-4 w-4" /> Retour à mon espace
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-xl sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-dore-400">Espace professionnel</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Rejoindre une agence</h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-white sm:text-lg">
          Trouvez une agence active, consultez ses informations et ses avis, puis candidatez comme agent, gestionnaire, caissier ou assistant administratif.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Building2 className="h-5 w-5 text-dore-400" /><p className="mt-2 text-2xl font-extrabold">{agences.length}</p><p className="text-sm text-white">Agences disponibles</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Users className="h-5 w-5 text-dore-400" /><p className="mt-2 text-2xl font-extrabold">{membres}</p><p className="text-sm text-white">Vos agences</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Send className="h-5 w-5 text-dore-400" /><p className="mt-2 text-2xl font-extrabold">{candidaturesEnAttente}</p><p className="text-sm text-white">Candidatures en attente</p></div>
        </div>
      </section>

      {erreur && <p role="alert" className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-base font-semibold leading-7 text-red-950">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-base font-semibold leading-7 text-emerald-950">{message}</p>}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-2xl font-extrabold text-nuit-950">Annuaire des agences</h2><p className="mt-1 text-sm leading-6 text-slate-600">Recherchez par nom, adresse ou description.</p></div>
          <button type="button" onClick={() => void charger()} disabled={chargement} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} /> Actualiser</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_230px]">
          <label className="block text-sm font-bold text-slate-700">Rechercher une agence
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3"><Search className="h-4 w-4 text-slate-500" /><input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Nom, ville, adresse…" className="min-h-12 w-full border-0 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-500" /></span>
          </label>
          <label className="block text-sm font-bold text-slate-700">Trier les agences
            <select value={tri} onChange={e => setTri(e.target.value as 'NOM' | 'NOTE' | 'AVIS')} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
              <option value="NOM">Nom (A à Z)</option><option value="NOTE">Meilleure note</option><option value="AVIS">Plus d’avis</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="block text-base font-extrabold text-nuit-950">Fonction souhaitée dans l’agence
          <select value={fonctionChoisie} onChange={e => setFonctionChoisie(e.target.value as typeof fonctionChoisie)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-950 sm:max-w-xl">
            <option value="AGENT">Agent immobilier</option>
            <option value="GESTIONNAIRE">Gestionnaire immobilier</option>
            <option value="CAISSIER">Caissier</option>
            <option value="ASSISTANT_ADMINISTRATIF">Assistant administratif</option>
          </select>
        </label>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choisissez le poste correspondant à vos compétences. Le responsable de l’agence étudiera votre candidature et décidera de l’accepter ou de la refuser.</p>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-nuit-950">Agences disponibles</h2>
          {!chargement && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{agencesFiltrees.length} résultat(s)</span>}
        </div>
        {chargement ? <p role="status" className="rounded-xl bg-slate-50 p-5 text-base font-semibold text-slate-800">Chargement des agences…</p> : agences.length === 0 ? (
          <p className="rounded-xl border border-slate-300 bg-white p-5 text-base font-medium text-slate-900">Aucune agence active n’est disponible pour le moment.</p>
        ) : agencesFiltrees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Search className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-bold text-slate-800">Aucune agence ne correspond à votre recherche.</p><button type="button" onClick={() => setRecherche('')} className="mt-3 rounded-lg px-4 py-2 font-bold text-nuit-900 underline">Effacer la recherche</button></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {agencesFiltrees.map(agence => {
              const candidature = candidaturePour(agence.id)
              const dejaMembre = mesEspaces.some(espace => espace.id === agence.id)
              const ancienne = candidatures.find(c => c.agenceId === agence.id)
              return (
                <article key={agence.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4 border-b border-slate-100 p-5 sm:p-6">
                    {agence.logoUrl ? <img src={agence.logoUrl} alt={`Logo de ${agence.nom}`} className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-nuit-900 text-dore-400"><Building2 className="h-7 w-7" /></span>}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-extrabold text-nuit-950">{agence.nom}</h3>
                      {agence.adresse && <p className="mt-2 flex items-start gap-2 text-sm font-medium text-slate-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-nuit-700" />{agence.adresse}</p>}
                      {typeof agence.nombreAvis === 'number' && agence.nombreAvis > 0 ? <p className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-800"><Star className="h-4 w-4 fill-amber-400 text-amber-500" />{agence.moyenne?.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}) ?? '—'}/5 <span className="font-medium text-slate-600">({agence.nombreAvis} avis)</span></p> : <p className="mt-2 text-sm text-slate-500">Pas encore d’avis</p>}
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    {agence.description && <p className="text-sm leading-7 text-slate-800">{agence.description}</p>}
                    {agence.avis && agence.avis.length > 0 && <div className="mt-4">
                      <button type="button" onClick={() => toggleAvis(agence.id)} className="text-sm font-extrabold text-nuit-900 underline underline-offset-4">{avisOuverts.includes(agence.id) ? 'Masquer les avis' : `Lire les avis (${agence.avis.length})`}</button>
                      {avisOuverts.includes(agence.id) && <div className="mt-3 space-y-3">{agence.avis.map(avis => <blockquote key={avis.id} className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-amber-800">{'★'.repeat(Math.max(0, Math.min(5, avis.note)))}{'☆'.repeat(5-Math.max(0, Math.min(5, avis.note)))} <span className="text-slate-700">· {avis.auteurNom}</span></p><p className="mt-2 text-sm leading-6 text-slate-800">{avis.commentaire}</p><p className="mt-2 text-xs text-slate-500">{new Date(avis.creeLe).toLocaleDateString('fr-FR')}</p></blockquote>)}</div>}
                    </div>}
                    {dejaMembre ? (
                      <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-950"><CheckCircle2 className="h-5 w-5 shrink-0" /> Vous êtes déjà membre — {mesEspaces.find(espace => espace.id === agence.id)?.fonction}</p>
                    ) : candidature ? (
                      <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950"><Send className="h-5 w-5 shrink-0" /> Candidature envoyée — en attente de réponse</p>
                    ) : ancienne?.statut === 'ACCEPTEE' ? (
                      <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-950"><CheckCircle2 className="h-5 w-5" /> Vous êtes membre de cette agence</p>
                    ) : (
                      <button type="button" onClick={() => void postuler(agence)} disabled={envoi !== null} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-nuit-900 px-5 py-3 text-base font-extrabold text-white shadow-sm hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-60">
                        <Send className="h-4 w-4" /> {envoi === agence.id ? 'Envoi de la candidature…' : 'Envoyer ma candidature'}
                      </button>
                    )}
                    {ancienne && !candidature && ancienne.statut !== 'ACCEPTEE' && <p className="mt-3 text-sm font-medium text-slate-700">Dernière candidature : <span className={ancienne.statut === 'REFUSEE' ? 'font-bold text-red-700' : 'font-bold text-amber-800'}>{libelles[ancienne.statut] ?? ancienne.statut}</span>{ancienne.traiteeLe ? ` · traitée le ${new Date(ancienne.traiteeLe).toLocaleDateString('fr-FR')}` : ''}</p>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold text-nuit-950">Mes candidatures</h2><p className="mt-1 text-sm text-slate-600">Suivez les réponses des agences auxquelles vous avez postulé.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{candidatures.length} candidature(s)</span></div>
        {candidatures.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">Vous n’avez envoyé aucune candidature.</p> : (
          <ul className="mt-4 divide-y divide-slate-200">
            {candidatures.map(c => <li key={c.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-nuit-950">{c.agenceNom}</p><p className="mt-1 text-sm text-slate-600">{libelles[c.fonction] ?? c.fonction} · Envoyée le {new Date(c.creeLe).toLocaleDateString('fr-FR')}</p>{c.traiteeLe && <p className="mt-1 text-xs text-slate-500">Traitée le {new Date(c.traiteeLe).toLocaleDateString('fr-FR')}</p>}</div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-bold ${c.statut === 'ACCEPTEE' ? 'bg-emerald-100 text-emerald-900' : c.statut === 'REFUSEE' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-950'}`}>{libelles[c.statut] ?? c.statut}</span>
            </li>)}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="font-extrabold text-nuit-950">Comment rejoindre une agence ?</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-slate-800">
          <li>Choisissez la fonction souhaitée : Agent, Gestionnaire, Caissier ou Assistant administratif.</li>
          <li>Choisissez une agence active et envoyez votre candidature.</li>
          <li>Le responsable de l’agence étudie votre demande et l’accepte ou la refuse.</li>
          <li>Après acceptation, l’agence apparaît dans « Mes agences » et votre espace professionnel devient accessible.</li>
        </ol>
        <p className="mt-3 text-sm leading-6 text-slate-700">Le responsable peut également envoyer des invitations directes. Le propriétaire utilise séparément « Confier un bien à une agence » : il ne devient pas collaborateur.</p>
      </section>
    </main>
  )
}
