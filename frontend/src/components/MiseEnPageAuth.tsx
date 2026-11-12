import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, UserCheck, Wallet } from 'lucide-react'
import { LogoComplet } from './Logo'
import photo from '../assets/hero-villa.webp'

/** Mise en page commune de la connexion et de l'inscription : le formulaire d'un côté, la promesse de la marque de l'autre. */
export default function MiseEnPageAuth({ titre, intro, children, pied }: { titre: string; intro: ReactNode; children: ReactNode; pied: ReactNode }) {
  return (
    <div className="grid lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[1fr_1.05fr]">
      <div className="relative isolate hidden overflow-hidden text-white lg:block">
        <img src={photo} alt="" width={1600} height={1008} className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-nuit-950/90 via-nuit-950/45 to-nuit-950/30" />
        <div className="flex h-full flex-col justify-end p-12">
          <p className="font-titre max-w-[16ch] text-5xl font-medium leading-[1.05]">Votre rêve, notre priorité.</p>
          <ul className="mt-8 space-y-4 text-nuit-100">
            <li className="flex items-center gap-3">
              <UserCheck aria-hidden className="h-5 w-5 shrink-0 text-dore-500" />
              Chaque annonce est examinée par un administrateur.
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-dore-500" />
              Votre mot de passe est chiffré, jamais lisible.
            </li>
            <li className="flex items-center gap-3">
              <Wallet aria-hidden className="h-5 w-5 shrink-0 text-dore-500" />
              Créer un compte est gratuit.
            </li>
          </ul>
          <p className="absolute right-4 top-4 text-xs text-white/70">Image illustrative</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md">
          <Link to="/" aria-label="ImmoSénégal : accueil" className="mx-auto block w-fit">
            <LogoComplet className="h-24 sm:h-28" />
          </Link>
          <h1 className="font-titre mt-6 text-center text-3xl font-medium text-nuit-900">{titre}</h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-slate-600">{intro}</p>
          <div className="mt-7 rounded-3xl bg-white/88 p-6 shadow-carte backdrop-blur-sm ring-1 ring-slate-200/70 sm:p-8">{children}</div>
          <p className="mt-5 text-center text-sm text-slate-600">{pied}</p>
        </div>
      </div>
    </div>
  )
}
