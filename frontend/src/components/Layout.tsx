import { useEffect, useState } from 'react'
import BandeauServeurLent from './BandeauServeurLent'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { LogOut, MapPin, Menu, PlusCircle, X } from 'lucide-react'
import { useAuth } from '../auth'
import { LogoComplet, Marque } from './Logo'

const lienDesktop = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-full px-3.5 py-2 text-[0.95rem] font-medium transition-colors ${
    isActive
      ? 'text-emeraude-600 after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-dore-500'
      : 'text-nuit-900/80 hover:text-emeraude-700'
  }`

const lienMobile = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-3 text-base font-medium transition-colors ${
    isActive ? 'bg-emeraude-50 text-emeraude-800' : 'text-nuit-900/85 hover:bg-emeraude-50 hover:text-emeraude-900'
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
        className={`sticky top-0 z-40 border-b border-emerald-100 bg-white text-nuit-900 transition-shadow ${
          defile ? 'border-emeraude-200 shadow-[0_8px_28px_-14px_rgb(6_59_43/0.18)]' : 'border-emerald-100'
        }`}
      >
        {/* Logo collé à gauche : peu de padding à gauche */}
        <div className="mx-auto flex h-[6rem] max-w-6xl items-center justify-between gap-3 pl-2 pr-3 sm:h-[6.25rem] sm:pl-3 sm:pr-4 lg:h-[6.75rem]">
          <Link
            to="/"
            onClick={fermerMenu}
            aria-label="ImmoSénégal : accueil"
            className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dore-500"
          >
            <Marque />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 xl:flex">
            <NavLink to="/" end className={lienDesktop}>Accueil</NavLink>
            <NavLink to="/catalogue" className={lienDesktop}>Catalogue</NavLink>
            <Link to="/#avantages" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-nuit-900/80 transition hover:text-emeraude-700">À propos</Link>
            <Link to="/faq" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-nuit-900/80 transition hover:text-emeraude-700">FAQ</Link>
            <Link to="/contact" className="rounded-full px-3 py-2 text-[0.95rem] font-medium text-nuit-900/80 transition hover:text-emeraude-700">Contact</Link>
            {utilisateur ? (
              <>
                <NavLink to="/tableau-de-bord" className={lienDesktop}>
                  Mon espace
                </NavLink>
                {peutPublier && (
                  <Link to="/annonces/nouvelle" className={`${boutonPublier} ml-2`}>
                    <PlusCircle aria-hidden className="h-4 w-4" />
                    Publier une annonce
                  </Link>
                )}
                <button
                  type="button"
                  onClick={deconnecter}
                  className="ml-1 flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.95rem] font-medium text-nuit-900/80 transition-colors hover:bg-emeraude-50 hover:text-emeraude-800"
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
                  className="ml-1 rounded-full border border-dore-500/70 bg-dore-500 px-4 py-2 text-[0.95rem] font-bold text-nuit-950 transition-colors hover:bg-dore-600"
                >
                  Inscription
                </NavLink>

              </>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-2 text-nuit-900 transition-colors hover:bg-emeraude-50 xl:hidden"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
          </button>
        </div>

        <div className="h-1 bg-gradient-to-r from-emerald-100 via-emeraude-500 to-emerald-100" aria-hidden />

        {menuOuvert && (
          <nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            className="max-h-[calc(100dvh-6.25rem)] overflow-y-auto border-t border-emerald-100 bg-white px-3 py-3 shadow-lg xl:hidden"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <NavLink to="/" end className={lienMobile} onClick={fermerMenu}>
                  Accueil
                </NavLink>
              </li>
              <li><NavLink to="/catalogue" className={lienMobile} onClick={fermerMenu}>Catalogue</NavLink></li>
              <li><Link to="/#avantages" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-nuit-900/85 hover:bg-emeraude-50 hover:text-emeraude-900" onClick={fermerMenu}>À propos</Link></li>
              <li><Link to="/faq" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-nuit-900/85 hover:bg-emeraude-50 hover:text-emeraude-900" onClick={fermerMenu}>FAQ</Link></li>
              <li><Link to="/contact" className="block rounded-xl px-3 py-3 text-base font-medium transition-colors text-nuit-900/85 hover:bg-emeraude-50 hover:text-emeraude-900" onClick={fermerMenu}>Contact</Link></li>
              {utilisateur ? (
                <>
                  <li>
                    <NavLink to="/tableau-de-bord" className={lienMobile} onClick={fermerMenu}>
                      Mon espace
                    </NavLink>
                  </li>
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-base font-medium text-nuit-900/85 hover:bg-emeraude-50"
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
                    <NavLink to="/inscription" className={lienMobile} onClick={fermerMenu}>
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

      <footer className="bg-gradient-to-b from-nuit-900 to-nuit-950 text-sm text-emerald-100/85">
        <div className="h-px bg-gradient-to-r from-transparent via-emeraude-500/70 to-transparent" aria-hidden />
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

        <div className="border-t border-emerald-100">
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
