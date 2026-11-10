import BandeauServeurLent from './BandeauServeurLent'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Building2, LogOut } from 'lucide-react'
import { useAuth } from '../auth'

const lienClasse = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-semibold transition-all sm:px-3 ${
    isActive ? 'bg-white/15 text-white' : 'text-nuit-100 hover:bg-white/10 hover:text-white'
  }`

export default function Layout() {
  const { utilisateur, deconnecter } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-dore-500 focus:px-4 focus:py-2 focus:text-nuit-950"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#091a31]/95 text-white shadow-[0_8px_30px_rgba(4,16,34,0.18)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <svg aria-hidden viewBox="0 0 48 48" className="h-9 w-9 shrink-0 drop-shadow-[0_3px_8px_rgba(217,170,69,0.22)]" fill="none">
              <path d="M5 21.5 24 6l19 15.5" stroke="#D9AA45" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 20v21h28V20" stroke="#0A9A70" strokeWidth="2.8" strokeLinejoin="round"/>
              <path d="M19 41V27h10v14" stroke="#D9AA45" strokeWidth="2.8" strokeLinejoin="round"/>
              <path d="M15 25h3M31 25h3" stroke="#0A9A70" strokeWidth="2.4" strokeLinecap="round"/>
              <path d="M24 6v-3" stroke="#D9AA45" strokeWidth="2.8" strokeLinecap="round"/>
            </svg>
            <span>
              Immo<span className="text-dore-500">Sénégal</span>
            </span>
          </Link>
          <nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={(e) => `${lienClasse(e)} hidden sm:inline-block`}>
              Accueil
            </NavLink>
            <NavLink to="/catalogue" className={lienClasse}>
              Catalogue
            </NavLink>
            {utilisateur ? (
              <>
                <NavLink to="/tableau-de-bord" className={lienClasse}>
                  Mon espace
                </NavLink>
                <button
                  type="button"
                  onClick={deconnecter}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-nuit-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <NavLink to="/connexion" className={lienClasse}>
                  Connexion
                </NavLink>
                <NavLink to="/inscription" className="rounded-xl bg-gradient-to-r from-[#e7bd62] to-[#d9a53d] px-4 py-2.5 text-sm font-bold text-[#10213a] shadow-lg shadow-[#d9aa45]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                  Inscription
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <BandeauServeurLent />

      <main id="contenu" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#071426] text-sm text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-white">
              <svg aria-hidden viewBox="0 0 48 48" className="h-8 w-8 shrink-0 drop-shadow-[0_3px_8px_rgba(217,170,69,0.22)]" fill="none">
              <path d="M5 21.5 24 6l19 15.5" stroke="#D9AA45" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 20v21h28V20" stroke="#0A9A70" strokeWidth="2.8" strokeLinejoin="round"/>
              <path d="M19 41V27h10v14" stroke="#D9AA45" strokeWidth="2.8" strokeLinejoin="round"/>
              <path d="M15 25h3M31 25h3" stroke="#0A9A70" strokeWidth="2.4" strokeLinecap="round"/>
              <path d="M24 6v-3" stroke="#D9AA45" strokeWidth="2.8" strokeLinecap="round"/>
            </svg>
              <span>
                Immo<span className="text-dore-500">Sénégal</span>
              </span>
            </p>
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
