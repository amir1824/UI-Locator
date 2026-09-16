export type ContextDetail = 'compact' | 'expanded'

export type LocatorContext = {
  source: {
    file: string
    line: number
    column: number
  }
  element: {
    tag: string
    text?: string
    html: string
    attributes: Record<string, string>
  }
  page: {
    url: string
    pathname: string
  }
  styles?: Record<string, string>
  box?: {
    top: number
    left: number
    width: number
    height: number
  }
  path?: string
}

export type GetContextOptions = {
  attribute?: string
  root?: string
  detail?: ContextDetail
}
