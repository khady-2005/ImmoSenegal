import { useState } from 'react'
import { Building2, BedSingle, House, LandPlot, MapPin, TreePalm } from 'lucide-react'
import { Link } from 'react-router-dom'
import SearchForm from '../components/SearchForm'
import RechercheLibre from '../components/RechercheLibre'
import type { Transaction } from '../rechercheLibre'
import CommentCaMarche from '../components/CommentCaMarche'
import Faq from '../components/Faq'
import ListeAnnonces from '../components/ListeAnnonces'
import { useAnnonces } from '../components/useAnnonces'
import { useAuth } from '../auth'
import photoAccueil from '../assets/hero-villa.webp'
import photoFin from '../assets/bien-saly.webp'

/** Raccourcis vers le catalogue filtré par type de bien (mêmes valeurs que le formulaire de recherche). */
const types = [
  { type: 'MAISON', nom: 'Maisons', icone: House },
  { type: 'APPARTEMENT', nom: 'Appartements', icone: Building2 },
  { type: 'STUDIO', nom: 'Studios', icone: BedSingle },
  { type: 'VILLA', nom: 'Villas', icone: TreePalm },
  { type: 'TERRAIN', nom: 'Terrains', icone: LandPlot },
]

/** Villes du catalogue : de simples raccourcis vers le filtre « ville » (aucun chiffre ni annonce inventés). */
const villes = ['Dakar', 'Ziguinchor', 'Thiès', 'Saint-Louis', 'Mbour', 'Saly', 'Kaolack', 'Touba']

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
  'inline-flex items-center rounded-full bg-dore-500 px-6 py-3 font-semibold text-nuit-950 transition-colors hover:bg-dore-600'

export default function Home() {
  const [onglet, setOnglet] = useState<'TOUT' | Transaction>('TOUT')
  const { etat, reessayer } = useAnnonces(
    `taille=6&tri=recent${onglet === 'TOUT' ? '' : `&transaction=${onglet}`}`,
  )
  // Nombre de VRAIS logements disponibles : les annonces d'exemple ne comptent jamais. Affiché seulement s'il y en a.
  const { etat: etatReelles } = useAnnonces('taille=1&exemple=false')
  const { utilisateur } = useAuth()
  const [avancee, setAvancee] = useState(false)
  const total = etatReelles.statut === 'ok' ? etatReelles.page.totalElements : 0
  const contientExemple = etat.statut === 'ok' && etat.page.contenu.some((a) => a.exemple)

  return (
    <>
      <section aria-labelledby="titre-accueil" className="relative isolate flex min-h-[680px] items-center overflow-hidden bg-nuit-950 text-white sm:min-h-[740px]">
        {/* Photo d'ambiance (image illustrative, pas une annonce). Le voile sombre garde le texte lisible. */}
        <img
          src={photoAccueil}
          alt=""
          width={1600}
          height={1008}
          className="absolute inset-0 -z-20 h-full w-full object-cover motion-safe:animate-[heroZoom_18s_ease-in-out_infinite_alternate]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061426]/95 via-[#071a2b]/70 to-[#071a2b]/20"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-nuit-950/55 to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-dore-500 shadow-lg backdrop-blur-md">
            <span aria-hidden className="h-2 w-2 rounded-full bg-dore-500 shadow-[0_0_12px_rgba(245,185,66,0.9)]" />
            Votre immobilier, partout au Sénégal
          </div>
          <h1
            id="titre-accueil"
            className="font-titre max-w-[10ch] text-6xl font-bold leading-[0.98] tracking-[-0.045em] text-balance drop-shadow-lg sm:text-7xl lg:text-[5.5rem]"
          >
            Rentrez enfin chez vous.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/90 sm:text-xl">
            Maisons, appartements, studios, villas et terrains à louer ou à acheter, partout au Sénégal.
          </p>
          <RechercheLibre />
          {total > 0 && (
            <p className="mt-1 flex items-center gap-2.5 text-sm text-white/90">
              <span
                aria-hidden
                className="inline-block h-4 w-2.5 rounded-[2px] bg-dore-500 shadow-[0_0_10px_2px_rgba(245,185,66,0.65)]"
              />
              {total} logement{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} en ce moment
            </p>
          )}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            <Link to="/catalogue" className="underline underline-offset-4 hover:text-dore-500">
              Voir tous les logements
            </Link>
            {utilisateur ? (
              <Link to="/tableau-de-bord" className="underline underline-offset-4 hover:text-dore-500">
                Mon espace
              </Link>
            ) : (
              <Link to="/inscription" className="underline underline-offset-4 hover:text-dore-500">
                Créer mon compte
              </Link>
            )}
          </p>
        </div>
        <p className="absolute bottom-2 right-3 text-xs text-white/70">Image illustrative</p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-24" aria-labelledby="titre-types">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="titre-types" className="font-titre text-2xl font-semibold">
            Parcourir par type de bien
          </h2>
          <button
            type="button"
            aria-expanded={avancee}
            aria-controls="recherche-avancee"
            onClick={() => setAvancee((v) => !v)}
            className="text-sm font-semibold text-emeraude-700 hover:underline"
          >
            {avancee ? 'Masquer la recherche avancée' : 'Recherche avancée'}
          </button>
        </div>
        {avancee && (
          <div id="recherche-avancee" className="mt-5">
            <SearchForm />
          </div>
        )}
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Types de bien">
          {types.map(({ type, nom, icone: Icone }, i) => (
            <li key={type} className={i === types.length - 1 ? 'col-span-2 sm:col-span-1' : undefined}>
              <Link
                to={`/catalogue?type=${type}`}
                className="group flex h-full flex-col items-center gap-3 rounded-3xl border border-slate-200/80 bg-white px-3 py-7 font-semibold text-slate-800 shadow-[0_8px_28px_rgba(11,31,58,0.05)] transition duration-300 hover:-translate-y-1 hover:border-emeraude-200 hover:shadow-[0_18px_42px_rgba(11,31,58,0.12)]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emeraude-50 to-[#d7f5e8] text-emeraude-700 transition duration-300 group-hover:scale-110 group-hover:bg-emeraude-700 group-hover:text-white">
                  <Icone aria-hidden className="h-5 w-5" />
                </span>
                {nom}
              </Link>
            </li>
          ))}
        </ul>
        <h3 className="font-titre mt-8 text-lg font-semibold">Ou choisissez une ville</h3>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Villes">
          {villes.map((ville) => (
            <li key={ville}>
              <Link
                to={`/catalogue?ville=${encodeURIComponent(ville)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-200 transition-colors hover:ring-2 hover:ring-emeraude-600"
              >
                <MapPin aria-hidden className="h-4 w-4 text-emeraude-600" />
                {ville}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24" aria-labelledby="titre-annonces">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
          <h2 id="titre-annonces" className="font-titre text-3xl font-bold tracking-tight sm:text-4xl">
            Les biens qui pourraient vous plaire
          </h2>
          <p className="mt-2 text-slate-500">Découvrez une sélection de logements et de terrains au Sénégal.</p>
          </div>
          <div role="group" aria-label="Type d’annonce" className="inline-flex rounded-full bg-slate-200/70 p-1 text-sm font-semibold">
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
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  onglet === valeur ? 'bg-nuit-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {nom}
              </button>
            ))}
          </div>
        </div>
        {contientExemple && (
          <p className="mt-3 text-sm text-slate-600">
            Les annonces marquées « Exemple » servent à la démonstration : ces biens n’existent pas.
          </p>
        )}
        <div className="mt-6">
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
        <p className="mt-6">
          <Link to="/catalogue" className="text-sm font-semibold text-emeraude-700 hover:underline">
            Voir tout le catalogue
          </Link>
        </p>
      </section>

      <CommentCaMarche />

      <section className="bg-emeraude-900 py-16 text-white" aria-labelledby="titre-portes">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titre-portes" className="font-titre max-w-[18ch] text-3xl font-semibold leading-tight sm:text-5xl">
            Chacun cherche une porte qui s’ouvre.
          </h2>
          <ul className="mt-10 grid gap-8 lg:grid-cols-3">
            {situations.map((texte) => (
              <li key={texte} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-2 h-5 w-3 shrink-0 rounded-[3px] bg-dore-500 shadow-[0_0_14px_3px_rgba(245,185,66,0.55)]"
                />
                <p className="font-titre text-xl leading-snug text-emeraude-50 sm:text-2xl">{texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24" aria-labelledby="titre-parcours">
        <h2 id="titre-parcours" className="font-titre text-3xl font-semibold sm:text-4xl">
          Vous cherchez, ou vous proposez ?
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_12px_35px_rgba(11,31,58,0.06)]">
            <h3 className="font-titre text-2xl font-semibold">Je cherche un logement</h3>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>Parcourez toutes les annonces sans créer de compte.</li>
              <li>Filtrez par type de bien, quartier et budget.</li>
              <li>Consultez les photos et le détail de chaque bien.</li>
            </ul>
            <Link
              to="/catalogue"
              className="mt-6 inline-flex rounded-full bg-nuit-900 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-nuit-800"
            >
              Parcourir le catalogue
            </Link>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-nuit-900 via-nuit-900 to-emeraude-900 p-8 text-white shadow-xl shadow-nuit-900/15">
            <h3 className="font-titre text-2xl font-semibold">Je propose un bien</h3>
            <ol className="mt-4 space-y-4">
              {[
                'Créez votre compte : c’est gratuit.',
                'Demandez le rôle de propriétaire. Un administrateur examine votre demande.',
                'Publiez votre annonce avec jusqu’à 8 photos.',
              ].map((texte, i) => (
                <li key={texte} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dore-500 text-sm font-bold text-nuit-950"
                  >
                    {i + 1}
                  </span>
                  <span className="text-nuit-100">{texte}</span>
                </li>
              ))}
            </ol>
            <Link to={utilisateur ? '/tableau-de-bord' : '/inscription'} className={`${boutonPlein} mt-6`}>
              {utilisateur ? 'Aller à mon espace' : 'Créer mon compte'}
            </Link>
          </div>
        </div>
      </section>

      <Faq />

      <section className="border-t border-slate-200 bg-slate-50 py-10" aria-labelledby="titre-avenir">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="titre-avenir" className="font-titre text-2xl font-semibold">
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
        <section className="relative isolate overflow-hidden py-20 text-white" aria-labelledby="titre-fin">
          <img
            src={photoFin}
            alt=""
            width={944}
            height={704}
            loading="lazy"
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-emeraude-900/90 via-emeraude-900/70 to-nuit-950/55" />
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="titre-fin" className="font-titre text-3xl font-semibold sm:text-4xl">
                Ouvrez la porte.
              </h2>
              <p className="mt-2 max-w-md text-emeraude-50">
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
