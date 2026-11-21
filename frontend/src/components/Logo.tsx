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
        <span className={`block whitespace-nowrap font-marque font-black tracking-[-0.075em] antialiased drop-shadow-[0_2px_8px_rgba(0,0,0,0.22)] ${grand ? 'text-[1.85rem] sm:text-[2.05rem] lg:text-[2.2rem]' : 'text-lg'}`}>
          <span className={`font-black ${sombre ? 'text-[#f4f8ff]' : 'text-nuit-900'}`}>Immo</span><span className={`ml-1 font-black ${sombre ? 'bg-gradient-to-r from-[#ffe58a] via-[#ffc928] to-[#e9a900] bg-clip-text text-transparent' : 'text-[#c58a00]'}`}>Sénégal</span>
        </span>
        <span aria-hidden className={`mt-1.5 block h-[3px] w-[78%] rounded-full bg-gradient-to-r from-dore-400 via-dore-500 to-transparent ${grand ? 'opacity-95' : 'opacity-70'}`} />
        <span className={`mt-1.5 hidden text-[0.72rem] font-semibold tracking-[0.13em] sm:block ${sombre ? 'text-white/85' : 'text-nuit-800'}`}>
          TROUVEZ · VISITEZ · HABITEZ
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
