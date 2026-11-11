import { Play } from 'lucide-react'

/**
 * Section de présentation vidéo.
 * - Si une URL YouTube/Vimeo est fournie plus tard, remplacer le bloc placeholder.
 * - Pour l’instant : structure honnête + points d’utilité (pas de fausse vidéo).
 */
export default function VideoPresentation() {
  // Quand tu auras une vraie vidéo, mets l’URL ici, par exemple :
  // const videoUrl = 'https://www.youtube.com/embed/XXXX'
  const videoUrl: string | null = null

  return (
    <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="titre-video">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 id="titre-video" className="font-titre text-3xl font-medium text-nuit-900 sm:text-4xl">
            Comprendre ImmoSénégal en 2 minutes
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Une plateforme pour trouver un logement ou publier un bien au Sénégal — location et vente.
          </p>
          <ul className="mt-6 space-y-3 text-slate-700">
            <li className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dore-500" aria-hidden />
              <span>
                <strong className="text-nuit-900">Pour les clients</strong> : chercher, filtrer, consulter les
                photos et le détail des annonces.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dore-500" aria-hidden />
              <span>
                <strong className="text-nuit-900">Pour les propriétaires</strong> : créer un compte, obtenir le
                rôle, publier une annonce avec photos.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dore-500" aria-hidden />
              <span>
                <strong className="text-nuit-900">Pour l’administration</strong> : valider les demandes de rôle et
                superviser la plateforme.
              </span>
            </li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-3xl bg-nuit-900 shadow-carte ring-1 ring-slate-200/20">
          {videoUrl ? (
            <div className="aspect-video w-full">
              <iframe
                title="Présentation d’ImmoSénégal"
                src={videoUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-br from-nuit-900 via-nuit-800 to-emeraude-900 p-8 text-center text-white">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dore-500 text-nuit-950 shadow-lg">
                <Play aria-hidden className="h-7 w-7 translate-x-0.5" />
              </span>
              <div>
                <p className="font-titre text-xl font-medium">Vidéo de présentation</p>
                <p className="mt-2 max-w-sm text-sm text-nuit-100">
                  La vidéo n’est pas encore en ligne. Tu peux l’ajouter plus tard (YouTube ou fichier) : le cadre
                  est déjà prêt.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
