// Shared UI constants — icons, separators, spinner

import { dim } from "./format"

/** Nerd Font icons used across components. */
export const ICONS = {
  branch: "\ue0a0",  //
  gauge:  "\uf0e4",  //
  tree:   "\uf1bb",  //
} as const

/** Gap between items on the same line. */
export const GAP = "   "

/** Dimmed vertical separator between sections. */
export const SEP = dim("  │  ")

/**
 * Mid-gray used for the horizontal rule and the per-row left gutter.
 * Stays legible on both dark and light terminal themes (brighter than ANSI dim,
 * but still clearly secondary to the colored content on the row).
 */
export const RULE_COLOR = "\x1b[38;2;110;110;120m"

/** Wraps text in RULE_COLOR with an automatic reset. */
export const inRuleColor = (s: string) => `${RULE_COLOR}${s}\x1b[0m`

const SPINNER_FRAMES = ["◐", "◓", "◑", "◒"]

/** Returns the current spinner frame based on wall clock time (cycles every 300ms). */
export function spin(): string {
  return SPINNER_FRAMES[Math.floor(Date.now() / 300) % SPINNER_FRAMES.length]
}
