import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'

type Contact = {
  id: string
  nom: string
  email: string | null
  telephone: string | null
  typeBesoin: string
  recherche: string | null
  ville: string | null
  notes: string | null
  statut: string
  membreAssigneId: string | null
  membreAssigneNom: string | null
  createurNom: string
  creeLe: string
}
type Membre = { id: string; nom: string; fonction: string; statut: string }

const statuts = [
  ['NOUVEAU', 'Nouveau'],
  ['A_CONTACTER', 'À contacter'],
  ['EN_NEGOCIATION', 'En négociation'],
  ['CLIENT', 'Client'],
  ['PERDU', 'Perdu'],
]
const besoins = [
  ['ACHAT', 'Recherche d’achat'],
  ['LOCATION', 'Recherche de location'],
  ['VENTE', 'Propriétaire vendeur'],
  ['MISE_EN_LOCATION', 'Propriétaire bailleur'],
  ['AUTRE', 'Autre demande'],
]

export default function CRMAgence({ agenceId, fonction }: { agenceId: string; fonction: string }) {
  const { jeton } = ({} as { jeton?: string })
  // Le jeton est fourni par le contexte d'authentification ci-dessous.
  const [token, setToken] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [typeBesoin, setTypeBesoin] = useState('ACHAT')
  const [recherche, setRecherche] = useState('')
  const [ville, setVille] = useState('')
  const [notes, setNotes] = useState('')
  const [membreAssigneId, setMembreAssigneId] = useState('')
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async (authToken: string) => {
    setChargement(true)
    setErreur(null)
    try {
      const liste = await appelApi<Contact[]>(`/api/agence/${agenceId}/crm/contacts`, { token: authToken })
      setContacts(liste)
      if (fonction === 'RESPONSABLE') {
        const equipe = await appelApi<Membre[]>(`/api/agence/${agenceId}/membres`, { token: authToken })
        setMembres(equipe.filter(m => m.statut === 'ACTIF' && ['AGENT', 'GESTIONNAIRE'].includes(m.fonction)))
      }
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de charger le CRM.')
    } finally {
      setChargement(false)
    }
  }, [agenceId, fonction])

  useEffect(() => {
    // Le contexte est lu dans le composant parent et injecté via l'événement d'initialisation.
  }, [])

  const creer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setEnvoi(true); setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/crm/contacts`, {
        method: 'POST', token,
        body: { nom, email, telephone, typeBesoin, recherche, ville, notes, membreAssigneId: membreAssigneId || null },
      })
      setNom(''); setEmail(''); setTelephone(''); setRecherche(''); setVille(''); setNotes(''); setMembreAssigneId('')
      setMessage('Contact ajouté au portefeuille commercial.')
      await charger(token)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible d’ajouter ce contact.')
    } finally { setEnvoi(false) }
  }

  const changerStatut = async (contact: Contact, statut: string) => {
    if (!token) return
    setErreur(null); setMessage(null)
    try {
      await appelApi(`/api/agence/${agenceId}/crm/contacts/${contact.id}`, {
        method: 'PATCH', token, body: { statut, notes: contact.notes },
      })
      setMessage('Suivi du contact mis à jour.')
      await charger(token)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Impossible de modifier ce contact.')
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Gestion commerciale</p>
          <h2 className="mt-1 text-xl font-bold text-nuit-900">CRM — Clients et prospects</h2>
          <p className="mt-1 text-sm text-slate-600">Centralisez les demandes et suivez chaque contact jusqu’à sa conversion.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{contacts.length} contact(s)</span>
      </div>

      {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={creer} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Nom complet
          <input required maxLength={120} value={nom} onChange={e => setNom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Nom du contact" />
        </label>
        <label className="text-sm font-medium text-slate-700">Téléphone
          <input maxLength={30} value={telephone} onChange={e => setTelephone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="+221 ..." />
        </label>
        <label className="text-sm font-medium text-slate-700">E-mail
          <input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="contact@exemple.com" />
        </label>
        <label className="text-sm font-medium text-slate-700">Type de demande
          <select value={typeBesoin} onChange={e => setTypeBesoin(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            {besoins.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Ville recherchée
          <input maxLength={100} value={ville} onChange={e => setVille(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Dakar, Thiès..." />
        </label>
        <label className="text-sm font-medium text-slate-700">Bien ou budget recherché
          <input maxLength={160} value={recherche} onChange={e => setRecherche(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Appartement 3 pièces, budget..." />
        </label>
        {fonction === 'RESPONSABLE' && <label className="text-sm font-medium text-slate-700">Attribuer à un collaborateur
          <select value={membreAssigneId} onChange={e => setMembreAssigneId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option value="">Moi-même</option>
            {membres.map(m => <option key={m.id} value={m.id}>{m.nom} — {m.fonction === 'AGENT' ? 'Agent' : 'Gestionnaire'}</option>)}
          </select>
        </label>}
        <label className="text-sm font-medium text-slate-700 md:col-span-2">Notes et historique du premier échange
          <textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder="Besoin, disponibilité, prochaine action..." />
        </label>
        <div className="md:col-span-2">
          <button disabled={envoi} className="rounded-full bg-nuit-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{envoi ? 'Enregistrement…' : 'Ajouter au CRM'}</button>
        </div>
      </form>

      <div className="mt-5">
        <h3 className="font-semibold text-nuit-900">Suivi des contacts</h3>
        {chargement ? <p className="mt-3 text-sm text-slate-500">Chargement…</p> : contacts.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aucun contact pour le moment. Ajoutez votre premier prospect ci-dessus.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {contacts.map(contact => (
              <article key={contact.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-nuit-900">{contact.nom}</p>
                    <p className="text-sm text-slate-600">{[contact.telephone, contact.email].filter(Boolean).join(' · ') || 'Aucun moyen de contact renseigné'}</p>
                    <p className="mt-1 text-xs text-slate-500">{besoins.find(([v]) => v === contact.typeBesoin)?.[1] ?? contact.typeBesoin} · {contact.ville || 'Ville non précisée'} · {contact.recherche || 'Besoin à préciser'}</p>
                    <p className="mt-1 text-xs text-slate-500">Attribué à : {contact.membreAssigneNom || 'Non attribué'} · Ajouté par {contact.createurNom}</p>
                    {contact.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{contact.notes}</p>}
                  </div>
                  <label className="text-xs font-medium text-slate-600">Étape du dossier
                    <select aria-label={`Statut de ${contact.nom}`} value={contact.statut} onChange={e => void changerStatut(contact, e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
                      {statuts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
