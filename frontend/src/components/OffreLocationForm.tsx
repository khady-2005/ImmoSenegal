import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'

export default function OffreLocationForm({ annonceId, loyer }: { annonceId: string; loyer: number }) {
  const { jeton } = useAuth()
  const navigate = useNavigate()
  const [montant, setMontant] = useState(String(loyer))
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState(false)

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const valeur = Number(montant)
    if (!Number.isFinite(valeur) || valeur <= 0) { setErreur('Saisissez un loyer mensuel valide.'); return }
    setEnvoi(true); setErreur('')
    try {
      await appelApi('/api/offres-location/annonces/' + annonceId, {
        method: 'POST', token: jeton, body: { loyerPropose: valeur, message: message.trim() || null },
      })
      setSucces(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’envoyer votre proposition.')
    } finally { setEnvoi(false) }
  }

  if (succes) return <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-900">Votre proposition de loyer a été envoyée.</p><p className="mt-1 text-sm text-emerald-800">Le propriétaire ou son agence pourra vous répondre depuis l’espace Offres.</p><button type="button" onClick={() => navigate('/mes-offres')} className="mt-3 text-sm font-semibold text-emerald-900 underline">Suivre ma proposition</button></div>

  return <form onSubmit={soumettre} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
    <div><h3 className="font-semibold text-nuit-900">Proposer un autre loyer</h3><p className="mt-1 text-xs text-slate-500">Envoyez une proposition de loyer mensuel au propriétaire ou à son agence. Aucun paiement n’est déclenché.</p></div>
    {erreur && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{erreur}</p>}
    <label className="block text-sm font-medium text-slate-700">Votre proposition mensuelle (FCFA)<input required type="number" min="1" step="1" value={montant} onChange={e => setMontant(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
    <p className="text-xs text-slate-500">Loyer affiché : {formatFcfa(loyer)} / mois</p>
    <label className="block text-sm font-medium text-slate-700">Message (facultatif)<textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Ajoutez une précision à votre proposition…" /></label>
    <button disabled={envoi} className="w-full rounded-xl bg-emeraude-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emeraude-800 disabled:opacity-50">{envoi ? 'Envoi…' : 'Envoyer ma proposition'}</button>
  </form>
}
