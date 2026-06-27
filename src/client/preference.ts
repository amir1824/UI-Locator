export function badgeLabel(picking: boolean): string {
  if (picking) return 'Picking — Esc'
  return 'Locator'
}
