import { CalendarDays, Handshake, House, Search, SlidersHorizontal } from 'lucide-react'
import { analyser } from '../rechercheLibre'

const exemple = 'Appartement à Thiès, 150 000 FCFA max'
const reconnus = analyser(exemple, 'LOCATION').reconnus

const etapes = [
  { titre: 'Décrivez votre recherche', texte: 'Indiquez le type de logement, la ville et votre budget avec les filtres ou en une phrase.', Icone: Search },
  { titre: 'Trouvez le bien idéal', texte: 'Parcourez les annonces, regardez les photos et découvrez les caractéristiques des biens.', Icone: House },
  { titre: 'Comparez et choisissez', texte: 'Comparez les offres et consultez la fiche qui correspond le mieux à votre projet.', Icone: Handshake },
]

export default function CommentCaMarche() {
  return (
    <section className="w-full bg-[#eaf3eb] py-14 sm:py-18" aria-labelledby="titre-etapes">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-dore-600">Simple et pratique</p>
        <h2 id="titre-etapes" className="font-titre text-3xl font-semibold text-nuit-900 sm:text-4xl">Comment ça marche ?</h2>
        <p className="mt-2 max-w-xl text-slate-600">Trois étapes pour avancer sereinement dans votre projet immobilier.</p>
        <ol className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {etapes.map(({ titre, texte, Icone }, i) => (
            <li key={titre} className="relative rounded-2xl border border-[#dceade] bg-white p-5 shadow-carte sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-white">{i + 1}</span>
                <Icone aria-hidden className="h-7 w-7 text-nuit-900" />
                {i < 2 && <span aria-hidden className="ml-auto hidden text-2xl text-dore-600 lg:block">→</span>}
              </div>
              <h3 className="font-titre mt-4 text-xl font-semibold text-nuit-900">{titre}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p>
              {i === 0 && <div className="mt-4 flex flex-wrap gap-2">{['Thiès', 'Budget max 150 000 FCFA', ...reconnus].slice(0, 3).map((mot) => <span key={mot} className="rounded-full bg-[#e9f6ed] px-3 py-1 text-xs font-semibold text-nuit-900">{mot}</span>)}</div>}
              {i === 1 && <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="h-4 w-4 text-dore-600" /> Consultez les informations disponibles</div>}
              {i === 2 && <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><SlidersHorizontal className="h-4 w-4 text-dore-600" /> Des critères clairs pour décider</div>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
