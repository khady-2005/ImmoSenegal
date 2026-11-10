import { Building2, Search } from 'lucide-react'
import { analyser } from '../rechercheLibre'

/**
 * « Comment ça marche » : trois étapes de la recherche, avec de petites maquettes décoratives.
 * Les pastilles de la première maquette viennent de la vraie analyse du site (celle de la zone de recherche) :
 * ce qui est montré est ce que le site reconnaît réellement. Aucune annonce, aucun prix, aucun chiffre inventé.
 */
const exemple = 'Appartement à Thiès, 150 000 FCFA max'
const reconnus = analyser(exemple, 'LOCATION').reconnus

const fondMaquette = 'flex h-56 items-center justify-center bg-gradient-to-br from-[#e5f4f1] via-[#eef5f8] to-[#fff1d7] px-5 py-6'

function MaquetteDecrire() {
  return (
    <div className="w-full rounded-xl bg-white p-3 shadow-md shadow-nuit-900/10">
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

function MaquetteAffiner() {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-1.5">
        {['Type', 'Lieu', 'Budget'].map((nom) => (
          <span key={nom} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {nom}
          </span>
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3 rounded-xl bg-white p-2.5 shadow-md shadow-nuit-900/10">
          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-emeraude-50 text-emeraude-700">
            <Building2 className="h-5 w-5" />
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

function MaquetteFiche() {
  return (
    <div className="w-full rounded-xl bg-white p-2.5 shadow-md shadow-nuit-900/10">
      <div className="flex h-20 items-center justify-center rounded-lg bg-emeraude-50 text-emeraude-700">
        <Building2 className="h-8 w-8" />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-8 rounded-md ${i === 0 ? 'bg-dore-500/70' : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-2.5 w-2/3 rounded bg-slate-200" />
        <div className="h-2.5 w-full rounded bg-slate-100" />
      </div>
    </div>
  )
}

const etapes = [
  {
    titre: 'Décrivez',
    texte: 'Écrivez ce que vous cherchez en une phrase. Le site repère le type de bien, le lieu et le budget, et vous montre ce qu’il a compris.',
    maquette: <MaquetteDecrire />,
  },
  {
    titre: 'Affinez',
    texte: 'Le catalogue s’ouvre déjà filtré. Vous pouvez encore changer le type de bien, le lieu ou le budget.',
    maquette: <MaquetteAffiner />,
  },
  {
    titre: 'Ouvrez la fiche',
    texte: 'Parcourez la galerie de photos et lisez le détail du bien avant de décider.',
    maquette: <MaquetteFiche />,
  },
]

export default function CommentCaMarche() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24" aria-labelledby="titre-etapes">
      <h2 id="titre-etapes" className="font-titre text-3xl font-semibold sm:text-4xl">
        Comment ça marche
      </h2>
      <p className="mt-2 max-w-xl text-slate-600">Trois gestes, du premier mot à la fiche du bien.</p>
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {etapes.map((etape, i) => (
          <li key={etape.titre} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(11,31,58,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,31,58,0.10)]">
            <div aria-hidden className={fondMaquette}>
              {etape.maquette}
            </div>
            <div className="p-6">
              <p className="text-sm font-semibold text-emeraude-700">Étape {i + 1}</p>
              <h3 className="font-titre mt-1 text-xl font-semibold">{etape.titre}</h3>
              <p className="mt-2 text-slate-600">{etape.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
