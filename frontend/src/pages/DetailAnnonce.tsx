import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Check, Home, MapPin, Ruler, UserRound, Tag } from 'lucide-react'
import { useApi } from '../useApi'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleStatut, libelleTypeBien, type Annonce } from '../types'
import { Chargement, MessageErreur } from '../components/ListeAnnonces'
import AnnonceCard from '../components/AnnonceCard'
import { useAnnonces } from '../components/useAnnonces'
import Galerie from '../components/Galerie'

/** Biens du même type dans la même ville (sans l'annonce affichée). Rien n'est affiché s'il n'y en a pas, ou en cas d'erreur. */
function BiensSimilaires({ annonce }: { annonce: Annonce }) {
  const { etat } = useAnnonces(
    `taille=4&tri=recent&type=${annonce.typeBien}&ville=${encodeURIComponent(annonce.ville)}`,
  )
  if (etat.statut !== 'ok') return null
  const autres = etat.page.contenu.filter((a) => a.id !== annonce.id).slice(0, 3)
  if (autres.length === 0) return null
  return (
    <section className="mt-16" aria-labelledby="titre-similaires">
      <h2 id="titre-similaires" className="font-titre text-2xl font-medium text-nuit-900 sm:text-3xl">
        Biens similaires
      </h2>
      <p className="mt-1 text-slate-600">
        {libelleTypeBien[annonce.typeBien]} à {annonce.ville}.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {autres.map((a) => (
          <AnnonceCard key={a.id} annonce={a} />
        ))}
      </div>
    </section>
  )
}

function Caracteristique({ icone: Icone, nom, valeur }: { icone: typeof Ruler; nom: string; valeur: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-carte ring-1 ring-slate-200/70">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700">
        <Icone aria-hidden className="h-5 w-5" />
      </span>
      <div>
        <dt className="text-sm text-slate-600">{nom}</dt>
        <dd className="font-semibold text-nuit-900">{valeur}</dd>
      </div>
    </div>
  )
}

export default function DetailAnnonce() {
  const { id = '' } = useParams()
  const { jeton } = useAuth()
  // Avec une session, le propriétaire et les administrateurs peuvent lire une annonce qui n'est pas encore publiée.
  const { data: a, erreur, chargement } = useApi<Annonce>(`/api/annonces/${encodeURIComponent(id)}`, jeton)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emeraude-700 hover:underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour au catalogue
      </Link>

      {chargement && <Chargement texte="Chargement de l'annonce…" />}

      {erreur && (
        <div className="mt-6">
          {erreur.status === 404 || erreur.status === 400 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h1 className="font-titre text-2xl font-medium text-nuit-900">Annonce introuvable</h1>
              <p className="mt-2 text-slate-600">Cette annonce n'existe pas ou a été retirée.</p>
              <Link
                to="/catalogue"
                className="mt-6 inline-flex rounded-full bg-nuit-900 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-nuit-800"
              >
                Voir les autres annonces
              </Link>
            </div>
          ) : (
            <MessageErreur message={erreur.message} />
          )}
        </div>
      )}

      {a && (
        <article className="mt-6">
          {a.exemple && (
            <p role="note" className="mb-5 inline-block rounded-full border border-dashed border-slate-400 bg-white px-4 py-1.5 text-sm text-slate-700">
              <strong>Annonce de démonstration</strong> : données simulées, photos illustratives.
            </p>
          )}
          <Galerie annonce={a} />

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
            <div>
              <p className="text-sm font-medium text-emeraude-700">
                {libelleTypeBien[a.typeBien]} · {libelleStatut[a.statut]}
              </p>
              <h1 className="font-titre mt-1 text-3xl font-medium leading-tight text-nuit-900 sm:text-4xl">{a.titre}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-slate-600">
                <MapPin aria-hidden className="h-4 w-4 text-emeraude-600" />
                {a.quartier}, {a.ville}
                {a.adresse ? ` — ${a.adresse}` : ''}
              </p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Caracteristique icone={Ruler} nom="Superficie" valeur={`${a.superficie} m²`} />
                {a.pieces !== null && <Caracteristique icone={BedDouble} nom="Pièces" valeur={a.pieces} />}
                <Caracteristique icone={Home} nom="Type de bien" valeur={libelleTypeBien[a.typeBien]} />
                <Caracteristique icone={Tag} nom="Transaction" valeur={a.transaction === 'LOCATION' ? 'Location' : 'Vente'} />
              </dl>

              {a.description && (
                <section className="mt-10" aria-labelledby="titre-description">
                  <h2 id="titre-description" className="font-titre text-2xl font-medium text-nuit-900">Description</h2>
                  <p className="mt-3 max-w-[68ch] whitespace-pre-line leading-relaxed text-slate-700">{a.description}</p>
                </section>
              )}

              {a.equipements.length > 0 && (
                <section className="mt-10" aria-labelledby="titre-equipements">
                  <h2 id="titre-equipements" className="font-titre text-2xl font-medium text-nuit-900">Équipements</h2>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {a.equipements.map((e) => (
                      <li key={e} className="flex items-center gap-2.5 text-slate-700">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emeraude-50 text-emeraude-700">
                          <Check aria-hidden className="h-3.5 w-3.5" />
                        </span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside aria-label="Prix et propriétaire" className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-3xl bg-white p-6 shadow-carte-haut ring-1 ring-slate-200/70">
                <p className="text-sm text-slate-600">{a.transaction === 'LOCATION' ? 'Loyer' : 'Prix de vente'}</p>
                <p className="font-titre mt-1 text-3xl font-semibold text-nuit-900">
                  {formatFcfa(a.prix)}
                  {a.transaction === 'LOCATION' && <span className="font-sans text-base font-normal text-slate-500"> / mois</span>}
                </p>

                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nuit-900 text-dore-500">
                    <UserRound aria-hidden className="h-6 w-6" />
                  </span>
                  <dl>
                    <dt className="text-sm text-slate-600">Publié par</dt>
                    <dd className="font-semibold text-nuit-900">{a.proprietaire.nomComplet}</dd>
                  </dl>
                </div>

                <p className="mt-6 rounded-2xl bg-dore-100/70 p-4 text-sm leading-relaxed text-nuit-900">
                  La demande de visite et la messagerie avec le propriétaire ne sont pas encore disponibles : elles arrivent
                  prochainement.
                </p>
              </div>
            </aside>
          </div>

          <BiensSimilaires annonce={a} />
        </article>
      )}
    </div>
  )
}
