import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Building2, Send } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'

type ConversationMandat = {
  mandatId: string
  annonceId: string
  annonceTitre: string
  agenceNom: string
  proprietaireNom: string
  interlocuteurNom: string
}
type MessageMandat = {
  id: string
  mandatId: string
  expediteurId: string
  expediteurNom: string
  contenu: string
  envoyeLe: string
}

export default function MessagerieMandats() {
  const { utilisateur, jeton } = useAuth()
  const [conversations, setConversations] = useState<ConversationMandat[]>([])
  const [selection, setSelection] = useState('')
  const [messages, setMessages] = useState<MessageMandat[]>([])
  const [contenu, setContenu] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)

  const chargerConversations = useCallback(async () => {
    try {
      const liste = await appelApi<ConversationMandat[]>('/api/messagerie/mandats', { token: jeton })
      setConversations(liste)
      setSelection(current => current && liste.some(c => c.mandatId === current) ? current : liste[0]?.mandatId ?? '')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les conversations avec les agences.')
    } finally { setChargement(false) }
  }, [jeton])

  const chargerMessages = useCallback(async () => {
    if (!selection) { setMessages([]); return }
    try {
      setMessages(await appelApi<MessageMandat[]>('/api/messagerie/mandats/' + selection, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les messages du mandat.')
    }
  }, [jeton, selection])

  useEffect(() => { void chargerConversations() }, [chargerConversations])
  useEffect(() => { void chargerMessages() }, [chargerMessages])

  // Actualise les nouveaux messages sans recharger la page.
  useEffect(() => {
    if (!selection) return
    const intervalle = window.setInterval(() => { void chargerMessages() }, 8000)
    return () => window.clearInterval(intervalle)
  }, [chargerMessages, selection])

  // Détecte aussi les nouvelles conversations créées depuis l'ouverture de la page.
  useEffect(() => {
    const intervalle = window.setInterval(() => { void chargerConversations() }, 20000)
    return () => window.clearInterval(intervalle)
  }, [chargerConversations])

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contenu.trim() || !selection || envoi) return
    setEnvoi(true); setErreur('')
    try {
      await appelApi<MessageMandat>('/api/messagerie/mandats/' + selection, {
        method: 'POST', token: jeton, body: { contenu: contenu.trim() },
      })
      setContenu('')
      await chargerMessages()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Le message n’a pas pu être envoyé.')
    } finally { setEnvoi(false) }
  }

  const active = conversations.find(c => c.mandatId === selection)
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-xl bg-emeraude-50 p-3 text-emeraude-800"><Building2 className="h-6 w-6" /></span>
        <div><h2 className="text-xl font-semibold text-nuit-900">Échanges avec les agences</h2><p className="text-sm text-slate-600">Conversations privées liées aux mandats de gestion acceptés.</p></div>
      </div>
      {erreur && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      <div className="grid min-h-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[17rem_1fr]">
        <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
          <h3 className="border-b border-slate-100 px-4 py-3 font-semibold text-nuit-900">Mandats</h3>
          {chargement ? <p className="p-4 text-sm text-slate-500">Chargement…</p> : conversations.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucune conversation. Un échange apparaît lorsqu'un mandat de gestion est accepté.</p> : conversations.map(c => (
            <button key={c.mandatId} type="button" onClick={() => setSelection(c.mandatId)} className={'block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ' + (selection === c.mandatId ? 'bg-amber-50' : '')}>
              <span className="block truncate text-sm font-semibold text-nuit-900">{c.annonceTitre}</span>
              <span className="mt-1 block text-xs text-slate-600">{c.interlocuteurNom}</span>
              <span className="mt-1 block text-[11px] text-slate-400">{c.agenceNom}</span>
            </button>
          ))}
        </aside>
        <div className="flex min-h-[22rem] flex-col">
          {active ? <>
            <header className="border-b border-slate-100 px-4 py-3"><h3 className="font-semibold text-nuit-900">{active.interlocuteurNom}</h3><p className="text-xs text-slate-500">{active.annonceTitre} · {active.agenceNom}</p></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {messages.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Aucun message. Vous pouvez commencer la conversation.</p> : messages.map(m => {
                const mien = m.expediteurId === utilisateur?.id
                return <div key={m.id} className={'flex ' + (mien ? 'justify-end' : 'justify-start')}><div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ' + (mien ? 'bg-nuit-900 text-white' : 'border border-slate-200 bg-white text-slate-800')}><p className="mb-1 text-[11px] font-semibold opacity-70">{mien ? 'Vous' : m.expediteurNom}</p><p className="whitespace-pre-wrap break-words">{m.contenu}</p><p className="mt-2 text-right text-[10px] opacity-60">{new Date(m.envoyeLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p></div></div>
              })}
            </div>
            <form onSubmit={envoyer} className="flex items-end gap-2 border-t border-slate-100 p-3">
              <label className="sr-only" htmlFor="message-mandat">Votre message à l'agence ou au propriétaire</label>
              <textarea id="message-mandat" value={contenu} onChange={e => setContenu(e.target.value)} maxLength={2000} rows={2} placeholder="Écrire un message…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emeraude-600 focus:ring-2 focus:ring-emeraude-100" />
              <button type="submit" disabled={!contenu.trim() || envoi} className="inline-flex items-center gap-2 rounded-xl bg-emeraude-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emeraude-800 disabled:opacity-50"><Send className="h-4 w-4" />Envoyer</button>
            </form>
          </> : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">Sélectionnez un mandat pour consulter les échanges.</div>}
        </div>
      </div>
    </section>
  )
}
