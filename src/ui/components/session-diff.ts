// Component: line counts added/removed by Claude Code during the session.
//
// Lives on the consumption row alongside tokens because it's the same
// conceptual family: "how much output did this session produce" — tokens
// being the unit cost, +/- lines being the visible work product.

import type { StdinData } from "../../parsing/stdin"
import { c } from "../format"

/**
 * Renders `+N -M` for lines added/removed in the current session, or null
 * when both counters are zero (typical at the start of a session before
 * any edits land).
 */
export function renderSessionDiff(data: StdinData): string | null {
  if (data.linesAdded === 0 && data.linesRemoved === 0) return null
  return `${c("green", `+${data.linesAdded}`)} ${c("red", `-${data.linesRemoved}`)}`
}
