import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookmarkCheck, CheckCircle2 } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

export default function DemandeReservationForm({ annonceId }: { annonceId: string }) {
  const { utilisateur, jeton } = useAuth()
  const navigate = useNavigate()
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
      await appelApi('/api/reservations/annonces/' + encodeURIComponent(annonceId), {
        method: 'POST', token: jeton, body: { message: message.trim() || null },
      })
      setEnvoye(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre demande de réservation.')
    } finally {
      setEnvoi(false)
    }
  }

  if (envoye) return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
      <div className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" /> Demande de réservation envoyée</div>
      <p className="mt-2 text-sm text-emerald-900">Le propriétaire de ce logement pourra accepter ou refuser votre demande. Vous pourrez suivre sa réponse dans votre espace.</p>
      <button type="button" onClick={() => navigate('/mes-reservations')} className="mt-3 text-sm font-semibold text-emerald-800 underline">Suivre ma réservation</button>
    </div>
  )

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-3 border-t border-slate-100 pt-4" aria-label="Demander une réservation">
      <div className="flex items-center gap-2 text-base font-semibold text-nuit-900"><BookmarkCheck className="h-5 w-5 text-emeraude-700" /> Demander une réservation</div>
      <p className="text-sm text-slate-600">Envoyez une demande au propriétaire. Aucun paiement n’est effectué sur cette étape.</p>
      <label className="block text-sm font-medium text-slate-700" htmlFor="message-reservation">Message au propriétaire (facultatif)</label>
      <textarea id="message-reservation" rows={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Présentez brièvement votre demande…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900" />
      {erreur && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      <button disabled={envoi} className="w-full rounded-xl bg-nuit-900 px-4 py-3 font-semibold text-white hover:bg-nuit-800 disabled:opacity-60">{envoi ? 'Envoi…' : 'Envoyer la demande de réservation'}</button>
    </form>
  )
}
