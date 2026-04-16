// ANSI formatting helpers

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"

const ANSI: Record<string, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
}

export { RESET }

const ANSI_RE = /\x1b\[[0-9;]*m/g

/** Wraps text in the given ANSI color with an automatic reset. */
export const c = (color: string, text: string) => `${ANSI[color] ?? ""}${text}${RESET}`

/** Wraps text in bold + the given ANSI color with an automatic reset. */
export const bold = (color: string, text: string) => `${BOLD}${ANSI[color] ?? ""}${text}${RESET}`

/** Wraps text in dim (faint) ANSI style with an automatic reset. */
export const dim = (text: string) => `${DIM}${text}${RESET}`

/** Returns the visual length of a string, stripping ANSI escape codes. */
export function vlen(s: string): number {
  const stripped = s.replace(ANSI_RE, "")
  let count = 0
  for (const _ of stripped) count++
  return count
}

/**
 * Renders a gradient bar from green to red based on the given percentage.
 * Uses 256-color ANSI sequences for smooth color transitions.
 * @param percent - Value from 0 to 100.
 * @param width - Number of characters in the bar (default: 20).
 * @returns ANSI-colored string of filled and empty block characters.
 */
export function gradientBar(percent: number, width = 20): string {
  const filled = Math.round((percent * width) / 100)
  let out = ""
  for (let i = 0; i < width; i++) {
    const t = width > 1 ? i / (width - 1) : 0
    let r: number, g: number, b: number
    if (t <= 0.5) {
      r = Math.round(220 * t * 2)
      g = 200
      b = Math.round(80 * (1 - t * 2))
    } else {
      const a = (t - 0.5) * 2
      r = 220
      g = Math.round(200 - 160 * a)
      b = Math.round(20 * a)
    }
    out += i < filled
      ? `\x1b[38;2;${r};${g};${b}m\u2588`
      : "\x1b[38;2;100;100;100m\u2591"
  }
  return out + RESET
}

/**
 * Returns the ANSI color code for a percentage value (green < 70, yellow 70-89, red >= 90).
 * @param pct - Percentage value.
 * @returns ANSI color escape code string.
 */
export function pctColor(pct: number): string {
  if (pct >= 90) return ANSI.red
  if (pct >= 70) return ANSI.yellow
  return ANSI.green
}

/**
 * Formats a duration in milliseconds to a human-readable string (e.g. "1h 30m", "5m", "30s").
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string.
 */
export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return `${sec}s`
}

/**
 * Formats the time remaining until a reset epoch as a human-readable countdown (e.g. "23m", "1h 15m").
 * Returns empty string if the reset time is in the past.
 * @param epochSec - Reset timestamp in seconds since Unix epoch.
 * @returns Formatted countdown string, or empty if already past.
 */
export function formatResetIn(epochSec: number): string {
  const diff = epochSec * 1000 - Date.now()
  if (diff <= 0) return ""
  const mins = Math.ceil(diff / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Replaces regular spaces with non-breaking spaces for terminal rendering. */
export const nbsp = (s: string) => s.replace(/ /g, "\u00A0")
