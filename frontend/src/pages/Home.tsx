import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Building2, BedSingle, House, LandPlot, MapPin, ShieldCheck, Headset, Handshake, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import CommentCaMarche from '../components/CommentCaMarche'
import ListeAnnonces from '../components/ListeAnnonces'
import { useAnnonces } from '../components/useAnnonces'
import photoPlage from '../assets/hero-plage.webp'
import photoSalon from '../assets/hero-salon.webp'
import photoCoucher from '../assets/hero-coucher.webp'
import photoFin from '../assets/bien-saly.webp'
import photoVilla from '../assets/hero-villa.webp'

const types = [
  { type: 'MAISON', nom: 'Maisons', description: 'Des espaces pour toute la famille', icone: House, image: photoVilla },
  { type: 'APPARTEMENT', nom: 'Appartements', description: 'Le confort en ville', icone: Building2, image: photoCoucher },
  { type: 'VILLA', nom: 'Villas', description: 'Élégance et sérénité', icone: House, image: photoFin },
  { type: 'STUDIO', nom: 'Studios', description: 'Pratiques au quotidien', icone: BedSingle, image: photoSalon },
  { type: 'TERRAIN', nom: 'Terrains', description: 'Donnez vie à vos projets', icone: LandPlot, image: photoPlage },
]

const boutonOr = 'inline-flex items-center justify-center gap-2 rounded-full bg-dore-500 px-6 py-3.5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-dore-600'

function TitreSection({ petit, titre, accent, id }: { petit: string; titre: string; accent?: string; id?: string }) {
  return <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-dore-600">{petit}</p><h2 id={id} className="font-titre text-3xl font-semibold tracking-tight text-nuit-900 sm:text-4xl">{titre}{accent && <> <span className="italic text-emeraude-700">{accent}</span></>}</h2></div>
}

export default function Home() {
  const [onglet, setOnglet] = useState<'TOUT' | 'LOCATION' | 'VENTE'>('TOUT')
  const { etat, reessayer } = useAnnonces(`taille=6&tri=recent${onglet === 'TOUT' ? '' : `&transaction=${onglet}`}`)
  const { etat: etatReelles } = useAnnonces('taille=1&exemple=false')
  const total = etatReelles.statut === 'ok' ? etatReelles.page.totalElements : 0

  return (
    <>
      <section aria-labelledby="titre-accueil" className="relative isolate min-h-[560px] overflow-hidden bg-gradient-to-br from-[#102a43] via-[#173b5e] to-[#245477] text-white sm:min-h-[620px]">
        <img src={photoVilla} alt="Villa contemporaine avec piscine, image d'ambiance" width={1600} height={1000} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#102a43]/75 via-[#102a43]/45 to-[#102a43]/10" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-[#102a43]/55 to-transparent" />
        <div className="mx-auto flex min-h-[560px] max-w-6xl items-center px-4 pb-32 pt-20 sm:min-h-[620px] sm:pb-36">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-dore-400/60 bg-[#063b2b]/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-dore-400"><Sparkles aria-hidden className="h-4 w-4" /> Votre partenaire immobilier au Sénégal</p>
            <h1 id="titre-accueil" className="font-marque mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">Immo<span className="text-dore-400">Sénégal</span></h1>
            <h2 className="font-titre mt-3 max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">Trouvez le bien de vos rêves au Sénégal</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">Maisons, appartements, terrains… une large sélection de biens immobiliers pour donner vie à vos projets.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="/catalogue" className={boutonOr}><span aria-hidden>⌕</span> Rechercher un bien</a>
              <Link to="/catalogue" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/70 bg-nuit-950/35 px-6 py-3.5 font-semibold text-white transition hover:bg-white hover:text-nuit-950">Découvrir le catalogue <ArrowRight aria-hidden className="h-4 w-4" /></Link>
            </div>
            {total > 0 && <p className="mt-6 text-sm font-medium text-white/90">{total} bien{total > 1 ? 's' : ''} publié{total > 1 ? 's' : ''} actuellement</p>}
          </div>
        </div>
      </section>

      <section id="avantages" className="bg-[#f3f8f3] py-9" aria-label="Les avantages ImmoSénégal">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 md:grid-cols-4 md:gap-4">
          {[
            { Icone: ShieldCheck, titre: 'Transactions sécurisées', sous: 'et fiables' },
            { Icone: Headset, titre: 'Une assistance', sous: 'à votre écoute' },
            { Icone: MapPin, titre: 'Une couverture', sous: 'partout au Sénégal' },
            { Icone: Handshake, titre: 'Des annonces', sous: 'gérées avec soin' },
          ].map(({ Icone, titre, sous }) => <div key={titre} className="flex items-center gap-3 border-slate-200 md:border-r md:px-4 last:border-0"><Icone aria-hidden className="h-8 w-8 shrink-0 text-nuit-900" /><div><p className="text-sm font-bold text-nuit-900">{titre}</p><p className="text-sm text-slate-600">{sous}</p></div></div>)}
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20" aria-labelledby="titre-annonces">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <TitreSection id="titre-annonces" petit="" titre="Biens" accent="vedette" />
            <Link to="/catalogue" className="inline-flex items-center gap-2 pb-1 text-sm font-bold text-nuit-900 hover:text-emeraude-700">Voir tout le catalogue <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Type d’annonce">
            {([['TOUT', 'Tout'], ['VENTE', 'À vendre'], ['LOCATION', 'À louer']] as const).map(([valeur, nom]) => <button key={valeur} type="button" aria-pressed={onglet === valeur} onClick={() => setOnglet(valeur)} className={`rounded-full px-5 py-2 text-sm font-bold transition ${onglet === valeur ? 'bg-nuit-900 text-white shadow' : 'bg-[#e9f6ed] text-[#07513a] hover:bg-[#dceade]'}`}>{nom}</button>)}
          </div>
          <div className="mt-7"><ListeAnnonces etat={etat} reessayer={reessayer} vide={onglet === 'TOUT' ? "Aucune annonce n'est encore publiée. Vous avez un bien à proposer ? Créez un compte : la première annonce peut être la vôtre." : 'Aucune annonce de ce type pour le moment.'} /></div>
          <p className="mt-8 text-center"><Link to="/catalogue" className="inline-flex items-center gap-2 rounded-full border border-emeraude-300 px-6 py-3 font-semibold text-nuit-900 transition hover:bg-emeraude-800 hover:text-white">Explorer tous les biens <ArrowRight className="h-4 w-4" /></Link></p>
        </div>
      </section>

      <section className="bg-[#eaf3eb] py-16 sm:py-20" aria-labelledby="titre-types">
        <div className="mx-auto max-w-6xl px-4">
          <TitreSection id="titre-types" petit="Explorez selon vos envies" titre="Nos" accent="catégories" />
          <p className="mt-3 max-w-xl text-slate-600">Un large choix de biens pour chaque projet, partout au Sénégal.</p>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Types de bien">
            {types.map(({ type, nom, description, icone: Icone, image }) => <li key={type}><Link to={`/catalogue?type=${type}`} aria-label={nom} className="group relative flex h-48 overflow-hidden rounded-2xl bg-nuit-900 shadow-carte transition hover:-translate-y-1 hover:shadow-carte-haut"><img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><span aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#f7faf7]/95 via-[#f7faf7]/80 to-transparent" /><span className="relative flex h-full w-[82%] flex-col justify-center p-4 text-nuit-900"><Icone aria-hidden className="mb-3 h-7 w-7 text-nuit-900" /><span className="font-titre text-xl font-semibold">{nom}</span><span className="mt-1 text-xs text-slate-600">{description}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold">Voir plus <ArrowRight className="h-3 w-3" /></span></span></Link></li>)}
          </ul>
        </div>
      </section>

      <div id="comment-ca-marche" className="scroll-mt-24"><CommentCaMarche /></div>

      <section id="contact" className="relative isolate overflow-hidden py-16 text-white sm:py-20">
        <img src={photoPlage} alt="" width={1400} height={800} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-nuit-950/55" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-dore-500">Votre prochain chapitre</p><h2 className="font-titre text-3xl font-semibold sm:text-4xl">Votre projet immobilier commence ici.</h2><p className="mt-3 max-w-xl text-white/85">Parcourez le catalogue et trouvez le bien qui correspond à vos envies.</p></div><Link to="/catalogue" className={boutonOr}>Commencer maintenant <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </>
  )
}
