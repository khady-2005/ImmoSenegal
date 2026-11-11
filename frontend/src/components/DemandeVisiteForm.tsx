import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

function dateLocaleMin() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function DemandeVisiteForm({ annonceId }: { annonceId: string }) {
  const { utilisateur, jeton } = useAuth()
  const navigate = useNavigate()
  const [dateVisite, setDateVisite] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  if (utilisateur?.role !== 'CLIENT') return null

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      await appelApi('/api/visites/annonces/' + encodeURIComponent(annonceId), {
        method: 'POST',
        token: jeton,
        body: { dateVisite, message: message.trim() || null },
      })
      setEnvoye(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre demande.')
    } finally {
      setEnvoi(false)
    }
  }

  if (envoye) return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
      <div className="flex items-center gap-2 font-semibold text-emerald-900">
        <CheckCircle2 className="h-5 w-5" /> Demande envoyée
      </div>
      <p className="mt-2 text-sm leading-relaxed text-emerald-900">Le propriétaire pourra accepter, refuser ou vous proposer un autre créneau. Vous retrouverez la réponse dans votre espace.</p>
      <button type="button" onClick={() => navigate('/mes-visites')} className="mt-3 text-sm font-semibold text-emerald-800 underline">Suivre ma demande</button>
    </div>
  )

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-4 border-t border-slate-100 pt-6" aria-label="Demander une visite">
      <div className="flex items-center gap-2 text-lg font-semibold text-nuit-900">
        <CalendarDays className="h-5 w-5 text-emeraude-700" /> Demander une visite
      </div>
      <p className="text-sm leading-relaxed text-slate-600">Choisissez la date et l’heure qui vous conviennent. Le propriétaire vous confirmera le rendez-vous.</p>
      <label className="block text-sm font-medium text-slate-700" htmlFor="date-visite">Date et heure souhaitées</label>
      <input id="date-visite" type="datetime-local" min={dateLocaleMin()} required value={dateVisite} onChange={e => setDateVisite(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:border-emeraude-600 focus:outline-none focus:ring-2 focus:ring-emeraude-100" />
      <label className="block text-sm font-medium text-slate-700" htmlFor="message-visite">Message au propriétaire <span className="font-normal text-slate-500">(facultatif)</span></label>
      <textarea id="message-visite" rows={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Précisez vos disponibilités ou posez une question…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:border-emeraude-600 focus:outline-none focus:ring-2 focus:ring-emeraude-100" />
      {erreur && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      <button disabled={envoi} className="w-full rounded-xl bg-emeraude-700 px-4 py-3 font-semibold text-white transition hover:bg-emeraude-800 disabled:cursor-not-allowed disabled:opacity-60">{envoi ? 'Envoi…' : 'Envoyer ma demande'}</button>
    </form>
  )
}
