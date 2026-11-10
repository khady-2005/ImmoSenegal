import { ArrowRight, Building2, Check, Images, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { analyser } from '../rechercheLibre'

/**
 * Présente les trois étapes du parcours de recherche avec des aperçus visuels.
 * Les critères affichés dans la première maquette proviennent de l'analyse réelle du site.
 */
const exemple = 'Appartement à Thiès, 150 000 FCFA max'
const reconnus = analyser(exemple, 'LOCATION').reconnus

const apercu = 'relative flex min-h-[250px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.13),transparent_38%),radial-gradient(circle_at_90%_90%,rgba(245,185,66,0.18),transparent_35%),linear-gradient(145deg,#f4f8f7,#edf2f7)] p-6'

function MaquetteDecrire() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white bg-white p-4 shadow-[0_18px_45px_rgba(7,20,42,0.12)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emeraude-50 text-emeraude-700"><Search className="h-3.5 w-3.5" /></span>
        Votre recherche
      </div>
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold leading-relaxed text-nuit-950">
        {exemple}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critères détectés</span>
        <span className="rounded-full bg-emeraude-50 px-2 py-1 text-[10px] font-bold text-emeraude-800">Compris</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {reconnus.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-full border border-emeraude-100 bg-emeraude-50 px-2.5 py-1 text-[11px] font-semibold text-emeraude-900">
            <Check className="h-3 w-3" />{r}
          </span>
        ))}
      </div>
    </div>
  )
}

function MaquetteAffiner() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Résultats adaptés</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emeraude-800 shadow-sm"><SlidersHorizontal className="h-3 w-3" /> Filtres</span>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="mb-2.5 flex gap-3 rounded-2xl border border-white bg-white p-3 shadow-[0_10px_25px_rgba(7,20,42,0.09)]">
          <div className={`flex h-[68px] w-[82px] shrink-0 items-center justify-center rounded-xl ${i === 0 ? 'bg-gradient-to-br from-emeraude-100 to-emerald-50' : 'bg-gradient-to-br from-amber-100 to-orange-50'}`}>
            <Building2 className={`h-7 w-7 ${i === 0 ? 'text-emeraude-700' : 'text-amber-700'}`} />
          </div>
          <div className="min-w-0 flex-1 py-1">
            <div className="mb-2 h-2.5 w-4/5 rounded-full bg-slate-200" />
            <div className="mb-3 h-2 w-1/2 rounded-full bg-slate-100" />
            <div className="h-2 w-2/5 rounded-full bg-emeraude-200" />
          </div>
        </div>
      ))}
      <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 text-emeraude-700" /> Type, lieu et budget déjà pris en compte</p>
    </div>
  )
}

function MaquetteFiche() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white bg-white p-3 shadow-[0_18px_45px_rgba(7,20,42,0.12)]">
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#12305a,#047857)]">
        <div aria-hidden className="absolute -right-5 -top-10 h-36 w-36 rounded-full border border-white/20" />
        <Building2 className="relative h-10 w-10 text-white" />
        <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold text-nuit-950">Aperçu du bien</span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-9 flex-1 rounded-lg ${i === 0 ? 'bg-dore-500/70' : 'bg-slate-100'}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="w-2/3 space-y-2">
          <div className="h-2.5 w-4/5 rounded-full bg-slate-200" />
          <div className="h-2 w-full rounded-full bg-slate-100" />
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700"><Images className="h-4 w-4" /></span>
      </div>
    </div>
  )
}

const etapes = [
  {
    titre: 'Décrivez votre recherche',
    texte: 'Écrivez simplement ce que vous souhaitez. ImmoSénégal repère le type de bien, la ville et votre budget.',
    detail: 'Une phrase suffit pour commencer',
    icone: Search,
    maquette: <MaquetteDecrire />,
  },
  {
    titre: 'Affinez les résultats',
    texte: 'Retrouvez un catalogue déjà filtré selon vos critères. Ajustez ensuite votre recherche en quelques clics.',
    detail: 'Des résultats plus pertinents',
    icone: SlidersHorizontal,
    maquette: <MaquetteAffiner />,
  },
  {
    titre: 'Découvrez le bien',
    texte: 'Explorez les photos et les informations du logement pour mieux préparer votre choix.',
    detail: 'Toutes les informations à portée de main',
    icone: Images,
    maquette: <MaquetteFiche />,
  },
]

export default function CommentCaMarche() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5f8f7] py-20 sm:py-24" aria-labelledby="titre-etapes">
      <div aria-hidden className="absolute -left-32 top-10 -z-10 h-72 w-72 rounded-full bg-emeraude-100/60 blur-3xl" />
      <div aria-hidden className="absolute -right-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emeraude-100 bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emeraude-800 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-dore-600" /> Simple et rapide
          </span>
          <h2 id="titre-etapes" className="font-titre mt-5 text-3xl font-bold tracking-tight text-nuit-950 sm:text-4xl lg:text-5xl">
            Comment ça marche ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            De votre première recherche à la découverte du bien, tout est pensé pour vous guider simplement.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
          {etapes.map((etape, i) => {
            const Icone = etape.icone
            return (
              <li key={etape.titre} className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(7,20,42,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:border-emeraude-200 hover:shadow-[0_24px_55px_rgba(7,20,42,0.12)]">
                <div className={`${apercu} `}>
                  <div className="absolute left-5 top-5 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-nuit-950 text-sm font-extrabold text-white shadow-lg">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-nuit-900/60">Étape {i + 1}</span>
                  </div>
                  {etape.maquette}
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emeraude-50 text-emeraude-700 transition-colors group-hover:bg-emeraude-700 group-hover:text-white">
                    <Icone className="h-5 w-5" />
                  </div>
                  <h3 className="font-titre text-xl font-bold tracking-tight text-nuit-950">{etape.titre}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{etape.texte}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-emeraude-800">{etape.detail}</span>
                    <ArrowRight className="h-4 w-4 text-dore-600 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
