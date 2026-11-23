import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import MessagerieMandats from '../components/MessagerieMandats'

type Conversation = {
  reservationId: string
  annonceId: string
  annonceTitre: string
  interlocuteurNom: string
  statut: string
}
type Message = {
  id: string
  reservationId: string
  expediteurId: string
  expediteurNom: string
  contenu: string
  envoyeLe: string
}

function dateMessage(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Messagerie() {
  const { utilisateur, jeton } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selection, setSelection] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [chargementMessages, setChargementMessages] = useState(false)
  const [contenu, setContenu] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')

  const chargerConversations = useCallback(async () => {
    try {
      const liste = await appelApi<Conversation[]>('/api/messagerie', { token: jeton })
      setConversations(liste)
      setSelection(current => current && liste.some(c => c.reservationId === current) ? current : liste[0]?.reservationId ?? '')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos conversations.')
    } finally { setChargement(false) }
  }, [jeton])

  const chargerMessages = useCallback(async () => {
    if (!selection) { setMessages([]); return }
    try {
      setChargementMessages(true)
      const liste = await appelApi<Message[]>('/api/messagerie/' + selection, { token: jeton })
      setMessages(liste)
      setErreur('')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les messages.')
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
    const texte = contenu.trim()
    if (!texte || !selection || envoi) return
    setEnvoi(true); setErreur('')
    try {
      const nouveau = await appelApi<Message>('/api/messagerie/' + selection, {
        method: 'POST', token: jeton, body: { contenu: texte },
      })
      setMessages(precedents => precedents.some(m => m.id === nouveau.id) ? precedents : [...precedents, nouveau])
      setContenu('')
      void chargerMessages()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Le message n’a pas pu être envoyé.')
    } finally { setEnvoi(false) }
  }

  if (utilisateur?.role !== 'CLIENT' && utilisateur?.role !== 'PROPRIETAIRE' && utilisateur?.role !== 'AGENT' && utilisateur?.role !== 'ADMIN') {
    return <main className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">La messagerie est réservée aux utilisateurs concernés par une réservation ou un mandat de gestion.</p></main>
  }

  const conversationsFiltrees = useMemo(() => conversations.filter(c => {
    const q = recherche.trim().toLocaleLowerCase()
    return !q || [c.annonceTitre, c.interlocuteurNom, c.statut].some(v => v.toLocaleLowerCase().includes(q))
  }), [conversations, recherche])
  const active = conversations.find(c => c.reservationId === selection)
  return (
    <main className="messagerie-page mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase tracking-wider text-amber-900">Échanges privés</p><h1 className="mt-2 font-titre text-3xl font-semibold text-amber-950">Messagerie</h1><p className="mt-2 text-slate-700">Discutez avec l’autre partie au sujet de vos demandes de réservation.</p></div>
      {erreur && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      <div className="grid min-h-[32rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[18rem_1fr]">
        <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
          <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-nuit-900">Conversations</h2><div className="border-b border-slate-100 p-3"><label htmlFor="recherche-conversation" className="sr-only">Rechercher une conversation</label><input id="recherche-conversation" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div>
          {chargement ? <p className="p-4 text-sm text-slate-500">Chargement…</p> : conversations.length === 0 ? <p className="p-5 text-sm text-slate-500">Aucune conversation. Une conversation apparaît après une demande de réservation.</p> : conversationsFiltrees.length === 0 ? <p className="p-4 text-sm text-slate-500">Aucun résultat.</p> : conversationsFiltrees.map(c => (
            <button key={c.reservationId} type="button" onClick={() => { setSelection(c.reservationId); setMessages([]) }} className={'block w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ' + (selection === c.reservationId ? 'bg-amber-50' : '')}>
              <span className="block truncate text-sm font-semibold text-nuit-900">{c.annonceTitre}</span><span className="mt-1 block text-xs text-slate-600">{c.interlocuteurNom}</span><span className="mt-1 block text-[11px] text-slate-400">Réservation : {c.statut.toLowerCase().replace('_', ' ')}</span>
            </button>
          ))}
        </aside>
        <section className="flex min-h-[30rem] flex-col">
          {active ? <>
            <header className="border-b border-slate-100 bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Destinataire de vos messages</p><h2 className="mt-1 text-lg font-bold text-nuit-900">{active.interlocuteurNom}</h2><p className="mt-1 text-sm text-slate-600">Au sujet du logement : {active.annonceTitre}</p></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {chargementMessages && messages.length === 0 ? <p role="status" className="py-12 text-center text-sm font-medium text-amber-900">Chargement des messages…</p> : messages.length === 0 ? <p className="py-12 text-center text-sm font-medium text-amber-900">Aucun message. Vous pouvez commencer la conversation.</p> : messages.map(m => {
                const mien = m.expediteurId === utilisateur.id
                return <div key={m.id} className={'flex ' + (mien ? 'justify-end' : 'justify-start')}><div className={'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ' + (mien ? 'bg-nuit-900 text-white' : 'border border-slate-200 bg-white text-slate-800')}><p className="mb-1 text-[11px] font-semibold opacity-70">{mien ? 'Vous' : m.expediteurNom}</p><p className="whitespace-pre-wrap break-words text-sm">{m.contenu}</p><p className="mt-2 text-right text-[10px] opacity-60">{dateMessage(m.envoyeLe)}</p></div></div>
              })}
            </div>
            <form onSubmit={envoyer} className="flex items-end gap-2 border-t border-slate-100 bg-white p-4"><label className="sr-only" htmlFor="message-contenu">Votre message</label><textarea id="message-contenu" value={contenu} onChange={e => setContenu(e.target.value)} maxLength={2000} rows={2} placeholder="Écrire un message…" className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /><button type="submit" disabled={!contenu.trim() || envoi} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-dore-500 px-5 py-3 text-sm font-bold text-nuit-950 shadow-sm transition hover:bg-dore-600 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Envoyer</button></form>
          </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500"><MessageCircle className="h-10 w-10 text-amber-800" /><p className="mt-3 font-medium text-slate-700">Sélectionnez une conversation</p><p className="mt-1 text-sm">Vos échanges liés aux réservations apparaîtront ici.</p></div>}
        </section>
      </div>
      <MessagerieMandats />
    </main>
  )
}
