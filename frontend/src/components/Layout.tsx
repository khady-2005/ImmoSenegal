import { useState } from 'react'
import BandeauServeurLent from './BandeauServeurLent'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../auth'
import logoImmo from '../assets/logo-immosenegal.png'

const lienDesktop = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
  }`

const lienMobile = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-3 text-base font-medium transition-colors ${
    isActive ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
  }`

function Logo({ taille = 'md' }: { taille?: 'sm' | 'md' }) {
  const h = taille === 'sm' ? 'h-10' : 'h-12'
  return (
    <img
      src={logoImmo}
      alt="ImmoSénégal — Votre rêve, notre priorité"
      className={`${h} w-auto max-w-[200px] object-contain`}
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

      <header className="sticky top-0 z-40 border-b border-white/10 bg-nuit-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-4 px-4 py-2.5">
          <Link to="/" className="shrink-0 rounded-md bg-white/95 px-2 py-1" onClick={fermerMenu} aria-label="ImmoSénégal — accueil">
            <Logo />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 sm:flex">
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
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
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
                  className="rounded-full bg-dore-500 px-4 py-2 text-sm font-bold text-nuit-950 shadow-md transition-colors hover:bg-dore-600"
                >
                  Inscription
                </NavLink>
              </>
            )}
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 sm:hidden"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
          </button>
        </div>

        {menuOuvert && (
          <nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            className="border-t border-white/10 bg-nuit-950 px-4 py-3 sm:hidden"
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
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-base font-medium text-white/90 hover:bg-white/10"
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
            <div className="inline-block rounded-md bg-white/95 px-2 py-1">
              <Logo taille="sm" />
            </div>
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
