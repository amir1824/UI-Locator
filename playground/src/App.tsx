import { useState } from 'react'
import { Card } from './Card'
import { ConfirmDialog } from './ConfirmDialog'

export function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clicks, setClicks] = useState(0)

  return (
    <main className="page">
      <header className="hero">
        <p className="brand">UI Locator</p>
        <h1>Playground</h1>
        <p className="lede">
          Click the <strong>Locator</strong> badge → hover → click an element to jump to source.
          Open the dialog and try picking through it — it should stay open.
        </p>
      </header>

      <section className="grid">
        <Card title="Counter" hint="src/Card.tsx">
          <button type="button" className="btn" onClick={() => setClicks((n) => n + 1)}>
            Clicked {clicks}
          </button>
        </Card>

        <Card title="Dialog test" hint="outside-click dismiss">
          <button type="button" className="btn btn-accent" onClick={() => setDialogOpen(true)}>
            Open dialog
          </button>
        </Card>

        <Card title="Nested" hint="pick the inner label">
          <div className="nest">
            <span className="nest-label">Inner target</span>
          </div>
        </Card>
      </section>

      {dialogOpen ? <ConfirmDialog onClose={() => setDialogOpen(false)} /> : null}
    </main>
  )
}
