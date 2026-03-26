'use client'

import { useEffect } from 'react'

/**
 * Force the app to stay in "light mode only".
 * Some UI components (like Tiptap template) toggle the `dark` class on <html>.
 * This component removes it to keep the whole app white/legible.
 */
export function NoDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')

    // Help browsers/OS pick the correct color-scheme.
    const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null
    if (meta) meta.content = 'light'
  }, [])

  return null
}

