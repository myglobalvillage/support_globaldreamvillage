import { useEffect, useRef } from 'react'

/** Global single-key shortcuts; ignored while typing in a form control. */
export function useShortcuts(handlers: Record<string, () => void>) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        if (e.key === 'Escape') el.blur()
        return
      }
      const fn = ref.current[e.key]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
