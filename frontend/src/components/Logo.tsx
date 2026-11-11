import logoComplet from '../assets/logo-immosenegal.webp'
import logoEmbleme from '../assets/logo-embleme.webp'

/**
 * Le logo ImmoSénégal, en deux versions :
 *  - `Marque` : version compacte (emblème + nom écrit), pour l'en-tête ;
 *  - `LogoComplet` : le logo entier, pour pied de page / connexion.
 */
export function Marque({ taille = 'md', sombre = false }: { taille?: 'md' | 'sm'; sombre?: boolean }) {
  const grand = taille === 'md'
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={logoEmbleme}
        alt=""
        width={520}
        height={311}
        className={`${grand ? 'h-11 sm:h-12' : 'h-9'} w-auto rounded-xl object-cover shadow-sm ring-1 ring-emeraude-200`}
      />
      <span className="leading-none">
        <span
          className={`font-marque block font-extrabold tracking-tight ${grand ? 'text-[1.4rem] sm:text-[1.6rem]' : 'text-xl'}`}
        >
          <span className={sombre ? 'text-white' : 'text-nuit-900'}>Immo</span>
          <span className={sombre ? 'text-emeraude-400' : 'text-emeraude-700'}>Sénégal</span>
        </span>
        <span
          className={`mt-1 hidden text-[0.72rem] italic sm:block ${sombre ? 'text-nuit-100/80' : 'text-slate-600'}`}
        >
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
