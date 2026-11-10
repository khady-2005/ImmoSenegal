import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Fait apparaître doucement son contenu quand il entre à l'écran. Sans navigateur compatible : visible tout de suite. */
export default function Apparition({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])

  return (
    <div ref={ref} className={`apparition ${visible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  )
}
