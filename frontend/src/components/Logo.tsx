import logoComplet from '../assets/logo-immosenegal.webp'
import logoEmbleme from '../assets/logo-embleme.webp'

/**
 * Logo compact pour l'en-tête : emblème circulaire lumineux et nom de la plateforme.
 * La version complète reste utilisée dans le pied de page et les pages de connexion.
 */
export function Marque({ taille = 'md', sombre = false }: { taille?: 'md' | 'sm'; sombre?: boolean }) {
  const grand = taille === 'md'
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-dore-400/90 shadow-[0_0_8px_rgba(245,190,70,0.35),0_0_16px_rgba(245,190,70,0.18)] ${grand ? 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] lg:h-20 lg:w-20' : 'h-8 w-8'}`}
      >
        <img
          src={logoEmbleme}
          alt=""
          width={520}
          height={311}
          className="h-full w-full rounded-full object-cover object-center scale-[1.08]"
        />
      </span>
      <span className="leading-none">
        <span className={`font-marque block font-extrabold tracking-tight ${grand ? 'text-[1.7rem] sm:text-[1.9rem] lg:text-[2.05rem]' : 'text-lg'}`}>
          <span className={sombre ? 'text-white' : 'text-nuit-900'}>Immo</span>
          <span className={sombre ? 'text-dore-400' : 'text-nuit-900'}>Sénégal</span>
        </span>
        <span className={`mt-1.5 hidden text-[0.78rem] italic sm:block ${sombre ? 'text-nuit-100/80' : 'text-nuit-800'}`}>
          Trouvez, Visitez, Habitez
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
