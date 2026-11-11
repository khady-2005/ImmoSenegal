import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Home, Search, Shield, Upload } from 'lucide-react'

const slides = [
  {
    titre: 'Cherchez un logement simplement',
    texte:
      'Parcourez les annonces de location et de vente partout au Sénégal. Filtrez par ville, type de bien et budget.',
    icone: Search,
  },
  {
    titre: 'Publiez votre bien en quelques étapes',
    texte:
      'Créez un compte, demandez le rôle propriétaire, puis publiez votre annonce avec photos. C’est gratuit.',
    icone: Upload,
  },
  {
    titre: 'Une plateforme pensée pour le Sénégal',
    texte:
      'Prix en FCFA, villes sénégalaises, interface en français et adaptée au téléphone.',
    icone: Home,
  },
  {
    titre: 'Transparence et confiance',
    texte:
      'Les annonces d’exemple sont clairement indiquées. Les fonctions à venir sont listées sans promesse fausse.',
    icone: Shield,
  },
]

export default function CarrouselUtilite() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 6000)
    return () => window.clearInterval(id)
  }, [])

  const precedent = () => setIndex((i) => (i - 1 + slides.length) % slides.length)
  const suivant = () => setIndex((i) => (i + 1) % slides.length)
  const slide = slides[index]
  const Icone = slide.icone

  return (
    <section className="bg-brume py-16" aria-labelledby="titre-carrousel">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="titre-carrousel" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
          À quoi sert ImmoSénégal ?
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          L’essentiel de la plateforme, en quelques points.
        </p>

        <div className="relative mt-8 overflow-hidden rounded-3xl bg-nuit-900 p-8 text-white shadow-carte sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-dore-500 text-nuit-950">
              <Icone aria-hidden className="h-8 w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-dore-500">
                {index + 1} / {slides.length}
              </p>
              <h3 className="font-titre mt-2 text-2xl font-medium sm:text-3xl">{slide.titre}</h3>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-nuit-100">{slide.texte}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2" role="tablist" aria-label="Diapositives">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Diapositive ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index ? 'w-8 bg-dore-500' : 'w-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={precedent}
                aria-label="Diapositive précédente"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
              >
                <ChevronLeft aria-hidden className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={suivant}
                aria-label="Diapositive suivante"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
              >
                <ChevronRight aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
