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

const SPINNER_FRAMES = ["◐", "◓", "◑", "◒"]

/** Returns the current spinner frame based on wall clock time (cycles every 300ms). */
export function spin(): string {
  return SPINNER_FRAMES[Math.floor(Date.now() / 300) % SPINNER_FRAMES.length]
}
