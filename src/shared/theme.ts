export type LocatorThemePreset = 'default' | 'light' | 'dark' | 'blue'

export type LocatorThemeOverride = {
  background?: string
  text?: string
  accent?: string
}

export type LocatorThemeInput = LocatorThemePreset | LocatorThemeOverride

export type LocatorTheme = {
  badgeBackground: string
  badgeText: string
  badgeActiveBackground: string
  badgeActiveText: string
  badgeBorder: string
  tooltipBackground: string
  tooltipText: string
  tooltipBorder: string
  highlightBorder: string
  highlightBackground: string
  highlightShadow: string
}

type ThemeColors = {
  background: string
  text: string
  accent: string
}

const PRESET_COLORS: Record<LocatorThemePreset, ThemeColors> = {
  default: { background: '#0f172a', text: '#f8fafc', accent: '#38bdf8' },
  light: { background: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  dark: { background: '#000000', text: '#ffffff', accent: '#a3a3a3' },
  blue: { background: '#1e3a8a', text: '#eff6ff', accent: '#60a5fa' },
}

function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex
  const channel = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${channel}`
}

function buildTheme(colors: ThemeColors): LocatorTheme {
  const { background, text, accent } = colors
  return {
    badgeBackground: background,
    badgeText: accent,
    badgeActiveBackground: accent,
    badgeActiveText: background,
    badgeBorder: accent,
    tooltipBackground: background,
    tooltipText: text,
    tooltipBorder: accent,
    highlightBorder: accent,
    highlightBackground: withAlpha(accent, 0.12),
    highlightShadow: withAlpha(background, 0.8),
  }
}

function isThemePreset(value: LocatorThemeInput): value is LocatorThemePreset {
  return typeof value === 'string'
}

export function resolveTheme(input?: LocatorThemeInput): LocatorTheme {
  if (!input) return buildTheme(PRESET_COLORS.default)
  if (isThemePreset(input)) {
    const preset = PRESET_COLORS[input] ?? PRESET_COLORS.default
    return buildTheme(preset)
  }
  return buildTheme({ ...PRESET_COLORS.default, ...input })
}
