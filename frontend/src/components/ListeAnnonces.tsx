import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'
import AnnonceCard from './AnnonceCard'
import type { EtatListe } from './useAnnonces'

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <p role="status" className="py-10 text-center text-slate-500">
      {texte}
    </p>
  )
}

/** Cartes grisées qui pulsent doucement pendant le chargement des annonces. */
export function CartesEnChargement({ nombre = 6 }: { nombre?: number }) {
  return (
    <div role="status" aria-label="Chargement des annonces" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Chargement des annonces…</span>
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} aria-hidden className="overflow-hidden rounded-2xl bg-white shadow-carte ring-1 ring-slate-200/70">
          <div className="squelette aspect-[4/3]" />
          <div className="space-y-3 p-5">
            <div className="squelette h-3.5 w-1/4 rounded" />
            <div className="squelette h-5 w-4/5 rounded" />
            <div className="squelette h-3.5 w-1/2 rounded" />
            <div className="squelette mt-5 h-3.5 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Quand aucune annonce ne correspond : un message qui dit quoi faire ensuite. */
export function EtatVide({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700">
        <SearchX aria-hidden className="h-7 w-7" />
      </span>
      <p className="mx-auto mt-4 max-w-md text-lg text-slate-700">{message}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

export function MessageErreur({ message, reessayer }: { message: string; reessayer?: () => void }) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {reessayer && (
        <button
          type="button"
          onClick={reessayer}
          className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}

/** Affiche les états d'une liste d'annonces : chargement, erreur (avec « Réessayer »), vide, résultats. */
export default function ListeAnnonces({
  etat,
  reessayer,
  vide,
  actionVide,
}: {
  etat: EtatListe
  reessayer: () => void
  vide: string
  actionVide?: ReactNode
}) {
  if (etat.statut === 'chargement') return <CartesEnChargement />
  if (etat.statut === 'erreur') return <MessageErreur message={etat.message} reessayer={reessayer} />
  if (etat.page.contenu.length === 0) {
    return <EtatVide message={vide}>{actionVide}</EtatVide>
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {etat.page.contenu.map((a) => (
        <AnnonceCard key={a.id} annonce={a} />
      ))}
    </div>
  )
}
