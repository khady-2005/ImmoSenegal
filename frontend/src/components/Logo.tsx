import logoComplet from '../assets/logo-immosenegal.webp'
import logoEmbleme from '../assets/logo-embleme.webp'

/**
 * Logo compact pour l'en-tête : emblème circulaire lumineux et nom de la plateforme.
 * La version complète reste utilisée dans le pied de page et les pages de connexion.
 */
export function Marque({ taille = 'md', sombre = false }: { taille?: 'md' | 'sm'; sombre?: boolean }) {
  const grand = taille === 'md'
  return (
    <span className="flex items-center gap-2">
      <span
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-emerald-300/90 shadow-[0_0_7px_rgba(16,185,129,0.45),0_0_15px_rgba(16,185,129,0.22)] ${grand ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-8 w-8'}`}
      >
        <img
          src={logoEmbleme}
          alt=""
          width={520}
          height={311}
          className="h-full w-full rounded-full object-cover object-center"
        />
      </span>
      <span className="leading-none">
        <span className={`font-marque block font-extrabold tracking-tight ${grand ? 'text-[1.2rem] sm:text-[1.35rem]' : 'text-lg'}`}>
          <span className={sombre ? 'text-white' : 'text-nuit-900'}>Immo</span>
          <span className={sombre ? 'text-emeraude-400' : 'text-emeraude-700'}>Sénégal</span>
        </span>
        <span className={`mt-1 hidden text-[0.68rem] italic sm:block ${sombre ? 'text-nuit-100/80' : 'text-slate-600'}`}>
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
