// /effort chip — dim label + colored level. Rendered as a sibling chip in the header,
// joined by the standard SEP so it follows the same visual rhythm as other columns.

import type { EffortLevel } from "../../collection/config"
import { c, dim } from "../format"

// Color per effort level on the Speed ↔ Intelligence axis. `low` is handled
// separately (rendered dimmed instead of colored), so it's excluded from the map.
const EFFORT_COLOR: Record<Exclude<EffortLevel, "low">, string> = {
  medium: "yellow",
  high:   "green",
  xhigh:  "magenta",
  max:    "red",
}

/**
 * Formats the /effort level as `effort: <level>` (dim label + colored value).
 * Returns `null` when the level is unset so the caller can skip the chip entirely.
 */
export function renderEffort(level: EffortLevel | null): string | null {
  if (!level) return null
  const value = level === "low" ? dim(level) : c(EFFORT_COLOR[level], level)
  return dim("effort: ") + value
}
