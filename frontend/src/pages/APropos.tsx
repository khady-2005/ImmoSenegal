import { ArrowRight, Compass, House, MapPin, Search, ShieldCheck, Users, CalendarCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const publics = [
  { Icone: Search, titre: 'Les personnes en recherche', texte: 'Parcourez les annonces et utilisez les critères du catalogue pour cibler les biens qui vous intéressent.' },
  { Icone: House, titre: 'Les propriétaires et annonceurs', texte: 'Présentez un bien immobilier sur une plateforme dédiée au marché sénégalais, selon les règles de publication.' },
  { Icone: CalendarCheck, titre: 'Les personnes qui souhaitent visiter', texte: 'Consultez une annonce et envoyez une demande de visite depuis la plateforme.' },
]

const principes = [
  { Icone: ShieldCheck, titre: 'Clarté', texte: 'Des informations structurées pour mieux comprendre chaque annonce.' },
  { Icone: MapPin, titre: 'Proximité', texte: 'Une attention portée aux villes, quartiers et réalités du Sénégal.' },
  { Icone: Users, titre: 'Accessibilité', texte: 'Un parcours simple pour les personnes qui cherchent ou proposent un bien.' },
]

export default function APropos() {
  return (
    <div className="min-h-screen bg-ivoire">
      <section className="relative isolate overflow-hidden bg-nuit-950 px-4 py-20 text-white sm:py-28">
        <div aria-hidden className="absolute -right-24 -top-28 -z-10 h-96 w-96 rounded-full border-[48px] border-emeraude-700/30" />
        <div aria-hidden className="absolute -bottom-36 left-1/3 -z-10 h-80 w-80 rounded-full bg-emeraude-700/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emeraude-300/40 bg-emeraude-900/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emeraude-300">
              <Compass className="h-4 w-4" /> Notre projet
            </p>
            <h1 className="mt-6 max-w-3xl font-titre text-4xl font-semibold leading-tight sm:text-6xl">L’immobilier sénégalais, dans un espace plus simple à explorer.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">ImmoSénégal est une plateforme dédiée à la consultation et à la publication d’annonces immobilières, ainsi qu’à la demande de visites.</p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emeraude-300">Notre ambition</p>
            <p className="mt-3 font-titre text-2xl leading-snug">Rapprocher les personnes et les biens, avec des informations faciles à consulter.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-20 md:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emeraude-700">L’origine du projet</p>
          <h2 className="mt-3 font-titre text-3xl font-semibold leading-tight text-nuit-950 sm:text-4xl">Une réponse à un besoin concret</h2>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-slate-600">
          <p>Rechercher un logement ou un terrain demande souvent de comparer des informations dispersées. ImmoSénégal propose un espace unique pour parcourir des annonces, préciser une recherche et découvrir les caractéristiques des biens.</p>
          <p>Le projet est développé dans le cadre d’un mémoire de Licence 3 en Ingénierie Informatique à l’Université Assane Seck de Ziguinchor. Il s’appuie sur les usages de recherche et de présentation de biens immobiliers au Sénégal.</p>
          <div className="rounded-2xl border-l-4 border-emeraude-600 bg-sable-50 p-5">
            <p className="font-semibold text-nuit-900">Une plateforme pensée autour de trois étapes</p>
            <p className="mt-1">Découvrir les annonces, comparer les informations utiles, puis prendre contact pour organiser une visite.</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emeraude-700">À qui s’adresse ImmoSénégal ?</p>
          <h2 className="mt-3 max-w-2xl font-titre text-3xl font-semibold text-nuit-950 sm:text-4xl">Un même espace pour différents projets immobiliers</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {publics.map(({ Icone, titre, texte }, index) => (
              <article key={titre} className="rounded-3xl border border-slate-200 bg-ivoire p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emeraude-50 text-emeraude-800"><Icone className="h-6 w-6" /></span>
                <p className="mt-6 text-xs font-bold uppercase tracking-widest text-emeraude-700">0{index + 1}</p>
                <h3 className="mt-2 font-titre text-xl font-semibold text-nuit-950">{titre}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sable-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emeraude-700">Ce qui nous guide</p>
          <h2 className="mt-3 font-titre text-3xl font-semibold text-nuit-950 sm:text-4xl">Nos principes</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {principes.map(({ Icone, titre, texte }) => (
              <div key={titre} className="flex gap-4 rounded-2xl bg-white p-6 shadow-carte">
                <Icone className="mt-1 h-7 w-7 shrink-0 text-emeraude-700" />
                <div><h3 className="font-semibold text-nuit-950">{titre}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col justify-between gap-5 rounded-3xl bg-nuit-950 p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div><p className="text-sm font-bold uppercase tracking-widest text-emeraude-300">Votre projet commence ici</p><h2 className="mt-2 font-titre text-2xl font-semibold sm:text-3xl">Explorez les annonces disponibles.</h2></div>
            <Link to="/catalogue" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emeraude-600 px-6 py-3 font-bold text-white transition hover:bg-emeraude-700">Voir le catalogue <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
