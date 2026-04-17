// /effort chip — label + colored level, glued to the model in the header.

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
 * Formats the /effort level as a dim-labeled, colored chip (e.g. ` | effort: high`).
 * Returns an empty string when the level is null so the caller can concatenate unconditionally.
 */
export function renderEffort(level: EffortLevel | null): string {
  if (!level) return ""
  if (level === "low") return dim(" | effort: ") + dim(level)
  return dim(" | effort: ") + c(EFFORT_COLOR[level], level)
}
