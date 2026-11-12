import Faq from '../components/Faq'

export default function FaqPage() {
  return (
    <div className="min-h-[70vh] bg-transparent">
      <section className="bg-nuit-950 px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-dore-300">Centre d’aide</p>
          <h1 className="mt-3 font-titre text-4xl font-semibold sm:text-5xl">Questions fréquentes</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/85">Les réponses aux questions les plus courantes sur l’utilisation d’ImmoSénégal.</p>
        </div>
      </section>
      <Faq />
    </div>
  )
}
