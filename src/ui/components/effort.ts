// /effort chip — dim label + colored level. Rendered as a sibling chip in the header,
// joined by the standard SEP so it follows the same visual rhythm as other columns.

import type { EffortLevel } from "../../collection/config"
import { c, dim } from "../format"

// Speed ↔ Intelligence axis (low → max). Color intensity scales with effort.
const EFFORT_COLOR: Record<EffortLevel, string> = {
  low:    "yellow",   // dimmed below; kept here for exhaustiveness
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
