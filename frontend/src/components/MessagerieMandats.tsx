import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
  dernierMessage: string | null
  dernierMessageLe: string | null
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
  const [chargementMessages, setChargementMessages] = useState(false)
  const [contenu, setContenu] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [recherche, setRecherche] = useState('')

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
      setChargementMessages(true)
      setMessages(await appelApi<MessageMandat[]>('/api/messagerie/mandats/' + selection, { token: jeton }))
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les messages du mandat.')
    } finally { setChargementMessages(false) }
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
      const nouveau = await appelApi<MessageMandat>('/api/messagerie/mandats/' + selection, {
        method: 'POST', token: jeton, body: { contenu: contenu.trim() },
      })
      setMessages(precedents => precedents.some(m => m.id === nouveau.id) ? precedents : [...precedents, nouveau])
      setContenu('')
      void chargerMessages()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Le message n’a pas pu être envoyé.')
    } finally { setEnvoi(false) }
  }

  const conversationsFiltrees = useMemo(() => conversations.filter(c => {
    const q = recherche.trim().toLocaleLowerCase()
    return !q || [c.annonceTitre, c.agenceNom, c.interlocuteurNom, c.proprietaireNom].some(v => v.toLocaleLowerCase().includes(q))
  }), [conversations, recherche])
  const active = conversations.find(c => c.mandatId === selection)
  return (
    <section className="messagerie-page mt-8 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-xl bg-amber-50 p-3 text-amber-900"><Building2 className="h-6 w-6" /></span>
        <div><h2 className="text-xl font-semibold text-nuit-900">Échanges avec les agences</h2><p className="text-sm text-slate-600">Conversations privées liées aux mandats de gestion acceptés.</p></div>
      </div>
      {erreur && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      <div className="grid min-h-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[17rem_1fr]">
        <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
          <h3 className="border-b border-slate-100 px-4 py-3 font-semibold text-nuit-900">Mandats</h3><div className="border-b border-slate-100 p-3"><label htmlFor="recherche-mandat-message" className="sr-only">Rechercher un mandat</label><input id="recherche-mandat-message" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
          {chargement ? <p className="p-4 text-sm text-slate-500">Chargement…</p> : conversations.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucune conversation. Un échange apparaît lorsqu'un mandat de gestion est accepté.</p> : conversationsFiltrees.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucun résultat.</p> : conversationsFiltrees.map(c => (
            <button key={c.mandatId} type="button" onClick={() => { setSelection(c.mandatId); setMessages([]) }} className={'block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ' + (selection === c.mandatId ? 'bg-amber-50' : '')}>
              <span className="block truncate text-sm font-semibold text-nuit-900">{c.annonceTitre}</span>
              <span className="mt-1 block text-xs text-slate-600">{c.interlocuteurNom}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{c.dernierMessage || "Aucun message pour le moment"}</span>
              <span className="mt-1 block text-[11px] text-slate-400">{c.dernierMessageLe ? new Date(c.dernierMessageLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : "Nouvelle conversation"} · {c.agenceNom}</span>
            </button>
          ))}
        </aside>
        <div className="flex min-h-[22rem] flex-col">
          {active ? <>
            <header className="border-b border-slate-100 bg-white px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Destinataire de vos messages</p><h3 className="mt-1 text-lg font-bold text-nuit-900">{active.interlocuteurNom}</h3><p className="mt-1 text-sm text-slate-600">{active.agenceNom} · {active.annonceTitre}</p></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {chargementMessages && messages.length === 0 ? <p role="status" className="py-10 text-center text-sm font-medium text-amber-900">Chargement des messages…</p> : messages.length === 0 ? <p className="py-10 text-center text-sm font-medium text-amber-900">Aucun message. Vous pouvez commencer la conversation.</p> : messages.map(m => {
                const mien = m.expediteurId === utilisateur?.id
                return <div key={m.id} className={'flex ' + (mien ? 'justify-end' : 'justify-start')}><div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ' + (mien ? 'border border-amber-300 bg-amber-100 text-nuit-950' : 'border border-slate-200 bg-white text-slate-800')}><p className="mb-1 text-[11px] font-semibold opacity-70">{mien ? 'Vous' : m.expediteurNom}</p><p className="whitespace-pre-wrap break-words">{m.contenu}</p><p className="mt-2 text-right text-[10px] opacity-60">{new Date(m.envoyeLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p></div></div>
              })}
            </div>
            <form onSubmit={envoyer} className="flex items-end gap-2 border-t border-slate-100 bg-white p-4">
              <label className="sr-only" htmlFor="message-mandat">Votre message à l'agence ou au propriétaire</label>
              <textarea id="message-mandat" value={contenu} onChange={e => setContenu(e.target.value)} maxLength={2000} rows={2} placeholder="Écrire un message…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
              <button type="submit" disabled={!contenu.trim() || envoi} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-dore-500 px-5 py-3 text-sm font-bold text-nuit-950 shadow-sm transition hover:bg-dore-600 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Envoyer</button>
            </form>
          </> : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">Sélectionnez un mandat pour consulter les échanges.</div>}
        </div>
      </div>
    </section>
  )
}
