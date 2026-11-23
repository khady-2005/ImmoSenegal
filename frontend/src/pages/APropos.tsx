import { ArrowRight, Building2, Compass, FileCheck2, MapPin, Search, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const usages = [
  {
    Icone: Search,
    numero: '01',
    titre: 'Explorer les annonces',
    texte: 'Parcourez les biens présentés et affinez votre recherche à partir des critères proposés dans le catalogue.',
  },
  {
    Icone: FileCheck2,
    numero: '02',
    titre: 'Mieux comprendre chaque bien',
    texte: 'Consultez les informations disponibles sur le logement ou le terrain : localisation, caractéristiques et photos.',
  },
  {
    Icone: Users,
    numero: '03',
    titre: 'Demander une visite',
    texte: 'Lorsque vous êtes intéressé par une annonce, vous pouvez transmettre une demande de visite depuis la plateforme.',
  },
]

const engagements = [
  {
    Icone: MapPin,
    titre: 'Un ancrage sénégalais',
    texte: 'Une plateforme conçue en tenant compte des villes, des quartiers et des habitudes de recherche au Sénégal.',
  },
  {
    Icone: ShieldCheck,
    titre: 'Des informations lisibles',
    texte: 'Une présentation structurée pour aider chacun à comprendre les détails affichés dans les annonces.',
  },
  {
    Icone: Building2,
    titre: 'Un parcours accessible',
    texte: 'Un espace qui rassemble la découverte des biens et les démarches prévues sur la plateforme.',
  },
]

export default function APropos() {
  return (
    <div className="min-h-screen bg-transparent">
      <section className="relative isolate overflow-hidden bg-nuit-950 px-4 py-20 text-white sm:py-28">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full border-[52px] border-emeraude-700/25" />
        <div aria-hidden className="absolute -bottom-40 left-[28%] -z-10 h-96 w-96 rounded-full bg-emeraude-600/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emeraude-300/30 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emeraude-300">
              <Compass className="h-4 w-4" /> À propos d’ImmoSénégal
            </p>
            <h1 className="mt-7 max-w-3xl font-titre text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">
              Trouver un bien au Sénégal, avec plus de clarté.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              ImmoSénégal est une plateforme immobilière qui facilite la consultation des annonces et la découverte des biens proposés à la location ou à la vente.
            </p>
            <Link to="/catalogue" className="mt-8 inline-flex items-center gap-2 rounded-full bg-emeraude-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-black/15 transition hover:bg-emeraude-400">
              Découvrir le catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/15 bg-nuit-950/95 p-7 shadow-2xl sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emeraude-300">Notre objectif</p>
              <p className="mt-5 font-titre text-3xl font-medium leading-snug sm:text-4xl">
                Rendre les annonces immobilières plus simples à découvrir et à comparer.
              </p>
              <div className="mt-8 h-px bg-white/15" />
              <p className="mt-5 text-sm leading-relaxed text-white/65">
                Une expérience pensée pour les personnes qui recherchent un logement, un terrain ou souhaitent présenter un bien.
              </p>
            </div>
            <div aria-hidden className="absolute -bottom-4 -left-4 -z-10 h-24 w-24 rounded-3xl border border-emeraude-400/30" />
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-7 shadow-carte sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emeraude-700">Pourquoi ce projet ?</p>
            <h2 className="mt-4 font-titre text-3xl font-semibold leading-tight text-nuit-950 sm:text-4xl">
              Une recherche immobilière mieux organisée.
            </h2>
          </div>
          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/95 p-7 text-base leading-relaxed text-slate-600 shadow-carte sm:p-9">
            <p>
              Lorsqu’on cherche une maison, un appartement ou un terrain, les informations peuvent être dispersées et difficiles à comparer. ImmoSénégal rassemble les annonces dans un même espace afin de rendre leur consultation plus pratique.
            </p>
            <p>
              La plateforme met l’accent sur la présentation des biens, leurs caractéristiques et les possibilités de recherche. Elle permet également, selon les fonctionnalités disponibles, d’envoyer une demande de visite pour une annonce.
            </p>
            <div className="rounded-2xl border border-emeraude-100 bg-white p-6 shadow-carte">
              <p className="font-semibold text-nuit-950">Une démarche simple</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Découvrir les annonces, consulter les détails utiles et effectuer les démarches proposées sur la fiche du bien.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emeraude-700">Comment utiliser la plateforme</p>
            <h2 className="mt-4 font-titre text-3xl font-semibold text-nuit-950 sm:text-4xl">
              Les étapes essentielles
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              ImmoSénégal accompagne les principales étapes de découverte d’un bien immobilier.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {usages.map(({ Icone, numero, titre, texte }) => (
              <article key={numero} className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-emeraude-300 hover:shadow-carte-haut">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emeraude-50 text-emeraude-800">
                    <Icone className="h-6 w-6" />
                  </span>
                  <span className="font-marque text-sm font-bold tracking-widest text-emeraude-700">{numero}</span>
                </div>
                <h3 className="mt-7 font-titre text-xl font-semibold text-nuit-950">{titre}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/95 px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emeraude-700">Nos repères</p>
            <h2 className="mt-4 font-titre text-3xl font-semibold text-nuit-950 sm:text-4xl">
              Ce qui guide ImmoSénégal
            </h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {engagements.map(({ Icone, titre, texte }) => (
              <div key={titre} className="flex gap-4 rounded-2xl border border-sable-200 bg-white p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emeraude-50 text-emeraude-800">
                  <Icone className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-nuit-950">{titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-6 rounded-3xl bg-nuit-950 p-8 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emeraude-300">Un projet universitaire</p>
              <h2 className="mt-3 font-titre text-2xl font-semibold sm:text-3xl">Développé à l’Université Assane Seck de Ziguinchor.</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
                ImmoSénégal est un projet universitaire développé dans le cadre d’un mémoire de Licence 3 en Ingénierie Informatique à l’Université Assane Seck de Ziguinchor. Il permet de mettre en pratique les compétences acquises en analyse, conception et développement d’applications web, à travers la réalisation d’une plateforme dédiée au secteur immobilier sénégalais.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emeraude-300/30 bg-emeraude-500/15 text-emeraude-300">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
