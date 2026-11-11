import { useState } from 'react'
import { ArrowUpRight, Building2, BedSingle, House, LandPlot, TreePalm } from 'lucide-react'
import { Link } from 'react-router-dom'
import RecherchePanneau from '../components/RecherchePanneau'
import CommentCaMarche from '../components/CommentCaMarche'
import Faq from '../components/Faq'
import Apparition from '../components/Apparition'
import ListeAnnonces from '../components/ListeAnnonces'
import { useAnnonces } from '../components/useAnnonces'
import { useAuth } from '../auth'
import photoPlage from '../assets/hero-plage.webp'
import photoSalon from '../assets/hero-salon.webp'
import photoCoucher from '../assets/hero-coucher.webp'
import photoFin from '../assets/bien-saly.webp'

/** Raccourcis vers le catalogue filtré par type de bien (mêmes valeurs que le formulaire de recherche). */
const types = [
  { type: 'MAISON', nom: 'Maisons', icone: House },
  { type: 'APPARTEMENT', nom: 'Appartements', icone: Building2 },
  { type: 'STUDIO', nom: 'Studios', icone: BedSingle },
  { type: 'VILLA', nom: 'Villas', icone: TreePalm },
  { type: 'TERRAIN', nom: 'Terrains', icone: LandPlot },
]

/**
 * Destinations : de simples raccourcis vers le filtre « ville » du catalogue. Aucun chiffre ni aucune annonce inventés ;
 * les cartes n'affichent pas de photo tant que de vraies photos de ces villes ne sont pas fournies.
 */
const villes = [
  { nom: 'Dakar', teinte: 'bg-sable text-nuit-900 hover:bg-sable-200', place: 'col-span-2 lg:row-span-2 lg:h-auto' },
  { nom: 'Saly', teinte: 'bg-emeraude-50 text-emeraude-900 hover:bg-emeraude-50/60' },
  { nom: 'Mbour', teinte: 'bg-[#edf2f7] text-nuit-900 hover:bg-[#e2eaf3]' },
  { nom: 'Saint-Louis', teinte: 'bg-[#edf2f7] text-nuit-900 hover:bg-[#e2eaf3]' },
  { nom: 'Ziguinchor', teinte: 'bg-sable text-nuit-900 hover:bg-sable-200' },
  { nom: 'Thiès', teinte: 'bg-emeraude-50 text-emeraude-900 hover:bg-emeraude-50/60' },
  { nom: 'Kaolack', teinte: 'bg-sable text-nuit-900 hover:bg-sable-200' },
  { nom: 'Touba', teinte: 'bg-[#edf2f7] text-nuit-900 hover:bg-[#e2eaf3]', place: 'col-span-2' },
]

/** Situations de vie (pas des témoignages : aucune personne réelle n'est citée). */
const situations = [
  'Pour qui cherche un studio près du campus.',
  'Pour la famille qui rêve d’une maison avec une cour.',
  'Pour qui veut présenter son bien avec de belles photos.',
]

/** Fonctions pas encore disponibles : affichées comme telles, jamais comme si elles existaient. */
const aVenir = [
  'Demande de visite en ligne',
  'Messagerie avec le propriétaire',
  'Carte des biens',
  "Badge « annonce vérifiée »",
  'Assistant de recherche',
]

const boutonPlein =
  'inline-flex items-center rounded-full bg-dore-500 px-6 py-3 font-semibold text-nuit-950 shadow-sm transition-all hover:bg-dore-600 hover:shadow-md active:scale-[0.98]'

export default function Home() {
  const [onglet, setOnglet] = useState<'TOUT' | 'LOCATION' | 'VENTE'>('TOUT')
  const { etat, reessayer } = useAnnonces(
    `taille=6&tri=recent${onglet === 'TOUT' ? '' : `&transaction=${onglet}`}`,
  )
  // Nombre de VRAIS logements disponibles : les annonces d'exemple ne comptent jamais. Affiché seulement s'il y en a.
  const { etat: etatReelles } = useAnnonces('taille=1&exemple=false')
  const { utilisateur } = useAuth()
  const total = etatReelles.statut === 'ok' ? etatReelles.page.totalElements : 0
  const contientExemple = etat.statut === 'ok' && etat.page.contenu.some((a) => a.exemple)

  return (
    <>
      {/* ───────── Hero : un accueil clair et chaleureux, avec trois photos illustratives (aucune n'est une annonce) ───────── */}
      <section aria-labelledby="titre-accueil" className="relative isolate overflow-hidden bg-gradient-to-b from-sable-50 via-sable-50 to-ivoire">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-dore-100/80 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-emeraude-50 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-44 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-48 lg:pt-20">
          <div>
            <p className="entree inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-emeraude-800 shadow-sm ring-1 ring-dore-500/40">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-dore-500" />
              Location · Vente · Terrains au Sénégal
            </p>
            <h1
              id="titre-accueil"
              className="entree entree-2 font-titre mt-6 max-w-[14ch] text-[2.9rem] font-light leading-[1.04] text-nuit-900 text-balance sm:text-6xl lg:text-[4.4rem]"
            >
              Trouvez le lieu qui <span className="italic text-emeraude-700">vous ressemble.</span>
            </h1>
            <p className="entree entree-3 mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Découvrez les meilleures opportunités immobilières au Sénégal. Location, vente et terrains : votre prochain projet
              commence ici.
            </p>
            <div className="entree entree-3 mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to="/catalogue"
                className="inline-flex items-center rounded-full bg-emeraude-700 px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emeraude-800 hover:shadow-md active:scale-[0.98]"
              >
                Voir tous les logements
              </Link>
              {utilisateur ? (
                <Link to="/tableau-de-bord" className="font-semibold text-nuit-900 underline decoration-dore-500 decoration-2 underline-offset-4 hover:text-emeraude-700">
                  Mon espace
                </Link>
              ) : (
                <Link to="/inscription" className="font-semibold text-nuit-900 underline decoration-dore-500 decoration-2 underline-offset-4 hover:text-emeraude-700">
                  Créer mon compte
                </Link>
              )}
            </div>
            {total > 0 && (
              <p className="entree entree-3 mt-6 flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                <span aria-hidden className="inline-block h-4 w-2.5 rounded-[2px] bg-dore-500 shadow-[0_0_10px_2px_rgba(217,170,69,0.45)]" />
                {total} logement{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} en ce moment
              </p>
            )}
          </div>

          {/* Trois photos en arche : l'architecture douce du logo. Décoratives, donc sans texte alternatif. */}
          <div className="entree entree-2 mx-auto w-full max-w-[19rem] sm:max-w-sm lg:mx-0 lg:justify-self-end">
            <div className="relative aspect-[4/5]">
              <img
                src={photoPlage}
                alt=""
                width={944}
                height={704}
                className="absolute inset-0 h-full w-full rounded-b-[2rem] rounded-t-[999px] object-cover object-[62%_center] shadow-carte-haut ring-4 ring-white"
              />
              <img
                src={photoSalon}
                alt=""
                width={520}
                height={388}
                className="absolute -bottom-7 -left-6 h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-carte-haut sm:-left-12 sm:h-40 sm:w-40"
              />
              <img
                src={photoCoucher}
                alt=""
                width={560}
                height={353}
                className="absolute -right-4 top-[26%] h-24 w-24 rounded-full border-4 border-white object-cover shadow-carte-haut sm:-right-9 sm:h-32 sm:w-32"
              />
            </div>
            <p className="mt-12 text-center text-xs text-slate-500">Images illustratives</p>
          </div>
        </div>
      </section>

      {/* Le panneau remonte sur la photo : un trait d'union entre l'image et la page. */}
      <div className="relative z-10 mx-auto -mt-32 max-w-6xl px-4 sm:-mt-36">
        <RecherchePanneau />
      </div>

      {/* ───────── Types de bien ───────── */}
      <Apparition>
        <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="titre-types">
          <h2 id="titre-types" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
            Parcourir par type de bien
          </h2>
          <p className="mt-2 max-w-xl text-slate-600">Du studio étudiant à la villa avec jardin, choisissez ce qui vous correspond.</p>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Types de bien">
            {types.map(({ type, nom, icone: Icone }, i) => (
              <li key={type} className={i === types.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}>
                <Link
                  to={`/catalogue?type=${type}`}
                  className="group flex h-full flex-col items-center gap-4 rounded-t-[4rem] rounded-b-2xl bg-white px-4 pb-6 pt-8 text-center shadow-carte ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-1.5 hover:bg-emeraude-50 hover:shadow-carte-haut hover:ring-emeraude-500/40 motion-reduce:transform-none"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700 ring-2 ring-dore-500/60 transition-colors group-hover:bg-emeraude-700 group-hover:text-white">
                    <Icone aria-hidden className="h-6 w-6" />
                  </span>
                  <span className="font-titre text-lg font-medium text-nuit-900 transition-colors group-hover:text-emeraude-800">{nom}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Apparition>

      {/* ───────── Annonces à la une ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="titre-annonces">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="titre-annonces" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
              Annonces à la une
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">Les biens publiés le plus récemment.</p>
          </div>
          <div role="group" aria-label="Type d’annonce" className="inline-flex rounded-full bg-sable p-1 text-sm font-semibold ring-1 ring-sable-200">
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
                  onglet === valeur ? 'bg-emeraude-700 text-white shadow-sm' : 'text-slate-600 hover:text-nuit-900'
                }`}
              >
                {nom}
              </button>
            ))}
          </div>
        </div>
        {contientExemple && (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
            Les annonces marquées « Exemple » servent à la démonstration : ces biens n’existent pas.
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
            className="inline-flex items-center gap-2 rounded-full border border-nuit-900/25 px-6 py-3 font-semibold text-nuit-900 transition-all hover:border-emeraude-700 hover:bg-emeraude-700 hover:text-white"
          >
            Voir tout le catalogue
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        </p>
      </section>

      {/* ───────── Destinations ───────── */}
      <Apparition>
        <section className="bg-sable-50 py-20" aria-labelledby="titre-destinations">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="titre-destinations" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
              Destinations populaires
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">Choisissez une ville pour voir ses annonces.</p>
            <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Villes">
              {villes.map(({ nom, teinte, place }) => (
                <li key={nom} className={place}>
                  <Link
                    to={`/catalogue?ville=${encodeURIComponent(nom)}`}
                    className={`group relative flex h-36 items-end overflow-hidden rounded-2xl ${teinte} p-5 ring-1 ring-dore-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-carte motion-reduce:transform-none sm:h-40 ${
                      place?.includes('row-span-2') ? 'lg:h-full lg:min-h-[21rem]' : ''
                    }`}
                  >
                    {/* Une arche dorée, comme les ouvertures de l'architecture contemporaine du logo. */}
                    <span
                      aria-hidden
                      className={`absolute bottom-0 rounded-t-full border-2 border-b-0 border-dore-500/70 transition-transform duration-500 group-hover:-translate-y-2 ${
                        place ? 'right-6 h-[72%] w-20 sm:w-24' : 'right-4 h-[58%] w-14'
                      }`}
                    />
                    <span
                      aria-hidden
                      className={`absolute bottom-0 rounded-t-full border border-b-0 border-dore-500/40 transition-transform duration-500 group-hover:-translate-y-1 ${
                        place ? 'right-10 h-[52%] w-12 sm:right-12' : 'right-[1.875rem] h-[40%] w-7'
                      }`}
                    />
                    <span className="font-titre relative text-2xl font-medium leading-none sm:text-3xl">{nom}</span>
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

      <section className="bg-sable py-20 text-nuit-900" aria-labelledby="titre-portes">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titre-portes" className="font-titre max-w-[20ch] text-3xl font-medium leading-tight sm:text-5xl">
            Chacun cherche une porte qui s’ouvre.
          </h2>
          <ul className="mt-12 grid gap-8 lg:grid-cols-3">
            {situations.map((texte) => (
              <li key={texte} className="flex gap-4 border-t border-dore-500/60 pt-6">
                <p className="font-titre text-xl font-light leading-snug text-nuit-900 sm:text-2xl">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Apparition>
        <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="titre-parcours">
          <h2 id="titre-parcours" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
            Vous cherchez, ou vous proposez ?
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

      <section className="border-t border-slate-200 bg-brume py-12" aria-labelledby="titre-avenir">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titre-avenir" className="font-titre text-2xl font-medium text-nuit-900">
            À venir
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">Ces fonctions ne sont pas encore disponibles.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {aVenir.map((nom) => (
              <li key={nom} className="rounded-full bg-white px-3.5 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
                {nom}
              </li>
            ))}
          </ul>
        </div>
      </section>

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
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-emeraude-900/85 via-emeraude-900/55 to-emeraude-900/10" />
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
