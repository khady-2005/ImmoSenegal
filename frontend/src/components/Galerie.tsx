import { useState } from 'react'
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Annonce } from '../types'
import { urlPhoto } from './photos'

/** Photo principale + vignettes cliquables. Sans photo : bandeau coloré et mention claire. */
export default function Galerie({ annonce }: { annonce: Annonce }) {
  const [courante, setCourante] = useState(0)
  const badge = (
    <span className="absolute left-4 top-4 rounded-full bg-dore-500 px-3.5 py-1 text-sm font-bold text-nuit-950 shadow">
      {annonce.transaction === 'LOCATION' ? 'À louer' : 'À vendre'}
    </span>
  )

  if (annonce.photos.length === 0) {
    return (
      <>
        <div aria-hidden className="relative flex h-56 items-center justify-center rounded-3xl bg-gradient-to-br from-nuit-800 to-emeraude-800 sm:h-80">
          <Building2 className="h-16 w-16 text-white/25" />
          {badge}
        </div>
        <p className="mt-2 text-sm text-slate-600">Aucune photo pour cette annonce.</p>
      </>
    )
  }

  const total = annonce.photos.length
  const index = Math.min(courante, total - 1)
  const aller = (i: number) => setCourante((i + total) % total)
  return (
    <section aria-label="Photos de l'annonce">
      <div className="relative h-72 overflow-hidden rounded-3xl bg-slate-200 shadow-carte sm:h-[28rem]">
        <img
          src={urlPhoto(annonce.id, annonce.photos[index])}
          alt={`Photo ${index + 1} sur ${total} : ${annonce.titre}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-nuit-950/40 to-transparent" />
        {badge}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => aller(index - 1)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-nuit-900 shadow transition-all hover:scale-105 hover:bg-white"
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => aller(index + 1)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-nuit-900 shadow transition-all hover:scale-105 hover:bg-white"
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
            <p className="absolute bottom-3 right-4 rounded-full bg-nuit-950/70 px-3 py-1 text-xs font-medium text-white">
              {index + 1} / {total}
            </p>
          </>
        )}
      </div>
      {total > 1 && (
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {annonce.photos.map((photo, i) => (
            <li key={photo} className="shrink-0">
              <button
                type="button"
                onClick={() => setCourante(i)}
                aria-label={`Voir la photo ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`block overflow-hidden rounded-xl ring-2 ring-offset-2 transition-all ${
                  i === index ? 'ring-dore-500' : 'opacity-70 ring-transparent hover:opacity-100'
                }`}
              >
                <img src={urlPhoto(annonce.id, photo)} alt="" loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
