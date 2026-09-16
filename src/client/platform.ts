/** True for macOS / iOS — Alt key is labeled Option (⌥). */
export function isApplePlatform(userAgent = navigator.userAgent): boolean {
  return /Mac|iPhone|iPod|iPad/.test(userAgent)
}

/** Modifier chord label for expanded copy (Alt on Win/Linux, Option on Mac). */
export function expandedModifierLabel(userAgent = navigator.userAgent): string {
  return isApplePlatform(userAgent) ? 'Option+Shift' : 'Alt+Shift'
}
