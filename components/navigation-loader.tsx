'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/how-to': 'How to Use',
}

function getLabel(path: string) {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  if (path.includes('/sow')) return 'Statement of Work'
  if (path.includes('/srs')) return 'System Requirements'
  if (path.includes('/prototype')) return 'Prototype'
  if (path.match(/^\/project\/[^/]+$/)) return 'Project'
  return 'Loading'
}

/* ── Floating particle ── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute h-1.5 w-1.5 rounded-full bg-primary/30"
      style={style}
    />
  )
}

const DURATION = 1500 // ms

export function NavigationLoader() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('')
  const prevPath = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname

    // Reset & show
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    setLabel(getLabel(pathname))
    setProgress(0)
    setExiting(false)
    setShow(true)
    startRef.current = performance.now()

    // Animate progress bar
    function tick(now: number) {
      const elapsed = now - (startRef.current ?? now)
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    // Exit after DURATION
    timerRef.current = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        setShow(false)
        setExiting(false)
        setProgress(0)
      }, 500)
    }, DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [pathname])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'var(--background)',
        opacity: exiting ? 0 : 1,
        transition: exiting ? 'opacity 0.5s cubic-bezier(0.16,1,0.3,1)' : 'none',
        pointerEvents: exiting ? 'none' : 'all',
      }}
    >
      {/* ── Blurred blob backgrounds ── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.45 0.15 250 / 0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.7 0.16 80 / 0.10) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        <div
          className="absolute left-1/4 top-2/3 h-64 w-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.6 0.15 160 / 0.08) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ── Floating particles ── */}
      {[
        { top: '20%', left: '15%', animationDelay: '0s', animationDuration: '2.8s' },
        { top: '70%', left: '80%', animationDelay: '0.4s', animationDuration: '3.2s' },
        { top: '35%', left: '85%', animationDelay: '0.8s', animationDuration: '2.5s' },
        { top: '80%', left: '20%', animationDelay: '1.2s', animationDuration: '3.6s' },
        { top: '15%', left: '70%', animationDelay: '0.2s', animationDuration: '3s' },
        { top: '55%', left: '8%',  animationDelay: '1.6s', animationDuration: '2.7s' },
      ].map((s, i) => (
        <Particle
          key={i}
          style={{
            top: s.top,
            left: s.left,
            animation: `float ${s.animationDuration} ${s.animationDelay} ease-in-out infinite`,
            opacity: 0.6,
          }}
        />
      ))}

      {/* ── Center card ── */}
      <div
        className="relative flex flex-col items-center gap-6"
        style={{
          animation: exiting
            ? 'fadeInUp 0.35s reverse cubic-bezier(0.16,1,0.3,1) both'
            : 'fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Logo with pulse ring */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'oklch(0.45 0.15 250 / 0.2)',
              animation: 'pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite',
            }}
          />
          {/* Second ring – slightly slower */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'oklch(0.45 0.15 250 / 0.12)',
              animation: 'pulse-ring 2s 0.4s cubic-bezier(0.215,0.61,0.355,1) infinite',
            }}
          />
          {/* Logo box */}
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, oklch(0.45 0.15 250) 0%, oklch(0.55 0.15 270) 100%)',
              animation: 'float 3s ease-in-out infinite',
              boxShadow: '0 16px 40px oklch(0.45 0.15 250 / 0.35)',
            }}
          >
            <img src="/loading.gif" alt="Loading" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* App name + page label */}
        <div className="text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            style={{ animation: 'fadeInUp 0.5s 0.1s both' }}
          >
            Sandy
          </p>
          <h1
            className="mt-1 text-xl font-semibold text-foreground"
            style={{ animation: 'fadeInUp 0.5s 0.2s both' }}
          >
            {label}
          </h1>
        </div>

        {/* Progress bar */}
        <div
          className="w-48 overflow-hidden rounded-full bg-muted"
          style={{
            height: '3px',
            animation: 'fadeInUp 0.5s 0.25s both',
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, oklch(0.45 0.15 250), oklch(0.65 0.15 280))',
              transition: 'width 0.05s linear',
              boxShadow: '0 0 8px oklch(0.45 0.15 250 / 0.5)',
            }}
          />
        </div>

        {/* Dot loader */}
        <div
          className="flex items-center gap-1.5"
          style={{ animation: 'fadeInUp 0.5s 0.3s both' }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: 'oklch(0.45 0.15 250 / 0.5)',
                animation: `pulse 1.4s ${i * 0.22}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
