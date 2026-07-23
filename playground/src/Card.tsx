import type { ReactNode } from 'react'

type CardProps = {
  title: string
  hint: string
  children: ReactNode
}

export function Card({ title, hint, children }: CardProps) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <p className="hint">{hint}</p>
      {children}
    </article>
  )
}
