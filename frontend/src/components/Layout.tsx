import { useEffect, useState } from 'react'
import BandeauServeurLent from './BandeauServeurLent'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { LogOut, MapPin, Menu, PlusCircle, X } from 'lucide-react'
import { useAuth } from '../auth'
import { LogoComplet, Marque } from './Logo'
import CentreNotifications from './CentreNotifications'

const lienDesktop = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors ${
    isActive
      ? 'text-dore-400 after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-dore-400'
      : 'text-white/85 hover:text-dore-300'
  }`

const lienMobile = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-3 text-base font-medium transition-colors ${
    isActive ? 'bg-white/10 text-dore-300' : 'text-white/90 hover:bg-white/10 hover:text-dore-300'
  }`

const boutonPublier =
  'inline-flex items-center gap-1.5 rounded-full bg-dore-500 px-4 py-2 text-[0.95rem] font-semibold text-nuit-950 shadow-sm transition-all hover:bg-dore-600 hover:shadow-md active:scale-[0.98]'

export default function Layout() {
  const { utilisateur, deconnecter } = useAuth()
  const peutPublier = utilisateur?.role === 'PROPRIETAIRE' || utilisateur?.role === 'ADMIN'
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [defile, setDefile] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 8)
    surDefilement()
    window.addEventListener('scroll', surDefilement, { passive: true })
    return () => window.removeEventListener('scroll', surDefilement)
  }, [])

  useEffect(() => {
    setMenuOuvert(false)
    document.body.classList.toggle('fond-pages', pathname !== '/')
    window.scrollTo?.(0, 0)
  }, [pathname])

  const fermerMenu = () => setMenuOuvert(false)
  const deconnecterEtFermer = () => {
    fermerMenu()
    deconnecter()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-dore-500 focus:px-4 focus:py-2 focus:text-nuit-950"
      >
        Aller au contenu
      </a>

      <header
        className={`sticky top-0 z-40 border-b border-dore-500/40 bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 text-white transition-shadow ${
          defile ? 'shadow-[0_10px_30px_-12px_rgb(2_12_27/0.65)]' : ''
        }`}
      >
        {/* Logo compact recadré pour l’en-tête */}
        <div className="mx-auto flex min-h-[5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[5.25rem] sm:px-6 lg:px-8">
          <Link to="/" onClick={fermerMenu} aria-label="ImmoSénégal : accueil" className="shrink-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dore-400">
            <Marque taille="md" sombre />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 xl:flex">
            <NavLink to="/" end className={lienDesktop}>Accueil</NavLink>
            <NavLink to="/catalogue" className={lienDesktop}>Catalogue</NavLink>
            <NavLink to="/carte" className={lienDesktop}>Carte</NavLink>
            <NavLink to="/assistant" className={lienDesktop}>Assistant</NavLink>
            {utilisateur && <NavLink to="/rejoindre-agence" className={lienDesktop}>Rejoindre une agence</NavLink>}
            <Link to="/a-propos" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-white/85 transition hover:text-dore-300">À propos</Link>
            <Link to="/faq" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-white/85 transition hover:text-dore-300">FAQ</Link>
            <Link to="/contact" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-white/85 transition hover:text-dore-300">Contact</Link>
            {utilisateur ? (
              <>
                <NavLink to="/mes-favoris" className={lienDesktop}>Mes favoris</NavLink>
                <NavLink to="/messagerie" className={lienDesktop}>Messagerie</NavLink>
                <NavLink to="/tableau-de-bord" className={lienDesktop}>
                  Mon espace
                </NavLink>
                <CentreNotifications />
                {peutPublier && (
                  <Link to="/annonces/nouvelle" className={`${boutonPublier} ml-2`}>
                    <PlusCircle aria-hidden className="h-4 w-4" />
                    Publier une annonce
                  </Link>
                )}
                <button
                  type="button"
                  onClick={deconnecter}
                  className="ml-1 flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.95rem] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-dore-300"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <NavLink to="/connexion" className={lienDesktop}>
                  Connexion
                </NavLink>
                <NavLink
                  to="/inscription"
                  className="ml-1 rounded-full border-2 border-[#ffe28a] bg-[#ffc928] px-4 py-2 text-[0.95rem] font-extrabold text-[#102b49] shadow-[0_2px_10px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#ffdc72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Inscription
                </NavLink>

              </>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-2 text-white transition-colors hover:bg-white/10 xl:hidden"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
          </button>
        </div>

        <div className="h-1 bg-gradient-to-r from-transparent via-dore-400 to-transparent" aria-hidden />

        {menuOuvert && (
          <nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            className="max-h-[calc(100dvh-5.25rem)] overflow-y-auto border-t border-white/10 bg-nuit-900 px-3 py-3 shadow-lg xl:hidden"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <NavLink to="/" end className={lienMobile} onClick={fermerMenu}>
                  Accueil
                </NavLink>
              </li>
              <li><NavLink to="/catalogue" className={lienMobile} onClick={fermerMenu}>Catalogue</NavLink></li>
              <li><NavLink to="/carte" className={lienMobile} onClick={fermerMenu}>Carte interactive</NavLink></li>
              <li><NavLink to="/assistant" className={lienMobile} onClick={fermerMenu}>Assistant immobilier</NavLink></li>
              {utilisateur && <li><NavLink to="/rejoindre-agence" className={lienMobile} onClick={fermerMenu}>Rejoindre une agence</NavLink></li>}
              <li><Link to="/a-propos" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-white/90 hover:bg-white/10 hover:text-dore-300" onClick={fermerMenu}>À propos</Link></li>
              <li><Link to="/faq" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-white/90 hover:bg-white/10 hover:text-dore-300" onClick={fermerMenu}>FAQ</Link></li>
              <li><Link to="/contact" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-white/90 hover:bg-white/10 hover:text-dore-300" onClick={fermerMenu}>Contact</Link></li>
              {utilisateur ? (
                <>
                  <li><NavLink to="/mes-favoris" className={lienMobile} onClick={fermerMenu}>Mes favoris</NavLink></li>
                  <li><NavLink to="/messagerie" className={lienMobile} onClick={fermerMenu}>Messagerie</NavLink></li>
                  <li>
                    <NavLink to="/tableau-de-bord" className={lienMobile} onClick={fermerMenu}>
                      Mon espace
                    </NavLink>
                  </li>
                  <li className="px-3 py-2"><CentreNotifications /></li>
                  {peutPublier && (
                    <li className="pt-2">
                      <Link to="/annonces/nouvelle" onClick={fermerMenu} className={`${boutonPublier} w-full justify-center py-3 text-base`}>
                        <PlusCircle aria-hidden className="h-5 w-5" />
                        Publier une annonce
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={deconnecterEtFermer}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-white/90 hover:bg-white/10"
                    >
                      <LogOut aria-hidden className="h-5 w-5" />
                      Déconnexion
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <NavLink to="/connexion" className={lienMobile} onClick={fermerMenu}>
                      Connexion
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/inscription" className="block rounded-xl border border-[#ffe28a] bg-[#ffc928] px-3 py-3 text-base font-extrabold text-[#102b49] shadow-sm transition-colors hover:bg-[#ffdc72]" onClick={fermerMenu}>
                      Inscription
                    </NavLink>
                  </li>

                </>
              )}
            </ul>
          </nav>
        )}
      </header>

      <BandeauServeurLent />

      <main id="contenu" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gradient-to-b from-nuit-900 to-nuit-950 text-sm text-white/75">
        <div className="h-px bg-gradient-to-r from-transparent via-dore-500/70 to-transparent" aria-hidden />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/" className="inline-flex rounded-2xl bg-white p-3 shadow-lg" aria-label="ImmoSénégal : accueil">
              <LogoComplet className="h-24" />
            </Link>
            <p className="mt-4 max-w-xs leading-relaxed">
              La plateforme immobilière du Sénégal : maisons, appartements, studios, villas et terrains à louer ou à acheter.
            </p>
          </div>

          <nav aria-label="Pied de page : explorer">
            <p className="font-semibold text-white">Explorer</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link to="/catalogue" className="transition-colors hover:text-white hover:underline">
                  Tous les logements
                </Link>
              <li>
                <Link to="/carte" className="transition-colors hover:text-white hover:underline">
                  Carte des biens
                </Link>
              </li>
              </li>
              <li>
                <Link to="/catalogue?transaction=LOCATION" className="transition-colors hover:text-white hover:underline">
                  Logements à louer
                </Link>
              </li>
              <li>
                <Link to="/catalogue?transaction=VENTE" className="transition-colors hover:text-white hover:underline">
                  Logements à acheter
                </Link>
              </li>
              <li>
                <Link to="/catalogue?type=TERRAIN" className="transition-colors hover:text-white hover:underline">
                  Terrains
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Pied de page : services">
            <p className="font-semibold text-white">Services</p>
            <ul className="mt-4 space-y-2.5">
              {peutPublier && (
                <li>
                  <Link to="/annonces/nouvelle" className="transition-colors hover:text-white hover:underline">
                    Publier une annonce
                  </Link>
                </li>
              )}
              {utilisateur ? (
                <li>
                  <Link to="/tableau-de-bord" className="transition-colors hover:text-white hover:underline">
                    Tableau de bord
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link to="/connexion" className="transition-colors hover:text-white hover:underline">
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link to="/inscription" className="transition-colors hover:text-white hover:underline">
                      Créer un compte
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          <div>
            <p className="font-semibold text-white">Contact</p>
            <ul className="mt-4 space-y-2.5">
              <li className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-dore-500" />
                Ziguinchor, Sénégal
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs sm:flex-row">
            <p>© {new Date().getFullYear()} ImmoSénégal. Projet de mémoire de Licence 3 Ingénierie Informatique, UASZ.</p>
            <Link to="/mentions-legales" className="transition-colors hover:text-white hover:underline">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
