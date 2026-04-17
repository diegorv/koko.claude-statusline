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

/**
 * Unicode codepoints that occupy two terminal cells (East Asian Wide + Fullwidth).
 * Conservative set — covers the canonical CJK ranges but leaves ambiguous glyphs
 * (most emoji, symbols) as width 1 since their rendering is terminal-dependent.
 */
function isWideCodepoint(cp: number): boolean {
  return (
    (cp >= 0x1100  && cp <= 0x115F)  ||  // Hangul Jamo
    (cp >= 0x2E80  && cp <= 0x303E)  ||  // CJK Radicals Supplement — CJK Symbols and Punctuation
    (cp >= 0x3041  && cp <= 0x33FF)  ||  // Hiragana, Katakana, Bopomofo, Hangul Compat, Enclosed CJK
    (cp >= 0x3400  && cp <= 0x4DBF)  ||  // CJK Unified Ideographs Extension A
    (cp >= 0x4E00  && cp <= 0x9FFF)  ||  // CJK Unified Ideographs
    (cp >= 0xA000  && cp <= 0xA4CF)  ||  // Yi Syllables
    (cp >= 0xAC00  && cp <= 0xD7A3)  ||  // Hangul Syllables
    (cp >= 0xF900  && cp <= 0xFAFF)  ||  // CJK Compatibility Ideographs
    (cp >= 0xFE30  && cp <= 0xFE4F)  ||  // CJK Compatibility Forms
    (cp >= 0xFF00  && cp <= 0xFF60)  ||  // Halfwidth and Fullwidth Forms (fullwidth range)
    (cp >= 0xFFE0  && cp <= 0xFFE6)  ||  // Fullwidth Signs
    (cp >= 0x20000 && cp <= 0x2FFFD)     // CJK Unified Ideographs Extensions B–F
  )
}

/**
 * Returns the visual width of a string in terminal cells, stripping ANSI escape
 * codes. Treats East Asian Wide and Fullwidth codepoints as 2 cells, everything
 * else as 1. Used by the line-wrap logic so CJK content doesn't overflow.
 */
export function vlen(s: string): number {
  const stripped = s.replace(ANSI_RE, "")
  let count = 0
  for (const ch of stripped) {
    count += isWideCodepoint(ch.codePointAt(0)!) ? 2 : 1
  }
  return count
}

/**
 * Renders a gradient bar from green to red based on the given percentage.
 * Uses 24-bit (true-color) ANSI sequences for smooth color transitions.
 * @param percent - Value from 0 to 100.
 * @param width - Number of characters in the bar (default: 20).
 * @returns ANSI-colored string of filled and empty block characters.
 */
export function gradientBar(percent: number, width = 20): string {
  const filled = Math.round((percent * width) / 100)
  const parts: string[] = []
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
    parts.push(i < filled
      ? `\x1b[38;2;${r};${g};${b}m\u2588`
      : "\x1b[38;2;100;100;100m\u2591")
  }
  return parts.join("") + RESET
}

// True-color orange for the intermediate 70-89% bucket — no ANSI-16 equivalent between yellow and red.
const ORANGE = "\x1b[38;2;255;170;60m"

/**
 * Returns the ANSI color code for a percentage value.
 * Four buckets: green < 50, yellow 50-69, orange 70-89, red >= 90.
 * The extra step at 50% gives a more informative ramp as usage climbs.
 */
export function pctColor(pct: number): string {
  if (pct >= 90) return ANSI.red
  if (pct >= 70) return ORANGE
  if (pct >= 50) return ANSI.yellow
  return ANSI.green
}

/**
 * Formats a duration in milliseconds to a human-readable string (e.g. "1h 30m", "5m", "30s").
 * @param ms - Duration in milliseconds.
 * @returns Formatted duration string.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s"
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

/**
 * Formats a token count in compact form: `148k`, `1.2m`, `450`.
 * Uses 1 decimal place only when the value isn't a whole multiple of the unit.
 *
 * The 'k' threshold is 950 (not 1000) so values like 999_500 format as `1m`
 * instead of the misleading `1000k` that naive rounding would produce.
 */
export function formatTokens(n: number): string {
  if (n >= 950_000) {
    const v = n / 1_000_000
    const rounded = Math.round(v * 10) / 10
    return rounded === Math.trunc(rounded) ? `${rounded}m` : `${rounded.toFixed(1)}m`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${n}`
}

/** Replaces regular spaces with non-breaking spaces for terminal rendering. */
export const nbsp = (s: string) => s.replace(/ /g, "\u00A0")
