import { useEffect, useState, type FormEvent } from 'react'
import { Star } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

interface Avis {
  id: string
  annonceId: string
  auteurNom: string
  note: number
  commentaire: string
  creeLe: string
}

export default function AvisAnnonce({ annonceId }: { annonceId: string }) {
  const { utilisateur, jeton } = useAuth()
  const [avis, setAvis] = useState<Avis[]>([])
  const [chargement, setChargement] = useState(true)
  const [note, setNote] = useState('5')
  const [commentaire, setCommentaire] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    appelApi<Avis[]>(`/api/annonces/${encodeURIComponent(annonceId)}/avis`)
      .then(resultat => { if (!annule) setAvis(resultat) })
      .catch(e => { if (!annule) setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les avis.') })
      .finally(() => { if (!annule) setChargement(false) })
    return () => { annule = true }
  }, [annonceId])

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      const nouvelAvis = await appelApi<Avis>(`/api/annonces/${encodeURIComponent(annonceId)}/avis`, {
        method: 'POST',
        token: jeton,
        body: { note: Number(note), commentaire: commentaire.trim() },
      })
      setAvis(precedents => [nouvelAvis, ...precedents])
      setCommentaire('')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre avis.')
    } finally {
      setEnvoi(false)
    }
  }

  const moyenne = avis.length ? avis.reduce((total, item) => total + item.note, 0) / avis.length : 0

  return (
    <section className="mt-12" aria-labelledby="titre-avis">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-dore-600">Retours d’expérience</p>
          <h2 id="titre-avis" className="font-titre mt-1 text-2xl font-medium text-nuit-900 sm:text-3xl">Avis des visiteurs</h2>
        </div>
        {avis.length > 0 && (
          <p className="flex items-center gap-2 text-sm font-semibold text-nuit-900">
            <Star aria-hidden className="h-5 w-5 fill-dore-500 text-dore-500" />
            {moyenne.toFixed(1)} / 5 · {avis.length} avis
          </p>
        )}
      </div>

      {chargement && <p role="status" className="mt-5 text-sm text-slate-500">Chargement des avis…</p>}
      {!chargement && avis.length === 0 && <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Aucun avis pour le moment.</p>}

      {avis.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {avis.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-nuit-900">{item.auteurNom}</p>
                <span className="flex items-center gap-1 text-sm font-semibold text-nuit-900">
                  <Star aria-hidden className="h-4 w-4 fill-dore-500 text-dore-500" /> {item.note}/5
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.commentaire}</p>
              <time className="mt-3 block text-xs text-slate-500" dateTime={item.creeLe}>
                {new Date(item.creeLe).toLocaleDateString('fr-FR')}
              </time>
            </article>
          ))}
        </div>
      )}

      {utilisateur?.role === 'CLIENT' && (
        <form onSubmit={soumettre} className="mt-7 rounded-2xl border border-dore-200 bg-dore-50/50 p-5">
          <h3 className="font-semibold text-nuit-900">Partager votre expérience</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Pour garantir des avis fiables, vous devez avoir effectué une visite acceptée dont la date est passée. Un seul avis est autorisé par annonce.</p>
          <label htmlFor={`note-avis-${annonceId}`} className="mt-4 block text-sm font-medium text-slate-700">Votre note</label>
          <select id={`note-avis-${annonceId}`} value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 sm:max-w-xs">
            <option value="5">5 — Excellent</option>
            <option value="4">4 — Très bien</option>
            <option value="3">3 — Bien</option>
            <option value="2">2 — Moyen</option>
            <option value="1">1 — Décevant</option>
          </select>
          <label htmlFor={`commentaire-avis-${annonceId}`} className="mt-4 block text-sm font-medium text-slate-700">Votre commentaire</label>
          <textarea id={`commentaire-avis-${annonceId}`} required maxLength={1200} rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Racontez votre expérience de visite…" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900" />
          {erreur && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
          <button disabled={envoi || !commentaire.trim()} className="mt-4 rounded-xl bg-nuit-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-60">
            {envoi ? 'Envoi…' : 'Publier mon avis'}
          </button>
        </form>
      )}
    </section>
  )
}
