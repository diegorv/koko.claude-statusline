// caveman chip — Nerd Font icon + lowercase mode. Followed by an optional
// savings suffix. Renders only when caveman is active; the caller (render.ts)
// passes null when caveman isn't installed.

import type { CavemanState } from "../../collection/caveman"
import { RESET } from "../format"

// 256-color orange — matches the bash statusline shipped with caveman so the
// brand stays consistent whether the user runs the upstream script or this one.
const ORANGE = "\x1b[38;5;172m"
// Nerd Font codicon — matches the visual width of the other Nerd Font
// gutters/icons used across the line.
const ICON = ""

/**
 * Formats the caveman chip + optional savings. Returns null when the state is
 * null (caveman absent/inactive) so the caller can skip the chip entirely.
 */
export function renderCaveman(state: CavemanState | null): string | null {
  if (!state) return null
  const chip = `${ORANGE}${ICON} ${state.mode}${RESET}`
  if (!state.savings) return chip
  return `${chip} ${ORANGE}${state.savings}${RESET}`
}
