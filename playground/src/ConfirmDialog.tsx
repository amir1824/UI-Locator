import { useEffect, useRef } from 'react'

type ConfirmDialogProps = {
  onClose: () => void
}

/** Closes on outside pointerdown (capture) — use pick mode to verify the dialog stays open. */
export function ConfirmDialog({ onClose }: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const panel = panelRef.current
      if (!panel) return
      if (panel.contains(event.target as Node)) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [onClose])

  return (
    <div className="dialog-root" role="presentation">
      <div className="dialog-backdrop" />
      <div
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title">Outside-click dialog</h2>
        <p>
          This closes on capture-phase <code>pointerdown</code> outside the panel. Enable Locator
          pick mode, then click a labeled element — the dialog should stay open.
        </p>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
