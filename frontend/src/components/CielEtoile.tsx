import type { CSSProperties } from 'react'

/** Étoiles de l'accueil : elles apparaissent quand le ciel s'assombrit. Décoratif, masqué aux lecteurs d'écran. */

function hasard(graine: number) {
  let a = graine
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Etoile = { x: number; y: number; r: number; o: number; delai: number }

const etoiles: Etoile[] = (() => {
  const alea = hasard(77)
  return Array.from({ length: 70 }, () => {
    // Plus denses en haut, plus rares vers l'horizon.
    const y = Math.pow(alea(), 1.6) * 330 + 12
    // Le texte occupe la gauche : on garde cette zone presque vide, sauf une bande tout en haut.
    const gauche = alea() < 0.15
    const x = gauche ? alea() * 560 : 560 + alea() * 880
    return {
      x: Math.round(x),
      y: Math.round(gauche ? Math.min(y, 40) : y),
      r: Number((0.7 + alea() * 0.9).toFixed(2)),
      o: Number((0.35 + alea() * 0.4).toFixed(2)),
      delai: Number((2.6 + alea() * 4).toFixed(2)),
    }
  })
})()

export default function CielEtoile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      {etoiles.map((e) => (
        <circle
          key={`${e.x}-${e.y}`}
          className="etoile"
          cx={e.x}
          cy={e.y}
          r={e.r}
          fill="#fff"
          style={{ '--o': e.o, '--delai': `${e.delai}s` } as CSSProperties}
        />
      ))}
    </svg>
  )
}
