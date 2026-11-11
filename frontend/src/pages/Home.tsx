import { useState } from 'react'
import { ArrowUpRight, Building2, BedSingle, House, LandPlot, TreePalm } from 'lucide-react'
import { Link } from 'react-router-dom'
import RecherchePanneau from '../components/RecherchePanneau'
import CommentCaMarche from '../components/CommentCaMarche'
import Faq from '../components/Faq'
import Apparition from '../components/Apparition'
import ListeAnnonces from '../components/ListeAnnonces'
import CarrouselUtilite from '../components/CarrouselUtilite'
import { useAnnonces } from '../components/useAnnonces'
import { useAuth } from '../auth'
import photoPlage from '../assets/hero-plage.webp'
import photoSalon from '../assets/hero-salon.webp'
import photoCoucher from '../assets/hero-coucher.webp'
import photoFin from '../assets/bien-saly.webp'
import photoVilla from '../assets/hero-villa.webp'

const types = [
  { type: 'MAISON', nom: 'Maisons', icone: House },
  { type: 'APPARTEMENT', nom: 'Appartements', icone: Building2 },
  { type: 'STUDIO', nom: 'Studios', icone: BedSingle },
  { type: 'VILLA', nom: 'Villas', icone: TreePalm },
  { type: 'TERRAIN', nom: 'Terrains', icone: LandPlot },
]

const villes = [
  { nom: 'Dakar', teinte: 'bg-white text-nuit-900 hover:bg-dore-100', place: 'col-span-2 lg:row-span-2 lg:h-auto' },
  { nom: 'Saly', teinte: 'bg-[#e7f2f0] text-nuit-900 hover:bg-white' },
  { nom: 'Mbour', teinte: 'bg-[#e8edf4] text-nuit-900 hover:bg-white' },
  { nom: 'Saint-Louis', teinte: 'bg-[#edf2f7] text-nuit-900 hover:bg-[#e2eaf3]' },
  { nom: 'Ziguinchor', teinte: 'bg-sable text-nuit-900 hover:bg-sable-200' },
  { nom: 'Thiès', teinte: 'bg-emeraude-50 text-emeraude-900 hover:bg-emeraude-50/60' },
  { nom: 'Kaolack', teinte: 'bg-sable text-nuit-900 hover:bg-sable-200' },
  { nom: 'Touba', teinte: 'bg-[#edf2f7] text-nuit-900 hover:bg-[#e2eaf3]', place: 'col-span-2' },
]

const situations = [
  'Pour qui cherche un studio près du campus.',
  'Pour la famille qui rêve d’une maison avec une cour.',
  'Pour qui veut présenter son bien avec de belles photos.',
]

const boutonPlein =
  'inline-flex items-center rounded-full bg-dore-500 px-6 py-3 font-semibold text-nuit-950 shadow-sm transition-all hover:bg-dore-600 hover:shadow-md active:scale-[0.98]'

function SurTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emeraude-700">
      {children}
    </p>
  )
}

export default function Home() {
  const [onglet, setOnglet] = useState<'TOUT' | 'LOCATION' | 'VENTE'>('TOUT')
  const { etat, reessayer } = useAnnonces(
    `taille=6&tri=recent${onglet === 'TOUT' ? '' : `&transaction=${onglet}`}`,
  )
  const { etat: etatReelles } = useAnnonces('taille=1&exemple=false')
  const { utilisateur } = useAuth()
  const total = etatReelles.statut === 'ok' ? etatReelles.page.totalElements : 0
  const contientExemple = etat.statut === 'ok' && etat.page.contenu.some((a) => a.exemple)

  return (
    <>
      {/* ─── Hero immersif ─── */}
      <section aria-labelledby="titre-accueil" className="relative isolate min-h-[680px] overflow-hidden bg-nuit-900 text-white sm:min-h-[720px]">
        <img
          src={photoVilla}
          alt=""
          width={1400}
          height={900}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-nuit-950 via-nuit-900/90 to-nuit-900/25" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-nuit-950/80 to-transparent" />
        <div className="mx-auto flex min-h-[680px] max-w-6xl items-center px-4 pb-36 pt-20 sm:min-h-[720px] sm:pb-40">
          <div className="max-w-3xl">
            <p className="entree inline-flex items-center gap-2 rounded-full border border-dore-500/60 bg-nuit-950/70 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              <span aria-hidden className="h-2 w-2 rounded-full bg-dore-500" />
              Location · Vente · Terrains au Sénégal
            </p>
            <h1
              id="titre-accueil"
              className="entree entree-2 font-titre mt-8 max-w-[15ch] text-[2.9rem] font-medium leading-[1.04] text-white text-balance sm:text-6xl lg:text-7xl"
            >
              Trouvez le bien immobilier qui{' '}
              <span className="italic text-dore-500">vous correspond.</span>
            </h1>
            <p className="entree entree-3 mt-7 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">
              Découvrez des maisons, appartements, villas et terrains dans les plus belles localités du Sénégal. Votre prochain projet immobilier commence ici.
            </p>
            <div className="entree entree-3 mt-9 flex flex-wrap items-center gap-4">
              <Link
                to="/catalogue"
                className="inline-flex items-center gap-2 rounded-full bg-dore-500 px-7 py-4 font-bold text-nuit-950 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-dore-600 active:translate-y-0"
              >
                Explorer les biens <ArrowUpRight aria-hidden className="h-5 w-5" />
              </Link>
              {utilisateur ? (
                <Link to="/tableau-de-bord" className="rounded-full border border-white/50 bg-nuit-950/40 px-6 py-4 font-semibold text-white transition hover:bg-white hover:text-nuit-900">
                  Mon espace
                </Link>
              ) : (
                <Link to="/inscription" className="rounded-full border border-white/50 bg-nuit-950/40 px-6 py-4 font-semibold text-white transition hover:bg-white hover:text-nuit-900">
                  Créer mon compte
                </Link>
              )}
            </div>
            {total > 0 && (
              <p className="entree entree-3 mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-nuit-950/60 px-4 py-2 text-sm font-semibold text-white">
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-dore-500" />
                {total} logement{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} en ce moment
              </p>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-8 right-6 hidden text-right text-xs font-medium uppercase tracking-[0.22em] text-white/70 lg:block">
          <span className="block text-dore-500">ImmoSénégal</span>
          Votre projet commence ici
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-28 max-w-6xl px-4 sm:-mt-32">
        <RecherchePanneau />
      </div>

      <Apparition>
        <CarrouselUtilite />
      </Apparition>

            {/* ─── Types ─── */}
      <Apparition>
        <section className="bg-[#f1f5f9] py-20" aria-labelledby="titre-types"><div className="mx-auto max-w-6xl px-4">
          <SurTitre>Explorer</SurTitre>
          <h2 id="titre-types" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
            Parcourir par <span className="text-emeraude-700">type de bien</span>
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Du studio étudiant à la villa avec jardin, choisissez ce qui vous correspond.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Types de bien">
            {types.map(({ type, nom, icone: Icone }, i) => (
              <li key={type} className={i === types.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}>
                <Link
                  to={`/catalogue?type=${type}`}
                  className="group flex h-full flex-col items-center gap-4 rounded-t-[4rem] rounded-b-2xl bg-white px-4 pb-6 pt-8 text-center shadow-carte ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1.5 hover:bg-emeraude-50 hover:shadow-carte-haut hover:ring-emeraude-500/40 motion-reduce:transform-none"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700 ring-2 ring-dore-500/60 transition-colors group-hover:bg-emeraude-700 group-hover:text-white">
                    <Icone aria-hidden className="h-6 w-6" />
                  </span>
                  <span className="font-titre text-lg font-medium text-nuit-900 transition-colors group-hover:text-emeraude-800">
                    {nom}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div></section>
      </Apparition>

      {/* ─── Annonces ─── */}
      <section className="bg-white py-20" aria-labelledby="titre-annonces"><div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SurTitre>Sélection</SurTitre>
            <h2 id="titre-annonces" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
              Annonces <span className="text-emeraude-700">à la une</span>
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Les biens publiés le plus récemment.
            </p>
          </div>
          <div
            role="group"
            aria-label="Type d’annonce"
            className="inline-flex rounded-full bg-sable p-1 text-sm font-semibold ring-1 ring-sable-200"
          >
            {(
              [
                ['TOUT', 'Toutes'],
                ['LOCATION', 'À louer'],
                ['VENTE', 'À vendre'],
              ] as const
            ).map(([valeur, nom]) => (
              <button
                key={valeur}
                type="button"
                aria-pressed={onglet === valeur}
                onClick={() => setOnglet(valeur)}
                className={`rounded-full px-4 py-1.5 transition-all ${
                  onglet === valeur
                    ? 'bg-emeraude-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-nuit-900'
                }`}
              >
                {nom}
              </button>
            ))}
          </div>
        </div>
        {contientExemple && (
          <p className="mt-5 rounded-xl border border-dashed border-dore-500/50 bg-dore-100/40 px-4 py-3 text-sm text-nuit-900">
            Catalogue de présentation : certaines annonces sont proposées à titre illustratif.
          </p>
        )}
        <div className="mt-8">
          <ListeAnnonces
            etat={etat}
            reessayer={reessayer}
            vide={
              onglet === 'TOUT'
                ? "Aucune annonce n'est encore publiée. Vous avez un bien à proposer ? Créez un compte : la première annonce peut être la vôtre."
                : 'Aucune annonce de ce type pour le moment.'
            }
          />
        </div>
        <p className="mt-10 text-center">
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 rounded-full border-2 border-emeraude-700/30 px-6 py-3 font-semibold text-emeraude-800 transition-all hover:border-emeraude-700 hover:bg-emeraude-700 hover:text-white"
          >
            Voir tout le catalogue
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        </p>
      </div></section>

      {/* ─── Destinations ─── */}
      <Apparition>
        <section className="bg-nuit-900 py-20 text-white" aria-labelledby="titre-destinations">
          <div className="mx-auto max-w-6xl px-4">
            <SurTitre>Où chercher</SurTitre>
            <h2 id="titre-destinations" className="font-titre text-3xl font-medium text-white sm:text-4xl">
              Destinations <span className="text-dore-500">populaires</span>
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-nuit-100 sm:text-lg">
              Choisissez une ville pour voir ses annonces.
            </p>
            <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Villes">
              {villes.map(({ nom, teinte, place }) => (
                <li key={nom} className={place}>
                  <Link
                    to={`/catalogue?ville=${encodeURIComponent(nom)}`}
                    className={`group relative flex h-36 items-end overflow-hidden rounded-2xl ${teinte} p-5 ring-1 ring-dore-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-carte motion-reduce:transform-none sm:h-40 ${
                      place?.includes('row-span-2') ? 'lg:h-full lg:min-h-[21rem]' : ''
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute bottom-0 rounded-t-full border-2 border-b-0 border-dore-500/70 transition-transform duration-500 group-hover:-translate-y-2 ${
                        place ? 'right-6 h-[72%] w-20 sm:w-24' : 'right-4 h-[58%] w-14'
                      }`}
                    />
                    <span className="font-titre relative text-2xl font-medium leading-none text-nuit-900 sm:text-3xl">
                      {nom}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="absolute right-4 top-4 h-5 w-5 text-dore-600 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Apparition>

      <Apparition>
        <CommentCaMarche />
      </Apparition>

      <section className="bg-nuit-900 py-20 text-white" aria-labelledby="titre-portes">
        <div className="mx-auto max-w-6xl px-4">
          <SurTitre>
            <span className="text-dore-500">Pour qui</span>
          </SurTitre>
          <h2 id="titre-portes" className="font-titre max-w-[18ch] text-3xl font-medium leading-tight text-white sm:text-5xl">
            Chacun cherche une porte qui s’ouvre.
          </h2>
          <ul className="mt-12 grid gap-8 lg:grid-cols-3">
            {situations.map((texte) => (
              <li key={texte} className="flex gap-4 border-t border-dore-500/50 pt-6">
                <p className="font-titre text-xl font-light leading-snug text-nuit-100 sm:text-2xl">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Apparition>
        <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="titre-parcours">
          <SurTitre>Parcours</SurTitre>
          <h2 id="titre-parcours" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
            Vous cherchez, ou vous <span className="text-emeraude-700">proposez</span> ?
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-carte ring-1 ring-slate-200/70">
              <h3 className="font-titre text-2xl font-medium text-nuit-900">Je cherche un logement</h3>
              <ul className="mt-5 space-y-3 text-slate-700">
                <li>Parcourez toutes les annonces sans créer de compte.</li>
                <li>Filtrez par type de bien, quartier et budget.</li>
                <li>Consultez les photos et le détail de chaque bien.</li>
              </ul>
              <Link
                to="/catalogue"
                className="mt-7 inline-flex rounded-full bg-emeraude-700 px-6 py-3 font-semibold text-white transition-all hover:bg-emeraude-800 active:scale-[0.98]"
              >
                Parcourir le catalogue
              </Link>
            </div>

            <div className="rounded-3xl bg-sable p-8 text-nuit-900 shadow-carte ring-1 ring-sable-200">
              <h3 className="font-titre text-2xl font-medium text-nuit-900">Je propose un bien</h3>
              <ol className="mt-5 space-y-4">
                {[
                  'Créez votre compte : c’est gratuit.',
                  'Demandez le rôle de propriétaire. Un administrateur examine votre demande.',
                  'Publiez votre annonce avec jusqu’à 8 photos.',
                ].map((texte, i) => (
                  <li key={texte} className="flex gap-3">
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emeraude-700 text-sm font-bold text-white"
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-700">{texte}</span>
                  </li>
                ))}
              </ol>
              <Link to={utilisateur ? '/tableau-de-bord' : '/inscription'} className={`${boutonPlein} mt-7`}>
                {utilisateur ? 'Aller à mon espace' : 'Créer mon compte'}
              </Link>
            </div>
          </div>
        </section>
      </Apparition>

      <Faq />

      {!utilisateur && (
        <section className="relative isolate overflow-hidden py-24 text-white" aria-labelledby="titre-fin">
          <img
            src={photoFin}
            alt=""
            width={944}
            height={704}
            loading="lazy"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-emeraude-900/90 via-emeraude-900/65 to-emeraude-900/20"
          />
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="titre-fin" className="font-titre text-3xl font-medium sm:text-5xl">
                Ouvrez la porte.
              </h2>
              <p className="mt-3 max-w-md text-lg text-white/90">
                Créer un compte est gratuit : c’est la première étape pour publier une annonce.
              </p>
            </div>
            <Link to="/inscription" className={boutonPlein}>
              Créer mon compte
            </Link>
          </div>
          <p className="absolute bottom-2 right-3 text-xs text-white/70">Image illustrative</p>
        </section>
      )}
    </>
  )
}
