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
  badgeActiveBorder: string
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
  light: { background: '#ffffff', text: '#111827', accent: '#2563eb' },
  dark: { background: '#000000', text: '#ffffff', accent: '#a3a3a3' },
  blue: { background: '#1e3a8a', text: '#eff6ff', accent: '#60a5fa' },
}

const LIGHT_BADGE_BORDER = '#d1d5db'

const HEX_COLOR_LENGTH = 7
const RGB_CHANNEL_MAX = 255
const HIGHLIGHT_ALPHA = 0.12
const SHADOW_ALPHA = 0.8

function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== HEX_COLOR_LENGTH) return hex
  const channel = Math.round(alpha * RGB_CHANNEL_MAX)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${channel}`
}

function buildTheme(colors: ThemeColors, preset?: LocatorThemePreset): LocatorTheme {
  const { background, text, accent } = colors
  const base: LocatorTheme = {
    badgeBackground: background,
    badgeText: accent,
    badgeActiveBackground: accent,
    badgeActiveText: background,
    badgeBorder: accent,
    badgeActiveBorder: accent,
    tooltipBackground: background,
    tooltipText: text,
    tooltipBorder: accent,
    highlightBorder: accent,
    highlightBackground: withAlpha(accent, HIGHLIGHT_ALPHA),
    highlightShadow: withAlpha(background, SHADOW_ALPHA),
  }
  if (preset !== 'light') return base
  return {
    ...base,
    badgeText: text,
    badgeActiveBackground: background,
    badgeActiveText: accent,
    badgeBorder: LIGHT_BADGE_BORDER,
    tooltipBorder: LIGHT_BADGE_BORDER,
  }
}

export function resolveTheme(input?: LocatorThemeInput): LocatorTheme {
  const lightBase = PRESET_COLORS.light
  if (!input) return buildTheme(lightBase, 'light')
  if (typeof input === 'string') return buildTheme(PRESET_COLORS[input] ?? lightBase, input)
  return buildTheme({ ...lightBase, ...input }, 'light')
}
