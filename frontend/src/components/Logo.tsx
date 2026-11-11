import logoComplet from '../assets/logo-immosenegal.webp'
import logoEmbleme from '../assets/logo-embleme.webp'

/**
 * Le logo ImmoSénégal, en deux versions :
 *  - `Marque` : emblème circulaire + nom, pour l'en-tête ;
 *  - `LogoComplet` : logo entier pour pied de page / auth.
 */
export function Marque({ taille = 'md', sombre = false }: { taille?: 'md' | 'sm'; sombre?: boolean }) {
  const grand = taille === 'md'
  const tailleCercle = grand ? 'h-12 w-12 sm:h-14 sm:w-14' : 'h-10 w-10'
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-dore-500/80 ${tailleCercle}`}
      >
        <img
          src={logoEmbleme}
          alt=""
          width={520}
          height={311}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="leading-none">
        <span
          className={`font-marque block font-extrabold tracking-tight ${grand ? 'text-[1.35rem] sm:text-[1.55rem]' : 'text-xl'}`}
        >
          <span className={sombre ? 'text-white' : 'text-nuit-900'}>Immo</span>
          <span className={sombre ? 'text-emeraude-500' : 'text-emeraude-600'}>Sénégal</span>
        </span>
        <span
          className={`mt-1 hidden text-[0.72rem] italic sm:block ${sombre ? 'text-nuit-100/80' : 'text-slate-600'}`}
        >
          Votre rêve, notre priorité
        </span>
      </span>
    </span>
  )
}

export function LogoComplet({ className = 'h-28' }: { className?: string }) {
  return (
    <img
      src={logoComplet}
      alt="ImmoSénégal — Votre rêve, notre priorité"
      width={960}
      height={682}
      className={`${className} w-auto`}
    />
  )
}
