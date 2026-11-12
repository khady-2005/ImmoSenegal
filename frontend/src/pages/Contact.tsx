import { ArrowRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Contact() {
  return (
    <div className="min-h-[70vh] bg-transparent">
      <section className="relative isolate overflow-hidden bg-nuit-950/80 px-4 py-20 text-white backdrop-blur-[2px] sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-dore-400">ImmoSénégal</p>
          <h1 className="mt-4 font-titre text-4xl font-semibold sm:text-5xl">Contactez-nous</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
            Une question sur la plateforme ou sur son fonctionnement ? Retrouvez ici les informations de contact disponibles.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2">
        <article className="rounded-3xl border border-white/80 bg-white/95 p-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dore-100 text-nuit-900"><MapPin aria-hidden /></div>
          <h2 className="mt-5 text-xl font-semibold text-nuit-950">Notre localisation</h2>
          <p className="mt-2 text-slate-600">Ziguinchor, Sénégal</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            ImmoSénégal est une plateforme immobilière développée dans le cadre d’un projet de mémoire de Licence 3 en Ingénierie Informatique à l’UASZ.
          </p>
        </article>
        <article className="rounded-3xl border border-dore-100 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-semibold text-nuit-950">Vous recherchez un bien ?</h2>
          <p className="mt-2 leading-relaxed text-slate-600">
            Consultez le catalogue pour parcourir les annonces et effectuer une recherche par localité, type de bien ou transaction.
          </p>
          <Link to="/catalogue" className="mt-6 inline-flex items-center gap-2 rounded-full bg-dore-500 px-5 py-3 font-semibold text-nuit-950 transition hover:bg-dore-400">
            Consulter le catalogue <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </article>
      </section>
    </div>
  )
}
