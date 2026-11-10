import { useState } from 'react'
import BandeauServeurLent from './BandeauServeurLent'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../auth'
import logoImmo from '../assets/Logo immobilier tropical ImmoSénégal.png'

const lienDesktop = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
    isActive
      ? 'bg-white/15 text-white shadow-sm'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

const lienMobile = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-3 text-base font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'
  }`

function Logo({ taille = 'md' }: { taille?: 'sm' | 'md' }) {
  const h = taille === 'sm' ? 'h-10' : 'h-12 sm:h-13'
  return (
    <img
      src={logoImmo}
      alt="ImmoSénégal — Votre rêve, notre priorité"
      className={`${h} w-auto max-w-[200px] object-contain object-left sm:max-w-[220px]`}
    />
  )
}

export default function Layout() {
  const { utilisateur, deconnecter } = useAuth()
  const [menuOuvert, setMenuOuvert] = useState(false)

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

      <header className="sticky top-0 z-40 bg-nuit-950/95 text-white shadow-md backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-3 px-3 sm:h-[4.5rem] sm:px-5">
          {/* Logo dans un pilule blanche douce */}
          <Link
            to="/"
            onClick={fermerMenu}
            aria-label="ImmoSénégal — accueil"
            className="flex shrink-0 items-center rounded-2xl bg-white px-2.5 py-1.5 shadow-sm transition hover:shadow-md"
          >
            <Logo />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 sm:flex">
            <NavLink to="/" end className={lienDesktop}>
              Accueil
            </NavLink>
            <NavLink to="/catalogue" className={lienDesktop}>
              Catalogue
            </NavLink>
            {utilisateur ? (
              <>
                <NavLink to="/tableau-de-bord" className={lienDesktop}>
                  Mon espace
                </NavLink>
                <button
                  type="button"
                  onClick={deconnecter}
                  className="ml-1 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
                  className="ml-1 rounded-full bg-gradient-to-r from-dore-500 to-dore-600 px-4 py-1.5 text-sm font-bold text-nuit-950 shadow-sm transition hover:from-dore-600 hover:to-dore-500"
                >
                  Inscription
                </NavLink>
              </>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl p-2 text-white hover:bg-white/10 sm:hidden"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
          </button>
        </div>

        {/* Fine ligne dorée sous le header */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-dore-500/80 to-transparent" aria-hidden />

        {menuOuvert && (
          <nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            className="border-t border-white/10 bg-nuit-950 px-3 py-3 sm:hidden"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <NavLink to="/" end className={lienMobile} onClick={fermerMenu}>
                  Accueil
                </NavLink>
              </li>
              <li>
                <NavLink to="/catalogue" className={lienMobile} onClick={fermerMenu}>
                  Catalogue
                </NavLink>
              </li>
              {utilisateur ? (
                <>
                  <li>
                    <NavLink to="/tableau-de-bord" className={lienMobile} onClick={fermerMenu}>
                      Mon espace
                    </NavLink>
                  </li>
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
                  <li className="pt-1">
                    <NavLink
                      to="/inscription"
                      onClick={fermerMenu}
                      className="block rounded-full bg-dore-500 px-3 py-3 text-center text-base font-bold text-nuit-950 hover:bg-dore-600"
                    >
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

      <footer className="bg-nuit-950 text-sm text-nuit-100/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="inline-flex items-center rounded-2xl bg-white px-2.5 py-1.5 shadow-sm"
            >
              <Logo taille="sm" />
            </Link>
            <p className="mt-3 max-w-xs">
              Maisons, appartements, studios, villas et terrains à louer ou à acheter, partout au Sénégal.
            </p>
          </div>
          <nav aria-label="Pied de page : explorer">
            <p className="font-semibold text-white">Explorer</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/catalogue" className="hover:text-white hover:underline">
                  Tous les logements
                </Link>
              </li>
              <li>
                <Link to="/catalogue?transaction=LOCATION" className="hover:text-white hover:underline">
                  Logements à louer
                </Link>
              </li>
              <li>
                <Link to="/catalogue?transaction=VENTE" className="hover:text-white hover:underline">
                  Logements à acheter
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Pied de page : compte">
            <p className="font-semibold text-white">Compte</p>
            <ul className="mt-3 space-y-2">
              {utilisateur ? (
                <li>
                  <Link to="/tableau-de-bord" className="hover:text-white hover:underline">
                    Tableau de bord
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link to="/connexion" className="hover:text-white hover:underline">
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link to="/inscription" className="hover:text-white hover:underline">
                      Créer un compte
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">
          <p>© {new Date().getFullYear()} ImmoSénégal – projet de mémoire L3 Ingénierie Informatique, UASZ</p>
        </div>
      </footer>
    </div>
  )
}
