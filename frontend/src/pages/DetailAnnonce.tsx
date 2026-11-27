import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Check, Home, MapPin, Navigation, Ruler, UserRound, Tag } from 'lucide-react'
import { useApi } from '../useApi'
import { useAuth } from '../auth'
import { formatFcfa } from '../format'
import { libelleStatut, libelleTypeBien, type Annonce } from '../types'
import { Chargement, MessageErreur } from '../components/ListeAnnonces'
import AnnonceCard from '../components/AnnonceCard'
import { useAnnonces } from '../components/useAnnonces'
import Galerie from '../components/Galerie'
import DemandeVisiteForm from '../components/DemandeVisiteForm'
import DemandeReservationForm from '../components/DemandeReservationForm'
import AvisAnnonce from '../components/AvisAnnonce'
import OffreAchatForm from '../components/OffreAchatForm'
import OffreLocationForm from '../components/OffreLocationForm'
import LecteurVideoAnnonce from '../components/LecteurVideoAnnonce'

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
      <h2 id="titre-similaires" className="font-titre text-2xl font-bold !text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] sm:text-3xl">
        Biens similaires
      </h2>
      <p className="mt-1 font-medium !text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
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
  const { jeton, utilisateur } = useAuth()
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
          <Galerie annonce={a} />
          <LecteurVideoAnnonce annonceId={a.id} />

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
            <div>
              <p className="text-sm font-medium text-emeraude-700">
                {libelleTypeBien[a.typeBien]} · {libelleStatut[a.statut]}
              </p>
              <h1 className="font-titre mt-1 text-3xl font-medium leading-tight text-nuit-900 sm:text-4xl">{a.titre}</h1>
              <p className="mt-2 flex items-center gap-1.5 !text-white">
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
                <section className="mt-10 rounded-2xl border border-white/20 bg-nuit-950/90 p-5 text-white shadow-xl backdrop-blur-sm" aria-labelledby="titre-description">
                  <h2 id="titre-description" className="font-titre text-2xl font-bold !text-white">Description</h2>
                  <p className="mt-3 max-w-[68ch] whitespace-pre-line leading-relaxed !text-white">{a.description}</p>
                </section>
              )}

              {a.equipements.length > 0 && (
                <section className="mt-10 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur-sm" aria-labelledby="titre-equipements">
                  <h2 id="titre-equipements" className="font-titre text-2xl font-bold text-nuit-900">Équipements</h2>
                  <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {a.equipements.map((e) => (
                      <li key={e} className="flex items-center gap-2.5 font-medium text-slate-800">
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

                <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nuit-900 text-dore-500">
                    <UserRound aria-hidden className="h-6 w-6" />
                  </span>
                  <dl className="space-y-1.5 text-sm">
                    <div>
                      <dt className="text-slate-500">Propriétaire</dt>
                      <dd className="font-semibold text-nuit-900">{a.proprietaire.nomComplet}</dd>
                    </div>
                    {a.diffuseur && (
                      <div>
                        <dt className="text-slate-500">Diffuseur</dt>
                        <dd className="font-semibold text-nuit-900">
                          <Link to={`/agences/${a.diffuseur.agenceSlug}`} className="hover:underline">
                            {a.diffuseur.agenceNom}
                          </Link>{' '}
                          {a.diffuseur.type === 'INTERNE' ? '(Agence ImmoSénégal)' : '(Agence partenaire)'}
                        </dd>
                      </div>
                    )}
                    {a.gestionnaire && (
                      <div>
                        <dt className="text-slate-500">Gestionnaire</dt>
                        <dd className="font-semibold text-nuit-900">
                          <Link to={`/agences/${a.gestionnaire.agenceSlug}`} className="hover:underline">
                            {a.gestionnaire.agenceNom}
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {utilisateur?.role === 'CLIENT' && <DemandeVisiteForm annonceId={a.id} />}
                {utilisateur?.role === 'CLIENT' && <DemandeReservationForm annonceId={a.id} />}
                {utilisateur?.role === 'CLIENT' && a.transaction === 'VENTE' && <OffreAchatForm annonceId={a.id} prix={a.prix} />}
                {utilisateur?.role === 'CLIENT' && a.transaction === 'LOCATION' && <OffreLocationForm annonceId={a.id} loyer={a.prix} />}
                {!utilisateur && <p className="mt-6 rounded-2xl bg-dore-100/70 p-4 text-sm leading-relaxed text-nuit-900">Connectez-vous avec un compte client pour demander une visite de ce bien.</p>}
                {(utilisateur?.role === 'PROPRIETAIRE' || utilisateur?.role === 'ADMIN') && <p className="mt-6 rounded-2xl bg-dore-100 p-4 text-sm leading-relaxed text-nuit-900">Les demandes de visite reçues pour vos annonces sont accessibles depuis votre tableau de bord.</p>}
              </div>
            </aside>
          </div>

          <section className="mt-12" aria-labelledby="titre-localisation">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur-sm">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Préparer votre visite</p>
                <h2 id="titre-localisation" className="font-titre mt-1 text-2xl font-bold text-nuit-900 sm:text-3xl">Localisation du logement</h2>
                <p className="mt-2 flex items-center gap-1.5 font-medium text-slate-700">
                  <MapPin aria-hidden className="h-4 w-4 text-amber-700" />
                  {a.quartier}, {a.ville}{a.adresse ? ` — ${a.adresse}` : ''}
                </p>
              </div>
              {((typeof a.latitude === 'number' && Number.isFinite(a.latitude) && a.latitude >= -90 && a.latitude <= 90 &&
               typeof a.longitude === 'number' && Number.isFinite(a.longitude) && a.longitude >= -180 && a.longitude <= 180) || Boolean(a.adresse || a.quartier || a.ville)) && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${typeof a.latitude === 'number' && Number.isFinite(a.latitude) && typeof a.longitude === 'number' && Number.isFinite(a.longitude) ? `${a.latitude},${a.longitude}` : encodeURIComponent([a.adresse, a.quartier, a.ville, 'Sénégal'].filter(Boolean).join(', '))}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Obtenir l’itinéraire vers ${a.titre} dans Google Maps`}
                  className="inline-flex items-center gap-2 rounded-xl bg-dore-500 px-5 py-3 text-sm font-bold text-nuit-950 transition hover:bg-dore-400"
                >
                  <Navigation aria-hidden className="h-4 w-4" />
                  Obtenir l’itinéraire
                </a>
              )}
            </div>
            {typeof a.latitude === 'number' && typeof a.longitude === 'number' &&
             Number.isFinite(a.latitude) && Number.isFinite(a.longitude) &&
             a.latitude >= -90 && a.latitude <= 90 && a.longitude >= -180 && a.longitude <= 180 ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-carte">
                <iframe
                  title={`Carte de localisation de ${a.titre}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${a.longitude - 0.012}%2C${a.latitude - 0.008}%2C${a.longitude + 0.012}%2C${a.latitude + 0.008}&layer=mapnik&marker=${a.latitude}%2C${a.longitude}`}
                  className="h-[360px] w-full border-0 sm:h-[440px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span>Repère : emplacement indiqué pour ce logement</span>
                  <a href={`https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=16/${a.latitude}/${a.longitude}`} target="_blank" rel="noreferrer" className="font-semibold text-nuit-900 underline">Agrandir la carte</a>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="font-semibold text-nuit-900">Position GPS non renseignée</p>
                <p className="mt-1 text-sm text-slate-600">La carte précise sera affichée dès que les coordonnées GPS de ce logement seront ajoutées à son annonce.</p>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([a.adresse, a.quartier, a.ville, 'Sénégal'].filter(Boolean).join(', '))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-nuit-900 underline"
                >
                  Rechercher cette adresse sur la carte
                </a>
              </div>
            )}
          </section>

          <AvisAnnonce annonceId={a.id} />
          <BiensSimilaires annonce={a} />
        </article>
      )}
    </div>
  )
}
