import { ArrowRight, BedDouble, Building2, MapPin, Ruler } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Annonce } from '../types'
import { libelleStatut, libelleTypeBien } from '../types'
import { formatFcfa } from '../format'
import { urlPhoto } from './photos'
import BoutonFavori from './BoutonFavori'

export default function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const location = annonce.transaction === 'LOCATION'
  const disponible = annonce.statut === 'PUBLIEE'
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-carte ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-carte-haut motion-reduce:transform-none">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-nuit-900 to-nuit-700">
        <BoutonFavori annonceId={annonce.id} />
        {annonce.photos.length > 0 ? (
          <img
            src={urlPhoto(annonce.id, annonce.photos[0], annonce.modifieLe)}
            alt={`Photo du type de bien présenté : ${annonce.titre}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <Building2 aria-hidden className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/25" />
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-nuit-950/80 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-dore-300 px-3 py-1 text-xs font-bold text-nuit-900 shadow-sm">
          {location ? 'À louer' : 'À vendre'}
        </span>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {!disponible && (
            <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {libelleStatut[annonce.statut]}
            </span>
          )}
        </div>

        <p className="font-titre absolute bottom-3 left-4 right-4 text-2xl font-semibold leading-none text-white drop-shadow">
          {formatFcfa(annonce.prix)}
          {location && <span className="font-sans text-sm font-normal text-white/85"> / mois</span>}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-sm font-medium text-amber-800">{libelleTypeBien[annonce.typeBien]}</p>
        <h3 className="font-titre text-lg font-semibold leading-snug text-nuit-900">
          {/* Le lien couvre toute la carte : un clic n'importe où ouvre la fiche. */}
          <Link to={`/annonces/${annonce.id}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {annonce.titre}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin aria-hidden className="h-4 w-4 shrink-0 text-amber-600" />
          {annonce.quartier}, {annonce.ville}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
          <p className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Ruler aria-hidden className="h-4 w-4 text-slate-400" />
              {annonce.superficie} m²
            </span>
            {annonce.pieces !== null && (
              <span className="flex items-center gap-1.5">
                <BedDouble aria-hidden className="h-4 w-4 text-slate-400" />
                {annonce.pieces} pièce{annonce.pieces > 1 ? 's' : ''}
              </span>
            )}
          </p>
          <span aria-hidden className="flex items-center gap-1 font-semibold text-amber-800 transition-all group-hover:gap-2">
            Voir le détail
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  )
}
