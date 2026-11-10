import { House, MessageCircle, Search, UserRound } from 'lucide-react'
import { analyser } from '../rechercheLibre'

/**
 * « Comment ça marche » : trois étapes de la recherche, avec de petites maquettes décoratives.
 * Les pastilles de la première maquette viennent de la vraie analyse du site (celle de la zone de recherche) :
 * ce qui est montré est ce que le site reconnaît réellement. Aucune annonce, aucun prix, aucun chiffre inventé.
 */
const exemple = 'Appartement à Thiès, 150 000 FCFA max'
const reconnus = analyser(exemple, 'LOCATION').reconnus

const fondMaquette = 'flex h-52 items-center justify-center bg-gradient-to-b from-emeraude-50 to-dore-100/70 px-5 py-5'

const carteMaquette = 'w-full rounded-xl bg-white p-3 shadow-md shadow-nuit-900/10 ring-1 ring-slate-200/70'

function MaquetteDecrire() {
  return (
    <div className={carteMaquette}>
      <p className="flex items-center gap-2 text-sm text-slate-800">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        {exemple}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {reconnus.map((r) => (
          <span key={r} className="rounded-full bg-emeraude-50 px-2 py-0.5 text-xs font-medium text-emeraude-900">
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

function MaquetteTrouver() {
  return (
    <div className="w-full space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl bg-white p-2.5 shadow-md shadow-nuit-900/10 ring-1 ring-slate-200/70">
          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-nuit-900 text-dore-500">
            <House className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5 py-1">
            <div className="h-2.5 w-3/4 rounded bg-slate-200" />
            <div className="h-2.5 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MaquetteContacter() {
  return (
    <div className={`${carteMaquette} flex items-center gap-3`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700">
        <UserRound className="h-5 w-5" />
      </span>
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-2/3 rounded bg-slate-200" />
        <div className="h-2.5 w-1/3 rounded bg-slate-100" />
      </div>
      <span className="rounded-full bg-dore-100 px-2.5 py-1 text-xs font-semibold text-nuit-900">Bientôt</span>
    </div>
  )
}

const etapes = [
  {
    titre: 'Décrivez votre recherche',
    icone: Search,
    texte: 'Écrivez ce que vous cherchez en une phrase, ou choisissez vos filtres. Le site repère le type de bien, le lieu et le budget.',
    maquette: <MaquetteDecrire />,
  },
  {
    titre: 'Trouvez le bien idéal',
    icone: House,
    texte: 'Le catalogue s’ouvre déjà filtré. Parcourez les photos, comparez les prix et lisez la fiche détaillée de chaque bien.',
    maquette: <MaquetteTrouver />,
  },
  {
    titre: 'Contactez le propriétaire',
    icone: MessageCircle,
    texte: 'Chaque fiche présente la personne qui publie le bien. La messagerie et la demande de visite arrivent prochainement.',
    maquette: <MaquetteContacter />,
  },
]

export default function CommentCaMarche() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="titre-etapes">
      <h2 id="titre-etapes" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
        Comment ça marche
      </h2>
      <p className="mt-2 max-w-xl text-slate-600">Trois gestes, du premier mot à la fiche du bien.</p>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {etapes.map((etape, i) => (
          <li
            key={etape.titre}
            className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-carte ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-carte-haut motion-reduce:transform-none"
          >
            <div aria-hidden className={fondMaquette}>
              {etape.maquette}
            </div>
            <div className="flex-1 p-6">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-nuit-900 text-dore-500 ring-2 ring-dore-500/40 transition-transform duration-300 group-hover:scale-110"
                >
                  <etape.icone className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-emeraude-700">Étape {i + 1}</p>
              </div>
              <h3 className="font-titre mt-4 text-xl font-medium text-nuit-900">{etape.titre}</h3>
              <p className="mt-2 leading-relaxed text-slate-600">{etape.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
