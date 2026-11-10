import { ArrowUpRight, BedDouble, MapPin, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Annonce } from '../types'
import { libelleStatut, libelleTypeBien } from '../types'
import { formatFcfa } from '../format'
import { urlPhoto } from './photos'

export default function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const location = annonce.transaction === 'LOCATION'
  const disponible = annonce.statut === 'PUBLIEE'
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(11,31,58,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-emeraude-600/30 hover:shadow-[0_22px_48px_rgba(11,31,58,0.13)]">
      <div className="relative h-60 overflow-hidden bg-gradient-to-br from-nuit-800 via-nuit-900 to-emeraude-900 sm:h-64">
        {annonce.photos.length > 0 ? (
          <img
            src={urlPhoto(annonce.id, annonce.photos[0])}
            alt={`${annonce.exemple ? 'Image illustrative' : 'Photo'} : ${annonce.titre}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.28),transparent_38%),linear-gradient(135deg,#12305a,#07142a)]">
            <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-center backdrop-blur-sm">
              <MapPin aria-hidden className="mx-auto h-7 w-7 text-dore-500" />
              <span className="mt-2 block text-xs font-semibold tracking-wide text-white/75">ImmoSénégal</span>
            </div>
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-nuit-950/65 via-nuit-950/5 to-nuit-950/10" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/30 bg-white/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-nuit-950 shadow-lg backdrop-blur">
            {location ? 'À louer' : 'À vendre'}
          </span>
          {annonce.exemple && (
            <span className="rounded-full border border-dashed border-white/60 bg-nuit-950/65 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
              Démonstration
            </span>
          )}
        </div>
        {!disponible && (
          <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow">
            {libelleStatut[annonce.statut]}
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <p className="max-w-[75%] text-xs font-semibold text-white/90 drop-shadow">
            <MapPin aria-hidden className="mr-1 inline h-3.5 w-3.5 text-dore-500" />
            {annonce.quartier}, {annonce.ville}
          </p>
          <span className="rounded-full border border-white/25 bg-nuit-950/35 p-2 text-white backdrop-blur transition group-hover:bg-emeraude-700">
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="p-5 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emeraude-700">{libelleTypeBien[annonce.typeBien]}</p>
          <span className="h-px flex-1 bg-slate-100" />
        </div>
        <h3 className="line-clamp-2 min-h-[3.25rem] font-titre text-lg font-bold leading-snug tracking-tight text-nuit-950">
          <Link to={`/annonces/${annonce.id}`} className="transition-colors duration-200 hover:text-emeraude-700">
            {annonce.titre}
          </Link>
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-100 py-3 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Ruler aria-hidden className="h-4 w-4 text-emeraude-700" />
            {annonce.superficie} m²
          </span>
          {annonce.pieces !== null && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble aria-hidden className="h-4 w-4 text-emeraude-700" />
              {annonce.pieces} pièce{annonce.pieces > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Prix du bien</p>
            <p className="text-xl font-extrabold tracking-tight text-nuit-950">
              {formatFcfa(annonce.prix)}
              {location && <span className="ml-1 text-xs font-semibold text-slate-500">/ mois</span>}
            </p>
          </div>
          <Link to={`/annonces/${annonce.id}`} className="inline-flex items-center gap-1 rounded-xl bg-emeraude-50 px-3 py-2.5 text-xs font-bold text-emeraude-800 transition hover:bg-emeraude-700 hover:text-white">
            Découvrir <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
