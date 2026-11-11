import { ArrowRight, ShieldCheck, Search, CalendarCheck, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const engagements = [
  { Icone: Search, titre: 'Faciliter la recherche', texte: 'Trouver des maisons, appartements, studios, villas ou terrains selon votre localité et vos critères.' },
  { Icone: ShieldCheck, titre: 'Présenter clairement les biens', texte: 'Consulter les informations utiles d’une annonce et prendre le temps de comparer les possibilités.' },
  { Icone: CalendarCheck, titre: 'Organiser les visites', texte: 'Envoyer une demande de visite et suivre son évolution depuis votre espace personnel.' },
]
export default function APropos() {
 return <div className="min-h-screen bg-[#f2f6fa]">
  <section className="bg-gradient-to-br from-nuit-950 via-nuit-900 to-nuit-800 px-4 py-20 text-white sm:py-24">
   <div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-dore-400">Notre vision</p><h1 className="mt-4 font-titre text-4xl font-semibold sm:text-5xl">À propos d’ImmoSénégal</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">Une plateforme conçue pour rendre la recherche immobilière au Sénégal plus simple, plus claire et plus accessible.</p></div>
  </section>
  <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:items-center">
   <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-dore-600">Qui sommes-nous ?</p><h2 className="mt-3 font-titre text-3xl font-semibold text-nuit-950">Un point de départ pour vos projets immobiliers</h2><p className="mt-5 leading-relaxed text-slate-600">ImmoSénégal rassemble dans un même espace des annonces de maisons, appartements, studios, villas et terrains. La plateforme accompagne les personnes qui souhaitent louer, acheter ou proposer un bien immobilier.</p><p className="mt-4 leading-relaxed text-slate-600">Ce projet est développé dans le cadre d’un mémoire de Licence 3 en Ingénierie Informatique à l’Université Assane Seck de Ziguinchor.</p></div>
   <div className="rounded-3xl border border-dore-200 bg-white p-7 shadow-carte"><MapPin className="h-9 w-9 text-dore-600"/><p className="mt-4 text-sm font-bold uppercase tracking-wider text-dore-600">Ancrage local</p><h3 className="mt-2 font-titre text-2xl font-semibold text-nuit-950">Conçu au Sénégal</h3><p className="mt-3 leading-relaxed text-slate-600">Une plateforme qui met en valeur les besoins et les réalités du marché immobilier sénégalais.</p></div>
  </section>
  <section className="bg-white px-4 py-16"><div className="mx-auto max-w-5xl"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-dore-600">Nos engagements</p><h2 className="mt-3 font-titre text-3xl font-semibold text-nuit-950">Une expérience utile à chaque étape</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{engagements.map(({Icone,titre,texte})=><article key={titre} className="rounded-2xl border border-slate-200 bg-[#f7f9fc] p-6"><Icone className="h-8 w-8 text-dore-600"/><h3 className="mt-4 font-titre text-xl font-semibold text-nuit-950">{titre}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p></article>)}</div><Link to="/catalogue" className="mt-9 inline-flex items-center gap-2 rounded-full bg-dore-500 px-6 py-3 font-bold text-nuit-950 transition hover:bg-dore-600">Découvrir les annonces <ArrowRight className="h-4 w-4"/></Link></div></section>
 </div>
}
