import type { CSSProperties } from 'react'

/**
 * Illustration originale : un quartier d'immeubles en plein jour, avec un baobab et un palmier au premier plan.
 * Les vitres apparaissent une à une au chargement (animation CSS « fenetre », désactivée si l'utilisateur demande
 * moins d'animations). Purement décorative : masquée aux lecteurs d'écran.
 */

const SOL = 650

type Immeuble = { x: number; l: number; h: number; couleur: string; tour?: boolean; antenne?: boolean; citerne?: boolean }

/** Silhouettes lointaines (sans détail) pour la profondeur. */
const loin: Omit<Immeuble, 'couleur'>[] = [
  { x: 40, l: 120, h: 210 }, { x: 190, l: 140, h: 260 }, { x: 360, l: 110, h: 190 }, { x: 500, l: 150, h: 300 },
  { x: 680, l: 120, h: 240 }, { x: 820, l: 160, h: 340 }, { x: 1000, l: 130, h: 380 }, { x: 1150, l: 150, h: 330 },
  { x: 1310, l: 160, h: 300 },
]

/** Immeubles du plan médian, avec une trame de fenêtres claires. */
const milieu: Omit<Immeuble, 'couleur'>[] = [
  { x: 0, l: 130, h: 170 }, { x: 150, l: 120, h: 230 }, { x: 290, l: 150, h: 200 }, { x: 460, l: 110, h: 280 },
  { x: 590, l: 140, h: 230 }, { x: 750, l: 120, h: 310 }, { x: 890, l: 140, h: 270 }, { x: 1060, l: 110, h: 340 },
  { x: 1190, l: 160, h: 290 }, { x: 1370, l: 120, h: 260 },
]

/** Premier plan : petites maisons colorées à gauche, tours à droite (là où le texte n'est pas). */
const devant: Immeuble[] = [
  { x: -20, l: 150, h: 120, couleur: '#f2c777' },
  { x: 140, l: 120, h: 150, couleur: '#7fc4a8', citerne: true },
  { x: 270, l: 140, h: 110, couleur: '#f6e7c9' },
  { x: 420, l: 130, h: 165, couleur: '#eaa88a' },
  { x: 570, l: 150, h: 240, couleur: '#f4f0e6', tour: true, citerne: true },
  { x: 730, l: 170, h: 330, couleur: '#e3d9c3', tour: true },
  { x: 910, l: 190, h: 470, couleur: '#0f7a5c', tour: true, antenne: true },
  { x: 1110, l: 170, h: 380, couleur: '#f1ece0', tour: true, citerne: true },
  { x: 1290, l: 200, h: 540, couleur: '#12305a', tour: true, antenne: true },
]

function hasard(graine: number) {
  let a = graine
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Vitre = { x: number; y: number; l: number; h: number; delai: number; allumee: boolean }
type Balcon = { x: number; y: number; l: number }

const { vitres, balcons } = (() => {
  const alea = hasard(1966)
  const vitres: Vitre[] = []
  const balcons: Balcon[] = []
  for (const b of devant) {
    const pasX = b.tour ? 34 : 42
    const pasY = b.tour ? 44 : 52
    const l = b.tour ? 18 : 18
    const h = b.tour ? 26 : 24
    const colonnes = Math.max(1, Math.floor((b.l - 20) / pasX))
    const lignes = Math.max(1, Math.floor((b.h - 26) / pasY))
    const largeurUtile = (colonnes - 1) * pasX + l
    const debutX = b.x + (b.l - largeurUtile) / 2
    for (let r = 0; r < lignes; r++) {
      const y = SOL - b.h + 22 + r * pasY
      if (b.tour) balcons.push({ x: b.x, y: y + h + 4, l: b.l })
      for (let c = 0; c < colonnes; c++) {
        const x = debutX + c * pasX
        vitres.push({
          x,
          y,
          l,
          h,
          delai: Number((0.4 + ((x + (b.h - (SOL - y))) / 1700) * 2.6 + alea() * 1.2).toFixed(2)),
          allumee: alea() < (b.couleur === '#12305a' ? 0.4 : 0.1),
        })
      }
    }
  }
  return { vitres, balcons }
})()

const VERT_FEUILLAGE = '#0b3d2e'

export default function ImmeublesJour({ className }: { className?: string }) {
  return (
    <svg
      className={`overflow-visible ${className ?? ''}`}
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="qj-halo">
          <stop offset="0" stopColor="#fff2c2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff2c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="qj-verre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcdf0" />
          <stop offset="1" stopColor="#3f7fae" />
        </linearGradient>
        <pattern id="qj-trame" width="24" height="32" patternUnits="userSpaceOnUse">
          <rect x="7" y="9" width="9" height="14" rx="1" fill="#ffffff" opacity="0.38" />
        </pattern>
      </defs>

      {/* Soleil et nuages */}
      <circle cx="1170" cy="130" r="230" fill="url(#qj-halo)" />
      <circle cx="1170" cy="130" r="56" fill="#fff6d6" />
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="300" cy="120" rx="90" ry="22" />
        <ellipse cx="350" cy="104" rx="60" ry="22" />
        <ellipse cx="700" cy="70" rx="80" ry="18" />
        <ellipse cx="740" cy="58" rx="50" ry="18" />
        <ellipse cx="930" cy="170" rx="70" ry="16" />
      </g>

      <g fill="#c7e0ee">
        {loin.map((b) => (
          <rect key={`l${b.x}`} x={b.x} y={SOL - b.h} width={b.l} height={b.h + 30} />
        ))}
      </g>

      <g>
        {milieu.map((b) => (
          <g key={`m${b.x}`}>
            <rect x={b.x} y={SOL - b.h} width={b.l} height={b.h + 30} fill="#9fc2da" />
            <rect x={b.x} y={SOL - b.h} width={b.l} height={b.h + 30} fill="url(#qj-trame)" />
          </g>
        ))}
      </g>

      {devant.map((b) => (
        <g key={`d${b.x}`}>
          <rect x={b.x} y={SOL - b.h} width={b.l} height={b.h + 30} fill={b.couleur} />
          {/* Face à l'ombre et rebord du toit pour donner du volume. */}
          <rect x={b.x + b.l * 0.78} y={SOL - b.h} width={b.l * 0.22} height={b.h + 30} fill="#07142a" opacity="0.1" />
          <rect x={b.x} y={SOL - b.h} width={b.l} height={8} fill="#07142a" opacity="0.14" />
          {b.citerne && <rect x={b.x + b.l * 0.2} y={SOL - b.h - 14} width="22" height="14" rx="2" fill="#6f7f8f" />}
          {b.antenne && (
            <g stroke="#52606e" strokeWidth="2.5" strokeLinecap="round">
              <line x1={b.x + b.l / 2} y1={SOL - b.h} x2={b.x + b.l / 2} y2={SOL - b.h - 46} />
              <line x1={b.x + b.l / 2 - 12} y1={SOL - b.h - 30} x2={b.x + b.l / 2 + 12} y2={SOL - b.h - 30} />
            </g>
          )}
        </g>
      ))}

      <g fill="#ffffff" opacity="0.7">
        {balcons.map((b) => (
          <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.l} height="4" />
        ))}
      </g>

      <g>
        {vitres.map((v) => (
          <rect
            key={`${v.x}-${v.y}`}
            className="fenetre"
            x={v.x}
            y={v.y}
            width={v.l}
            height={v.h}
            rx="2"
            fill={v.allumee ? '#f5b942' : 'url(#qj-verre)'}
            style={{ '--delai': `${v.delai}s` } as CSSProperties}
          />
        ))}
      </g>

      {/* Sol */}
      <path d="M0 640 Q360 632 720 642 T1440 636 V700 H0 Z" fill="#d9cfb4" />
      <rect x="0" y="676" width="1440" height="24" fill="#4b5a6b" />

      {/* Baobab */}
      <g transform="translate(1010 650) scale(0.9) translate(-858 -452)" fill={VERT_FEUILLAGE} stroke={VERT_FEUILLAGE} strokeLinecap="round">
        <path
          d="M826 452 C834 400 826 350 838 304 C842 288 850 280 858 280 C866 280 872 288 876 304 C888 350 880 400 890 452 Z"
          stroke="none"
        />
        <g fill="none" strokeWidth="8">
          <path d="M858 290 C836 252 804 236 772 234" />
          <path d="M858 290 C850 244 846 206 830 180" />
          <path d="M858 290 C866 246 886 216 912 198" />
          <path d="M858 290 C886 262 926 254 960 262" />
          <path d="M858 292 C830 284 796 290 770 306" />
        </g>
        <g stroke="none">
          {[
            [772, 234],
            [830, 180],
            [912, 198],
            [960, 262],
            [770, 306],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx - 15} cy={cy + 3} r="10" />
              <circle cx={cx} cy={cy - 5} r="13" />
              <circle cx={cx + 15} cy={cy + 2} r="10" />
            </g>
          ))}
        </g>
      </g>

      {/* Palmier */}
      <g transform="translate(150 214)" fill="none" stroke={VERT_FEUILLAGE} strokeLinecap="round">
        <path d="M1190 452 C1196 380 1200 320 1214 262" strokeWidth="7" />
        <g strokeWidth="5">
          <path d="M1214 262 C1190 240 1160 238 1136 252" />
          <path d="M1214 262 C1196 226 1170 214 1140 216" />
          <path d="M1214 262 C1220 222 1240 202 1266 196" />
          <path d="M1214 262 C1240 240 1272 240 1296 256" />
          <path d="M1214 262 C1224 236 1214 218 1204 200" />
        </g>
      </g>
    </svg>
  )
}
