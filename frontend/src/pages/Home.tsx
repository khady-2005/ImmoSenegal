import { useState } from 'react'
import { ArrowUpRight, Building2, BedSingle, House, LandPlot, TreePalm, MapPin, Sparkles } from 'lucide-react'
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
  { type: 'MAISON', nom: 'Maisons', description: 'Confort et espace', icone: House, image: photoVilla },
  { type: 'APPARTEMENT', nom: 'Appartements', description: 'Modernité au quotidien', icone: Building2, image: photoCoucher },
  { type: 'VILLA', nom: 'Villas', description: 'Luxe et élégance', icone: TreePalm, image: photoFin },
  { type: 'STUDIO', nom: 'Studios', description: 'Pratiques et fonctionnels', icone: BedSingle, image: photoSalon },
  { type: 'TERRAIN', nom: 'Terrains', description: 'Imaginez votre projet', icone: LandPlot, image: photoPlage },
]

const villes = [
  { nom: 'Dakar', image: photoCoucher, taille: 'lg:row-span-2 lg:min-h-[25rem]' },
  { nom: 'Saly', image: photoFin },
  { nom: 'Mbour', image: photoPlage },
  { nom: 'Saint-Louis', image: photoVilla },
  { nom: 'Ziguinchor', image: photoSalon },
  { nom: 'Thiès', image: photoCoucher },
]

const boutonPlein =
  'inline-flex items-center justify-center gap-2 rounded-full bg-dore-500 px-6 py-3.5 font-bold text-nuit-950 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-dore-600 hover:shadow-xl active:translate-y-0'

function SurTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emeraude-700">
      <span aria-hidden className="h-5 w-1 rounded-full bg-dore-500" />
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
      <section aria-labelledby="titre-accueil" className="relative isolate min-h-[650px] overflow-hidden bg-nuit-950 text-white sm:min-h-[700px]">
        <img src={photoVilla} alt="" width={1600} height={1000} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-nuit-950/95 via-nuit-950/75 to-nuit-950/15" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-nuit-950/75 to-transparent" />
        <div className="mx-auto flex min-h-[650px] max-w-6xl items-center px-4 pb-36 pt-24 sm:min-h-[700px] sm:pb-40">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-dore-500/60 bg-nuit-950/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-dore-500">
              <Sparkles aria-hidden className="h-4 w-4" /> L’immobilier au Sénégal, autrement
            </p>
            <h1 id="titre-accueil" className="font-titre mt-7 max-w-[14ch] text-5xl font-medium leading-[1.04] text-white text-balance sm:text-6xl lg:text-7xl">
              Le lieu de vos prochains <span className="italic text-dore-500">beaux projets.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">
              Découvrez une sélection de maisons, appartements, villas et terrains dans les plus belles localités du Sénégal.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/catalogue" className={boutonPlein}>Explorer les biens <ArrowUpRight aria-hidden className="h-5 w-5" /></Link>
              <Link to={utilisateur ? '/tableau-de-bord' : '/inscription'} className="inline-flex items-center justify-center rounded-full border border-white/55 bg-nuit-950/35 px-6 py-3.5 font-semibold text-white transition hover:bg-white hover:text-nuit-900">
                {utilisateur ? 'Mon espace' : 'Créer un compte'}
              </Link>
            </div>
            {total > 0 && <p className="mt-8 text-sm font-medium text-white/85">{total} bien{total > 1 ? 's' : ''} publié{total > 1 ? 's' : ''} actuellement</p>}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-8 right-8 hidden text-right lg:block">
          <p className="font-titre text-2xl italic text-white/90">Votre prochaine adresse.</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-dore-500">ImmoSénégal</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-28 max-w-6xl px-4 sm:-mt-32">
        <div className="rounded-3xl bg-white p-2 shadow-[0_24px_70px_-28px_rgba(7,20,42,0.45)] ring-1 ring-slate-200/80 sm:p-4">
          <RecherchePanneau />
        </div>
      </div>

      <Apparition><CarrouselUtilite /></Apparition>

      <Apparition>
        <section className="bg-[#f7f8fa] py-20 sm:py-24" aria-labelledby="titre-types">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <SurTitre>Trouvez votre univers</SurTitre>
                <h2 id="titre-types" className="font-titre text-3xl font-medium text-nuit-900 sm:text-5xl">Explorez nos <span className="italic text-emeraude-700">catégories.</span></h2>
                <p className="mt-3 max-w-xl text-slate-600">Des espaces de vie et des opportunités immobilières pour chaque projet.</p>
              </div>
              <Link to="/catalogue" className="hidden items-center gap-2 pb-1 font-semibold text-emeraude-800 hover:text-emeraude-600 sm:inline-flex">Tout le catalogue <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5" aria-label="Types de bien">
              {types.map(({ type, nom, description, icone: Icone, image }) => (
                <li key={type}>
                  <Link to={`/catalogue?type=${type}`} aria-label={nom} className="group relative flex h-64 overflow-hidden rounded-2xl bg-nuit-900 shadow-carte transition duration-300 hover:-translate-y-1.5 hover:shadow-carte-haut">
                    <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-nuit-950/95 via-nuit-950/20 to-transparent" />
                    <span className="relative mt-auto flex w-full items-end justify-between p-5 text-white">
                      <span><Icone aria-hidden className="mb-3 h-6 w-6 text-dore-500" /><span className="block font-titre text-2xl">{nom}</span><span className="mt-1 block text-xs text-white/80">{description}</span></span>
                      <ArrowUpRight aria-hidden className="mb-1 h-5 w-5 text-dore-500 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Apparition>

      <section className="bg-white py-20 sm:py-24" aria-labelledby="titre-annonces">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><SurTitre>La sélection</SurTitre><h2 id="titre-annonces" className="font-titre text-3xl font-medium text-nuit-900 sm:text-5xl">Des biens qui <span className="italic text-emeraude-700">inspirent.</span></h2><p className="mt-3 text-slate-600">Les annonces publiées récemment sur ImmoSénégal.</p></div>
            <div role="group" aria-label="Type d’annonce" className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
              {([['TOUT', 'Tout'], ['LOCATION', 'À louer'], ['VENTE', 'À vendre']] as const).map(([valeur, nom]) => (
                <button key={valeur} type="button" aria-pressed={onglet === valeur} onClick={() => setOnglet(valeur)} className={`rounded-full px-4 py-2 transition-all ${onglet === valeur ? 'bg-nuit-900 text-white shadow' : 'text-slate-600 hover:text-nuit-900'}`}>{nom}</button>
              ))}
            </div>
          </div>
          {contientExemple && <p className="mt-5 rounded-xl border border-dore-500/40 bg-dore-100/40 px-4 py-3 text-sm text-nuit-900">Catalogue de présentation : certaines annonces sont proposées à titre illustratif.</p>}
          <div className="mt-9"><ListeAnnonces etat={etat} reessayer={reessayer} vide={onglet === 'TOUT' ? "Aucune annonce n'est encore publiée. Vous avez un bien à proposer ? Créez un compte : la première annonce peut être la vôtre." : 'Aucune annonce de ce type pour le moment.'} /></div>
          <p className="mt-10 text-center"><Link to="/catalogue" className="inline-flex items-center gap-2 rounded-full border border-nuit-900/20 px-6 py-3 font-semibold text-nuit-900 transition hover:border-nuit-900 hover:bg-nuit-900 hover:text-white">Voir tout le catalogue <ArrowUpRight className="h-4 w-4" /></Link></p>
        </div>
      </section>

      <Apparition>
        <section className="bg-nuit-900 py-20 text-white sm:py-24" aria-labelledby="titre-destinations">
          <div className="mx-auto max-w-6xl px-4">
            <SurTitre>Nos régions</SurTitre>
            <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 id="titre-destinations" className="font-titre text-3xl font-medium sm:text-5xl">Le Sénégal, <span className="italic text-dore-500">chez vous.</span></h2><p className="mt-3 max-w-xl text-nuit-100">Explorez les localités et trouvez le cadre qui vous ressemble.</p></div><MapPin aria-hidden className="hidden h-10 w-10 text-dore-500 sm:block" /></div>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="Villes">
              {villes.map(({ nom, image, taille }) => (
                <li key={nom} className={taille ?? ''}>
                  <Link to={`/catalogue?ville=${encodeURIComponent(nom)}`} className={`group relative flex min-h-40 overflow-hidden rounded-2xl bg-nuit-800 ${taille ? 'h-full min-h-[20rem]' : 'h-44'}`}>
                    <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-nuit-950/90 via-nuit-950/10 to-transparent" />
                    <span className="relative mt-auto flex w-full items-end justify-between p-5"><span className="font-titre text-2xl text-white">{nom}</span><ArrowUpRight className="h-5 w-5 text-dore-500 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Apparition>

      <Apparition><CommentCaMarche /></Apparition>

      <section className="bg-[#f7f8fa] py-20 sm:py-24" aria-labelledby="titre-proprietaires">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2 lg:items-center">
          <div><SurTitre>Espace propriétaire</SurTitre><h2 id="titre-proprietaires" className="font-titre text-3xl font-medium leading-tight text-nuit-900 sm:text-5xl">Votre bien mérite une <span className="italic text-emeraude-700">belle vitrine.</span></h2><p className="mt-5 max-w-lg leading-relaxed text-slate-600">Présentez votre propriété avec des photos et une description détaillée. Gérez vos annonces depuis votre espace propriétaire.</p><Link to={utilisateur ? '/tableau-de-bord' : '/inscription'} className={`${boutonPlein} mt-7`}>{utilisateur ? 'Accéder à mon espace' : 'Créer mon compte'} <ArrowUpRight className="h-4 w-4" /></Link></div>
          <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] bg-nuit-900 shadow-carte-haut"><img src={photoFin} alt="Villa contemporaine à Saly, image illustrative" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /><span aria-hidden className="absolute inset-0 bg-gradient-to-t from-nuit-950/65 to-transparent" /><span className="absolute bottom-6 left-6 rounded-full border border-white/40 bg-nuit-950/45 px-4 py-2 text-sm font-medium text-white">Valorisez votre bien immobilier</span></div>
        </div>
      </section>

      <Faq />

      {!utilisateur && <section className="relative isolate overflow-hidden py-20 text-white sm:py-24" aria-labelledby="titre-fin">
        <img src={photoPlage} alt="" width={1400} height={800} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-nuit-950/80" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between"><div><SurTitre>Votre prochain chapitre</SurTitre><h2 id="titre-fin" className="font-titre text-3xl font-medium sm:text-5xl">Et si votre prochain projet commençait ici ?</h2><p className="mt-3 max-w-xl text-white/85">Explorez le catalogue ou créez votre compte pour effectuer vos demandes.</p></div><Link to="/catalogue" className={boutonPlein}>Explorer le catalogue <ArrowUpRight className="h-4 w-4" /></Link></div>
      </section>}
    </>
  )
}
