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
 * Codepoints in the BMP "Misc Symbols + Dingbats + Misc Technical" range that
 * default to emoji presentation (Unicode Emoji_Presentation=Yes). Anything not
 * in this set defaults to text presentation (1 cell) unless followed by VS-16.
 *
 * Stored as a compact range table — pairs of [start, end] (inclusive). A range
 * with start === end is a single codepoint.
 */
// Ranges MUST stay sorted by `start` — `isInRangeTable` relies on this for
// early termination. Run the unit tests after editing to catch ordering bugs.
//
// 0x23F1–0x23F2 (stopwatch / timer) have default text presentation per Unicode
// but render as 2 cells in modern terminals (iTerm2, Ghostty, Kitty, etc.) when
// the emoji font is preferred. ⏱ is used directly in this project's header, so
// they are merged into the [0x23F0, 0x23F3] block here.
const EMOJI_PRESENTATION_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x231A, 0x231B], [0x23E9, 0x23EC], [0x23F0, 0x23F3],
  [0x25FD, 0x25FE], [0x2614, 0x2615], [0x2648, 0x2653], [0x267F, 0x267F],
  [0x2693, 0x2693], [0x26A1, 0x26A1], [0x26AA, 0x26AB], [0x26BD, 0x26BE],
  [0x26C4, 0x26C5], [0x26CE, 0x26CE], [0x26D4, 0x26D4], [0x26EA, 0x26EA],
  [0x26F2, 0x26F3], [0x26F5, 0x26F5], [0x26FA, 0x26FA], [0x26FD, 0x26FD],
  [0x2705, 0x2705], [0x270A, 0x270B], [0x2728, 0x2728], [0x274C, 0x274C],
  [0x274E, 0x274E], [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797],
  [0x27B0, 0x27B0], [0x27BF, 0x27BF],
]

function isInRangeTable(cp: number, table: ReadonlyArray<readonly [number, number]>): boolean {
  for (const [start, end] of table) {
    if (cp < start) return false
    if (cp <= end) return true
  }
  return false
}

/**
 * Unicode codepoints that occupy two terminal cells (East Asian Wide + Fullwidth + emoji).
 * Modern terminals (iTerm2, Ghostty, Kitty, Alacritty, WezTerm) render emoji as 2 cells,
 * so we count them that way to keep wrap math aligned with what the terminal draws.
 */
function isWideCodepoint(cp: number): boolean {
  return (
    (cp >= 0x1100  && cp <= 0x115F)  ||  // Hangul Jamo
    isInRangeTable(cp, EMOJI_PRESENTATION_RANGES) ||  // Default-emoji codepoints in BMP
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
    (cp >= 0x1F000 && cp <= 0x1FFFD) ||  // Mahjong, Domino, Cards, Emoji blocks (Misc Symbols and Pictographs, Transport, Supplemental, Extended-A)
    (cp >= 0x20000 && cp <= 0x2FFFD)     // CJK Unified Ideographs Extensions B–F
  )
}

/**
 * Codepoints that contribute zero cells: ZWJ, variation selectors, and combining
 * marks. These either modify a preceding base character or are invisible joiners,
 * so adding their own width would double-count the resulting glyph.
 */
function isZeroWidthCodepoint(cp: number): boolean {
  return (
    cp === 0x200B || cp === 0x200C || cp === 0x200D || // ZWSP, ZWNJ, ZWJ
    cp === 0xFEFF                                   || // BOM
    (cp >= 0x0300 && cp <= 0x036F) ||  // Combining Diacritical Marks
    (cp >= 0x0483 && cp <= 0x0489) ||  // Cyrillic combining
    (cp >= 0x1AB0 && cp <= 0x1AFF) ||  // Combining Diacritical Marks Extended
    (cp >= 0x1DC0 && cp <= 0x1DFF) ||  // Combining Diacritical Marks Supplement
    (cp >= 0x20D0 && cp <= 0x20FF) ||  // Combining Diacritical Marks for Symbols
    (cp >= 0xFE00 && cp <= 0xFE0F) ||  // Variation Selectors (incl. VS-15/VS-16)
    (cp >= 0xFE20 && cp <= 0xFE2F) ||  // Combining Half Marks
    (cp >= 0xE0100 && cp <= 0xE01EF)   // Variation Selectors Supplement
  )
}

/**
 * Returns the visual width of a string in terminal cells, stripping ANSI escape
 * codes. Counts East Asian Wide, Fullwidth, and emoji codepoints as 2 cells;
 * combining marks, variation selectors, and zero-width joiners as 0; everything
 * else as 1. A text-presentation char followed by VS-16 (U+FE0F) is promoted to
 * 2 cells (e.g. ❤️ = heart + VS-16). Used by the line-wrap logic so styled
 * content doesn't overflow.
 *
 * Note: ZWJ-joined emoji sequences (e.g. 👨‍👩‍👧) overcount because each base
 * emoji is counted as 2 cells while the terminal draws the whole sequence as
 * one 2-cell glyph. Treated as acceptable: overcount is safer than undercount
 * (lines wrap a bit early instead of overflowing), and these sequences are rare
 * in the strings we render.
 */
export function vlen(s: string): number {
  const stripped = s.replace(ANSI_RE, "")
  const chars = [...stripped]
  let count = 0
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!
    if (isZeroWidthCodepoint(cp)) continue
    if (isWideCodepoint(cp)) { count += 2; continue }
    // VS-16 lookahead: a narrow base char followed by U+FE0F is rendered as
    // emoji (2 cells) by terminals that support emoji presentation.
    const next = i + 1 < chars.length ? chars[i + 1].codePointAt(0)! : 0
    count += next === 0xFE0F ? 2 : 1
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
 * Formats the time remaining until a reset epoch as a human-readable countdown.
 * Switches unit by magnitude so the result stays compact and readable:
 *   < 60m  → "23m"
 *   < 48h  → "1h 15m" / "47h"
 *   >= 48h → "6d 5h" / "7d"  (minutes dropped — irrelevant at this scale)
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
  if (h >= 48) {
    const d = Math.floor(h / 24)
    const hr = h % 24
    return hr > 0 ? `${d}d ${hr}h` : `${d}d`
  }
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
