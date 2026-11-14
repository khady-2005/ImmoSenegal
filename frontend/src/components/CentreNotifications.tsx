import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { appelApi } from '../api'
import { useAuth } from '../auth'

type Notification = {
  id: string
  type: string
  titre: string
  message: string
  lien: string | null
  lue: boolean
  creeLe: string
}
type ReponseNotifications = { notifications: Notification[]; nonLues: number }

function dateCourte(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CentreNotifications() {
  const { jeton } = useAuth()
  const navigate = useNavigate()
  const [ouvert, setOuvert] = useState(false)
  const [donnees, setDonnees] = useState<ReponseNotifications>({ notifications: [], nonLues: 0 })

  const charger = useCallback(async () => {
    if (!jeton) return
    try {
      setDonnees(await appelApi<ReponseNotifications>('/api/notifications', { token: jeton }))
    } catch {
      // Une indisponibilité temporaire des notifications ne bloque pas la navigation.
    }
  }, [jeton])

  useEffect(() => {
    void charger()
    const intervalle = window.setInterval(() => { void charger() }, 30000)
    return () => window.clearInterval(intervalle)
  }, [charger])

  async function ouvrirNotification(notification: Notification) {
    if (!notification.lue) {
      try {
        await appelApi('/api/notifications/' + notification.id + '/lue', { method: 'POST', token: jeton })
        setDonnees(v => ({
          ...v,
          nonLues: Math.max(0, v.nonLues - 1),
          notifications: v.notifications.map(n => n.id === notification.id ? { ...n, lue: true } : n),
        }))
      } catch { /* Le lien reste accessible même si le marquage échoue. */ }
    }
    setOuvert(false)
    if (notification.lien) navigate(notification.lien)
  }

  async function toutLire() {
    try {
      await appelApi('/api/notifications/tout-lire', { method: 'POST', token: jeton })
      setDonnees(v => ({ ...v, nonLues: 0, notifications: v.notifications.map(n => ({ ...n, lue: true })) }))
    } catch { /* Le prochain rafraîchissement récupérera l'état du serveur. */ }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => { setOuvert(v => !v); if (!ouvert) void charger() }}
        aria-label={donnees.nonLues ? donnees.nonLues + ' notifications non lues' : 'Notifications'}
        aria-expanded={ouvert}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-white/90 transition hover:bg-white/10 hover:text-dore-300">
        <Bell className="h-5 w-5" aria-hidden />
        {donnees.nonLues > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{donnees.nonLues > 99 ? '99+' : donnees.nonLues}</span>}
      </button>

      {ouvert && (
        <section className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left text-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-nuit-900">Notifications</h2>
            {donnees.nonLues > 0 && <button type="button" onClick={() => void toutLire()} className="inline-flex items-center gap-1 text-xs font-semibold text-nuit-700 hover:text-amber-700"><CheckCheck className="h-4 w-4" />Tout lire</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {donnees.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Aucune notification pour le moment.</p>
            ) : donnees.notifications.map(n => (
              <button key={n.id} type="button" onClick={() => void ouvrirNotification(n)}
                className={'block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ' + (!n.lue ? 'bg-amber-50/70' : 'bg-white')}>
                <span className="flex items-start gap-2">
                  {!n.lue && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-nuit-900">{n.titre}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">{n.message}</span>
                    <span className="mt-1.5 block text-[11px] text-slate-400">{dateCourte(n.creeLe)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
