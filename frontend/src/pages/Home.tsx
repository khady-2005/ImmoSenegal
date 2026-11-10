import { useState } from 'react'
import { ArrowRight, BedSingle, Building2, House, LandPlot, MapPin, Search, TreePalm } from 'lucide-react'
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

const types = [
  { type: 'MAISON', nom: 'Maisons', sousTitre: 'De l’espace pour vivre', icone: House },
  { type: 'APPARTEMENT', nom: 'Appartements', sousTitre: 'La ville à votre portée', icone: Building2 },
  { type: 'STUDIO', nom: 'Studios', sousTitre: 'Un espace à vous', icone: BedSingle },
  { type: 'VILLA', nom: 'Villas', sousTitre: 'Le confort au quotidien', icone: TreePalm },
  { type: 'TERRAIN', nom: 'Terrains', sousTitre: 'Construisez votre projet', icone: LandPlot },
]

const villes = ['Dakar', 'Ziguinchor', 'Thiès', 'Saint-Louis', 'Mbour', 'Saly', 'Kaolack', 'Touba']

const boutonOr = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#e7b653] px-6 py-3 font-semibold text-[#142238] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#f0c66f] hover:shadow-lg'

export default function Home() {
  const [onglet, setOnglet] = useState<'TOUT' | Transaction>('TOUT')
  const [avancee, setAvancee] = useState(false)
  const { etat, reessayer } = useAnnonces(
    `taille=6&tri=recent${onglet === 'TOUT' ? '' : `&transaction=${onglet}`}`,
  )
  const { etat: etatReelles } = useAnnonces('taille=1&exemple=false')
  const { utilisateur } = useAuth()
  const total = etatReelles.statut === 'ok' ? etatReelles.page.totalElements : 0
  const contientExemple = etat.statut === 'ok' && etat.page.contenu.some((a) => a.exemple)

  return (
    <>
      <section aria-labelledby="titre-accueil" className="relative isolate min-h-[680px] overflow-hidden bg-[#101e32] text-white lg:min-h-[720px]">
        <img src={photoAccueil} alt="" width={1600} height={1008} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101e32]/95 via-[#101e32]/78 to-[#101e32]/25" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#101e32]/65 to-transparent" />
        <div className="mx-auto flex min-h-[680px] max-w-7xl items-center px-5 pb-20 pt-20 sm:px-8 lg:min-h-[720px]">
          <div className="w-full max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.19em] text-white/90 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#e7b653]" />
              L’immobilier, autrement
            </div>
            <h1 id="titre-accueil" className="font-titre max-w-[850px] text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-[5.2rem]">
              Le bon endroit
              <span className="block text-[#efc875]">commence ici.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
              Découvrez des maisons, appartements, villas et terrains à louer ou à acheter partout au Sénégal.
            </p>
            <div className="mt-8 max-w-2xl">
              <RechercheLibre />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
              <Link to="/catalogue" className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-[#efc875]">
                Explorer tous les biens <ArrowRight className="h-4 w-4" />
              </Link>
              {total > 0 && <span className="border-l border-white/30 pl-5">{total} bien{total > 1 ? 's' : ''} publié{total > 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
        <div className="absolute bottom-5 right-6 hidden text-[10px] uppercase tracking-[0.16em] text-white/60 sm:block">ImmoSénégal · Votre projet, notre priorité</div>
      </section>

      <section className="bg-[#f7f6f2] py-16 sm:py-20" aria-labelledby="titre-types">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#98702e]">Explorez les possibilités</p>
              <h2 id="titre-types" className="font-titre mt-3 text-3xl font-semibold tracking-tight text-[#17263a] sm:text-4xl">Quel bien recherchez-vous ?</h2>
            </div>
            <button type="button" aria-expanded={avancee} aria-controls="recherche-avancee" onClick={() => setAvancee((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-[#d8d8d0] bg-white px-5 py-2.5 text-sm font-semibold text-[#24364d] transition hover:border-[#98702e] hover:text-[#98702e]">
              <Search className="h-4 w-4" /> {avancee ? 'Fermer les filtres' : 'Affiner ma recherche'}
            </button>
          </div>
          {avancee && <div id="recherche-avancee" className="mb-7 rounded-3xl border border-[#e6e2d8] bg-white p-5 shadow-sm sm:p-7"><SearchForm /></div>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {types.map(({ type, nom, sousTitre, icone: Icone }) => (
              <Link key={type} to={`/catalogue?type=${type}`} className="group rounded-2xl border border-[#e8e5dc] bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#d7bd85] hover:shadow-[0_16px_35px_rgba(25,39,55,0.08)] sm:p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0e6] text-[#8b692f] transition group-hover:bg-[#17263a] group-hover:text-white"><Icone className="h-5 w-5" /></span>
                <span className="mt-5 block font-titre text-lg font-semibold text-[#17263a]">{nom}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{sousTitre}</span>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-[#e2ded3] pt-7 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <p className="text-sm font-semibold text-[#17263a]">Explorer par ville</p>
              <p className="mt-1 text-xs text-slate-500">Les destinations qui vous intéressent</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {villes.map((ville) => <Link key={ville} to={`/catalogue?ville=${encodeURIComponent(ville)}`} className="inline-flex items-center gap-1.5 rounded-full border border-[#e2ded3] bg-white px-4 py-2 text-sm text-[#455267] transition hover:border-[#98702e] hover:text-[#80602b]"><MapPin className="h-3.5 w-3.5" />{ville}</Link>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="titre-annonces">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#98702e]">À découvrir</p>
            <h2 id="titre-annonces" className="font-titre mt-3 text-3xl font-semibold tracking-tight text-[#17263a] sm:text-4xl">Une sélection de biens</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Parcourez les annonces et trouvez le lieu qui correspond à votre prochain projet.</p>
          </div>
          <div role="group" aria-label="Type d’annonce" className="inline-flex w-fit rounded-full border border-[#e5e2da] bg-[#f7f6f2] p-1 text-sm font-semibold">
            {([['TOUT', 'Tout'], ['LOCATION', 'À louer'], ['VENTE', 'À vendre']] as const).map(([valeur, nom]) => (
              <button key={valeur} type="button" aria-pressed={onglet === valeur} onClick={() => setOnglet(valeur)} className={`rounded-full px-4 py-2 transition ${onglet === valeur ? 'bg-[#17263a] text-white shadow-sm' : 'text-slate-600 hover:text-[#17263a]'}`}>{nom}</button>
            ))}
          </div>
        </div>
        {contientExemple && <p className="mb-4 rounded-xl bg-[#f7f6f2] px-4 py-3 text-xs text-slate-600">Les annonces marquées « Exemple » sont uniquement destinées à la démonstration.</p>}
        <ListeAnnonces etat={etat} reessayer={reessayer} vide={onglet === 'TOUT' ? "Aucune annonce n'est encore publiée." : 'Aucune annonce de ce type pour le moment.'} />
        <div className="mt-9 flex justify-center">
          <Link to="/catalogue" className="inline-flex items-center gap-2 rounded-full border border-[#17263a] px-6 py-3 text-sm font-semibold text-[#17263a] transition hover:bg-[#17263a] hover:text-white">Voir tout le catalogue <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <CommentCaMarche />

      <section className="bg-[#17263a] py-16 text-white sm:py-20" aria-labelledby="titre-parcours">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#efc875]">Vous avez un projet ?</p>
            <h2 id="titre-parcours" className="font-titre mt-4 text-3xl font-semibold leading-tight sm:text-4xl">Vous cherchez un bien ou souhaitez en proposer un ?</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">ImmoSénégal vous permet de parcourir les annonces ou de rejoindre la plateforme pour gérer vos biens.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-7">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#efc875]">Pour les visiteurs</span>
              <h3 className="font-titre mt-3 text-2xl font-semibold">Je recherche</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">Consultez librement le catalogue et recherchez selon vos critères.</p>
              <Link to="/catalogue" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#efc875]">Parcourir les biens <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="rounded-3xl bg-[#f1e6cf] p-7 text-[#17263a]">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b692f]">Pour les propriétaires</span>
              <h3 className="font-titre mt-3 text-2xl font-semibold">Je propose un bien</h3>
              <p className="mt-3 text-sm leading-6 text-[#536073]">Créez votre compte et demandez l’accès propriétaire. La publication est réservée aux propriétaires autorisés et aux administrateurs.</p>
              <Link to={utilisateur ? '/tableau-de-bord' : '/inscription'} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#17263a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263b56]">{utilisateur ? 'Mon espace' : 'Créer un compte'} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <Faq />

      {!utilisateur && <section className="relative isolate overflow-hidden py-16 text-white sm:py-20" aria-labelledby="titre-fin">
        <img src={photoFin} alt="" width={944} height={704} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#102238]/85" />
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#efc875]">Votre prochain chapitre</p><h2 id="titre-fin" className="font-titre mt-3 text-3xl font-semibold sm:text-4xl">Et si votre prochain chez-vous était ici ?</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/75">Rejoignez ImmoSénégal pour demander une visite et accéder aux informations détaillées des biens.</p></div>
          <Link to="/inscription" className={boutonOr}>Créer mon compte <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>}
    </>
  )
}
