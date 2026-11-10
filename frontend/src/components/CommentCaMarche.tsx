import { ArrowUpRight, Building2, CheckCircle2, Compass, Search, SlidersHorizontal } from 'lucide-react'

const etapes = [
  {
    numero: '01',
    titre: 'Exprimez votre recherche',
    texte: 'Indiquez la ville, le type de logement et votre budget. Vous pouvez aussi écrire votre recherche avec vos propres mots.',
    detail: 'Une recherche simple et intuitive',
    Icone: Search,
    accent: 'from-emerald-500 to-teal-700',
  },
  {
    numero: '02',
    titre: 'Trouvez les biens adaptés',
    texte: 'Parcourez le catalogue, comparez les annonces et affinez les résultats selon vos critères.',
    detail: 'Des filtres pour mieux choisir',
    Icone: SlidersHorizontal,
    accent: 'from-sky-600 to-blue-900',
  },
  {
    numero: '03',
    titre: 'Explorez et prenez contact',
    texte: 'Consultez les informations du bien. Connectez-vous pour accéder aux détails complémentaires et demander une visite.',
    detail: 'La prochaine étape vers votre logement',
    Icone: Building2,
    accent: 'from-amber-500 to-orange-700',
  },
]

export default function CommentCaMarche() {
  return (
    <section className="relative overflow-hidden bg-[#f4f3ee] py-20 sm:py-28" aria-labelledby="titre-etapes">
      <div aria-hidden className="absolute -right-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-100/70 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div className="flex flex-col justify-center">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
              <Compass className="h-4 w-4" /> Votre parcours immobilier
            </span>
            <h2 id="titre-etapes" className="font-titre max-w-lg text-4xl font-bold leading-[1.08] tracking-tight text-[#102a27] sm:text-5xl lg:text-[3.6rem]">
              Trouver votre bien,
              <span className="mt-2 block font-normal italic text-emerald-700">en toute simplicité.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-8 text-slate-600">
              De la première recherche jusqu’à la prise de contact, ImmoSénégal vous accompagne à chaque étape.
            </p>

            <div className="mt-9 flex items-center gap-4 border-t border-[#102a27]/10 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#102a27] text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#102a27]">Un parcours clair</p>
                <p className="mt-1 text-sm text-slate-500">Vous gardez le contrôle à chaque étape.</p>
              </div>
            </div>
          </div>

          <ol className="relative space-y-4">
            <div aria-hidden className="absolute bottom-12 left-[2.15rem] top-12 hidden w-px bg-gradient-to-b from-emerald-300 via-slate-300 to-amber-300 sm:block" />
            {etapes.map(({ numero, titre, texte, detail, Icone, accent }) => (
              <li key={numero} className="group relative grid gap-5 rounded-[1.6rem] border border-white/90 bg-white/85 p-5 shadow-[0_14px_40px_rgba(16,42,39,0.06)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(16,42,39,0.11)] sm:grid-cols-[4.5rem_1fr] sm:items-center sm:gap-6 sm:p-7">
                <div className="relative z-10 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.35rem] bg-[#102a27] text-lg font-bold tracking-wide text-white shadow-lg shadow-[#102a27]/15">
                  {numero}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
                      <Icone className="h-4 w-4" />
                    </span>
                    <h3 className="font-titre text-xl font-bold tracking-tight text-[#102a27] sm:text-2xl">{titre}</h3>
                  </div>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">{texte}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold tracking-wide text-emerald-800">{detail}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
