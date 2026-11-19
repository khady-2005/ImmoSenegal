import { useEffect, useState } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = { id: string; annonceTitre: string; loyerMensuel: number; etat: string; proprietaireNom: string; locataireNom: string; dateDebut: string }
const monnaie = (n: number) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'
const liens = [
  { href: '/mes-contrats-location', titre: 'Mes contrats', texte: 'Consulter les conditions, les dates et les paiements déclarés.' },
  { href: '/incidents-location', titre: 'Incidents et réparations', texte: 'Signaler un problème et suivre sa prise en charge.' },
  { href: '/etats-des-lieux', titre: 'États des lieux', texte: 'Consulter et valider les constats d’entrée et de sortie.' },
  { href: '/depot-garantie', titre: 'Dépôt de garantie', texte: 'Consulter la proposition de restitution et répondre.' },
]
export default function EspaceLocataire() {
  const { jeton, utilisateur } = useAuth()
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    if (!jeton) return
    appelApi<Contrat[]>('/api/locations/mes-contrats', { token: jeton })
       .then(l => setContrats(l.filter(c => c.etat !== 'TERMINE' && c.etat !== 'RESILIE')))
      .catch(e => setErreur(e instanceof ApiError ? e.message : 'Impossible de charger vos locations.'))
  }, [jeton])
  const actifs = contrats.filter(c => c.etat === 'ACTIF' || c.etat === 'RESILIATION_PLANIFIEE')
  const loyer = actifs.reduce((s, c) => s + Number(c.loyerMensuel || 0), 0)
  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Espace personnel</p>
    <h1 className="mt-2 text-3xl font-bold text-nuit-900">Bonjour {utilisateur?.nomComplet || ''}</h1>
    <p className="mt-2 text-sm text-slate-600">Retrouvez vos locations, vos démarches et les échanges avec vos propriétaires.</p>
    {erreur && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Locations suivies</p><p className="mt-1 text-2xl font-bold">{contrats.length}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Locations en cours</p><p className="mt-1 text-2xl font-bold">{actifs.length}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Loyers mensuels des contrats actifs</p><p className="mt-1 text-xl font-bold">{monnaie(loyer)}</p></div>
    </section>
    <section className="mt-8"><h2 className="text-xl font-bold text-nuit-900">Mes démarches</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{liens.map(l => <a key={l.href} href={l.href} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"><h3 className="font-bold text-nuit-900">{l.titre}</h3><p className="mt-2 text-sm text-slate-600">{l.texte}</p><span className="mt-4 inline-block text-sm font-semibold text-amber-800">Accéder →</span></a>)}</div>
    </section>
    <section className="mt-8"><h2 className="text-xl font-bold text-nuit-900">Mes logements</h2>
      {contrats.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucune location en cours pour le moment.</p> :
        <div className="mt-3 grid gap-3">{contrats.map(c => <article key={c.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{c.annonceTitre}</strong><span className="text-xs text-slate-500">{c.etat}</span></div><p className="mt-2 text-sm text-slate-600">Propriétaire : {c.proprietaireNom} · Loyer : {monnaie(c.loyerMensuel)}</p></article>)}</div>}
    </section>
  </main>
}
