import { BedDouble, MapPin, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Annonce } from '../types'
import { libelleStatut, libelleTypeBien } from '../types'
import { formatFcfa } from '../format'
import { urlPhoto } from './photos'

export default function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const location = annonce.transaction === 'LOCATION'
  const disponible = annonce.statut === 'PUBLIEE'
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(11,31,58,0.06)] transition duration-300 hover:-translate-y-1.5 hover:border-emeraude-200 hover:shadow-[0_22px_48px_rgba(11,31,58,0.14)]">
      <div className="relative flex h-56 items-end overflow-hidden bg-gradient-to-br from-nuit-800 to-emeraude-700 p-4 sm:h-64">
        {annonce.photos.length > 0 && (
          <img
            src={urlPhoto(annonce.id, annonce.photos[0])}
            alt={`${annonce.exemple ? 'Image illustrative' : 'Photo'} : ${annonce.titre}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-nuit-950/55 via-transparent to-transparent" />
        <span className="relative rounded-full border border-white/50 bg-white/95 px-3 py-1 text-xs font-bold text-nuit-950 shadow-md backdrop-blur">
          {location ? 'À louer' : 'À vendre'}
        </span>
        {annonce.exemple && (
          <span className="absolute left-3 top-3 rounded-full border border-dashed border-slate-400 bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Exemple
          </span>
        )}
        {!disponible && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {libelleStatut[annonce.statut]}
          </span>
        )}
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emeraude-700">{libelleTypeBien[annonce.typeBien]}</p>
        <h3 className="font-titre text-lg font-bold leading-snug tracking-tight text-nuit-900">
          <Link to={`/annonces/${annonce.id}`} className="transition-colors duration-200 hover:text-emeraude-700">
            {annonce.titre}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-slate-600">
          <MapPin aria-hidden className="h-4 w-4" />
          {annonce.quartier}, {annonce.ville}
        </p>
        <p className="text-xl font-extrabold tracking-tight text-emeraude-800">
          {formatFcfa(annonce.prix)}
          {location && <span className="text-sm font-normal text-slate-500"> / mois</span>}
        </p>
        <p className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Ruler aria-hidden className="h-4 w-4" />
            {annonce.superficie} m²
          </span>
          {annonce.pieces !== null && (
            <span className="flex items-center gap-1">
              <BedDouble aria-hidden className="h-4 w-4" />
              {annonce.pieces} pièce{annonce.pieces > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}
